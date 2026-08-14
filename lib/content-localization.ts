import { createHash } from "node:crypto";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { after } from "next/server";
import { z } from "zod";
import type { Locale } from "@/lib/i18n";
import type { StoredGtmPlan } from "@/lib/types";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { normalizeMarketResearch } from "@/lib/market-sizing";

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;
type Path = (string | number)[];
// ponytail: process-local dedupe; add a DB job lock only if cross-instance duplicates are observed.
const pendingTranslations = new Set<string>();
const translationCooldowns = new Map<string, number>();

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
  "key", "methodologyVersion", "researchMethodologyVersion", "currency", "confidence", "method",
  "category", "marketPresence", "sourceType", "publisher", "freshness", "researchContextSignature"
]);

function pathKey(path: Path) {
  return path.map(String).join(".");
}

function matchesTargetLocale(value: string, targetLocale: Locale) {
  return targetLocale === "ko" ? /[가-힣]/.test(value) : !/[가-힣]/.test(value);
}

function hasEnglishProse(value: string) {
  const words = value.match(/\b[A-Za-z]{2,}\b/g) ?? [];
  return /^(?:none|unknown|no information|not available)$/i.test(value.trim()) ||
    (words.length >= 2 && !words.every((word) => /^[A-Z]{2,5}$/.test(word)));
}

function isTranslatable(path: Path, value: string, sourceLocale: Locale, targetLocale?: Locale) {
  const last = String(path.at(-1) ?? "");
  const full = pathKey(path);
  if (!value.trim() || NON_TRANSLATABLE_KEYS.has(last)) return false;
  if (/researchCoverage\.(?:lanes|coverageGaps)\./.test(full)) return false;
  if (/^https?:\/\//i.test(value) || /^\d{4}-\d{2}-\d{2}/.test(value)) return false;
  if (/\.competitors\.\d+\.name$/.test(`.${full}`) || /\.sources\.\d+\.title$/.test(`.${full}`)) return false;
  if (/(?:founderContext|marketResearch)\.offeringName$/.test(full)) return false;
  if (targetLocale === "ko") {
    if (/(?:founderContext|marketResearch)\.targetCountry$/.test(full)) return /[A-Za-z]{3}/.test(value);
    return hasEnglishProse(value);
  }
  if (targetLocale === "en") return /[가-힣]/.test(value);
  return sourceLocale === "ko" ? /[가-힣]/.test(value) : /[A-Za-z]{3}/.test(value);
}

function collectStrings(value: unknown, sourceLocale: Locale, targetLocale?: Locale, path: Path = [], result: { path: Path; text: string }[] = []) {
  if (typeof value === "string") {
    if (isTranslatable(path, value, sourceLocale, targetLocale)) result.push({ path, text: value });
    return result;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectStrings(entry, sourceLocale, targetLocale, [...path, index], result));
    return result;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, entry]) => collectStrings(entry, sourceLocale, targetLocale, [...path, key], result));
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
  targetLocale: Locale,
  options: { waitForMissing?: boolean } = {}
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
    }, plan.contentLocale ?? "ko", targetLocale),
    ...collectStrings({
      founderContext: document.founderContext,
      recentMessages: document.recentMessages
    }, plan.founderContextLocale ?? plan.contentLocale ?? "ko", targetLocale),
    ...collectStrings({ marketResearch: document.marketResearch }, plan.marketResearchLocale ?? plan.contentLocale ?? "ko", targetLocale)
  ];
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
    if (entry?.is_official) return false;
    return !entry || entry.source_hash !== field.hash ||
      !matchesTargetLocale(entry.translated_text, targetLocale);
  });
  let failed = missing.length > 0;

  if (missing.length > 0 && process.env.OPENAI_API_KEY) {
    const pendingKey = `${plan.id}:${targetLocale}`;
    const translateMissing = async () => {
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
        return text && matchesTargetLocale(text, targetLocale) ? [{
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
      if (rows.length > 0) {
        const { error } = await admin.from("content_translations").upsert(rows, {
          onConflict: "entity_type,entity_id,field_name,target_locale"
        });
        if (error) throw error;
      }
      if (rows.length !== missing.length) {
        throw new Error(`partial translation: ${rows.length}/${missing.length}`);
      }
      return rows;
    };

    if (options.waitForMissing) {
      try {
        const rows = await translateMissing();
        rows.forEach((row) => cache.set(row.field_name, row));
        failed = rows.length !== missing.length;
      } catch (error) {
        translationCooldowns.set(pendingKey, Date.now() + 60_000);
        if (process.env.NODE_ENV !== "test") {
          console.error("[content-localization] report translation failed", {
            planId: plan.id,
            targetLocale,
            error: error instanceof Error ? error.message : "unknown"
          });
        }
      }
    } else if (!pendingTranslations.has(pendingKey) &&
        (translationCooldowns.get(pendingKey) ?? 0) <= Date.now()) {
      pendingTranslations.add(pendingKey);
      try {
        after(async () => {
          try {
            await translateMissing();
            translationCooldowns.delete(pendingKey);
          } catch (error) {
            translationCooldowns.set(pendingKey, Date.now() + 60_000);
            console.error("[content-localization] background translation failed", {
              planId: plan.id,
              targetLocale,
              error: error instanceof Error ? error.message : "unknown"
            });
          } finally {
            pendingTranslations.delete(pendingKey);
          }
        });
      } catch (error) {
        pendingTranslations.delete(pendingKey);
        if (process.env.NODE_ENV !== "test") {
          console.error("[content-localization] background scheduling failed", {
            planId: plan.id,
            targetLocale,
            error: error instanceof Error ? error.message : "unknown"
          });
        }
      }
    }
  }

  const localized = structuredClone(document);
  fields.forEach((field) => {
    const entry = cache.get(field.key);
    if (entry?.is_official || (entry?.source_hash === field.hash &&
        matchesTargetLocale(entry.translated_text, targetLocale))) {
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
