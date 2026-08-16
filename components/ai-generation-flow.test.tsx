import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.stubGlobal("React", React);

import { AiGenerationFlow, GENERATION_STAGES } from "@/components/ai-generation-flow";

const render = (stage: (typeof GENERATION_STAGES)[number] | null) =>
  renderToStaticMarkup(<AiGenerationFlow locale="ko" stage={stage} startedAt={null} />);

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
});
