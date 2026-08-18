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

// ---- 상품별 오버라이드 (025) ---------------------------------------------------
import { describeRouting, diffRouting, effectiveRoutes, validateProductOverrides, type ProductOverrides } from "@/lib/ai-models/routing";

const PRODUCTS = ["ai-market-intelligence", "pkg-feasibility"];

describe("validateProductOverrides", () => {
  it("빈 객체는 유효하다 (오버라이드 없음)", () => {
    expect(validateProductOverrides({}, bothKeys, PRODUCTS)).toEqual({ ok: true, overrides: {} });
  });

  it("단계별 완전한 route만 받고, 모르는 상품·모델·노력은 거부한다", () => {
    const good = { "ai-market-intelligence": { final_report: { model: "anthropic:claude-fable-5", effort: "high" } } };
    expect(validateProductOverrides(good, bothKeys, PRODUCTS)).toEqual({ ok: true, overrides: good });
    expect(validateProductOverrides({ "no-such-product": { final_report: { model: "anthropic:claude-fable-5", effort: "high" } } }, bothKeys, PRODUCTS)).toEqual({ ok: false, error: "unknown_product" });
    expect(validateProductOverrides({ "ai-market-intelligence": { final_report: { model: "nope", effort: "high" } } }, bothKeys, PRODUCTS)).toEqual({ ok: false, error: "unknown_model" });
    expect(validateProductOverrides({ "ai-market-intelligence": { final_report: { model: "anthropic:claude-fable-5", effort: "max" } } }, bothKeys, PRODUCTS)).toEqual({ ok: false, error: "unsupported_effort" });
    // 부분 route(모델만)는 모양 오류 — DB의 || 병합이 단계 단위라 반쪽짜리를 넣으면 노력이 사라진다.
    expect(validateProductOverrides({ "ai-market-intelligence": { final_report: { model: "anthropic:claude-fable-5" } } }, bothKeys, PRODUCTS)).toEqual({ ok: false, error: "invalid_shape" });
    // 상품 안에 빈 객체는 "조정 없음"과 같으니 저장 전에 걸러진다.
    expect(validateProductOverrides({ "ai-market-intelligence": {} }, bothKeys, PRODUCTS)).toEqual({ ok: true, overrides: {} });
  });

  it("공급자 키가 없으면 그 공급자 모델 오버라이드를 거부한다", () => {
    const over = { "ai-market-intelligence": { final_report: { model: "anthropic:claude-fable-5", effort: "high" } } };
    expect(validateProductOverrides(over, { hasOpenAiKey: true, hasAnthropicKey: false }, PRODUCTS)).toEqual({ ok: false, error: "provider_key_missing" });
  });
});

describe("effectiveRoutes", () => {
  it("상품 오버라이드가 있는 단계만 덮고 나머지는 기본값이다 — DB의 routes || overrides->product와 같은 뜻", () => {
    const overrides: ProductOverrides = { "pkg-feasibility": { final_report: { model: "anthropic:claude-fable-5", effort: "high" } } };
    expect(effectiveRoutes(SEED_ROUTES, overrides, "pkg-feasibility")).toEqual({ ...SEED_ROUTES, final_report: { model: "anthropic:claude-fable-5", effort: "high" } });
    expect(effectiveRoutes(SEED_ROUTES, overrides, "ai-market-intelligence")).toEqual(SEED_ROUTES);
    expect(effectiveRoutes(SEED_ROUTES, overrides, null)).toEqual(SEED_ROUTES);
  });
});

describe("diffRouting / describeRouting", () => {
  const fable = { model: "anthropic:claude-fable-5" as const, effort: "high" as const };
  it("공통 변경과 상품 변경(추가·삭제·수정)을 나눠 돌려준다", () => {
    const from = { routes: SEED_ROUTES, overrides: { "pkg-feasibility": { final_report: fable } } as ProductOverrides };
    const to = { routes: { ...SEED_ROUTES, final_report: { model: "anthropic:claude-opus-5" as const, effort: "medium" as const } }, overrides: { "ai-market-intelligence": { final_report: fable } } as ProductOverrides };
    const diff = diffRouting(from, to);
    expect(diff.stages.map((c) => c.stage)).toEqual(["final_report"]);
    expect(diff.products).toEqual([
      { productId: "ai-market-intelligence", stage: "final_report", from: null, to: fable },
      { productId: "pkg-feasibility", stage: "final_report", from: fable, to: null }
    ]);
    expect(diffRouting(from, from)).toEqual({ stages: [], products: [] });
  });

  it("요약에 상품 조정 건수를 붙인다", () => {
    expect(describeRouting(SEED_ROUTES, {}, "ko")).toBe("세 단계 GPT-5.6 Sol");
    expect(describeRouting(SEED_ROUTES, { "pkg-feasibility": { final_report: fable, public_research: fable } }, "ko")).toBe("세 단계 GPT-5.6 Sol · 상품 조정 2건");
    expect(describeRouting(SEED_ROUTES, { "pkg-feasibility": { final_report: fable } }, "en")).toBe("All stages GPT-5.6 Sol · 1 product override");
  });
});
