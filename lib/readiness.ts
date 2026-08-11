import {
  INTAKE_ITEMS,
  INTAKE_QUESTIONS,
  INTAKE_STAGES,
  PAID_PILOT_QUESTION_ID,
  POSITIVE_LEVEL,
  getIntakeItems,
  getIntakeQuestions,
  getIntakeStages
} from "@/lib/intake-questions";
import type { Locale } from "@/lib/i18n";
import type {
  ActionRecommendation,
  ReadinessAnswer,
  ReadinessLevel,
  ReadinessResult,
  ReadinessStatus,
  StageResult,
  TargetMarketContext
} from "@/lib/types";

/** 단계 통과에 필요한 긍정 비율. 문항 수가 아니라 배점 가중이다. */
export const GATE_THRESHOLD = 0.8;

export const STAGES = INTAKE_STAGES;

const LEGACY_STATUS_LABELS: Record<string, ReadinessStatus> = {
  "극초기": "준비 1단계",
  "준비중": "준비 2단계",
  "준비완료": "준비 3단계"
};

const LEVEL_MEANING: Record<ReadinessLevel, string> = {
  1: "아직 검토하거나 시작하지 않은 상태입니다.",
  2: "필요성은 인지했지만 실행 또는 확인 가능한 증거가 부족합니다.",
  3: "실행 사례가 있어 단계 통과 점수로 인정됩니다.",
  4: "반복 실행 또는 외부 확인이 된 강점으로 단계 통과 점수에 인정됩니다."
};
const EN_LEVEL_MEANING: Record<ReadinessLevel, string> = {
  1: "This area has not been reviewed or started yet.",
  2: "The need is understood, but execution or verifiable evidence is still limited.",
  3: "There is an execution example, so this response counts toward the stage gate.",
  4: "This is a repeatable or externally verified strength that counts toward the stage gate."
};
type AnswerInsightStatus = "blocker" | "deferred" | "needs_work" | "passed" | "strength";

export const questionsOfStage = (stageId: string, locale: Locale = "ko") => {
  const items = new Map(getIntakeItems(locale).map((item) => [item.id, item]));
  return getIntakeQuestions(locale).filter(
    (question) => items.get(question.itemId)!.stageId === stageId
  );
};

export function normalizeGateMessage(message: string) {
  return Object.entries(LEGACY_STATUS_LABELS)
    .reduce(
      (text, [legacy, current]) =>
        text.replaceAll(`${legacy} 단계`, current).replaceAll(legacy, current),
      message
    )
    .replace(/^필수 선결 조건이 남았습니다\s*—\s*/, "")
    .trim();
}

export function normalizeReadinessStatus(status: string): ReadinessStatus {
  return LEGACY_STATUS_LABELS[status] ?? status as ReadinessStatus;
}

export function isTargetMarketConfirmed(targetMarket?: TargetMarketContext | null) {
  return Boolean(
    targetMarket?.targetCountry.trim() &&
      targetMarket.targetCustomerSegment.trim() &&
      (targetMarket.confirmed || targetMarket.confirmedAt)
  );
}

export function buildStageAnswerInsights(
  submitted: ReadinessAnswer[],
  stageId: string,
  locale: Locale = "ko"
) {
  const stages = getIntakeStages(locale);
  const questions = getIntakeQuestions(locale);
  const itemsCatalog = getIntakeItems(locale);
  const stage = stages.find((entry) => entry.id === stageId);
  if (!stage) throw new Error(`Unknown readiness stage: ${stageId}`);

  const answerById = new Map(submitted.map((answer) => [answer.questionId, answer]));
  const stageQuestions = questionsOfStage(stageId, locale);
  const paidPilotAnswer = answerById.get(PAID_PILOT_QUESTION_ID);
  const paidPilotDeferred = stageId === "early" && (
    !paidPilotAnswer ||
    paidPilotAnswer.level < POSITIVE_LEVEL ||
    !paidPilotAnswer.evidence?.value
  );
  const answers = stageQuestions.flatMap((question) => {
    const answer = answerById.get(question.id);
    if (!answer) return [];
    const missingCriticalEvidence = question.critical && !answer.evidence?.value;
    const answerIsDeferred = question.id === PAID_PILOT_QUESTION_ID &&
      (answer.level < POSITIVE_LEVEL || missingCriticalEvidence);
    const status: AnswerInsightStatus = answer.level < POSITIVE_LEVEL || missingCriticalEvidence
      ? answerIsDeferred ? "deferred" : question.critical ? "blocker" : "needs_work"
      : answer.level === 4 ? "strength" : "passed";
    const statusLabel = locale === "en"
      ? status === "blocker"
        ? "Required prerequisite"
        : status === "deferred"
          ? "90-day validation task"
        : status === "needs_work"
          ? "Needs work"
          : status === "strength" ? "Strength" : "Passed"
      : status === "blocker"
        ? "필수 선결 조건"
        : status === "deferred"
          ? "90일 검증 과제"
        : status === "needs_work"
          ? "보완 필요"
          : status === "strength" ? "강점" : "통과";

    return [{
      questionId: question.id,
      number: questions.findIndex((entry) => entry.id === question.id) + 1,
      question: question.question,
      level: answer.level,
      answerText: question.options[answer.level - 1],
      meaning: answerIsDeferred
        ? locale === "en"
          ? "This does not block Readiness Stages 1 or 2. Complete a paid target-country proof of concept or pilot and submit evidence by the end of the 90-day plan to pass Gate C."
          : "준비 1·2단계를 막지 않습니다. 90일 계획 안에 초기 목표국가의 유료 실증시험이나 파일럿을 완료하고 근거를 제출해야 단계 통과 기준 C를 통과합니다."
        : missingCriticalEvidence && answer.level >= POSITIVE_LEVEL
        ? locale === "en"
          ? "The response is positive, but this required question still needs supporting evidence."
          : "긍정 응답이지만 필수 문항의 확인 근거가 없어 단계 통과 조건이 남았습니다."
        : (locale === "en" ? EN_LEVEL_MEANING : LEVEL_MEANING)[answer.level],
      status,
      statusLabel,
      action: answer.level < POSITIVE_LEVEL || missingCriticalEvidence ? question.action : null,
      completionEvidence: answer.evidence?.value || question.followUp,
      hasEvidence: Boolean(answer.evidence?.value)
    }];
  });
  const counts: Record<AnswerInsightStatus, number> = {
    blocker: 0,
    deferred: 0,
    needs_work: 0,
    passed: 0,
    strength: 0
  };
  for (const answer of answers) counts[answer.status] += 1;
  const items = itemsCatalog.filter((item) => item.stageId === stageId).map((item) => {
    const itemQuestions = stageQuestions.filter((question) => question.itemId === item.id);
    const gateQuestions = paidPilotDeferred
      ? itemQuestions.filter((question) => question.id !== PAID_PILOT_QUESTION_ID)
      : itemQuestions;
    const totalWeight = gateQuestions.reduce((sum, question) => sum + question.weight, 0);
    const positiveWeight = gateQuestions
      .filter((question) => (answerById.get(question.id)?.level ?? 0) >= POSITIVE_LEVEL)
      .reduce((sum, question) => sum + question.weight, 0);
    return {
      id: item.id,
      label: item.label,
      totalWeight,
      positiveWeight,
      positivePercent: totalWeight ? Math.round((positiveWeight / totalWeight) * 100) : 0,
      segments: ([1, 2, 3, 4] as ReadinessLevel[]).map((level) => {
        const weight = itemQuestions
          .filter((question) => answerById.get(question.id)?.level === level)
          .reduce((sum, question) => sum + question.weight, 0);
        return { level, weight, percent: (weight / item.weight) * 100 };
      })
    };
  });
  const positiveScore = items.reduce((sum, item) => sum + item.positiveWeight, 0);
  const totalScore = items.reduce((sum, item) => sum + item.totalWeight, 0);

  return {
    stageId,
    stageLabel: stage.label,
    gate: stage.gate,
    positiveScore,
    totalScore,
    thresholdScore: totalScore * GATE_THRESHOLD,
    score: totalScore ? Math.round((positiveScore / totalScore) * 100) : 0,
    counts,
    items,
    answers
  };
}

export function isCompleteStageAnswerSet(answers: ReadinessAnswer[]) {
  const answered = new Set(answers.map((answer) => answer.questionId));
  if (answered.size !== answers.length) return false;

  return STAGES.some((_, stageIndex) => {
    const expected = STAGES.slice(0, stageIndex + 1).flatMap((stage) =>
      questionsOfStage(stage.id).map((question) => question.id)
    );
    return (
      answered.size === expected.length &&
      expected.every((questionId) => answered.has(questionId))
    );
  });
}

export function validateAssessmentAnswers(answers: ReadinessAnswer[], locale: Locale = "ko") {
  const errors: Record<string, string> = {};
  const valid = new Set(INTAKE_QUESTIONS.map((question) => question.id));

  for (const answer of answers) {
    if (!valid.has(answer.questionId)) {
      errors[answer.questionId] = locale === "en" ? "Unknown assessment question." : "알 수 없는 진단 문항입니다.";
    } else if (![1, 2, 3, 4].includes(answer.level)) {
      errors[answer.questionId] = locale === "en" ? "The selected response level is invalid." : "응답 단계가 올바르지 않습니다.";
    }
  }

  if (!isCompleteStageAnswerSet(answers)) {
    errors._form = locale === "en"
      ? "Please answer every question once through the completed stage."
      : "완료한 단계까지 모든 문항에 한 번씩 답해 주세요.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function hasPassedStage(
  submitted: ReadinessAnswer[],
  stageId: string,
  targetMarket?: TargetMarketContext | null,
  locale: Locale = "ko"
) {
  return (
    calculateReadiness(submitted, targetMarket, locale).stages.find((stage) => stage.stageId === stageId)
      ?.passed ?? false
  );
}

export function calculateReadiness(
  submitted: ReadinessAnswer[],
  targetMarket?: TargetMarketContext | null,
  locale: Locale = "ko"
): ReadinessResult {
  const stagesCatalog = getIntakeStages(locale);
  const itemsCatalog = getIntakeItems(locale);
  const items = new Map(itemsCatalog.map((item) => [item.id, item]));
  const levels = new Map(submitted.map((a) => [a.questionId, a.level]));
  const evidence = new Map(submitted.map((a) => [a.questionId, a.evidence?.value.trim()]));
  const positive = (id: string) => (levels.get(id) ?? 0) >= POSITIVE_LEVEL;
  const paidPilotValidated = positive(PAID_PILOT_QUESTION_ID) && Boolean(evidence.get(PAID_PILOT_QUESTION_ID));

  const stages: StageResult[] = stagesCatalog.map((stage) => {
    const questions = questionsOfStage(stage.id, locale);
    const scoredQuestions = stage.id === "early" && !paidPilotValidated
      ? questions.filter((question) => question.id !== PAID_PILOT_QUESTION_ID)
      : questions;
    const totalScore = scoredQuestions.reduce((sum, question) => sum + question.weight, 0);
    const positiveScore = scoredQuestions
      .filter((question) => positive(question.id))
      .reduce((sum, question) => sum + question.weight, 0);
    const blockers = questions
      .filter(
        (question) =>
          question.critical && question.id !== PAID_PILOT_QUESTION_ID &&
          (!positive(question.id) || !evidence.get(question.id))
      )
      .map((question) => question.question);
    const prerequisiteBlockers = stage.id === "preparing" && !isTargetMarketConfirmed(targetMarket)
      ? [
          ...(!targetMarket?.targetCountry.trim()
            ? [locale === "en" ? "Confirm your initial target country." : "초기 목표국가를 확정해 주세요."]
            : []),
          ...(!targetMarket?.targetCustomerSegment.trim()
            ? [locale === "en" ? "Confirm the initial customer segment in your target country." : "초기 목표국가의 목표 고객군을 확정해 주세요."]
            : []),
          ...(targetMarket?.targetCountry.trim() && targetMarket.targetCustomerSegment.trim() &&
          !targetMarket.confirmed && !targetMarket.confirmedAt
            ? [locale === "en" ? "Confirm the initial target-market information." : "초기 목표시장 정보를 확인해 주세요."]
            : [])
        ]
      : stage.id === "ready" && !paidPilotValidated
        ? [locale === "en"
            ? "Complete a paid target-country proof of concept or pilot and submit payment or customer-commitment evidence."
            : "초기 목표국가의 유료 실증시험이나 파일럿을 완료하고 결제 또는 고객 투입 증거를 제출해 주세요."]
        : [];
    const ratio = totalScore ? positiveScore / totalScore : 0;

    return {
      stageId: stage.id,
      label: stage.label,
      gate: stage.gate,
      unlocks: stage.unlocks,
      positiveScore,
      totalScore,
      ratio,
      blockers,
      prerequisiteBlockers,
      passed:
        ratio >= GATE_THRESHOLD &&
        blockers.length === 0 &&
        prerequisiteBlockers.length === 0,
      scoreToPass:
        Math.round(
          Math.max(0, totalScore * GATE_THRESHOLD - positiveScore) * 10
        ) / 10
    };
  });

  let achievedIndex = -1;
  for (const [index, stage] of stages.entries()) {
    if (!stage.passed) break;
    achievedIndex = index;
  }
  const current = stages[achievedIndex + 1] ?? null;

  const gateMessages: string[] = [];
  if (current) {
    for (const blocker of [...current.prerequisiteBlockers, ...current.blockers]) {
      gateMessages.push(normalizeGateMessage(blocker));
    }
    if (current.blockers.length === 0 && current.scoreToPass > 0) {
      gateMessages.push(
        locale === "en"
          ? `${current.scoreToPass} weighted points remain to pass ${current.label}.`
          : `${current.label} 통과까지 ${current.scoreToPass}점이 남았습니다.`
      );
    }
  }

  // 현재 단계 액션에 미완료 유료 실증시험을 90일 이월 과제로 함께 유지한다.
  const actions: ActionRecommendation[] = current
    ? [
        ...(!paidPilotValidated
          ? getIntakeQuestions(locale).filter((question) => question.id === PAID_PILOT_QUESTION_ID)
          : []),
        ...questionsOfStage(current.stageId, locale).filter((question) => question.id !== PAID_PILOT_QUESTION_ID)
      ]
        .filter(
          (question) =>
            !positive(question.id) || (question.critical && !evidence.get(question.id))
        )
        .sort(
          (a, b) =>
            Number(b.id === PAID_PILOT_QUESTION_ID) - Number(a.id === PAID_PILOT_QUESTION_ID) ||
            Number(!!b.critical) - Number(!!a.critical) ||
            b.weight - a.weight ||
            (levels.get(a.id) ?? 0) - (levels.get(b.id) ?? 0)
        )
        .slice(0, 5)
        .map((question) => {
          const item = items.get(question.itemId)!;
          const stage = stagesCatalog.find((s) => s.id === item.stageId)!;
          return {
            questionId: question.id,
            title: question.action,
            owner: item.owner,
            completionEvidence: question.followUp,
            phase: stage.journeyPhase,
            serviceTag: item.serviceTag,
            urgency: question.critical ? "P0" : "P1"
          };
        })
    : [];

  return {
    overallScore: Math.round(
      stages.reduce((sum, stage) => sum + stage.positiveScore, 0)
    ),
    domainScores: Object.fromEntries(
      stages.map((stage) => [stage.stageId, Math.round(stage.ratio * 100)])
    ),
    status: (current?.label ?? (locale === "en" ? "Ready to Enter" : "진출 실행 가능")) as ReadinessStatus,
    isOnHold: gateMessages.length > 0,
    gateMessages,
    actions,
    stages,
    achievedStageId: achievedIndex >= 0 ? stages[achievedIndex].stageId : null,
    currentStageId: current?.stageId ?? null
  };
}

export function decidePlanHorizons(result: ReadinessResult): (30 | 60 | 90)[] {
  if (result.actions.some((action) => action.questionId === PAID_PILOT_QUESTION_ID)) {
    return [30, 60, 90];
  }
  if (result.currentStageId === "early") {
    return [30];
  }
  if (result.currentStageId === "preparing") {
    const early = result.stages.find((stage) => stage.stageId === "early");
    return early && early.ratio >= 0.9 && early.blockers.length === 0
      ? [60]
      : [30, 60];
  }
  if (result.currentStageId === "ready") {
    const ready = result.stages.find((stage) => stage.stageId === "ready");
    return ready && ready.ratio >= 0.6 && ready.blockers.length === 0
      ? [30, 60]
      : [30];
  }
  return [30, 60, 90];
}
