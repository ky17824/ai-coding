import { z } from "zod";
import type { Locale } from "@/lib/i18n";
import { buildStageAnswerInsights } from "@/lib/readiness";
import type { ReadinessAnswer } from "@/lib/types";

export const STAGE_SUMMARY_MODEL = "gpt-5.6-sol" as const;

export const stageSummarySchema = z.object({
  headline: z.string().trim().min(10).max(100),
  overview: z.string().trim().min(40).max(600),
  whyItMatters: z.string().trim().min(40).max(600),
  priorityActions: z.array(z.object({
    title: z.string().trim().min(5).max(100),
    reason: z.string().trim().min(20).max(300),
    direction: z.string().trim().min(20).max(300)
  })).min(1).max(3),
  nextMilestone: z.string().trim().min(20).max(300)
});

export type StageSummary = z.infer<typeof stageSummarySchema>;
export type StageSummaryStatus = "pending" | "generating" | "complete" | "failed";

export function buildStageSummaryInput(answers: ReadinessAnswer[], locale: Locale) {
  const insight = buildStageAnswerInsights(answers, "early", locale);
  return {
    stageId: insight.stageId,
    stageLabel: insight.stageLabel,
    gate: insight.gate,
    score: insight.score,
    thresholdPercent: 80,
    counts: insight.counts,
    answers: insight.answers.map((answer) => ({
      questionId: answer.questionId,
      number: answer.number,
      question: answer.question,
      level: answer.level,
      answerText: answer.answerText,
      meaning: answer.meaning,
      status: answer.status,
      statusLabel: answer.statusLabel,
      hasEvidence: answer.hasEvidence
    })),
    priorityActionCandidates: insight.answers
      .filter((answer) => answer.action)
      .map((answer) => ({
        questionId: answer.questionId,
        title: answer.action!,
        completionEvidence: answer.completionEvidence,
        status: answer.status
      }))
  };
}

