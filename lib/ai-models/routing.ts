import { z } from "zod";
import { MODEL_CATALOG, modelSpec, type Effort, type ModelKey } from "@/lib/ai-models/catalog";

export const STAGES = ["classification", "public_research", "final_report"] as const;
export type Stage = (typeof STAGES)[number];

/** 단계 이름은 사용자 화면의 플로우차트(components/ai-generation-flow.tsx)와 같은 문구를 쓴다. */
export const STAGE_LABEL: Record<"ko" | "en", Record<Stage, string>> = {
  ko: { classification: "입력 정리", public_research: "공개 자료 조사", final_report: "보고서 작성" },
  en: { classification: "Organising input", public_research: "Public research", final_report: "Writing the report" }
};

const modelKeySchema = z.custom<ModelKey>((value) => typeof value === "string" && value in MODEL_CATALOG);
const effortSchema = z.enum(["low", "medium", "high"]);

const stageRouteSchema = z.object({ model: modelKeySchema, effort: effortSchema }).strict();
export const routesSchema = z.object({
  classification: stageRouteSchema,
  public_research: stageRouteSchema,
  final_report: stageRouteSchema
}).strict();

export type StageRoute = { model: ModelKey; effort: Effort };
export type Routes = z.infer<typeof routesSchema>;

/** 배포 직후 동작을 바꾸지 않기 위한 초기값. 전환은 관리자 페이지에서 한다. */
export const SEED_ROUTES: Routes = {
  classification: { model: "openai:gpt-5.6-sol", effort: "medium" },
  public_research: { model: "openai:gpt-5.6-sol", effort: "medium" },
  final_report: { model: "openai:gpt-5.6-sol", effort: "medium" }
};

export type RoutesValidationError = "invalid_shape" | "unknown_model" | "unsupported_effort" | "no_web_search" | "provider_key_missing";
export type RoutesValidation = { ok: true; routes: Routes } | { ok: false; error: RoutesValidationError };

/**
 * 저장·읽기 양쪽에서 같은 규칙을 쓴다. 클라이언트가 먼저 걸러도 서버는 다시 본다.
 * 순서가 중요하다: 모양 → 모델 존재 → effort → 단계 기능 → 키.
 */
export function validateRoutes(input: unknown, env: { hasOpenAiKey: boolean; hasAnthropicKey: boolean }): RoutesValidation {
  const parsed = routesSchema.safeParse(input);
  if (!parsed.success) {
    // 모양은 맞는데 모델 문자열만 모르는 경우를 구분해 준다.
    const loose = z.object({
      classification: z.object({ model: z.string(), effort: z.string() }).strict(),
      public_research: z.object({ model: z.string(), effort: z.string() }).strict(),
      final_report: z.object({ model: z.string(), effort: z.string() }).strict()
    }).strict().safeParse(input);
    if (!loose.success) return { ok: false, error: "invalid_shape" };
    for (const stage of STAGES) {
      if (!(loose.data[stage].model in MODEL_CATALOG)) return { ok: false, error: "unknown_model" };
    }
    return { ok: false, error: "unsupported_effort" };
  }
  const routes = parsed.data;
  for (const stage of STAGES) {
    const error = validateStageRoute(stage, routes[stage], env);
    if (error) return { ok: false, error };
  }
  return { ok: true, routes };
}

/** 한 단계의 route가 그 단계에서 쓸 수 있는지. 공통 기본값과 상품 오버라이드가 같은 규칙을 쓴다. */
export function validateStageRoute(stage: Stage, route: StageRoute, env: { hasOpenAiKey: boolean; hasAnthropicKey: boolean }): RoutesValidationError | null {
  const spec = modelSpec(route.model);
  if (!spec.efforts.includes(route.effort)) return "unsupported_effort";
  if (stage === "public_research" && !spec.webSearch) return "no_web_search";
  if (spec.provider === "openai" && !env.hasOpenAiKey) return "provider_key_missing";
  if (spec.provider === "anthropic" && !env.hasAnthropicKey) return "provider_key_missing";
  return null;
}

// ---- 상품별 오버라이드 (025) ---------------------------------------------------
// { "<productId>": { "<stage>": {model, effort} } } — 단계별 완전한 route만. DB의 reserve RPC가
// routes || overrides->product 로 얕게 병합하므로(단계 키 단위 교체), 반쪽 route는 허용하지 않는다.

export type ProductOverrides = Record<string, Partial<Routes>>;
export type OverridesValidationError = RoutesValidationError | "unknown_product";
export type OverridesValidation = { ok: true; overrides: ProductOverrides } | { ok: false; error: OverridesValidationError };

const productOverridesSchema = z.record(z.string().min(1), routesSchema.partial().strict());

export function validateProductOverrides(input: unknown, env: { hasOpenAiKey: boolean; hasAnthropicKey: boolean }, allowedProductIds: readonly string[]): OverridesValidation {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, error: "invalid_shape" };
  const parsed = productOverridesSchema.safeParse(input);
  if (!parsed.success) {
    // 모양은 맞는데 모델 문자열·노력만 모르는 경우를 구분해 준다 (validateRoutes와 같은 순서).
    for (const stages of Object.values(input as Record<string, unknown>)) {
      if (!stages || typeof stages !== "object") return { ok: false, error: "invalid_shape" };
      for (const route of Object.values(stages as Record<string, unknown>)) {
        const loose = z.object({ model: z.string(), effort: z.string() }).strict().safeParse(route);
        if (!loose.success) return { ok: false, error: "invalid_shape" };
        if (!(loose.data.model in MODEL_CATALOG)) return { ok: false, error: "unknown_model" };
      }
    }
    return { ok: false, error: "unsupported_effort" };
  }
  const overrides: ProductOverrides = {};
  for (const [productId, stages] of Object.entries(parsed.data)) {
    if (!allowedProductIds.includes(productId)) return { ok: false, error: "unknown_product" };
    const entries = STAGES.filter((stage) => stages[stage]);
    for (const stage of entries) {
      const error = validateStageRoute(stage, stages[stage]!, env);
      if (error) return { ok: false, error };
    }
    // 빈 상품 항목은 "조정 없음"과 같다 — 저장하지 않는다.
    if (entries.length) overrides[productId] = Object.fromEntries(entries.map((stage) => [stage, stages[stage]!]));
  }
  return { ok: true, overrides };
}

/** 이 상품의 유효 라우팅. reserve RPC의 `routes || coalesce(overrides->product, '{}')`와 같은 뜻이다. */
export function effectiveRoutes(defaults: Routes, overrides: ProductOverrides, productId: string | null): Routes {
  const over = productId ? overrides[productId] : undefined;
  return over ? { ...defaults, ...over } : defaults;
}

export type ProductRouteChange = { productId: string; stage: Stage; from: StageRoute | null; to: StageRoute | null };

export function diffRouting(
  from: { routes: Routes; overrides: ProductOverrides },
  to: { routes: Routes; overrides: ProductOverrides }
): { stages: ReturnType<typeof diffRoutes>; products: ProductRouteChange[] } {
  const products: ProductRouteChange[] = [];
  const ids = [...new Set([...Object.keys(from.overrides), ...Object.keys(to.overrides)])].sort();
  for (const productId of ids) {
    for (const stage of STAGES) {
      const a = from.overrides[productId]?.[stage] ?? null;
      const b = to.overrides[productId]?.[stage] ?? null;
      if (a?.model === b?.model && a?.effort === b?.effort) continue;
      products.push({ productId, stage, from: a, to: b });
    }
  }
  return { stages: diffRoutes(from.routes, to.routes), products };
}

export function countOverrides(overrides: ProductOverrides): number {
  return Object.values(overrides).reduce((sum, stages) => sum + STAGES.filter((stage) => stages[stage]).length, 0);
}

export function describeRouting(routes: Routes, overrides: ProductOverrides, locale: "ko" | "en"): string {
  const base = describeRoutes(routes, locale);
  const n = countOverrides(overrides);
  if (!n) return base;
  return locale === "en" ? `${base} · ${n} product override${n === 1 ? "" : "s"}` : `${base} · 상품 조정 ${n}건`;
}

export function diffRoutes(from: Routes, to: Routes): Array<{ stage: Stage; from: StageRoute; to: StageRoute }> {
  return STAGES.flatMap((stage) =>
    from[stage].model === to[stage].model && from[stage].effort === to[stage].effort
      ? []
      : [{ stage, from: from[stage], to: to[stage] }]
  );
}

export function describeRoutes(routes: Routes, locale: "ko" | "en"): string {
  const labels = STAGES.map((stage) => MODEL_CATALOG[routes[stage].model].label);
  if (new Set(labels).size === 1) return locale === "en" ? `All stages ${labels[0]}` : `세 단계 ${labels[0]}`;
  return STAGES.map((stage, index) => `${STAGE_LABEL[locale][stage]} ${labels[index]}`).join(" · ");
}
