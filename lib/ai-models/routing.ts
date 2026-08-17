import { z } from "zod";
import { MODEL_CATALOG, MODEL_KEYS, modelSpec, type Effort, type ModelKey } from "@/lib/ai-models/catalog";

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
    const spec = modelSpec(routes[stage].model);
    if (!spec.efforts.includes(routes[stage].effort)) return { ok: false, error: "unsupported_effort" };
    if (stage === "public_research" && !spec.webSearch) return { ok: false, error: "no_web_search" };
    if (spec.provider === "openai" && !env.hasOpenAiKey) return { ok: false, error: "provider_key_missing" };
    if (spec.provider === "anthropic" && !env.hasAnthropicKey) return { ok: false, error: "provider_key_missing" };
  }
  return { ok: true, routes };
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

export function keysForProvider(provider: "openai" | "anthropic"): ModelKey[] {
  return MODEL_KEYS.filter((key) => MODEL_CATALOG[key].provider === provider);
}
