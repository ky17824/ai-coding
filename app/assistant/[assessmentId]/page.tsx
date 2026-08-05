import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GtmAssistant } from "@/components/gtm-assistant";
import { SiteHeader } from "@/components/site-header";
import type { GtmPlanItem, StoredGtmPlan } from "@/lib/types";
import { createSupabaseAdminClient, requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "AI GTM 어시스턴트" };
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
  const user = await requireUser();
  const admin = createSupabaseAdminClient();
  if (!user) redirect("/signin");
  if (!admin) throw new Error("Supabase admin client is not configured");
  const { assessmentId } = await params;
  const { data: profile } = await admin
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();
  if (!profile?.organization_id) redirect("/account/onboarding");
  const { data: assessment } = await admin
    .from("assessments")
    .select("id,overall_score,domain_scores,status_label,is_on_hold,gate_messages")
    .eq("id", assessmentId)
    .eq("organization_id", profile.organization_id)
    .maybeSingle();
  if (!assessment) redirect("/dashboard");
  const [{ data: actions }, { data: plan }] = await Promise.all([
    admin
      .from("action_items")
      .select("id,title,urgency,completion_evidence")
      .eq("assessment_id", assessmentId)
      .order("created_at"),
    admin
      .from("gtm_plans")
      .select("id,status,summary,assumptions,founder_context,recent_messages,turn_count,generation_count,model")
      .eq("assessment_id", assessmentId)
      .in("status", ["draft", "active"])
      .maybeSingle()
  ]);
  let initialPlan: StoredGtmPlan | null = null;
  if (plan) {
    const { data: itemRows } = await admin
      .from("gtm_plan_items")
      .select("*")
      .eq("plan_id", plan.id)
      .order("horizon")
      .order("sort_order");
    initialPlan = {
      id: plan.id,
      assessmentId,
      status: plan.status,
      summary: plan.summary,
      assumptions: (plan.assumptions as string[]) ?? [],
      founderContext: (plan.founder_context as Record<string, string>) ?? {},
      recentMessages: (plan.recent_messages as StoredGtmPlan["recentMessages"]) ?? [],
      turnCount: plan.turn_count,
      generationCount: plan.generation_count,
      generatedBy: plan.model,
      items: (itemRows ?? []).map((row) => mapItem(row as Record<string, unknown>))
    };
  }

  return (
    <main className="app-page">
      <SiteHeader compact />
      <GtmAssistant
        assessment={{
          id: assessment.id,
          score: assessment.overall_score,
          status: assessment.status_label,
          isOnHold: assessment.is_on_hold,
          gateMessages: (assessment.gate_messages as string[]) ?? []
        }}
        actions={(actions ?? []).map((action) => ({
          id: action.id,
          title: action.title,
          priority: action.urgency,
          completionEvidence: action.completion_evidence
        }))}
        initialPlan={initialPlan}
      />
    </main>
  );
}
