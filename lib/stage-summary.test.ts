import { describe, expect, it } from "vitest";
import { questionsOfStage } from "@/lib/readiness";
import type { ReadinessAnswer } from "@/lib/types";
import {
  buildStageSummaryInput,
  stageSummarySchema
} from "@/lib/stage-summary";

const validActions = [
  {
    title: "진출 비용 범위를 확정하세요",
    reason: "비용 범위가 없으면 투자 가능한 시장 검증의 크기와 중단 기준을 정할 수 없습니다.",
    direction: "인증·현지화·인력·법률·물류 비용을 같은 기준으로 합산해 상한선을 정합니다."
  },
  {
    title: "전담 책임자를 지정하세요",
    reason: "담당자와 투입 시간이 없으면 중요한 검증 과제가 국내 업무에 밀려 반복적으로 지연됩니다.",
    direction: "의사결정 권한이 있는 책임자와 주당 확보 시간을 문서로 합의합니다."
  },
  {
    title: "중단 기준을 합의하세요",
    reason: "중단 기준이 없으면 근거가 부족해도 비용과 시간이 계속 투입될 위험이 있습니다.",
    direction: "90일 안에 확인할 지표와 최소 통과값을 경영진이 함께 확정합니다."
  }
];

const validSummary = {
  headline: "기회는 확인했지만 실행 책임과 비용 기준이 먼저 필요합니다",
  overview: "현재 답변에서는 글로벌 진출의 필요성과 제품 가능성은 인식하고 있습니다. 다만 실행 책임자와 비용 범위가 확정되지 않아 준비 1단계를 통과하기에는 실행 기반이 부족합니다.",
  whyItMatters: "책임과 비용 기준 없이 진출을 시작하면 검증 과제가 국내 업무에 밀리고 예상 밖 비용이 발생해도 중단하거나 조정할 기준이 없습니다. 이는 의사결정 지연과 반복 지출로 이어질 수 있습니다.",
  priorityActions: validActions,
  nextMilestone: "책임자·투입 시간·총비용 상한·90일 중단 기준을 경영진이 문서로 합의하면 다음 단계 판단이 가능합니다."
};

describe("stage readiness summary", () => {
  it("builds one grounded input row for every Stage 1 answer", () => {
    const questions = questionsOfStage("early", "ko");
    const answers: ReadinessAnswer[] = questions.map((question, index) => ({
      questionId: question.id,
      level: index === 0 ? 2 : 3,
      evidence: question.critical && index > 0
        ? { kind: "note", value: "경영회의 확인 기록" }
        : undefined
    }));

    const input = buildStageSummaryInput(answers, "ko");

    expect(input.answers).toHaveLength(questions.length);
    expect(new Set(input.answers.map((answer) => answer.questionId)).size).toBe(questions.length);
    expect(input.answers[0]).toMatchObject({
      questionId: questions[0].id,
      question: questions[0].question,
      level: 2,
      answerText: questions[0].options[1],
      hasEvidence: false
    });
    expect(input.score).toBeGreaterThanOrEqual(0);
    expect(input.thresholdPercent).toBe(80);
    expect(input.priorityActionCandidates.length).toBeGreaterThan(0);
  });

  it("requires one to three priority actions", () => {
    expect(stageSummarySchema.safeParse({ ...validSummary, priorityActions: [] }).success).toBe(false);
    expect(stageSummarySchema.safeParse({ ...validSummary, priorityActions: validActions }).success).toBe(true);
    expect(stageSummarySchema.safeParse({
      ...validSummary,
      priorityActions: [...validActions, validActions[0]]
    }).success).toBe(false);
  });
});
