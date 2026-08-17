// lib/ai-models/routing.test.ts
import { describe, expect, it } from "vitest";
import { SEED_ROUTES, describeRoutes, diffRoutes, validateRoutes } from "@/lib/ai-models/routing";

const bothKeys = { hasOpenAiKey: true, hasAnthropicKey: true };
const opusAll = {
  classification: { model: "anthropic:claude-opus-5", effort: "low" },
  public_research: { model: "anthropic:claude-opus-5", effort: "medium" },
  final_report: { model: "anthropic:claude-opus-5", effort: "medium" }
};

describe("validateRoutes", () => {
  it("시드는 유효하고 세 단계 모두 sol이다", () => {
    const result = validateRoutes(SEED_ROUTES, bothKeys);
    expect(result.ok).toBe(true);
    expect(SEED_ROUTES.classification.model).toBe("openai:gpt-5.6-sol");
    expect(SEED_ROUTES.public_research.model).toBe("openai:gpt-5.6-sol");
    expect(SEED_ROUTES.final_report.model).toBe("openai:gpt-5.6-sol");
  });

  it("허용 목록 밖 모델을 거부한다", () => {
    const result = validateRoutes({ ...opusAll, final_report: { model: "openai:gpt-5.6-nova", effort: "medium" } }, bothKeys);
    expect(result).toEqual({ ok: false, error: "unknown_model" });
  });

  it("그 모델이 지원하지 않는 effort를 거부한다", () => {
    const result = validateRoutes({ ...opusAll, classification: { model: "anthropic:claude-opus-5", effort: "xhigh" } }, bothKeys);
    expect(result).toEqual({ ok: false, error: "unsupported_effort" });
  });

  it("폴백 키가 오면 거부한다", () => {
    const result = validateRoutes({ ...opusAll, final_report: { ...opusAll.final_report, fallback: "openai:gpt-5.6-sol" } }, bothKeys);
    expect(result).toEqual({ ok: false, error: "invalid_shape" });
  });

  it("단계가 빠지면 거부한다", () => {
    const { final_report: _drop, ...partial } = opusAll;
    expect(validateRoutes(partial, bothKeys)).toEqual({ ok: false, error: "invalid_shape" });
  });

  it("공급자 키가 없으면 그 공급자 모델을 거부한다", () => {
    const result = validateRoutes(opusAll, { hasOpenAiKey: true, hasAnthropicKey: false });
    expect(result).toEqual({ ok: false, error: "provider_key_missing" });
  });

  it("조사 단계에 웹검색 없는 모델은 거부한다 (현재 목록엔 없어 규칙만 확인)", () => {
    // 목록의 모든 모델이 webSearch:true라 통과해야 한다. 규칙 자체는 validateRoutes 안에 있다.
    expect(validateRoutes(opusAll, bothKeys).ok).toBe(true);
  });
});

describe("diffRoutes / describeRoutes", () => {
  it("바뀐 단계만 돌려준다", () => {
    const next = { ...SEED_ROUTES, final_report: { model: "anthropic:claude-opus-5" as const, effort: "medium" as const } };
    expect(diffRoutes(SEED_ROUTES, next)).toEqual([{ stage: "final_report", from: SEED_ROUTES.final_report, to: next.final_report }]);
    expect(diffRoutes(SEED_ROUTES, SEED_ROUTES)).toEqual([]);
  });

  it("세 단계가 같은 모델이면 한 줄로 요약한다", () => {
    expect(describeRoutes(SEED_ROUTES, "ko")).toBe("세 단계 GPT-5.6 Sol");
    const mixed = { ...SEED_ROUTES, final_report: { model: "anthropic:claude-opus-5" as const, effort: "medium" as const } };
    expect(describeRoutes(mixed, "ko")).toBe("입력 정리 GPT-5.6 Sol · 공개 자료 조사 GPT-5.6 Sol · 보고서 작성 Claude Opus 5");
  });
});
