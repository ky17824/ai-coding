import { describe, expect, it } from "vitest";
import {
  INTAKE_ITEMS,
  INTAKE_QUESTIONS,
  INTAKE_STAGES
} from "@/lib/intake-questions";
import {
  GATE_THRESHOLD,
  calculateReadiness,
  questionsOfStage,
  validateAssessmentAnswers
} from "@/lib/readiness";
import type { ReadinessAnswer, ReadinessLevel } from "@/lib/types";

const sum = (values: number[]) => values.reduce((total, n) => total + n, 0);
const answerAll = (level: ReadinessLevel): ReadinessAnswer[] =>
  INTAKE_QUESTIONS.map((question) => ({ questionId: question.id, level }));

describe("intake question set", () => {
  it("keeps 55 questions with unique ids, four options, and an action", () => {
    const itemIds = new Set<string>(INTAKE_ITEMS.map((item) => item.id));
    expect(INTAKE_QUESTIONS).toHaveLength(55);
    expect(new Set(INTAKE_QUESTIONS.map((q) => q.id)).size).toBe(55);
    for (const question of INTAKE_QUESTIONS) {
      expect(itemIds.has(question.itemId)).toBe(true);
      expect(question.options).toHaveLength(4);
      expect(question.action.trim().length).toBeGreaterThan(0);
      expect(question.followUp.trim().length).toBeGreaterThan(0);
    }
  });

  it("rolls question weights up to item, stage, and 100 points", () => {
    for (const item of INTAKE_ITEMS) {
      expect(
        sum(INTAKE_QUESTIONS.filter((q) => q.itemId === item.id).map((q) => q.weight))
      ).toBeCloseTo(item.weight, 10);
    }
    for (const stage of INTAKE_STAGES) {
      expect(
        sum(
          INTAKE_ITEMS.filter((i) => i.stageId === stage.id).map((i) => i.weight)
        )
      ).toBeCloseTo(stage.weight, 10);
      expect(sum(questionsOfStage(stage.id).map((q) => q.weight))).toBeCloseTo(
        stage.weight,
        10
      );
    }
    expect(sum(INTAKE_STAGES.map((s) => s.weight))).toBe(100);
  });

  it("rejects levels outside 1~4 and unknown ids", () => {
    expect(
      validateAssessmentAnswers([{ questionId: "res-tce", level: 0 as ReadinessLevel }])
        .valid
    ).toBe(false);
    expect(
      validateAssessmentAnswers([{ questionId: "nope", level: 3 }]).valid
    ).toBe(false);
    expect(validateAssessmentAnswers(answerAll(2)).valid).toBe(true);
  });
});

describe("phase gate", () => {
  it("holds the first stage and scores 0 when nothing is positive", () => {
    const result = calculateReadiness(answerAll(1));
    expect(result.overallScore).toBe(0);
    expect(result.achievedStageId).toBeNull();
    expect(result.currentStageId).toBe("early");
    expect(result.status).toBe("극초기");
    expect(result.isOnHold).toBe(true);
    expect(result.actions).toHaveLength(5);
    expect(result.actions[0].urgency).toBe("P0");
  });

  it("passes every stage once all answers are positive", () => {
    const result = calculateReadiness(answerAll(3));
    expect(result.overallScore).toBe(100);
    expect(result.stages.every((stage) => stage.passed)).toBe(true);
    expect(result.achievedStageId).toBe("ready");
    expect(result.currentStageId).toBeNull();
    expect(result.status).toBe("진출 실행 가능");
    expect(result.actions).toHaveLength(0);
    expect(result.isOnHold).toBe(false);
  });

  it("fails a stage that lands just under the weighted 80% bar", () => {
    const dropped = new Set([
      "mvc-stop-criteria",
      "mvc-resource-priority",
      "res-cash-runway",
      "mkt-icp-source"
    ]);
    const result = calculateReadiness(
      INTAKE_QUESTIONS.map((question) => ({
        questionId: question.id,
        level: (dropped.has(question.id) ? 2 : 4) as ReadinessLevel
      }))
    );
    const early = result.stages[0];
    expect(early.positiveScore).toBeCloseTo(23.5, 10);
    expect(early.ratio).toBeLessThan(GATE_THRESHOLD);
    expect(early.blockers).toEqual([]);
    expect(early.passed).toBe(false);
    expect(early.scoreToPass).toBeCloseTo(0.5, 10);
    expect(result.actions).toHaveLength(4);
  });

  it("blocks a stage on an unmet critical question even above 80%", () => {
    const result = calculateReadiness(
      INTAKE_QUESTIONS.map((question) => ({
        questionId: question.id,
        level: (question.id === "res-owner-time" ? 1 : 4) as ReadinessLevel
      }))
    );
    expect(result.stages[0].ratio).toBeGreaterThan(GATE_THRESHOLD);
    expect(result.stages[0].blockers).toHaveLength(1);
    expect(result.stages[0].passed).toBe(false);
    expect(result.gateMessages[0]).toContain("필수 선결조건");
  });

  it("stops at the first failed stage even when a later stage would pass", () => {
    const result = calculateReadiness(
      INTAKE_QUESTIONS.map((question) => ({
        questionId: question.id,
        level: (question.itemId === "home-pmf" ? 1 : 4) as ReadinessLevel
      }))
    );
    expect(result.stages[0].passed).toBe(false);
    expect(result.stages[1].passed).toBe(true);
    expect(result.achievedStageId).toBeNull();
    expect(result.currentStageId).toBe("early");
    expect(result.actions.every((a) => a.phase === "pre_entry")).toBe(true);
  });
});
