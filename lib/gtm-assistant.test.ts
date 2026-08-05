import { describe, expect, it } from "vitest";
import { zodTextFormat } from "openai/helpers/zod";
import {
  assistantResponseSchema,
  buildDeterministicPlan,
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
