import {
  INTAKE_ITEMS,
  INTAKE_QUESTIONS,
  INTAKE_STAGES,
  PAID_PILOT_QUESTION_ID,
  POSITIVE_LEVEL,
  getIntakeItems,
  getIntakeQuestions,
  getQuestionNumber,
  getIntakeStages,
  type SurveyVersion
} from "@/lib/intake-questions";
import type { Locale } from "@/lib/i18n";
import type {
  ActionRecommendation,
  DeferredReason,
  ReadinessAnswer,
  ReadinessLevel,
  QuestionApplicability,
  ReadinessResult,
  ReadinessStatus,
  SalesMotion,
  StageResult,
  TargetMarketContext
} from "@/lib/types";

/** 단계 통과에 필요한 긍정 비율. 문항 수가 아니라 배점 가중이다. */
export const GATE_THRESHOLD = 0.8;

export const STAGES = INTAKE_STAGES;

const LEGACY_STATUS_LABELS: Record<string, ReadinessStatus> = {
  "극초기": "준비 1단계",
  "준비중": "준비 2단계",
  "준비완료": "준비 3단계",
  "Readiness Stage 1": "준비 1단계",
  "Readiness Stage 2": "준비 2단계",
  "Readiness Stage 3": "준비 3단계",
  "Ready to Enter": "진출 실행 가능"
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

export const questionsOfStage = (
  stageId: string,
  locale: Locale = "ko",
  version: SurveyVersion = "4.0"
) => {
  const items = new Map(getIntakeItems(locale).map((item) => [item.id, item]));
  return getIntakeQuestions(locale, version).filter(
    (question) => items.get(question.itemId)!.stageId === stageId
  );
};

const PARTNER_ONLY_IDS = new Set([
  "partner-actual-work",
  "partner-economics",
  "partner-shortfall",
  "contract-control",
  "contract-exit",
  "contract-switch-cost",
  "contract-dependency-limit"
]);

const V5_TARGET_COUNTRY_IDS = new Set(
  getIntakeQuestions("ko", "5.0").slice(13, 31).map((question) => question.id)
);

export interface AssessmentQuestionContext {
  surveyVersion: SurveyVersion;
  salesMotion: SalesMotion | null;
  completedStageId?: "early" | "preparing" | "ready";
  targetMarket?: TargetMarketContext | null;
  answers: ReadinessAnswer[];
}

export interface ResolvedAssessmentQuestions {
  requiredIds: string[];
  deferredIds: string[];
  notApplicableIds: string[];
  applicabilityById: ReadonlyMap<string, QuestionApplicability>;
  deferredGroups: Array<{ reason: DeferredReason; questionIds: string[] }>;
}

export function resolveAssessmentQuestions(context: AssessmentQuestionContext): ResolvedAssessmentQuestions {
  const questions = getIntakeQuestions("ko", context.surveyVersion);
  if (context.surveyVersion === "4.0") {
    return {
      requiredIds: questions.map((question) => question.id),
      deferredIds: [],
      notApplicableIds: [],
      applicabilityById: new Map(questions.map((question) => [question.id, "required" as const])),
      deferredGroups: []
    };
  }

  const levels = new Map(context.answers.map((answer) => [answer.questionId, answer.level]));
  const structural = new Set<string>();
  if (context.salesMotion === "direct") {
    for (const id of PARTNER_ONLY_IDS) structural.add(id);
  }
  if ((levels.get(PAID_PILOT_QUESTION_ID) ?? 0) < POSITIVE_LEVEL) {
    structural.add("alloc-concentration");
  }

  const deferredByReason = new Map<DeferredReason, string[]>([
    ["target_country_missing", []],
    ["sales_motion_unknown", []],
    ["local_test_not_started", []],
    ["paid_evidence_missing", []]
  ]);
  const requiredIds: string[] = [];
  const deferredIds: string[] = [];
  const targetCountryMissing = !context.targetMarket?.targetCountry.trim();

  for (const question of questions) {
    if (structural.has(question.id)) continue;
    const reason: DeferredReason | null = targetCountryMissing && V5_TARGET_COUNTRY_IDS.has(question.id)
      ? "target_country_missing"
      : context.salesMotion === "unknown" && PARTNER_ONLY_IDS.has(question.id)
        ? "sales_motion_unknown"
        : question.id === "test-defects" && (levels.get("test-environment") ?? 0) < POSITIVE_LEVEL
          ? "local_test_not_started"
          : question.id === "test-no-discount" && (levels.get(PAID_PILOT_QUESTION_ID) ?? 0) < POSITIVE_LEVEL
            ? "paid_evidence_missing"
            : null;
    if (reason) {
      deferredIds.push(question.id);
      deferredByReason.get(reason)!.push(question.id);
    } else {
      requiredIds.push(question.id);
    }
  }

  const notApplicableIds = questions.filter((question) => structural.has(question.id)).map((question) => question.id);
  return {
    requiredIds,
    deferredIds,
    notApplicableIds,
    applicabilityById: new Map(questions.map((question) => [
      question.id,
      structural.has(question.id)
        ? "structural_not_applicable" as const
        : deferredIds.includes(question.id)
          ? "deferred_unmet" as const
          : "required" as const
    ])),
    deferredGroups: [...deferredByReason.entries()]
      .filter(([, questionIds]) => questionIds.length)
      .map(([reason, questionIds]) => ({ reason, questionIds }))
  };
}

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

export function formatReadinessStatus(status: string, locale: Locale): ReadinessStatus {
  const canonical = normalizeReadinessStatus(status);
  if (locale !== "en") return canonical;
  return ({
    "준비 1단계": "Readiness Stage 1",
    "준비 2단계": "Readiness Stage 2",
    "준비 3단계": "Readiness Stage 3",
    "진출 실행 가능": "Ready to Enter"
  } as Record<string, ReadinessStatus>)[canonical] ?? canonical;
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
  locale: Locale = "ko",
  version: SurveyVersion = "4.0",
  salesMotion: SalesMotion = "unknown",
  targetMarket?: TargetMarketContext | null
) {
  const stages = getIntakeStages(locale);
  const questions = getIntakeQuestions(locale, version);
  const itemsCatalog = getIntakeItems(locale);
  const stage = stages.find((entry) => entry.id === stageId);
  if (!stage) throw new Error(`Unknown readiness stage: ${stageId}`);

  const answerById = new Map(submitted.map((answer) => [answer.questionId, answer]));
  const resolved = resolveAssessmentQuestions({
    surveyVersion: version,
    salesMotion,
    targetMarket,
    answers: submitted
  });
  const required = new Set(resolved.requiredIds);
  const notApplicable = new Set(resolved.notApplicableIds);
  const stageQuestions = questionsOfStage(stageId, locale, version)
    .filter((question) => !notApplicable.has(question.id));
  const paidPilotAnswer = answerById.get(PAID_PILOT_QUESTION_ID);
  const paidPilotDeferred = version === "4.0" && stageId === "early" && (
    !paidPilotAnswer ||
    paidPilotAnswer.level < POSITIVE_LEVEL ||
    !paidPilotAnswer.evidence?.value
  );
  const answers = stageQuestions.flatMap((question) => {
    const answer = answerById.get(question.id);
    if (!answer) return [];
    const missingCriticalEvidence = question.critical && !answer.evidence?.value;
    const answerIsDeferred = version === "4.0" && question.id === PAID_PILOT_QUESTION_ID &&
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
      number: getQuestionNumber(question.id, version)!,
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
      .filter((question) => required.has(question.id) && (answerById.get(question.id)?.level ?? 0) >= POSITIVE_LEVEL)
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
  const rawPositiveScore = items.reduce((sum, item) => sum + item.positiveWeight, 0);
  const rawTotalScore = items.reduce((sum, item) => sum + item.totalWeight, 0);
  const totalScore = version === "5.0" ? stage.weight : rawTotalScore;
  const positiveScore = version === "5.0" && rawTotalScore
    ? Math.round(stage.weight * rawPositiveScore / rawTotalScore * 10) / 10
    : rawPositiveScore;

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

export function isCompleteStageAnswerSet(
  answers: ReadinessAnswer[],
  context?: AssessmentQuestionContext
) {
  const answered = new Set(answers.map((answer) => answer.questionId));
  if (answered.size !== answers.length) return false;

  if (context?.surveyVersion === "5.0") {
    const resolved = resolveAssessmentQuestions({ ...context, answers });
    const completedIndex = context.completedStageId
      ? STAGES.findIndex((stage) => stage.id === context.completedStageId)
      : null;
    return STAGES.some((_, stageIndex) => {
      if (completedIndex !== null && stageIndex !== completedIndex) return false;
      const stageIds = new Set(STAGES.slice(0, stageIndex + 1).map((stage) => stage.id));
      const expected = resolved.requiredIds.filter((id) => {
        const question = getIntakeQuestions("ko", "5.0").find((entry) => entry.id === id)!;
        return stageIds.has(getIntakeItems("ko").find((item) => item.id === question.itemId)!.stageId);
      });
      return expected.length > 0 && expected.every((id) => answered.has(id)) &&
        [...answered].filter((id) => resolved.requiredIds.includes(id)).length === expected.length;
    });
  }

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

export function validateAssessmentAnswers(
  answers: ReadinessAnswer[],
  locale: Locale = "ko",
  context?: AssessmentQuestionContext
) {
  const errors: Record<string, string> = {};
  const version = context?.surveyVersion ?? "4.0";
  const valid = new Set(getIntakeQuestions(locale, version).map((question) => question.id));
  const resolved = context?.surveyVersion === "5.0"
    ? resolveAssessmentQuestions({ ...context, answers })
    : null;
  const allowed = resolved && context?.completedStageId
    ? new Set(resolved.requiredIds.filter((id) => {
        const question = getIntakeQuestions(locale, "5.0").find((entry) => entry.id === id)!;
        const item = getIntakeItems(locale).find((entry) => entry.id === question.itemId)!;
        return STAGES.findIndex((stage) => stage.id === item.stageId) <=
          STAGES.findIndex((stage) => stage.id === context.completedStageId);
      }))
    : null;

  for (const answer of answers) {
    if (!valid.has(answer.questionId)) {
      errors[answer.questionId] = locale === "en" ? "Unknown assessment question." : "알 수 없는 진단 문항입니다.";
    } else if (![1, 2, 3, 4].includes(answer.level)) {
      errors[answer.questionId] = locale === "en" ? "The selected response level is invalid." : "응답 단계가 올바르지 않습니다.";
    } else if (allowed && !allowed.has(answer.questionId)) {
      errors[answer.questionId] = locale === "en"
        ? "This question is not part of the current assessment branch."
        : "현재 진단 분기에 포함되지 않는 문항입니다.";
    }
  }

  if (!isCompleteStageAnswerSet(answers, context ? { ...context, answers } : undefined)) {
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
  locale: Locale = "ko",
  version: SurveyVersion = "4.0",
  salesMotion: SalesMotion = "unknown"
) {
  return (
    calculateReadiness(submitted, targetMarket, locale, version, salesMotion).stages.find((stage) => stage.stageId === stageId)
      ?.passed ?? false
  );
}

function calculateReadinessV4(
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
    currentStageId: current?.stageId ?? null,
    progress: {
      answered: submitted.length,
      required: INTAKE_QUESTIONS.length,
      percent: Math.round((submitted.length / INTAKE_QUESTIONS.length) * 100)
    },
    deferredIds: [],
    notApplicableIds: [],
    deferredGroups: []
  };
}

const DEFERRED_MESSAGE: Record<string, { ko: string; en: string }> = {
  target_country_missing: {
    ko: "초기 목표국가를 정하면 현지 시장·규제 문항을 이어서 확인합니다.",
    en: "Confirm an initial target country to continue the local market and regulatory questions."
  },
  sales_motion_unknown: {
    ko: "판매 방식(직접·파트너·혼합)을 정하면 파트너 관련 문항을 이어서 확인합니다.",
    en: "Choose a sales motion to continue the partner-related questions."
  },
  local_test_not_started: {
    ko: "현지 환경 시험을 시작하면 발견 문제와 해결 상태를 확인합니다.",
    en: "Start a local-environment test to review defects and resolution status."
  },
  paid_evidence_missing: {
    ko: "유료 고객 증거가 생기면 정상 가격 결제와 매출 집중도를 확인합니다.",
    en: "Add paid-customer evidence to review full-price payment and revenue concentration."
  }
};

function calculateReadinessV5(
  submitted: ReadinessAnswer[],
  targetMarket: TargetMarketContext | null | undefined,
  locale: Locale,
  salesMotion: SalesMotion
): ReadinessResult {
  const stagesCatalog = getIntakeStages(locale);
  const itemsCatalog = getIntakeItems(locale);
  const questions = getIntakeQuestions(locale, "5.0");
  const itemById = new Map(itemsCatalog.map((item) => [item.id, item]));
  const levels = new Map(submitted.map((answer) => [answer.questionId, answer.level]));
  const evidence = new Map(submitted.map((answer) => [answer.questionId, answer.evidence?.value.trim()]));
  const resolved = resolveAssessmentQuestions({
    surveyVersion: "5.0",
    salesMotion,
    targetMarket,
    answers: submitted
  });
  const required = new Set(resolved.requiredIds);
  const applicable = new Set([...resolved.requiredIds, ...resolved.deferredIds]);
  const positive = (id: string) => (levels.get(id) ?? 0) >= POSITIVE_LEVEL;

  const stages: StageResult[] = stagesCatalog.map((stage) => {
    const stageQuestions = questions.filter(
      (question) => itemById.get(question.itemId)!.stageId === stage.id && applicable.has(question.id)
    );
    const rawTotal = stageQuestions.reduce((sum, question) => sum + question.weight, 0);
    const rawPositive = stageQuestions
      .filter((question) => required.has(question.id) && positive(question.id))
      .reduce((sum, question) => sum + question.weight, 0);
    const ratio = rawTotal ? rawPositive / rawTotal : 1;
    const blockers = stageQuestions
      .filter((question) => required.has(question.id) && question.critical &&
        (!positive(question.id) || !evidence.get(question.id)))
      .map((question) => question.question);
    const prerequisiteBlockers = stage.id === "preparing" && !isTargetMarketConfirmed(targetMarket)
      ? [locale === "en" ? "Confirm the initial target market." : "초기 목표시장 정보를 확인해 주세요."]
      : [];
    const positiveScore = Math.round(stage.weight * ratio * 10) / 10;
    return {
      stageId: stage.id,
      label: stage.label,
      gate: stage.gate,
      unlocks: stage.unlocks,
      positiveScore,
      totalScore: stage.weight,
      ratio,
      blockers,
      prerequisiteBlockers,
      passed: ratio >= GATE_THRESHOLD && blockers.length === 0 && prerequisiteBlockers.length === 0,
      scoreToPass: Math.round(Math.max(0, stage.weight * GATE_THRESHOLD - positiveScore) * 10) / 10
    };
  });

  let achievedIndex = -1;
  for (const [index, stage] of stages.entries()) {
    if (!stage.passed) break;
    achievedIndex = index;
  }
  const current = stages[achievedIndex + 1] ?? null;
  const currentQuestionIds = new Set(
    current ? questionsOfStage(current.stageId, locale, "5.0").map((question) => question.id) : []
  );
  const gateMessages = current
    ? [
        ...current.prerequisiteBlockers,
        ...current.blockers,
        ...resolved.deferredGroups
          .filter((group) => group.questionIds.some((id) => currentQuestionIds.has(id)))
          .map((group) => DEFERRED_MESSAGE[group.reason][locale]),
        ...(current.blockers.length === 0 && current.scoreToPass > 0
          ? [locale === "en"
              ? `${current.scoreToPass} weighted points remain to pass ${current.label}.`
              : `${current.label} 통과까지 ${current.scoreToPass}점이 남았습니다.`]
          : [])
      ]
    : [];
  const actions: ActionRecommendation[] = current
    ? questionsOfStage(current.stageId, locale, "5.0")
        .filter((question) => required.has(question.id) &&
          (!positive(question.id) || (question.critical && !evidence.get(question.id))))
        .sort((a, b) => Number(!!b.critical) - Number(!!a.critical) || b.weight - a.weight)
        .slice(0, 5)
        .map((question) => {
          const item = itemById.get(question.itemId)!;
          const stage = stagesCatalog.find((entry) => entry.id === item.stageId)!;
          return {
            questionId: question.id,
            title: question.action,
            owner: item.owner,
            completionEvidence: question.followUp,
            phase: stage.journeyPhase,
            serviceTag: item.serviceTag,
            urgency: question.critical ? "P0" as const : "P1" as const
          };
        })
    : [];
  const answeredRequired = submitted.filter((answer) => required.has(answer.questionId)).length;

  return {
    overallScore: Math.round(stages.reduce((sum, stage) => sum + stage.positiveScore, 0)),
    domainScores: Object.fromEntries(stages.map((stage) => [stage.stageId, Math.round(stage.ratio * 100)])),
    status: (current?.label ?? (locale === "en" ? "Ready to Enter" : "진출 실행 가능")) as ReadinessStatus,
    isOnHold: gateMessages.length > 0,
    gateMessages: gateMessages.map(normalizeGateMessage),
    actions,
    stages,
    achievedStageId: achievedIndex >= 0 ? stages[achievedIndex].stageId : null,
    currentStageId: current?.stageId ?? null,
    progress: {
      answered: answeredRequired,
      required: resolved.requiredIds.length,
      percent: resolved.requiredIds.length ? Math.round((answeredRequired / resolved.requiredIds.length) * 100) : 100
    },
    deferredIds: resolved.deferredIds,
    notApplicableIds: resolved.notApplicableIds,
    deferredGroups: resolved.deferredGroups
  };
}

export function calculateReadiness(
  submitted: ReadinessAnswer[],
  targetMarket?: TargetMarketContext | null,
  locale: Locale = "ko",
  version: SurveyVersion = "4.0",
  salesMotion: SalesMotion = "unknown"
): ReadinessResult {
  return version === "5.0"
    ? calculateReadinessV5(submitted, targetMarket, locale, salesMotion)
    : calculateReadinessV4(submitted, targetMarket, locale);
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
