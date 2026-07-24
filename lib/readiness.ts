import { DOMAINS, READINESS_QUESTIONS } from "@/lib/readiness-data";
import type {
  ActionRecommendation,
  ReadinessAnswer,
  ReadinessResult,
  ReadinessStatus
} from "@/lib/types";

const levelOf = (answers: Map<string, ReadinessAnswer>, id: string) =>
  answers.get(id)?.level ?? 0;

export function validateAssessmentAnswers(answers: ReadinessAnswer[]) {
  const errors: Record<string, string> = {};
  const validIds = new Set(READINESS_QUESTIONS.map((question) => question.id));

  for (const answer of answers) {
    if (!validIds.has(answer.questionId)) {
      errors[answer.questionId] = "알 수 없는 진단 문항입니다.";
      continue;
    }
    if (![0, 1, 2, 3].includes(answer.level)) {
      errors[answer.questionId] = "응답 단계가 올바르지 않습니다.";
    }
    if (
      answer.level === 3 &&
      (!answer.evidence || !answer.evidence.value.trim())
    ) {
      errors[answer.questionId] = "완료에는 메모·링크·파일 증빙이 필요합니다.";
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

function getStatus(score: number): ReadinessStatus {
  if (score < 40) return "기초 정비";
  if (score < 65) return "진출 준비";
  if (score < 80) return "현장 검증";
  return "실행 가능";
}

export function calculateReadiness(
  submittedAnswers: ReadinessAnswer[]
): ReadinessResult {
  const answers = new Map(
    submittedAnswers.map((answer) => [answer.questionId, answer])
  );
  const domainScores: Record<string, number> = {};

  for (const domain of DOMAINS) {
    const questions = READINESS_QUESTIONS.filter(
      (question) => question.domainId === domain.id
    );
    const earned = questions.reduce(
      (sum, question) => sum + levelOf(answers, question.id),
      0
    );
    domainScores[domain.id] = Math.round((earned / (questions.length * 3)) * 100);
  }

  const overallScore = Math.round(
    Object.values(domainScores).reduce((sum, score) => sum + score, 0) /
      DOMAINS.length
  );
  const gateMessages: string[] = [];
  if (levelOf(answers, "pmf") <= 1) {
    gateMessages.push("본국 PMF 증거가 부족해 해외 진출을 보류해야 합니다.");
  }
  if (levelOf(answers, "leadership-resources") <= 1) {
    gateMessages.push("장기 자원 배정 합의 전에는 해외 진출을 보류해야 합니다.");
  }

  const actions: ActionRecommendation[] = READINESS_QUESTIONS.map(
    (question, index) => ({
      question,
      index,
      level: levelOf(answers, question.id),
      rank:
        (3 - levelOf(answers, question.id)) * 100 +
        question.priority * 10 -
        (question.phase === "pre_entry"
          ? 0
          : question.phase === "initial_entry"
            ? 2
            : 4)
    })
  )
    .filter(({ level }) => level < 3)
    .sort((a, b) => b.rank - a.rank || a.index - b.index)
    .slice(0, 5)
    .map(({ question }) => ({
      questionId: question.id,
      title: question.action.title,
      owner: question.action.owner,
      completionEvidence: question.action.completionEvidence,
      phase: question.phase,
      serviceTag: question.action.serviceTag,
      urgency: question.priority === 3 ? "P0" : "P1"
    }));

  return {
    overallScore,
    domainScores,
    status: getStatus(overallScore),
    isOnHold: gateMessages.length > 0,
    gateMessages,
    actions
  };
}
