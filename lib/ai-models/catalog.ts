/**
 * AI 전문가 서비스가 쓸 수 있는 모델의 전부. 관리자는 이 목록 안에서만 고른다.
 * 단가는 2026-08-17 공식 문서 기준(Fable 5는 2026-08-18)이며 코드 검토를 거쳐서만 바꾼다.
 */
export type Provider = "openai" | "anthropic";
export type Effort = "low" | "medium" | "high";
export type ModelKey = "anthropic:claude-fable-5" | "anthropic:claude-opus-5" | "anthropic:claude-sonnet-5" | "openai:gpt-5.6-sol" | "openai:gpt-5.6-luna";

export type ModelSpec = {
  key: ModelKey;
  provider: Provider;
  model: string;
  label: string;
  structuredOutput: true;
  webSearch: boolean;
  fileInput: boolean;
  efforts: readonly Effort[];
  priceUsdPerMTok: { input: number; cacheRead: number; cacheWrite?: number; output: number };
  webSearchUsdPerCall: 0.01;
  deprecatedAt?: string;
};

export type ModelUsage = {
  input: number;
  cachedInput: number;
  cacheWriteInput: number;
  output: number;
  webSearchCalls: number;
};

export const MODEL_CATALOG: Record<ModelKey, ModelSpec> = {
  // Anthropic 최상위 모델(2026-08-18 추가). Opus 5의 두 배 단가($10/$50). 사고(thinking)는 항상 켜져
  // 있어 thinking 파라미터를 보내지 않는다 — 어댑터가 원래 안 보낸다. 안전 분류기가 HTTP 200에
  // stop_reason=refusal로 거절할 수 있어 어댑터가 그 경우를 명시적 오류로 바꾼다.
  // 조직이 30일 데이터 보존이 아니면(ZDR) 모든 요청이 400이다.
  "anthropic:claude-fable-5": {
    key: "anthropic:claude-fable-5", provider: "anthropic", model: "claude-fable-5", label: "Claude Fable 5",
    structuredOutput: true, webSearch: true, fileInput: true, efforts: ["low", "medium", "high"],
    priceUsdPerMTok: { input: 10, cacheRead: 1, cacheWrite: 12.5, output: 50 }, webSearchUsdPerCall: 0.01
  },
  "anthropic:claude-opus-5": {
    key: "anthropic:claude-opus-5", provider: "anthropic", model: "claude-opus-5", label: "Claude Opus 5",
    structuredOutput: true, webSearch: true, fileInput: true, efforts: ["low", "medium", "high"],
    priceUsdPerMTok: { input: 5, cacheRead: 0.5, cacheWrite: 6.25, output: 25 }, webSearchUsdPerCall: 0.01
  },
  "anthropic:claude-sonnet-5": {
    key: "anthropic:claude-sonnet-5", provider: "anthropic", model: "claude-sonnet-5", label: "Claude Sonnet 5",
    structuredOutput: true, webSearch: true, fileInput: true, efforts: ["low", "medium", "high"],
    priceUsdPerMTok: { input: 2, cacheRead: 0.2, cacheWrite: 2.5, output: 10 }, webSearchUsdPerCall: 0.01
  },
  "openai:gpt-5.6-sol": {
    key: "openai:gpt-5.6-sol", provider: "openai", model: "gpt-5.6-sol", label: "GPT-5.6 Sol",
    structuredOutput: true, webSearch: true, fileInput: true, efforts: ["low", "medium", "high"],
    priceUsdPerMTok: { input: 5, cacheRead: 0.5, output: 30 }, webSearchUsdPerCall: 0.01
  },
  // ponytail: Luna도 none/xhigh/max effort를 지원하지만 efforts에는 넣지 않는다. none은
  // 웹검색을 없애 다른 파이프라인을 재게 되므로(더 빠른 게 아니라 다른 것을 측정), Effort
  // 유니온을 넓히지 않는 이유는 비용이 아니라 측정 타당성이다.
  "openai:gpt-5.6-luna": {
    key: "openai:gpt-5.6-luna", provider: "openai", model: "gpt-5.6-luna", label: "GPT-5.6 Luna",
    structuredOutput: true, webSearch: true, fileInput: true, efforts: ["low", "medium", "high"],
    priceUsdPerMTok: { input: 0.2, cacheRead: 0.02, output: 1.2 }, webSearchUsdPerCall: 0.01
  }
};

export const MODEL_KEYS = Object.keys(MODEL_CATALOG) as ModelKey[];

export function modelSpec(key: ModelKey): ModelSpec {
  return MODEL_CATALOG[key];
}

export function parseModelKey(value: unknown): ModelKey | null {
  return typeof value === "string" && value in MODEL_CATALOG ? (value as ModelKey) : null;
}

/** 모델 토큰 비용(USD). 웹검색 비용은 estimateAiVariableCosts가 따로 더한다. */
export function costOf(key: ModelKey, usage: ModelUsage): number {
  const price = MODEL_CATALOG[key].priceUsdPerMTok;
  const uncached = Math.max(0, usage.input - usage.cachedInput - usage.cacheWriteInput);
  const total =
    uncached * price.input +
    usage.cachedInput * price.cacheRead +
    usage.cacheWriteInput * (price.cacheWrite ?? price.input) +
    usage.output * price.output;
  return Number((total / 1_000_000).toFixed(6));
}

/** 표시용 라벨. 알 수 없는 값(예전 실행의 원시 모델명)은 그대로 보여 준다. */
export function modelLabel(value: string): string {
  const byKey = parseModelKey(value);
  if (byKey) return MODEL_CATALOG[byKey].label;
  const byModel = MODEL_KEYS.find((key) => MODEL_CATALOG[key].model === value);
  return byModel ? MODEL_CATALOG[byModel].label : value;
}

/**
 * 관리자 드롭다운에 이 모델을 보여줄지 정한다. deprecated 모델은 새로 고를 수 없게 숨기되,
 * 그 단계에 지금 저장된 값이면(스냅샷이 이미 그 모델을 가리키면) 계속 보여주고 "지원 종료" 라벨만 붙인다.
 */
export function isModelOptionVisible(spec: Pick<ModelSpec, "deprecatedAt">, isSavedValue: boolean): boolean {
  return !spec.deprecatedAt || isSavedValue;
}
