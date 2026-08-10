import { describe, expect, it } from "vitest";
import { zodTextFormat } from "openai/helpers/zod";
import {
  assistantResponseSchema,
  buildDeterministicPlan,
  finalizeMarketResearch,
  sanitizeFounderText,
  shouldUseWebSearch,
  validatePlanDraft
} from "./gtm-assistant";
import type { SavedAction } from "./gtm-assistant";

const actions: SavedAction[] = Array.from({ length: 5 }, (_, index) => ({
  id: `action-${index + 1}`,
  question_id: `q${index + 1}`,
  title: `실행 액션 ${index + 1}`,
  owner_label: "대표",
  completion_evidence: `완료 증거 ${index + 1}`,
  service_tag: index === 0 ? "legal" : "market",
  urgency: index < 2 ? "P0" : "P1"
}));

describe("AI GTM assistant safeguards", () => {
  it("uses an object root required by OpenAI structured outputs", () => {
    const format = zodTextFormat(assistantResponseSchema, "gtm_assistant_turn");

    expect(format.schema).toMatchObject({ type: "object" });
    expect(JSON.stringify(format.schema)).not.toContain('"format":"uri"');
  });

  it("turns saved diagnostic actions into a bounded 30·60·90 day plan", () => {
    const plan = buildDeterministicPlan(actions, new Date("2026-08-05T00:00:00Z"));

    expect(plan.items).toHaveLength(5);
    expect(plan.items.map((item) => item.horizon)).toEqual([30, 30, 60, 60, 90]);
    expect(plan.items[0]).toMatchObject({
      expertRequired: true,
      sourceActionItemId: "action-1",
      sources: [{ kind: "diagnosis", title: "55문항 준비도 진단" }]
    });
  });

  it("keeps deterministic and model plans inside the allowed horizons", () => {
    const plan = buildDeterministicPlan(actions, new Date("2026-08-05T00:00:00Z"), [60]);
    expect(plan.items.every((item) => item.horizon === 60)).toBe(true);
    expect(() => validatePlanDraft({ ...plan, items: [{ ...plan.items[0], horizon: 30 }] }, [60]))
      .toThrow("허용되지 않은 계획 기간");
  });

  it("does not allow a sellability verdict before all 55 questions are available", () => {
    expect(() => finalizeMarketResearch({
      scope: "market_preresearch",
      targetCountry: "일본",
      targetCustomer: "중견 제조사",
      offeringName: "제품 A",
      executiveSummary: "시장 사전조사",
      trends: [{ title: "추세", finding: "확인", sourceTitle: "공식 자료", url: null }],
      marketSizing: (["TAM", "SAM", "SOM", "LAM"] as const).map((label) => ({
        label, estimate: "추정 전", method: "가정 확인 필요", assumptions: [], sourceTitles: []
      })),
      competitors: [{ name: "대안 A", type: "alternative", relevance: "대안", differentiationGap: "확인 필요", sourceTitle: "공식 자료", url: null }],
      sellability: { available: true, verdict: "promising", summary: "판정", evidenceGaps: [] },
      nextExperiments: ["고객 인터뷰"],
      limitations: ["사전조사"]
    })).toThrow("준비완료 전에는");
  });

  it("rejects unsafe source URLs after model parsing", () => {
    const plan = buildDeterministicPlan(actions, new Date("2026-08-05T00:00:00Z"));
    plan.items[0].sources[0].url = "javascript:alert(1)";

    expect(() => validatePlanDraft(plan)).toThrow("근거 URL은 HTTP(S) 주소여야 합니다.");
  });

  it("removes common personal identifiers before model or search use", () => {
    expect(
      sanitizeFounderText("kyeon@tansley.kr 010-1234-5678 고객 A와 일본 진출")
    ).toBe("[이메일] [전화번호] 고객 A와 일본 진출");
  });

  it("only enables web search for target-country facts that can change", () => {
    expect(shouldUseWebSearch("일본", "최신 인증 규정과 세율을 확인해줘")).toBe(true);
    expect(shouldUseWebSearch("일본", "우리 팀의 목표를 정리해줘")).toBe(false);
    expect(shouldUseWebSearch("", "최신 인증 규정")).toBe(false);
  });
});
