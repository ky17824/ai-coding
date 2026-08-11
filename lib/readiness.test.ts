import { describe, expect, it } from "vitest";
import {
  INTAKE_ITEMS,
  INTAKE_QUESTIONS,
  INTAKE_STAGES
} from "@/lib/intake-questions";
import {
  GATE_THRESHOLD,
  buildStageAnswerInsights,
  calculateReadiness,
  decidePlanHorizons,
  hasPassedStage,
  isCompleteStageAnswerSet,
  normalizeGateMessage,
  normalizeReadinessStatus,
  questionsOfStage,
  validateAssessmentAnswers
} from "@/lib/readiness";
import type { ReadinessAnswer, ReadinessLevel } from "@/lib/types";

const sum = (values: number[]) => values.reduce((total, n) => total + n, 0);
const answerAll = (level: ReadinessLevel): ReadinessAnswer[] =>
  INTAKE_QUESTIONS.map((question) => ({
    questionId: question.id,
    level,
    evidence: question.critical && level >= 3
      ? { kind: "note", value: "확인 근거" }
      : undefined
  }));
const confirmedMarket = {
  targetCountry: "일본",
  targetCustomerSegment: "도쿄 소재 중견 제조사",
  confirmed: true
};

describe("intake question set", () => {
  it("shows legacy saved statuses with the current stage names", () => {
    expect(normalizeReadinessStatus("극초기")).toBe("준비 1단계");
    expect(normalizeReadinessStatus("준비중")).toBe("준비 2단계");
    expect(normalizeReadinessStatus("준비완료")).toBe("준비 3단계");
    expect(normalizeReadinessStatus("진출 실행 가능")).toBe("진출 실행 가능");
  });

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
  it("removes the repeated legacy prerequisite prefix", () => {
    expect(normalizeGateMessage("필수 선결 조건이 남았습니다 — 총 진입비용을 계산해 주세요."))
      .toBe("총 진입비용을 계산해 주세요.");
    expect(normalizeGateMessage("극초기 단계 통과까지 10점이 남았습니다."))
      .toBe("준비 1단계 통과까지 10점이 남았습니다.");
  });

  it("accepts only complete stage prefixes", () => {
    const early = new Set(questionsOfStage("early").map((question) => question.id));
    const earlyAnswers = answerAll(1).filter((answer) => early.has(answer.questionId));
    expect(isCompleteStageAnswerSet(earlyAnswers)).toBe(true);
    expect(validateAssessmentAnswers(earlyAnswers).valid).toBe(true);
    expect(isCompleteStageAnswerSet(earlyAnswers.slice(1))).toBe(false);
    expect(isCompleteStageAnswerSet(answerAll(1))).toBe(true);
  });

  it("does not unlock preparing when the completed early Gate fails", () => {
    const early = new Set(questionsOfStage("early").map((question) => question.id));
    const earlyAnswers = answerAll(1).filter((answer) => early.has(answer.questionId));
    expect(earlyAnswers).toHaveLength(18);
    expect(hasPassedStage(earlyAnswers, "early")).toBe(false);
    expect(hasPassedStage(earlyAnswers.map((answer) => ({
      ...answer,
      level: 4,
      evidence: { kind: "note", value: "확인 근거" }
    })), "early"))
      .toBe(true);
  });

  it("stops at preparing after early passes and preparing fails", () => {
    const throughPreparing = new Set(
      ["early", "preparing"].flatMap((stageId) =>
        questionsOfStage(stageId).map((question) => question.id)
      )
    );
    const answers = answerAll(1)
      .filter((answer) => throughPreparing.has(answer.questionId))
      .map((answer) => ({
        ...answer,
        level: questionsOfStage("early").some(
          (question) => question.id === answer.questionId
        ) ? 4 as const : answer.level,
        evidence: questionsOfStage("early").some(
          (question) => question.id === answer.questionId && question.critical
        ) ? { kind: "note" as const, value: "확인 근거" } : answer.evidence
      }));
    expect(hasPassedStage(answers, "early")).toBe(true);
    expect(hasPassedStage(answers, "preparing")).toBe(false);
  });

  it("holds the first stage and scores 0 when nothing is positive", () => {
    const result = calculateReadiness(answerAll(1));
    expect(result.overallScore).toBe(0);
    expect(result.achievedStageId).toBeNull();
    expect(result.currentStageId).toBe("early");
    expect(result.status).toBe("준비 1단계");
    expect(result.isOnHold).toBe(true);
    expect(result.actions).toHaveLength(5);
    expect(result.actions[0].urgency).toBe("P0");
  });

  it("passes every stage once all answers are positive", () => {
    const result = calculateReadiness(answerAll(3), confirmedMarket);
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
        level: (dropped.has(question.id) ? 2 : 4) as ReadinessLevel,
        evidence: question.critical
          ? { kind: "note" as const, value: "확인 근거" }
          : undefined
      })),
      confirmedMarket
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
        level: (question.id === "res-owner-time" ? 1 : 4) as ReadinessLevel,
        evidence: question.critical && question.id !== "res-owner-time"
          ? { kind: "note" as const, value: "확인 근거" }
          : undefined
      })),
      confirmedMarket
    );
    expect(result.stages[0].ratio).toBeGreaterThan(GATE_THRESHOLD);
    expect(result.stages[0].blockers).toHaveLength(1);
    expect(result.stages[0].passed).toBe(false);
    expect(result.gateMessages[0]).not.toContain("필수 선결 조건이 남았습니다");
  });

  it("keeps Gate A independent but blocks Gate B until target market is confirmed", () => {
    const answers = answerAll(4);
    const withoutMarket = calculateReadiness(answers);
    expect(withoutMarket.stages[0].passed).toBe(true);
    expect(withoutMarket.stages[1].passed).toBe(false);
    expect(withoutMarket.stages[1].prerequisiteBlockers).toHaveLength(2);
    expect(withoutMarket.currentStageId).toBe("preparing");

    const withMarket = calculateReadiness(answers, confirmedMarket);
    expect(withMarket.stages.every((stage) => stage.passed)).toBe(true);
  });

  it("defers paid-customer validation through Gate B and requires it at Gate C", () => {
    const paidCustomerMissing = answerAll(4).map((answer) =>
      answer.questionId === "pmf-paid-conversion"
        ? { ...answer, level: 2 as const, evidence: undefined }
        : answer
    );
    const otherEarlyBlocker = answerAll(4).map((answer) =>
      answer.questionId === "res-owner-time"
        ? { ...answer, level: 2 as const, evidence: undefined }
        : answer
    );

    const deferred = calculateReadiness(paidCustomerMissing, confirmedMarket);
    expect(deferred.stages[0].passed).toBe(true);
    expect(deferred.stages[0].positiveScore).toBe(27);
    expect(deferred.stages[0].totalScore).toBe(27);
    expect(deferred.stages[1].passed).toBe(true);
    expect(deferred.stages[2].passed).toBe(false);
    expect(deferred.currentStageId).toBe("ready");
    expect(deferred.actions.some((action) => action.questionId === "pmf-paid-conversion")).toBe(true);
    expect(decidePlanHorizons(deferred)).toEqual([30, 60, 90]);
    expect(decidePlanHorizons(calculateReadiness(otherEarlyBlocker))).toEqual([30]);
    expect(decidePlanHorizons(calculateReadiness(answerAll(4)))).toEqual([60]);
    expect(decidePlanHorizons(calculateReadiness(answerAll(4), confirmedMarket))).toEqual([30, 60, 90]);
  });

  it("stops at the first failed stage even when a later stage would pass", () => {
    const result = calculateReadiness(
      INTAKE_QUESTIONS.map((question) => ({
        questionId: question.id,
        level: (question.itemId === "resources" ? 1 : 4) as ReadinessLevel,
        evidence: question.critical && question.itemId !== "resources"
          ? { kind: "note" as const, value: "확인 근거" }
          : undefined
      })),
      confirmedMarket
    );
    expect(result.stages[0].passed).toBe(false);
    expect(result.stages[1].passed).toBe(true);
    expect(result.achievedStageId).toBeNull();
    expect(result.currentStageId).toBe("early");
    expect(result.actions.every((a) => a.phase === "pre_entry")).toBe(true);
  });
});

describe("dashboard answer insights", () => {
  it("restores selected answers and classifies their meaning", () => {
    const earlyQuestions = questionsOfStage("early");
    const critical = earlyQuestions.find((question) => question.critical)!;
    const ordinary = earlyQuestions.find((question) => !question.critical)!;
    const answers: ReadinessAnswer[] = earlyQuestions.map((question) => ({
      questionId: question.id,
      level: question.id === critical.id
        ? 2
        : question.id === ordinary.id
          ? 4
          : 3,
      evidence: question.critical && question.id !== critical.id
        ? { kind: "note", value: "확인 근거" }
        : undefined
    }));

    const insight = buildStageAnswerInsights(answers, "early");
    const criticalInsight = insight.answers.find(
      (answer) => answer.questionId === critical.id
    );
    const strengthInsight = insight.answers.find(
      (answer) => answer.questionId === ordinary.id
    );

    expect(criticalInsight).toMatchObject({
      answerText: critical.options[1],
      status: "blocker",
      statusLabel: "필수 선결 조건"
    });
    expect(strengthInsight).toMatchObject({
      answerText: ordinary.options[3],
      status: "strength",
      statusLabel: "강점"
    });
    expect(insight.counts.blocker).toBe(1);
    expect(insight.counts.strength).toBe(1);
  });

  it("builds item distributions that preserve each item weight", () => {
    const earlyQuestions = questionsOfStage("early");
    const answers: ReadinessAnswer[] = earlyQuestions.map((question, index) => ({
      questionId: question.id,
      level: ((index % 4) + 1) as ReadinessLevel
    }));
    const insight = buildStageAnswerInsights(answers, "early");

    for (const item of insight.items) {
      expect(sum(item.segments.map((segment) => segment.weight))).toBeCloseTo(
        INTAKE_ITEMS.find((entry) => entry.id === item.id)!.weight,
        10
      );
      expect(sum(item.segments.map((segment) => segment.percent))).toBeCloseTo(
        100,
        1
      );
    }
    expect(insight.score).toBe(
      calculateReadiness(answers).domainScores.early
    );
    expect(insight.positiveScore).toBeCloseTo(
      insight.items.reduce((total, item) => total + item.positiveWeight, 0),
      10
    );
    expect(insight.totalScore).toBe(
      insight.items.reduce((total, item) => total + item.totalWeight, 0)
    );
    expect(insight.thresholdScore).toBe(insight.totalScore * 0.8);
  });

  it("labels an unmet paid pilot as a deferred 90-day validation task", () => {
    const answers = questionsOfStage("early").map((question) => ({
      questionId: question.id,
      level: (question.id === "pmf-paid-conversion" ? 2 : 4) as ReadinessLevel,
      evidence: question.critical && question.id !== "pmf-paid-conversion"
        ? { kind: "note" as const, value: "확인 근거" }
        : undefined
    }));
    const insight = buildStageAnswerInsights(answers, "early");

    expect(insight.answers.find((answer) => answer.questionId === "pmf-paid-conversion"))
      .toMatchObject({ status: "deferred", statusLabel: "90일 검증 과제" });
    expect(insight.counts.deferred).toBe(1);
    expect(insight.totalScore).toBe(27);
    expect(insight.thresholdScore).toBeCloseTo(21.6, 10);

    const result = calculateReadiness(answers);
    expect(result.stages.find((stage) => stage.stageId === "early")?.passed).toBe(true);
    expect(result.currentStageId).toBe("preparing");
    expect(result.actions.some((action) => action.questionId === "pmf-paid-conversion")).toBe(true);
    expect(decidePlanHorizons(result)).toEqual([30, 60, 90]);
  });
});
