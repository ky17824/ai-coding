import { describe, expect, it } from "vitest";
import { buildDeterministicPlan, type SavedAction } from "./gtm-assistant";
import { buildGtmPlanFilename, buildGtmPlanMarkdown } from "./gtm-plan-download";

const actions: SavedAction[] = [
  {
    id: "action-1",
    question_id: "q1",
    title: "일본 개인정보 규제 확인",
    owner_label: "대표",
    completion_evidence: "현지 전문가 검토 메모",
    service_tag: "legal",
    urgency: "P0"
  }
];

describe("GTM plan download", () => {
  it("exports the complete current plan as readable Markdown", () => {
    const draft = buildDeterministicPlan(
      actions,
      new Date("2026-08-08T00:00:00Z")
    );
    draft.items[0].dependencies = ["현지 고객 인터뷰 완료"];

    const markdown = buildGtmPlanMarkdown(
      {
        assessment: {
          score: 78,
          status: "준비중",
          gateMessages: ["필수 선결 조건이 남았습니다"]
        },
        founderContext: {
          targetCountry: "일본",
          targetCustomer: "도쿄 제조사",
          resources: "대표 1명",
          deadline: "2026-12-31",
          constraints: "현지 법인 설립 전 검증"
        },
        planStatus: "draft",
        summary: draft.summary,
        assumptions: draft.assumptions,
        generatedBy: draft.generatedBy,
        items: draft.items
      },
      new Date("2026-08-08T12:00:00Z")
    );

    expect(markdown).toContain("# Borderless AI GTM 실행 계획");
    expect(markdown).toContain("계획 상태: 초안");
    expect(markdown).toContain("준비도: 78점 · 준비중");
    expect(markdown).toContain("목표 국가: 일본");
    expect(markdown).toContain("## 30일 계획");
    expect(markdown).toContain("### 1. [P0] 일본 개인정보 규제 확인");
    expect(markdown).toContain("의존 관계: 현지 고객 인터뷰 완료");
    expect(markdown).toContain("전문가 확인: 필요");
    expect(markdown).toContain("현지 전문가 검토 메모");
    expect(markdown).toContain("55문항 준비도 진단");
  });

  it("creates a filesystem-safe filename from the target country", () => {
    expect(
      buildGtmPlanFilename("일본/도쿄", new Date("2026-08-08T00:00:00Z"))
    ).toBe("borderless-gtm-plan-일본-도쿄-2026-08-08.md");
  });
});
