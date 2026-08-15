import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GtmAssistant } from "@/components/gtm-assistant";
import { getPendingFounderQuestion } from "@/lib/gtm-assistant";
import { SiteHeader } from "@/components/site-header";
import { normalizeGateMessage, normalizeReadinessStatus } from "@/lib/readiness";
import { localizedPath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import type { GtmMarketResearch, GtmPlanItem, StoredGtmPlan } from "@/lib/types";
import { createSupabaseAdminClient, getCurrentProfile } from "@/lib/supabase/server";
import { localizeStoredGtmPlan } from "@/lib/content-localization";
import { getIntakeItems, getIntakeQuestions, type SurveyVersion } from "@/lib/intake-questions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getRequestLocale()) === "en" ? "AI GTM Assistant" : "AI GTM 어시스턴트" };
}
export const dynamic = "force-dynamic";

function mapItem(row: Record<string, unknown>): GtmPlanItem {
  return {
    id: row.id as string,
    sourceActionItemId: row.source_action_item_id as string | null,
    questionId: row.question_id as string | null,
    horizon: row.horizon as 30 | 60 | 90,
    priority: row.priority as "P0" | "P1",
    title: row.title as string,
    rationale: row.rationale as string,
    ownerLabel: row.owner_label as string,
    dueDate: row.due_date as string,
    completionEvidence: row.completion_evidence as string,
    dependencies: (row.dependencies as string[]) ?? [],
    riskNote: row.risk_note as string,
    status: row.status as GtmPlanItem["status"],
    expertRequired: row.expert_required as boolean,
    expertReason: row.expert_reason as string,
    serviceTag: row.service_tag as string,
    handoffBrief: row.handoff_brief as string,
    sources: (row.sources as GtmPlanItem["sources"]) ?? []
  };
}

export default async function AssistantPage({
  params
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const [{ user, profile }, locale] = await Promise.all([getCurrentProfile(), getRequestLocale()]);
  const admin = createSupabaseAdminClient();
  if (!user) redirect(localizedPath("/signin", locale));
  if (!admin) throw new Error("Supabase admin client is not configured");
  const { assessmentId } = await params;
  if (!profile?.organization_id) redirect(localizedPath("/account/onboarding", locale));
  const { data: assessment } = await admin
    .from("assessments")
    .select("id,overall_score,domain_scores,status_label,is_on_hold,gate_messages,target_country,target_customer_segment,survey_version")
    .eq("id", assessmentId)
    .eq("organization_id", profile.organization_id)
    .maybeSingle();
  if (!assessment) redirect(localizedPath("/dashboard", locale));
  const [{ data: actions }, { data: plan }] = await Promise.all([
    admin
      .from("action_items")
      .select("id,question_id,title,urgency,completion_evidence")
      .eq("assessment_id", assessmentId)
      .order("created_at"),
    admin
      .from("gtm_plans")
      .select("id,status,summary,assumptions,founder_context,market_research,market_research_confirmed_at,recent_messages,turn_count,generation_count,model,content_locale,founder_context_locale,market_research_locale,gtm_plan_items(*)")
      .eq("assessment_id", assessmentId)
      .in("status", ["draft", "active"])
      .maybeSingle()
  ]);
  let initialPlan: StoredGtmPlan | null = null;
  if (plan) {
    const itemRows = [...(plan.gtm_plan_items ?? [])].sort((a, b) =>
      a.horizon - b.horizon || a.sort_order - b.sort_order
    );
    initialPlan = {
      id: plan.id,
      assessmentId,
      status: plan.status,
      summary: plan.summary,
      assumptions: (plan.assumptions as string[]) ?? [],
      founderContext: (plan.founder_context as StoredGtmPlan["founderContext"]) ?? {},
      marketResearch: (plan.market_research as GtmMarketResearch | null) ?? null,
      marketResearchConfirmedAt: plan.market_research_confirmed_at,
      recentMessages: (plan.recent_messages as StoredGtmPlan["recentMessages"]) ?? [],
      turnCount: plan.turn_count,
      generationCount: plan.generation_count,
      generatedBy: plan.model,
      contentLocale: plan.content_locale ?? "ko",
      founderContextLocale: plan.founder_context_locale ?? plan.content_locale ?? "ko",
      marketResearchLocale: plan.market_research_locale ?? plan.content_locale ?? "ko",
      items: itemRows.map((row) => mapItem(row as Record<string, unknown>))
    };
    initialPlan = await localizeStoredGtmPlan(
      admin,
      profile.organization_id,
      initialPlan,
      locale
    );
  }
  const initialQuestion = initialPlan && initialPlan.items.length === 0
    ? getPendingFounderQuestion(initialPlan.founderContext, initialPlan.recentMessages, locale)
    : null;

  const surveyVersion: SurveyVersion = assessment.survey_version === "5.0" ? "5.0" : "4.0";
  const questions = new Map(getIntakeQuestions(locale, surveyVersion).map((question) => [question.id, question]));
  const items = new Map(getIntakeItems(locale).map((item) => [item.id, item]));

  return (
    <main className="app-page">
      <SiteHeader compact locale={locale} />
      <GtmAssistant
        assessment={{
          id: assessment.id,
          score: assessment.overall_score,
          status: normalizeReadinessStatus(assessment.status_label),
          isOnHold: assessment.is_on_hold,
          gateMessages: [...new Set(
            ((assessment.gate_messages as string[]) ?? []).map(normalizeGateMessage)
          )],
          targetCountry: assessment.target_country ?? "",
          targetCustomer: assessment.target_customer_segment ?? ""
        }}
        actions={(actions ?? []).map((action) => {
          const question = action.question_id ? questions.get(action.question_id) : null;
          const item = question ? items.get(question.itemId) : null;
          return {
            id: action.id,
            title: question?.action ?? action.title,
            priority: action.urgency,
            completionEvidence: question?.followUp ?? action.completion_evidence,
            owner: item?.owner
          };
        })}
        initialPlan={initialPlan}
        initialQuestion={initialQuestion}
        locale={locale}
      />
    </main>
  );
}
