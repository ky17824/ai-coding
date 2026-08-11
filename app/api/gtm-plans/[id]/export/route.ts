import { NextResponse } from "next/server";
import { getRequestLocale } from "@/lib/i18n-server";
import type { GtmFounderContext, GtmMarketResearch } from "@/lib/types";
import type { GtmPlanItem, StoredGtmPlan } from "@/lib/types";
import { createSupabaseAdminClient, requireUser } from "@/lib/supabase/server";
import { localizeStoredGtmPlan } from "@/lib/content-localization";

const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]!));

const list = (entries: unknown[]) => `<ul>${entries.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("")}</ul>`;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const locale = await getRequestLocale();
  const en = locale === "en";
  const user = await requireUser();
  const admin = createSupabaseAdminClient();
  if (!user || !admin) return NextResponse.json({ message: en ? "Please sign in." : "로그인이 필요합니다." }, { status: 401 });

  const { id } = await params;
  const { data: profile } = await admin.from("profiles").select("organization_id").eq("id", user.id).single();
  const { data: plan } = await admin.from("gtm_plans")
    .select("id,organization_id,assessment_id,status,summary,assumptions,founder_context,market_research,market_research_confirmed_at,recent_messages,turn_count,generation_count,model,content_locale,founder_context_locale,market_research_locale,updated_at")
    .eq("id", id).maybeSingle();
  if (!plan || plan.organization_id !== profile?.organization_id) {
    return NextResponse.json({ message: en ? "We couldn't find the plan." : "계획을 찾을 수 없습니다." }, { status: 404 });
  }
  const { data: items } = await admin.from("gtm_plan_items").select("*").eq("plan_id", id)
    .order("horizon").order("sort_order");
  const localizedPlan = await localizeStoredGtmPlan(admin, plan.organization_id, {
    id: plan.id,
    assessmentId: plan.assessment_id,
    status: plan.status,
    summary: plan.summary,
    assumptions: (plan.assumptions as string[]) ?? [],
    founderContext: (plan.founder_context ?? {}) as Partial<GtmFounderContext>,
    marketResearch: plan.market_research as GtmMarketResearch | null,
    marketResearchConfirmedAt: plan.market_research_confirmed_at,
    recentMessages: plan.recent_messages ?? [],
    turnCount: plan.turn_count,
    generationCount: plan.generation_count,
    generatedBy: plan.model,
    contentLocale: plan.content_locale ?? "ko",
    founderContextLocale: plan.founder_context_locale ?? plan.content_locale ?? "ko",
    marketResearchLocale: plan.market_research_locale ?? plan.content_locale ?? "ko",
    items: (items ?? []).map((item) => ({
      id: item.id,
      sourceActionItemId: item.source_action_item_id,
      questionId: item.question_id,
      horizon: item.horizon,
      priority: item.priority,
      title: item.title,
      rationale: item.rationale,
      ownerLabel: item.owner_label,
      dueDate: item.due_date,
      completionEvidence: item.completion_evidence,
      dependencies: item.dependencies ?? [],
      riskNote: item.risk_note,
      status: item.status,
      expertRequired: item.expert_required,
      expertReason: item.expert_reason,
      serviceTag: item.service_tag,
      handoffBrief: item.handoff_brief,
      sources: item.sources ?? []
    } as GtmPlanItem))
  } satisfies StoredGtmPlan, locale);
  const context = localizedPlan.founderContext;
  const research = localizedPlan.marketResearch;
  if (!research) return NextResponse.json({ message: en ? "There is no market research to download." : "다운로드할 시장 조사 결과가 없습니다." }, { status: 409 });

  const marketSizes = research.marketSizing.map((entry) => `<article><h3>${entry.label}</h3><strong>${escapeHtml(entry.estimate)}</strong><p>${escapeHtml(entry.method)}</p>${list(entry.assumptions)}</article>`).join("");
  const competitors = research.competitors.map((entry) => `<tr><td>${escapeHtml(entry.name)}</td><td>${escapeHtml(entry.type)}</td><td>${escapeHtml(entry.relevance)}</td><td>${escapeHtml(entry.differentiationGap)}</td></tr>`).join("");
  const planItems = localizedPlan.items.map((item) => `<article><p><strong>${item.horizon} ${en ? "days" : "일"} · ${escapeHtml(item.priority)}</strong></p><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.rationale)}</p><dl><dt>${en ? "Owner" : "담당"}</dt><dd>${escapeHtml(item.ownerLabel)}</dd><dt>${en ? "Due date" : "기한"}</dt><dd>${escapeHtml(item.dueDate)}</dd><dt>${en ? "Completion evidence" : "완료 근거"}</dt><dd>${escapeHtml(item.completionEvidence)}</dd></dl></article>`).join("");
  const fontUrl = escapeHtml(new URL("/fonts/PretendardVariable.woff2", request.url).toString());
  const html = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><title>${en ? "Global GTM Execution Report" : "Global GTM 실행 보고서"}</title><style>@font-face{font-family:"Pretendard Variable";font-style:normal;font-weight:45 920;font-display:swap;src:url("${fontUrl}") format("woff2-variations")}body{font:16px/1.6 "Pretendard Variable",Pretendard,"Noto Sans KR",system-ui,sans-serif;color:#0a251b;max-width:1080px;margin:40px auto;padding:0 24px}h1{font-size:42px}h2{margin-top:48px;border-bottom:2px solid #188653;padding-bottom:8px}.meta,.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}.grid article,section>article{border:1px solid #d8e3dd;border-radius:16px;padding:20px;margin:12px 0}table{width:100%;border-collapse:collapse}th,td{text-align:left;vertical-align:top;border-bottom:1px solid #ddd;padding:10px}dt{font-weight:700}dd{margin:0 0 8px}.notice{padding:12px;background:#fff6e8;border:1px solid #e7b876;border-radius:10px}@media print{body{margin:0}.no-print{display:none}}</style></head><body><button class="no-print" onclick="print()">${en ? "Print or save as PDF" : "PDF로 저장·인쇄"}</button>${localizedPlan.translationFallback ? `<p class="notice">${en ? "Some saved content could not be translated and is shown in its original language." : "일부 저장 내용을 번역하지 못해 원문으로 표시합니다."}</p>` : ""}<p>Borderless · ${en ? "AI GTM Assistant" : "AI GTM 어시스턴트"}</p><h1>${escapeHtml(context.offeringName || (en ? "Global GTM Execution Report" : "Global GTM 실행 보고서"))}</h1><p>${escapeHtml(localizedPlan.summary)}</p><section class="meta"><p><strong>${en ? "Offering type" : "론칭 유형"}</strong><br>${escapeHtml(context.offeringType)}</p><p><strong>${en ? "Target country" : "목표국가"}</strong><br>${escapeHtml(context.targetCountry)}</p><p><strong>${en ? "Target customer" : "목표 고객"}</strong><br>${escapeHtml(context.targetCustomer)}</p><p><strong>${en ? "Updated" : "작성일"}</strong><br>${escapeHtml(String(plan.updated_at).slice(0,10))}</p></section><h2>${en ? "Offering Definition" : "론칭 대상 정의"}</h2><p>${escapeHtml(context.offeringSummary)}</p><p><strong>${en ? "Customer problem" : "고객 문제"}</strong><br>${escapeHtml(context.customerProblem)}</p><p><strong>${en ? "Core value" : "핵심 가치"}</strong><br>${escapeHtml(context.coreValue)}</p><h2>${en ? `AI ${research.scope === "market_preresearch" ? "Market & Competitive Research" : "Preliminary Sellability Review"}` : `AI 시장·경쟁 ${research.scope === "market_preresearch" ? "사전조사" : "판매 가능성 예비검증"}`}</h2><p>${escapeHtml(research.executiveSummary)}</p>${research.scope === "market_preresearch" ? (en ? "<p><strong>Note:</strong> Sellability was not assessed because the 55-question assessment is incomplete.</p>" : "<p><strong>주의:</strong> 55문항 완료 전이므로 실제 판매 가능성은 판정하지 않았습니다.</p>") : `<p><strong>${en ? "Sellability assessment" : "판매 가능성 판단"}:</strong> ${escapeHtml(research.sellability.summary)}</p>`}<div class="grid">${marketSizes}</div><h3>${en ? "Market Trends" : "시장동향"}</h3>${list(research.trends.map((entry) => `${entry.title}: ${entry.finding} (${entry.sourceTitle})`))}<h3>${en ? "Key Competitors" : "주요 경쟁사"}</h3><table><thead><tr><th>${en ? "Name" : "이름"}</th><th>${en ? "Type" : "유형"}</th><th>${en ? "Relevance" : "관련성"}</th><th>${en ? "Differentiation gap" : "차별화 공백"}</th></tr></thead><tbody>${competitors}</tbody></table><h3>${en ? "Next Validation Tasks" : "다음 검증 과제"}</h3>${list(research.nextExperiments)}<h2>${en ? "30 · 60 · 90 Day Plan" : "단계별 실행계획(30·60·90 Day Plan)"}</h2>${planItems || (en ? "<p>No execution plan has been created yet.</p>" : "<p>아직 실행 계획이 작성되지 않았습니다.</p>")}<h2>${en ? "Assumptions & Limitations" : "가정과 한계"}</h2>${list([...localizedPlan.assumptions, ...research.limitations])}</body></html>`;
  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-disposition": `attachment; filename="global-gtm-report-${id}.html"`
    }
  });
}
