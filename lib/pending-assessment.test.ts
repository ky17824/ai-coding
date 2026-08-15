import { beforeEach, describe, expect, it } from "vitest";
import {
  INTAKE_QUESTIONS,
  getIntakeQuestions,
  isAnswerCompatibleAcrossVersions
} from "@/lib/intake-questions";
import { questionsOfStage, resolveAssessmentQuestions } from "@/lib/readiness";
import { PENDING_KEY, clearPending, loadPending, savePending } from "@/lib/pending-assessment";
import type { ReadinessAnswer } from "@/lib/types";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const answers = (): ReadinessAnswer[] =>
  INTAKE_QUESTIONS.map((question) => ({ questionId: question.id, level: 2 }));
const targetMarket = { targetCountry: "일본", targetCustomerSegment: "도쿄 중견기업", confirmed: true };
const v5Answers = () => {
  const all = getIntakeQuestions("ko", "5.0").map((question) => ({
    questionId: question.id,
    level: 4 as const,
    evidence: question.critical ? { kind: "note" as const, value: "근거" } : undefined
  }));
  const resolved = resolveAssessmentQuestions({
    surveyVersion: "5.0",
    salesMotion: "partner",
    targetMarket,
    answers: all
  });
  return all.filter((answer) => resolved.requiredIds.includes(answer.questionId));
};

describe("pending assessment", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: new MemoryStorage()
    });
  });

  it("round trips a versioned assessment and clears it", () => {
    const pending = {
      surveyVersion: "5.0" as const,
      completedStageId: "ready" as const,
      salesMotion: "partner" as const,
      targetMarket,
      answers: v5Answers()
    };
    savePending(pending);
    expect(loadPending("5.0")).toEqual({ ...pending, needsReview: false });
    clearPending();
    expect(loadPending()).toBeNull();
  });

  it("treats a legacy array as v4", () => {
    const early = new Set(questionsOfStage("early").map((question) => question.id));
    const earlyAnswers = answers().filter((answer) => early.has(answer.questionId));
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(earlyAnswers));
    expect(loadPending("4.0")).toEqual(expect.objectContaining({
      surveyVersion: "4.0",
      completedStageId: "early",
      answers: earlyAnswers,
      needsReview: false
    }));
  });

  it("restores only unchanged v4 answers into v5", () => {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(answers()));
    const restored = loadPending("5.0");
    const compatible = answers().filter((answer) =>
      isAnswerCompatibleAcrossVersions(answer.questionId, "4.0", "5.0")
    );
    expect(restored).toEqual(expect.objectContaining({
      surveyVersion: "5.0",
      answers: compatible,
      needsReview: true
    }));
    expect(restored?.answers).toHaveLength(29);
  });

  it("does not convert v5 back to v4", () => {
    savePending({
      surveyVersion: "5.0",
      completedStageId: "early",
      salesMotion: "direct",
      targetMarket,
      answers: getIntakeQuestions("ko", "5.0").slice(0, 13).map((question) => ({ questionId: question.id, level: 2 }))
    });
    expect(loadPending("4.0")).toBeNull();
  });

  it("rejects incomplete, unknown, duplicate, invalid, and malformed legacy data", () => {
    const invalidValues = [
      answers().slice(1),
      answers().map((answer, index) => index ? answer : { questionId: "unknown", level: 2 as const }),
      answers().map((answer, index, all) => index ? answer : all[1]),
      answers().map((answer, index) => index ? answer : { ...answer, level: 0 as 1 })
    ];
    for (const value of invalidValues) {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify(value));
      expect(loadPending()).toBeNull();
    }
    sessionStorage.setItem(PENDING_KEY, "{");
    expect(loadPending()).toBeNull();
  });
});
