import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("dashboard execution summary", () => {
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
});
