import {
  INTAKE_ITEMS,
  INTAKE_QUESTIONS,
  INTAKE_STAGES,
  POSITIVE_LEVEL
} from "@/lib/intake-questions";
import type {
  ActionRecommendation,
  ReadinessAnswer,
  ReadinessResult,
  ReadinessStatus,
  StageResult
} from "@/lib/types";

/** 단계 통과에 필요한 긍정 비율. 문항 수가 아니라 배점 가중이다. */
export const GATE_THRESHOLD = 0.8;

export const STAGES = INTAKE_STAGES;

const ITEM = new Map(INTAKE_ITEMS.map((item) => [item.id, item]));

export const questionsOfStage = (stageId: string) =>
  INTAKE_QUESTIONS.filter(
    (question) => ITEM.get(question.itemId)!.stageId === stageId
  );

export function validateAssessmentAnswers(answers: ReadinessAnswer[]) {
  const errors: Record<string, string> = {};
  const valid = new Set(INTAKE_QUESTIONS.map((question) => question.id));

  for (const answer of answers) {
    if (!valid.has(answer.questionId)) {
      errors[answer.questionId] = "알 수 없는 진단 문항입니다.";
    } else if (![1, 2, 3, 4].includes(answer.level)) {
      errors[answer.questionId] = "응답 단계가 올바르지 않습니다.";
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function calculateReadiness(
  submitted: ReadinessAnswer[]
): ReadinessResult {
  const levels = new Map(submitted.map((a) => [a.questionId, a.level]));
  const positive = (id: string) => (levels.get(id) ?? 0) >= POSITIVE_LEVEL;

  const stages: StageResult[] = INTAKE_STAGES.map((stage) => {
    const questions = questionsOfStage(stage.id);
    const positiveScore = questions
      .filter((question) => positive(question.id))
      .reduce((sum, question) => sum + question.weight, 0);
    const blockers = questions
      .filter((question) => question.critical && !positive(question.id))
      .map((question) => question.question);
    const ratio = positiveScore / stage.weight;

    return {
      stageId: stage.id,
      label: stage.label,
      gate: stage.gate,
      unlocks: stage.unlocks,
      positiveScore,
      totalScore: stage.weight,
      ratio,
      blockers,
      passed: ratio >= GATE_THRESHOLD && blockers.length === 0,
      scoreToPass:
        Math.round(
          Math.max(0, stage.weight * GATE_THRESHOLD - positiveScore) * 10
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
    for (const blocker of current.blockers) {
      gateMessages.push(`필수 선결 조건이 남았습니다 — ${blocker}`);
    }
    if (current.blockers.length === 0 && current.scoreToPass > 0) {
      gateMessages.push(
        `${current.label} 단계 통과까지 ${current.scoreToPass}점이 남았습니다.`
      );
    }
  }

  // 액션은 현재 단계에서만 뽑는다. 통과하지 못한 단계를 두고 앞서가게 하지 않는다.
  const actions: ActionRecommendation[] = current
    ? questionsOfStage(current.stageId)
        .filter((question) => !positive(question.id))
        .sort(
          (a, b) =>
            Number(!!b.critical) - Number(!!a.critical) ||
            b.weight - a.weight ||
            (levels.get(a.id) ?? 0) - (levels.get(b.id) ?? 0)
        )
        .slice(0, 5)
        .map((question) => {
          const item = ITEM.get(question.itemId)!;
          const stage = INTAKE_STAGES.find((s) => s.id === item.stageId)!;
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
    status: (current?.label ?? "진출 실행 가능") as ReadinessStatus,
    isOnHold: gateMessages.length > 0,
    gateMessages,
    actions,
    stages,
    achievedStageId: achievedIndex >= 0 ? stages[achievedIndex].stageId : null,
    currentStageId: current?.stageId ?? null
  };
}
