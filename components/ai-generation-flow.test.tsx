import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.stubGlobal("React", React);

import { AiGenerationFlow, GENERATION_STAGES } from "@/components/ai-generation-flow";

const render = (
  stage: (typeof GENERATION_STAGES)[number] | null,
  extra: Partial<React.ComponentProps<typeof AiGenerationFlow>> = {}
) => renderToStaticMarkup(<AiGenerationFlow locale="ko" stage={stage} startedAt={null} {...extra} />);

const stateOf = (markup: string) =>
  [...markup.matchAll(/ai-flow__step ai-flow__step--(done|active|pending)/g)].map((match) => match[1]);

describe("생성 진행 플로우차트", () => {
  it("서버가 기록한 단계까지만 완료로 표시한다", () => {
    // 진행 표시는 서버가 준 값에서만 나온다. 시간이 지난다고 앞서 나가지 않는다.
    expect(stateOf(render("context"))).toEqual(["active", "pending", "pending", "pending", "pending"]);
    expect(stateOf(render("verify"))).toEqual(["done", "done", "active", "pending", "pending"]);
    expect(stateOf(render("finalize"))).toEqual(["done", "done", "done", "done", "active"]);
  });

  it("단계를 아직 모르면 아무 단계도 진행 중으로 표시하지 않는다", () => {
    const markup = render(null);
    expect(stateOf(markup)).toEqual(["pending", "pending", "pending", "pending", "pending"]);
    expect(markup).toContain("진행 단계를 확인하는 중입니다.");
  });

  it("진행 중인 단계에 aria-current를 준다", () => {
    expect(render("report")).toContain('aria-current="step"');
    expect(render(null)).not.toContain('aria-current="step"');
  });

  it("단계 목록이 마이그레이션의 제약과 같다", () => {
    // 021의 check 제약과 어긋나면 라우트가 기록하는 값을 화면이 못 그린다.
    expect([...GENERATION_STAGES]).toEqual(["context", "research", "verify", "report", "finalize"]);
  });

  it("연결선 상태는 done·active·pending 클래스 그대로다 (연결선 CSS가 이 클래스를 그대로 쓴다)", () => {
    // 연결선 애니메이션은 app/globals.css의 :has() 선택자가 이 li 클래스만으로 판단한다.
    // 즉 이 클래스 시퀀스 자체가 연결선 상태의 유일한 근거다 — 새 클래스를 추가하지 않는다.
    expect(stateOf(render("research"))).toEqual(["done", "active", "pending", "pending", "pending"]);
  });

  it("라우트 스냅샷이 있으면 활성 단계에 모델 라벨을 보여준다", () => {
    const markup = render("report", {
      routeSnapshot: { final_report: { model: "anthropic:claude-opus-5", effort: "high" } },
      stageLog: [{ stage: "report", at: new Date().toISOString() }]
    });
    expect(markup).toContain("Claude Opus 5");
    expect(markup).toContain("작성 중");
  });

  it("라우트 스냅샷이 없으면 모델 라벨을 보여주지 않는다", () => {
    const markup = render("report");
    expect(markup).not.toContain("작성 중");
  });

  it("verify·finalize는 로컬 단계라 스냅샷이 있어도 모델을 보여주지 않는다", () => {
    const markup = render("verify", {
      routeSnapshot: {
        classification: { model: "openai:gpt-5.6-sol", effort: "medium" },
        public_research: { model: "openai:gpt-5.6-sol", effort: "medium" },
        final_report: { model: "anthropic:claude-opus-5", effort: "high" }
      }
    });
    expect(markup).not.toContain("작성 중");
  });

  it("조사 요약이 있을 때만 출처·발견 수를 보여준다", () => {
    // "출처"라는 글자 자체는 단계 설명문(공개 자료 조사·출처 검증)에도 나오므로,
    // 요약 문구 "N건 · 발견 M건" 형태로 정확히 대조한다.
    const withSummary = render("report", { researchSummary: { sources: 6, findings: 4 } });
    expect(withSummary).toContain("출처 6건 · 조사 결과 4건");
    const withoutSummary = render("report");
    expect(withoutSummary).not.toContain("건 · 발견");
  });

  it("research 단계 자신은 조사가 끝나기 전이라 요약을 보여주지 않는다", () => {
    const markup = render("research", { researchSummary: { sources: 6, findings: 4 } });
    expect(markup).not.toContain("건 · 발견");
  });

  it("활성 단계별 소요 예상 문구를 보여준다", () => {
    expect(render("research")).toContain("보통 1분 안팎");
    expect(render("report")).toContain("가장 긴 단계");
    expect(render("finalize")).toContain("몇 초");
    // 실측이 없는 단계는 지어내지 않는다.
    expect(render("context")).not.toContain("보통");
    expect(render("verify")).not.toContain("보통");
  });

  it("화면을 닫아도 이어진다는 문구는 모든 활성 단계에서 유지된다", () => {
    expect(render("context")).toContain("이 화면을 닫아도 작업은 계속되며");
    expect(render("report")).toContain("이 화면을 닫아도 작업은 계속되며");
  });
});
