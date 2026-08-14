import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StageSummaryPanel } from "@/components/stage-summary-panel";

const summary = {
  headline: "실행 책임과 비용 기준을 먼저 세워야 합니다",
  overview: "진출 필요성과 제품 가능성은 확인했지만 책임자와 총비용 기준이 충분히 합의되지 않았습니다. 지금은 시장 확대보다 실행 기반을 먼저 고정할 단계입니다.",
  whyItMatters: "책임자와 비용 상한 없이 시작하면 검증 과제가 국내 업무에 밀리고 예상 밖 비용이 발생해도 중단 결정을 내리기 어렵습니다. 이는 시간과 자원의 반복 손실로 이어질 수 있습니다.",
  priorityActions: [{
    title: "전담 책임자를 지정하세요",
    reason: "명확한 책임자가 있어야 검증 과제가 일상 업무에 밀리지 않고 의사결정이 이어집니다.",
    direction: "의사결정 권한이 있는 담당자와 주당 투입 시간을 경영진 회의에서 확정합니다."
  }],
  nextMilestone: "책임자·투입 시간·비용 상한을 문서로 합의하면 다음 단계의 시장 검증을 시작할 수 있습니다."
};

describe("stage summary panel", () => {
  it("shows one founder-facing narrative instead of repeated prerequisites", () => {
    const html = renderToStaticMarkup(
      <StageSummaryPanel
        assessmentId="assessment-1"
        locale="ko"
        initialSummary={summary}
        initialStatus="complete"
        score={67}
      />
    );

    expect(html).toContain("1단계 진단 총평");
    expect(html).toContain(summary.headline);
    expect(html).toContain(summary.overview);
    expect(html).toContain("왜 지금 해결해야 하나요?");
    expect(html).toContain(summary.priorityActions[0].title);
    expect(html).toContain(summary.priorityActions[0].reason);
    expect(html).toContain(summary.priorityActions[0].direction);
    expect(html).toContain(summary.nextMilestone);
    expect(html).toContain("67%");
    expect(html).not.toContain("먼저 해결해야 할 선결 조건");
  });

  it("offers an explicit retry without generating on render", () => {
    const html = renderToStaticMarkup(
      <StageSummaryPanel
        assessmentId="assessment-1"
        locale="ko"
        initialSummary={null}
        initialStatus="failed"
        score={67}
      />
    );

    expect(html).toContain("진단 총평을 생성하지 못했습니다");
    expect(html).toContain("총평 다시 생성");
    expect(html).toContain("aria-live=\"polite\"");
  });
});
