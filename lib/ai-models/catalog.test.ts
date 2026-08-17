import { describe, expect, it } from "vitest";
import { MODEL_CATALOG, costOf, modelSpec, parseModelKey, type ModelKey } from "@/lib/ai-models/catalog";

const KEYS = Object.keys(MODEL_CATALOG) as ModelKey[];

describe("모델 허용 목록", () => {
  it("세 모델이 정확히 있고 키가 provider:model 형식이다", () => {
    expect(KEYS.sort()).toEqual(["anthropic:claude-opus-5", "anthropic:claude-sonnet-5", "openai:gpt-5.6-sol"]);
    for (const key of KEYS) {
      const spec = modelSpec(key);
      expect(`${spec.provider}:${spec.model}`).toBe(key);
    }
  });

  it("모든 모델에 단가·effort·기능이 있다", () => {
    for (const key of KEYS) {
      const spec = modelSpec(key);
      expect(spec.efforts.length).toBeGreaterThan(0);
      expect(spec.priceUsdPerMTok.input).toBeGreaterThan(0);
      expect(spec.priceUsdPerMTok.output).toBeGreaterThan(0);
      expect(spec.priceUsdPerMTok.cacheRead).toBeGreaterThan(0);
      expect(spec.webSearchUsdPerCall).toBe(0.01);
      expect(typeof spec.webSearch).toBe("boolean");
      expect(spec.structuredOutput).toBe(true);
    }
  });

  it("parseModelKey는 목록 밖 값을 null로 돌려준다", () => {
    expect(parseModelKey("anthropic:claude-opus-5")).toBe("anthropic:claude-opus-5");
    expect(parseModelKey("openai:gpt-5.6-luna")).toBeNull();
    expect(parseModelKey("")).toBeNull();
    expect(parseModelKey(42)).toBeNull();
  });

  it("costOf는 캐시 읽기·쓰기 축을 포함해 계산한다", () => {
    // Opus 5: in 5, cache-read 0.5, cache-write 6.25, out 25
    const usage = { input: 100_000, cachedInput: 20_000, cacheWriteInput: 10_000, output: 10_000, webSearchCalls: 0 };
    // (100000-20000-10000)*5 + 20000*0.5 + 10000*6.25 + 10000*25 = 350000+10000+62500+250000 = 672500 → 0.6725
    expect(costOf("anthropic:claude-opus-5", usage)).toBeCloseTo(0.6725, 6);
    // Sol: cache-write 없음. (100000-20000)*5 + 20000*0.5 + 10000*30 = 400000+10000+300000 = 710000 → 0.71
    expect(costOf("openai:gpt-5.6-sol", { ...usage, cacheWriteInput: 0 })).toBeCloseTo(0.71, 6);
  });

  it("기존 sol 계산과 결과가 같다 (회귀)", () => {
    // 010 이후 쓰던 calculateSolCostUsd: (in-cached)*5 + cached*0.5 + out*30
    const usage = { input: 31131, cachedInput: 0, cacheWriteInput: 0, output: 8397, webSearchCalls: 3 };
    expect(costOf("openai:gpt-5.6-sol", usage)).toBeCloseTo((31131 * 5 + 8397 * 30) / 1e6, 6);
  });
});
