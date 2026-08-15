import { describe, expect, it } from "vitest";
import { getIntakeQuestions } from "@/lib/intake-questions";
import {
  calculateReadiness,
  resolveAssessmentQuestions,
  validateAssessmentAnswers
} from "@/lib/readiness";
import type { ReadinessAnswer, ReadinessLevel } from "@/lib/types";

const market = {
  targetCountry: "일본",
  targetCustomerSegment: "도쿄 소재 중견 제조사",
  confirmed: true
};

const answerV5 = (level: ReadinessLevel = 4): ReadinessAnswer[] =>
  getIntakeQuestions("ko", "5.0").map((question) => ({
    questionId: question.id,
    level,
    evidence: question.critical && level >= 3
      ? { kind: "note", value: "확인 근거" }
      : undefined
  }));

const resolve = (input: {
  salesMotion: "direct" | "partner" | "hybrid" | "unknown";
  targetCountry?: string;
  paid?: ReadinessLevel;
  tested?: ReadinessLevel;
}) => {
  const answers = answerV5().map((answer) =>
    answer.questionId === "pmf-paid-conversion"
      ? { ...answer, level: input.paid ?? answer.level }
      : answer.questionId === "test-environment"
        ? { ...answer, level: input.tested ?? answer.level }
        : answer
  );
  return resolveAssessmentQuestions({
    surveyVersion: "5.0",
    salesMotion: input.salesMotion,
    targetMarket: { ...market, targetCountry: input.targetCountry ?? market.targetCountry },
    answers
  });
};

describe("readiness v5 applicability", () => {
  it("classifies partner-only questions by sales motion", () => {
    const partnerOnly = [
      "partner-actual-work",
      "partner-economics",
      "partner-shortfall",
      "contract-control",
      "contract-exit",
      "contract-switch-cost",
      "contract-dependency-limit"
    ];

    expect(resolve({ salesMotion: "direct" }).notApplicableIds)
      .toEqual(partnerOnly);
    expect(resolve({ salesMotion: "unknown" }).deferredIds)
      .toEqual(expect.arrayContaining(partnerOnly));
    expect(resolve({ salesMotion: "partner" }).requiredIds)
      .toEqual(expect.arrayContaining(partnerOnly));
    expect(resolve({ salesMotion: "hybrid" }).requiredIds)
      .toEqual(expect.arrayContaining(partnerOnly));
  });

  it("applies structural precedence and assigns each deferred question once", () => {
    const directWithoutCountry = resolve({ salesMotion: "direct", targetCountry: "" });
    expect(directWithoutCountry.notApplicableIds).toContain("partner-actual-work");
    expect(directWithoutCountry.deferredIds).not.toContain("partner-actual-work");
    expect(directWithoutCountry.deferredIds).toContain("bmlc-classification");

    const grouped = directWithoutCountry.deferredGroups.flatMap((group) => group.questionIds);
    expect(new Set(grouped).size).toBe(grouped.length);
    expect(grouped).toEqual(directWithoutCountry.deferredIds);
  });

  it("defers dependent work and excludes concentration before paid evidence", () => {
    const notTested = resolve({ salesMotion: "partner", tested: 2 });
    expect(notTested.deferredIds).toContain("test-defects");

    const unpaid = resolve({ salesMotion: "partner", paid: 2 });
    expect(unpaid.deferredIds).toContain("test-no-discount");
    expect(unpaid.notApplicableIds).toContain("alloc-concentration");
  });

  it("keeps required completion separate from deferred readiness scoring", () => {
    const context = {
      surveyVersion: "5.0" as const,
      salesMotion: "partner" as const,
      targetMarket: { ...market, targetCountry: "" },
      answers: answerV5()
    };
    const resolved = resolveAssessmentQuestions(context);
    const requiredAnswers = context.answers.filter((answer) => resolved.requiredIds.includes(answer.questionId));
    const result = calculateReadiness(requiredAnswers, context.targetMarket, "ko", "5.0", "partner");

    expect(result.progress).toEqual({
      answered: resolved.requiredIds.length,
      required: resolved.requiredIds.length,
      percent: 100
    });
    expect(result.deferredIds).toHaveLength(18);
    expect(result.overallScore).toBeLessThan(100);
    expect(result.actions).not.toHaveLength(18);
    expect(validateAssessmentAnswers(requiredAnswers, "ko", context).valid).toBe(true);
  });

  it("normalizes all-positive applicable v5 answers to 100", () => {
    const result = calculateReadiness(answerV5(), market, "ko", "5.0", "direct");
    expect(result.overallScore).toBe(100);
    expect(result.stages.map((stage) => stage.positiveScore)).toEqual([30, 40, 30]);
    expect(result.domainScores).toEqual({ early: 100, preparing: 100, ready: 100 });
    expect(result.notApplicableIds).toHaveLength(7);
  });

  it("requires evidence for positive critical answers without changing v4 behavior", () => {
    const withoutEvidence = answerV5().map((answer) =>
      answer.questionId === "res-tce" ? { ...answer, evidence: undefined } : answer
    );
    expect(calculateReadiness(withoutEvidence, market, "ko", "5.0", "partner")
      .stages[0].passed).toBe(false);

    const v4Answers = getIntakeQuestions("ko", "4.0").map((question) => ({
      questionId: question.id,
      level: 4 as const,
      evidence: question.critical ? { kind: "note" as const, value: "확인 근거" } : undefined
    }));
    expect(calculateReadiness(v4Answers, market, "ko"))
      .toEqual(calculateReadiness(v4Answers, market, "ko", "4.0", "unknown"));
  });
});
