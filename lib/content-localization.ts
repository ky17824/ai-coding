import { createHash } from "node:crypto";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { Locale } from "@/lib/i18n";
import type { StoredGtmPlan } from "@/lib/types";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { normalizeMarketResearch } from "@/lib/market-sizing";

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;
type Path = (string | number)[];

const translationSchema = z.object({
  translations: z.array(z.object({
    key: z.string(),
    text: z.string()
  })).max(300)
});

const NON_TRANSLATABLE_KEYS = new Set([
  "id", "url", "checkedAt", "generatedAt", "dueDate", "deadline",
  "kind", "scope", "status", "priority", "serviceTag", "role",
  "questionKey", "inputType", "label", "offeringType", "generatedBy",
  "key", "methodologyVersion", "currency", "confidence", "method", "researchContextSignature"
]);

function pathKey(path: Path) {
  return path.map(String).join(".");
}

function isTranslatable(path: Path, value: string, sourceLocale: Locale) {
  const last = String(path.at(-1) ?? "");
  const full = pathKey(path);
  if (!value.trim() || NON_TRANSLATABLE_KEYS.has(last)) return false;
  if (/^https?:\/\//i.test(value) || /^\d{4}-\d{2}-\d{2}/.test(value)) return false;
  if (/\.competitors\.\d+\.name$/.test(`.${full}`) || /\.sources\.\d+\.title$/.test(`.${full}`)) return false;
  if (/founderContext\.(offeringName|targetCountry)$/.test(full)) return false;
  return sourceLocale === "ko" ? /[가-힣]/.test(value) : /[A-Za-z]{3}/.test(value);
}

function collectStrings(value: unknown, sourceLocale: Locale, path: Path = [], result: { path: Path; text: string }[] = []) {
  if (typeof value === "string") {
    if (isTranslatable(path, value, sourceLocale)) result.push({ path, text: value });
    return result;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectStrings(entry, sourceLocale, [...path, index], result));
    return result;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, entry]) => collectStrings(entry, sourceLocale, [...path, key], result));
  }
  return result;
}

function setAtPath(root: unknown, path: Path, value: string) {
  let cursor = root as Record<string | number, unknown>;
  path.slice(0, -1).forEach((segment) => {
    cursor = cursor[segment] as Record<string | number, unknown>;
  });
  cursor[path.at(-1)!] = value;
}

export function contentHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function localizeStoredGtmPlan(
  admin: AdminClient,
  organizationId: string,
  plan: StoredGtmPlan,
  targetLocale: Locale
): Promise<StoredGtmPlan> {
  plan = { ...plan, marketResearch: normalizeMarketResearch(plan.marketResearch) };
  const document = {
    summary: plan.summary,
    assumptions: plan.assumptions,
    founderContext: plan.founderContext,
    marketResearch: plan.marketResearch,
    recentMessages: plan.recentMessages,
    items: Object.fromEntries(plan.items.filter((item) => item.id).map((item) => [item.id!, item]))
  };
  const strings = [
    ...collectStrings({
      summary: document.summary,
      assumptions: document.assumptions,
      items: document.items
    }, plan.contentLocale ?? "ko"),
    ...collectStrings({
      founderContext: document.founderContext,
      recentMessages: document.recentMessages
    }, plan.founderContextLocale ?? plan.contentLocale ?? "ko"),
    ...collectStrings({ marketResearch: document.marketResearch }, plan.marketResearchLocale ?? plan.contentLocale ?? "ko")
  ].filter((entry) => {
    const key = pathKey(entry.path);
    const source = key.startsWith("founderContext") || key.startsWith("recentMessages")
      ? plan.founderContextLocale ?? plan.contentLocale ?? "ko"
      : key.startsWith("marketResearch")
        ? plan.marketResearchLocale ?? plan.contentLocale ?? "ko"
        : plan.contentLocale ?? "ko";
    return source !== targetLocale;
  });
  if (strings.length === 0) return plan;

  const fields = strings.map((entry) => ({
    ...entry,
    key: pathKey(entry.path),
    hash: contentHash(entry.text)
  }));
  const { data: cached } = await admin.from("content_translations")
    .select("field_name,source_hash,translated_text,is_official")
    .eq("entity_type", "gtm_plan")
    .eq("entity_id", plan.id)
    .eq("target_locale", targetLocale)
    .in("field_name", fields.map((field) => field.key));
  const cache = new Map((cached ?? []).map((entry) => [entry.field_name, entry]));
  const missing = fields.filter((field) => {
    const entry = cache.get(field.key);
    return !entry?.is_official && entry?.source_hash !== field.hash;
  });
  let failed = false;

  if (missing.length > 0) {
    if (!process.env.OPENAI_API_KEY) {
      failed = true;
    } else {
      try {
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const response = await client.responses.parse({
          model: "gpt-5.6-luna",
          store: false,
          instructions: targetLocale === "en"
            ? "Translate each value into concise, natural US English for a startup GTM product. Preserve numbers, currencies, dates, URLs, product and company names, and factual certainty. Do not add, omit, or reinterpret claims. Return every key exactly as provided."
            : "각 value를 자연스럽고 전문적인 한국어로 번역하세요. 숫자, 통화, 날짜, URL, 제품명, 회사명과 사실의 확실성은 그대로 유지하고 내용을 추가·삭제·재해석하지 마세요. 모든 key를 입력 그대로 반환하세요.",
          input: JSON.stringify(missing.map(({ key, text }) => ({ key, text }))),
          text: { format: zodTextFormat(translationSchema, "content_translation") }
        });
        const translated = new Map(response.output_parsed?.translations.map((entry) => [entry.key, entry.text]) ?? []);
        const rows = missing.flatMap((field) => {
          const text = translated.get(field.key);
          return text ? [{
            organization_id: organizationId,
            entity_type: "gtm_plan",
            entity_id: plan.id,
            field_name: field.key,
            target_locale: targetLocale,
            source_hash: field.hash,
            translated_text: text,
            is_official: false,
            updated_at: new Date().toISOString()
          }] : [];
        });
        if (rows.length !== missing.length) failed = true;
        if (rows.length > 0) {
          const { error } = await admin.from("content_translations").upsert(rows, {
            onConflict: "entity_type,entity_id,field_name,target_locale"
          });
          if (error) failed = true;
          rows.forEach((row) => cache.set(row.field_name, row));
        }
      } catch {
        failed = true;
      }
    }
  }

  const localized = structuredClone(document);
  fields.forEach((field) => {
    const entry = cache.get(field.key);
    if (entry?.is_official || entry?.source_hash === field.hash) {
      setAtPath(localized, field.path, entry.translated_text);
    }
  });
  return {
    ...plan,
    ...localized,
    items: plan.items.map((item) => item.id ? localized.items[item.id] ?? item : item),
    translationFallback: failed
  };
}

export async function translateTextFields<T extends Record<string, string>>(
  values: T,
  targetLocale: Locale
): Promise<T | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.parse({
    model: "gpt-5.6-luna",
    store: false,
    instructions: targetLocale === "en"
      ? "Translate each value into concise, natural US English. Preserve numbers, currencies, dates, URLs, product names, company names, and factual certainty. Return every key exactly as provided."
      : "각 value를 자연스럽고 전문적인 한국어로 번역하세요. 숫자, 통화, 날짜, URL, 제품명, 회사명과 사실의 확실성은 그대로 유지하고 모든 key를 입력 그대로 반환하세요.",
    input: JSON.stringify(Object.entries(values).map(([key, text]) => ({ key, text }))),
    text: { format: zodTextFormat(translationSchema, "content_translation") }
  });
  const translated = Object.fromEntries(
    (response.output_parsed?.translations ?? []).map(({ key, text }) => [key, text])
  );
  return Object.keys(values).every((key) => translated[key]) ? translated as T : null;
}

export async function preserveFounderContextLocale(
  admin: AdminClient,
  organizationId: string,
  planId: string,
  locale: Locale,
  founderContext: StoredGtmPlan["founderContext"]
) {
  const fields = collectStrings({ founderContext }, locale).map((entry) => ({
    organization_id: organizationId,
    entity_type: "gtm_plan",
    entity_id: planId,
    field_name: pathKey(entry.path),
    target_locale: locale,
    source_hash: contentHash(entry.text),
    translated_text: entry.text,
    is_official: true,
    updated_at: new Date().toISOString()
  }));
  if (fields.length > 0) {
    await admin.from("content_translations").upsert(fields, {
      onConflict: "entity_type,entity_id,field_name,target_locale"
    });
  }
}

export const contentLocalizationInternals = { collectStrings, isTranslatable };
