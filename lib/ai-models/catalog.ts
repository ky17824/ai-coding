/**
 * AI 전문가 서비스가 쓸 수 있는 모델의 전부. 관리자는 이 목록 안에서만 고른다.
 * 단가는 2026-08-17 공식 문서 기준이며 코드 검토를 거쳐서만 바꾼다.
 */
export type Provider = "openai" | "anthropic";
export type Effort = "low" | "medium" | "high";
export type ModelKey = "anthropic:claude-opus-5" | "anthropic:claude-sonnet-5" | "openai:gpt-5.6-sol";

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
  replacement?: ModelKey;
};

export type ModelUsage = {
  input: number;
  cachedInput: number;
  cacheWriteInput: number;
  output: number;
  webSearchCalls: number;
};

export const MODEL_CATALOG: Record<ModelKey, ModelSpec> = {
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
