import { describe, expect, it } from "vitest";
import { buildDeterministicPlan, type SavedAction } from "./gtm-assistant";
import { buildGtmPlanFilename, buildGtmPlanHtml } from "./gtm-plan-download";

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
  it("exports diagnosis explanations and the complete plan as a readable HTML report", () => {
    const draft = buildDeterministicPlan(
      actions,
      new Date("2026-08-08T00:00:00Z")
    );
    draft.items[0].dependencies = ["현지 고객 인터뷰 완료"];

    const html = buildGtmPlanHtml(
      {
        assessment: {
          score: 78,
          status: "준비중",
          domainScores: { early: 90, preparing: 68, ready: 30 },
          gateMessages: ["필수 선결 조건이 남았습니다"],
          priorityActions: [{
            title: "현지 규제 검토",
            priority: "P0",
            completionEvidence: "전문가 검토 메모"
          }]
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

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("진단 결과와 해석");
    expect(html).toContain("실행 증거의 범위");
    expect(html).toContain("준비중");
    expect(html).toContain("극초기 준비도 90퍼센트");
    expect(html).toContain("현지 규제 검토");
    expect(html).toContain("AI와 함께 만든 실행 계획");
    expect(html).toContain("일본 개인정보 규제 확인");
    expect(html).toContain("현지 고객 인터뷰 완료");
    expect(html).toContain("전문가 확인 필요");
    expect(html).toContain("현지 전문가 검토 메모");
    expect(html).toContain("55문항 준비도 진단");
    expect(html).toContain("인쇄 또는 PDF 저장");
  });

  it("escapes founder and AI content before placing it in the report", () => {
    const draft = buildDeterministicPlan(actions, new Date("2026-08-08T00:00:00Z"));
    draft.summary = '<script>alert("x")</script>';
    const html = buildGtmPlanHtml({
      assessment: {
        score: 20,
        status: "극초기",
        domainScores: {},
        gateMessages: [],
        priorityActions: []
      },
      founderContext: { targetCountry: "<일본>" },
      planStatus: "draft",
      summary: draft.summary,
      assumptions: [],
      generatedBy: draft.generatedBy,
      items: draft.items
    });

    expect(html).not.toContain('<script>alert("x")</script>');
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(html).toContain("&lt;일본&gt;");
  });

  it("creates a filesystem-safe filename from the target country", () => {
    expect(
      buildGtmPlanFilename("일본/도쿄", new Date("2026-08-08T00:00:00Z"))
    ).toBe("borderless-gtm-report-일본-도쿄-2026-08-08.html");
  });
});
