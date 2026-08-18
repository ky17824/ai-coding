// Stage Gate 막대(시그니처)의 계약: 세 칸·기준선 위치·현재 단계·통과 표시·애니메이션 옵트인
import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.stubGlobal("React", React);
import { StageGateBar } from "@/components/stage-gate-bar";

const stages = [
  { id: "s1", label: "준비 1단계", value: 84 },
  { id: "s2", label: "준비 2단계", value: 46 },
  { id: "s3", label: "준비 3단계", value: 8 }
];

describe("StageGateBar", () => {
  it("세 칸을 그리고 기준선 위치(80%)를 CSS 변수로 넘긴다", () => {
    const html = renderToStaticMarkup(<StageGateBar stages={stages} current="s2" />);
    expect(html.match(/stage-gate__cell/g)?.length).toBe(3);
    expect(html).toContain("--gate:80%");
    expect(html).toContain('aria-label="준비 1단계 84%, 준비 2단계 46%, 준비 3단계 8%"');
  });

  it("현재 단계 칸과 통과한 칸을 표시하고, 애니메이션은 옵트인이다", () => {
    const html = renderToStaticMarkup(<StageGateBar stages={stages} current="s2" />);
    expect(html).toContain("stage-gate__cell is-passed");
    expect(html).toContain("stage-gate__cell is-current");
    expect(html).not.toContain("stage-gate--animate");
    expect(renderToStaticMarkup(<StageGateBar stages={stages} animate />)).toContain("stage-gate--animate");
  });

  it("sm 크기는 라벨 없이 막대만, 값은 0~100으로 잘린다", () => {
    const html = renderToStaticMarkup(<StageGateBar stages={[{ id: "a", label: "A", value: 140 }, { id: "b", label: "B", value: -5 }, { id: "c", label: "C", value: 50 }]} size="sm" />);
    expect(html).not.toContain("stage-gate__meta");
    expect(html).toContain("width:100%");
    expect(html).toContain("width:0%");
  });

  it("대시보드·랜딩·여정이 같은 컴포넌트를 쓰고 reduced-motion에서 애니메이션을 끈다", () => {
    for (const file of ["app/dashboard/page.tsx", "components/readiness-preview.tsx", "app/journey/page.tsx"]) {
      expect(readFileSync(file, "utf8")).toContain("StageGateBar");
    }
    const css = readFileSync("app/globals.css", "utf8");
    expect(css).toMatch(/prefers-reduced-motion[^}]*\{[^}]*\.stage-gate__fill \{ animation: none !important; \}/s);
  });
});
