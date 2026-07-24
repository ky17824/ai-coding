import { describe, expect, it } from "vitest";
import { READINESS_QUESTIONS } from "@/lib/readiness-data";
import {
  calculateReadiness,
  validateAssessmentAnswers
} from "@/lib/readiness";
import type { ReadinessAnswer } from "@/lib/types";

describe("readiness scoring", () => {
  it("returns the same score and action order for identical answers", () => {
    const answers: ReadinessAnswer[] = READINESS_QUESTIONS.map((question) => ({
      questionId: question.id,
      level: question.id === "pmf" ? 1 : 2
    }));

    expect(calculateReadiness(answers)).toEqual(calculateReadiness(answers));
    expect(calculateReadiness(answers).overallScore).toBe(64);
    expect(calculateReadiness(answers).isOnHold).toBe(true);
  });

  it("normalizes six domains instead of overweighting domains with more questions", () => {
    const answers: ReadinessAnswer[] = READINESS_QUESTIONS.map((question) => ({
      questionId: question.id,
      level: question.domainId === "market_finance" ? 3 : 0,
      evidence:
        question.domainId === "market_finance"
          ? { kind: "note", value: "검증 자료" }
          : undefined
    }));

    expect(calculateReadiness(answers).overallScore).toBe(17);
  });

  it("requires evidence for completed answers", () => {
    const result = validateAssessmentAnswers([
      { questionId: "pmf", level: 3 }
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors.pmf).toContain("증빙");
  });

  it("marks a fully evidenced assessment as execution-ready", () => {
    const answers: ReadinessAnswer[] = READINESS_QUESTIONS.map((question) => ({
      questionId: question.id,
      level: 3,
      evidence: { kind: "note", value: "검증 완료" }
    }));
    const result = calculateReadiness(answers);

    expect(result.overallScore).toBe(100);
    expect(result.status).toBe("실행 가능");
    expect(result.isOnHold).toBe(false);
    expect(result.actions).toHaveLength(0);
  });
});
