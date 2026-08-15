import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../globals.css", import.meta.url), "utf8");

describe("dashboard execution summary", () => {
  it("uses the readiness-to-plan dashboard heading", () => {
    expect(source).toContain("준비도를 확인하시고 AI와 함께 실행계획을 작성하세요");
    expect(source).not.toContain("이어서 진출 준비를 진행하세요");
  });

  it("removes duplicate execution summaries from the dashboard", () => {
    expect(source).not.toContain('en ? "AI GTM PLAN" : "AI GTM 계획(AI GTM Plan)"');
    expect(source).not.toContain('className="plan-summary"');
    expect(source).not.toContain("localizedPlan");
    expect(source).not.toContain("planStatus");
    expect(source).not.toContain("displayPlanItems");
    expect(source).not.toContain("displayActions");
    expect(source).not.toContain('en ? "PRIORITY ACTIONS" : "우선 실행항목(Priority Actions)"');
    expect(source).not.toContain('en ? "Actions from this assessment" : "이번 진단의 실행 액션"');
  });

  it("links the dashboard header and no-plan CTA to the current assistant", () => {
    expect(source).toContain('assistantHref={`/assistant/${assessment.id}`}');
    expect(source).toContain('en ? "Create plan with AI" : "AI로 계획 만들기"');
    expect(source).toContain('`/assistant/${assessment.id}`');
  });

  it("keeps AI expert recommendations out of the dashboard", () => {
    expect(source).not.toContain("ServiceCard");
    expect(source).not.toContain("getPublishedServices");
    expect(source).not.toContain("추천 AI 전문가");
  });

  it("uses stored aggregate results and versioned question details", () => {
    expect(source).toContain("survey_version,sales_motion");
    expect(source).not.toContain("calculateReadiness(");
    expect(source).toContain("assessment.overall_score");
    expect(source).toContain("assessment.domain_scores");
    expect(source).toContain("assessment.gate_messages");
    expect(source).toContain("assessment.survey_version");
  });

  it("keeps breathing room above the previous-answer button", () => {
    expect(css).toMatch(/\.next-session > small:last-of-type\s*\{[^}]*margin-bottom:\s*24px;/s);
  });
});
