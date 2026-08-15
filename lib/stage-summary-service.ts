import OpenAI from "openai";
import type { Locale } from "@/lib/i18n";
import type { SurveyVersion } from "@/lib/intake-questions";
import {
  buildStageSummaryInput,
  generateStageSummary,
  stageSummarySchema,
  STAGE_SUMMARY_MODEL,
  type StageSummary
} from "@/lib/stage-summary";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { ReadinessAnswer, ReadinessLevel, SalesMotion } from "@/lib/types";

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;
type GenerateSummary = (
  input: unknown,
  locale: Locale,
  client: OpenAI
) => Promise<StageSummary>;

type EnsureStageSummaryOptions = {
  admin: AdminClient;
  assessmentId: string;
  organizationId: string;
  locale: Locale;
  answers?: ReadinessAnswer[];
  generate?: GenerateSummary;
};

export type StageSummaryResult = {
  status: "complete" | "generating" | "failed";
  summary: StageSummary | null;
};

export async function ensureStageSummary({
  admin,
  assessmentId,
  organizationId,
  locale,
  answers,
  generate = generateStageSummary
}: EnsureStageSummaryOptions): Promise<StageSummaryResult> {
  const { data: assessment } = await admin.from("assessments")
    .select("id,stage_summary,stage_summary_status,survey_version,sales_motion,target_country,target_customer_segment,target_market_confirmed_at")
    .eq("id", assessmentId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!assessment) return { status: "failed", summary: null };

  const stored = stageSummarySchema.safeParse(assessment.stage_summary);
  if (assessment.stage_summary_status === "complete" && stored.success) {
    return { status: "complete", summary: stored.data };
  }

  const { data: reservation } = await admin.from("assessments")
    .update({ stage_summary_status: "generating" })
    .eq("id", assessmentId)
    .eq("organization_id", organizationId)
    .in("stage_summary_status", ["pending", "failed"])
    .is("stage_summary", null)
    .select("id")
    .maybeSingle();
  if (!reservation) return { status: "generating", summary: null };

  try {
    let summaryAnswers = answers;
    if (!summaryAnswers) {
      const { data: rows, error } = await admin.from("readiness_answers")
        .select("question_id,level,evidence_kind,evidence_value")
        .eq("assessment_id", assessmentId);
      if (error) throw error;
      summaryAnswers = (rows ?? []).map((row) => ({
        questionId: row.question_id,
        level: row.level as ReadinessLevel,
        evidence: row.evidence_value ? {
          kind: row.evidence_kind as "note" | "url" | "file",
          value: row.evidence_value
        } : undefined
      }));
    }
    const usesDefaultGenerator = generate === generateStageSummary;
    if (usesDefaultGenerator && !process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
    const client = usesDefaultGenerator
      ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      : null as unknown as OpenAI;
    const surveyVersion: SurveyVersion = assessment.survey_version === "5.0" ? "5.0" : "4.0";
    const salesMotion: SalesMotion = ["direct", "partner", "hybrid", "unknown"].includes(assessment.sales_motion)
      ? assessment.sales_motion as SalesMotion
      : "unknown";
    const summary = await generate(buildStageSummaryInput(
      summaryAnswers,
      locale,
      surveyVersion,
      salesMotion,
      {
        targetCountry: assessment.target_country ?? "",
        targetCustomerSegment: assessment.target_customer_segment ?? "",
        confirmedAt: assessment.target_market_confirmed_at
      }
    ), locale, client);
    const generatedAt = new Date().toISOString();
    const { error } = await admin.from("assessments").update({
      stage_summary: summary,
      stage_summary_locale: locale,
      stage_summary_model: STAGE_SUMMARY_MODEL,
      stage_summary_generated_at: generatedAt,
      stage_summary_status: "complete"
    }).eq("id", assessmentId).eq("organization_id", organizationId);
    if (error) throw error;
    return { status: "complete", summary };
  } catch {
    await admin.from("assessments")
      .update({ stage_summary_status: "failed" })
      .eq("id", assessmentId)
      .eq("organization_id", organizationId);
    return { status: "failed", summary: null };
  }
}
