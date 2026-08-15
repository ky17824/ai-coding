import {
  getIntakeQuestions,
  isAnswerCompatibleAcrossVersions,
  type SurveyVersion
} from "@/lib/intake-questions";
import { questionsOfStage, validateAssessmentAnswers } from "@/lib/readiness";
import type { ReadinessAnswer, SalesMotion, TargetMarketContext } from "@/lib/types";

export const PENDING_KEY = "pending-assessment";
type StageId = "early" | "preparing" | "ready";

export interface PendingAssessment {
  surveyVersion: SurveyVersion;
  completedStageId: StageId;
  salesMotion?: SalesMotion;
  targetMarket: TargetMarketContext;
  answers: ReadinessAnswer[];
}

export interface LoadedPendingAssessment extends PendingAssessment {
  needsReview: boolean;
}

const emptyMarket: TargetMarketContext = {
  targetCountry: "",
  targetCustomerSegment: "",
  confirmed: false
};

function completedStage(answers: ReadinessAnswer[], version: SurveyVersion): StageId | null {
  const answered = new Set(answers.map((answer) => answer.questionId));
  return (["ready", "preparing", "early"] as const).find((stageId) => {
    const expected = ["early", "preparing", "ready"]
      .slice(0, ["early", "preparing", "ready"].indexOf(stageId) + 1)
      .flatMap((id) => questionsOfStage(id, "ko", version).map((question) => question.id));
    return expected.length === answered.size && expected.every((id) => answered.has(id));
  }) ?? null;
}

export function savePending(pending: PendingAssessment) {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  }
}

export function loadPending(targetVersion: SurveyVersion = "4.0"): LoadedPendingAssessment | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? "null");
    const pending: PendingAssessment | null = Array.isArray(value)
      ? (() => {
          const stage = completedStage(value as ReadinessAnswer[], "4.0");
          return stage ? {
            surveyVersion: "4.0",
            completedStageId: stage,
            targetMarket: emptyMarket,
            answers: value as ReadinessAnswer[]
          } : null;
        })()
      : value && typeof value === "object" && "surveyVersion" in value && "answers" in value
        ? value as PendingAssessment
        : null;
    if (!pending || !["4.0", "5.0"].includes(pending.surveyVersion)) return null;
    if (pending.surveyVersion === "5.0" && targetVersion === "4.0") return null;
    if (pending.surveyVersion === "4.0" && targetVersion === "5.0") {
      return {
        surveyVersion: "5.0",
        completedStageId: pending.completedStageId,
        salesMotion: "unknown",
        targetMarket: pending.targetMarket ?? emptyMarket,
        answers: pending.answers.filter((answer) =>
          isAnswerCompatibleAcrossVersions(answer.questionId, "4.0", "5.0")
        ),
        needsReview: true
      };
    }
    const salesMotion = pending.surveyVersion === "5.0" ? pending.salesMotion ?? null : null;
    const valid = validateAssessmentAnswers(pending.answers, "ko", {
      surveyVersion: pending.surveyVersion,
      completedStageId: pending.completedStageId,
      salesMotion,
      targetMarket: pending.targetMarket ?? emptyMarket,
      answers: pending.answers
    }).valid;
    if (!valid) return null;
    return { ...pending, targetMarket: pending.targetMarket ?? emptyMarket, needsReview: false };
  } catch {
    return null;
  }
}

export function clearPending() {
  if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(PENDING_KEY);
}

export function getPendingAnswerCount() {
  if (typeof sessionStorage === "undefined") return 0;
  try {
    const value = JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? "null");
    return Array.isArray(value) ? value.length : Array.isArray(value?.answers) ? value.answers.length : 0;
  } catch {
    return 0;
  }
}
