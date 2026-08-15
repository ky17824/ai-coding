import { NextResponse } from "next/server";
import { z } from "zod";
import { translateTextFields } from "@/lib/content-localization";
import { createSupabaseAdminClient, requireUser } from "@/lib/supabase/server";
import { marketResearchContextSignature, normalizeMarketResearch } from "@/lib/market-sizing";
import { marketResearchDocumentSchema, researchDocumentDigests } from "@/lib/gtm-research-documents";

const localeSchema = z.enum(["ko", "en"]).default("ko");
const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), locale: localeSchema }),
  z.object({ action: z.literal("confirm_research"), locale: localeSchema }),
  z.object({
    action: z.literal("update_item"),
    itemId: z.string().uuid(),
    ownerLabel: z.string().trim().min(1).max(80),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    completionEvidence: z.string().trim().min(1).max(400),
    status: z.enum(["not_started", "in_progress", "completed", "blocked"]),
    locale: localeSchema
  })
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const parsed = requestSchema.safeParse(await request.json());
  const en = parsed.success && parsed.data.locale === "en";
  const user = await requireUser();
  const admin = createSupabaseAdminClient();
  if (!parsed.success) {
    return NextResponse.json({ message: "Please check the plan details." }, { status: 400 });
  }
  if (!user || !admin) {
    return NextResponse.json({ message: en ? "Please sign in." : "로그인이 필요합니다." }, { status: 401 });
  }
  const { id } = await params;
  const { data: plan } = await admin
    .from("gtm_plans")
    .select("id,organization_id,founder_context,market_research,market_research_documents,market_research_confirmed_at,content_locale")
    .eq("id", id)
    .maybeSingle();
  const { data: profile } = await admin
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();
  if (!plan || plan.organization_id !== profile?.organization_id) {
    return NextResponse.json({ message: en ? "We couldn't find that plan." : "계획을 찾을 수 없습니다." }, { status: 404 });
  }
  const parsedDocuments = z.array(marketResearchDocumentSchema).safeParse(plan.market_research_documents ?? []);
  if (!parsedDocuments.success) return NextResponse.json({ message: en ? "The saved research documents are invalid." : "저장된 조사 자료 상태가 올바르지 않습니다." }, { status: 500 });
  const documentDigests = researchDocumentDigests(parsedDocuments.data);

  if (parsed.data.action === "approve") {
    const research = normalizeMarketResearch(plan.market_research);
    const legacyConfirmed = research?.marketSizingMethodologyVersion === "legacy" && documentDigests.length === 0 && Boolean(plan.market_research_confirmed_at);
    if (!research || !plan.market_research_confirmed_at || (!legacyConfirmed && (
        research.marketSizing.some((entry) => entry.status === "insufficient_evidence") ||
        research.researchContextSignature !== marketResearchContextSignature(plan.founder_context ?? {}, documentDigests)))) {
      return NextResponse.json(
        { message: en ? "Review and confirm the market and competitive research before approving the plan." : "시장·경쟁 사전조사를 확인한 뒤 계획을 승인해 주세요." },
        { status: 409 }
      );
    }
    const { error } = await admin
      .from("gtm_plans")
      .update({ status: "active", approved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", id);
    return error
      ? NextResponse.json({ message: en ? "We couldn't approve the plan." : "계획을 승인하지 못했습니다." }, { status: 500 })
      : NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "confirm_research") {
    const research = normalizeMarketResearch(plan.market_research);
    if (!research) {
      return NextResponse.json({ message: en ? "There is no market research to confirm." : "확인할 시장 조사 결과가 없습니다." }, { status: 409 });
    }
    if (research.marketSizing.some((entry) => entry.status === "insufficient_evidence")) {
      return NextResponse.json({ message: en ? "Add the missing market-sizing evidence and run the research again before confirming it." : "부족한 시장규모 근거를 입력하고 다시 조사한 뒤 확인해 주세요." }, { status: 409 });
    }
    if (!research.researchContextSignature || research.researchContextSignature !== marketResearchContextSignature(plan.founder_context ?? {}, documentDigests)) {
      return NextResponse.json({ message: en ? "Inputs changed. Run the market research again before confirming it." : "입력 내용이 변경되었습니다. 시장 조사를 다시 실행한 뒤 확인해 주세요." }, { status: 409 });
    }
    const { error } = await admin
      .from("gtm_plans")
      .update({ market_research_confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", id);
    return error
      ? NextResponse.json({ message: en ? "We couldn't confirm the market research." : "시장 조사를 확인 처리하지 못했습니다." }, { status: 500 })
      : NextResponse.json({ ok: true });
  }

  let ownerLabel = parsed.data.ownerLabel;
  let completionEvidence = parsed.data.completionEvidence;
  const sourceLocale = plan.content_locale === "en" ? "en" : "ko";
  if (sourceLocale !== parsed.data.locale) {
    const translated = await translateTextFields({ ownerLabel, completionEvidence }, sourceLocale);
    if (!translated) {
      return NextResponse.json(
        { message: en ? "We couldn't preserve this edit in the plan's original language. Please try again." : "계획 원문 언어로 변환하지 못했습니다. 다시 시도해 주세요." },
        { status: 503 }
      );
    }
    ({ ownerLabel, completionEvidence } = translated);
  }

  const { error } = await admin
    .from("gtm_plan_items")
    .update({
      owner_label: ownerLabel,
      due_date: parsed.data.dueDate,
      completion_evidence: completionEvidence,
      status: parsed.data.status,
      completed_at: parsed.data.status === "completed" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    })
    .eq("id", parsed.data.itemId)
    .eq("plan_id", id);
  return error
    ? NextResponse.json({ message: en ? "We couldn't save the plan item." : "계획 항목을 저장하지 못했습니다." }, { status: 500 })
    : NextResponse.json({ ok: true });
}
