import { NextResponse } from "next/server";
import type { GtmFounderContext, GtmMarketResearch } from "@/lib/types";
import { createSupabaseAdminClient, requireUser } from "@/lib/supabase/server";

const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]!));

const list = (entries: unknown[]) => `<ul>${entries.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("")}</ul>`;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const admin = createSupabaseAdminClient();
  if (!user || !admin) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await params;
  const { data: profile } = await admin.from("profiles").select("organization_id").eq("id", user.id).single();
  const { data: plan } = await admin.from("gtm_plans")
    .select("id,organization_id,summary,assumptions,founder_context,market_research,updated_at")
    .eq("id", id).maybeSingle();
  if (!plan || plan.organization_id !== profile?.organization_id) {
    return NextResponse.json({ message: "계획을 찾을 수 없습니다." }, { status: 404 });
  }
  const { data: items } = await admin.from("gtm_plan_items").select("*").eq("plan_id", id)
    .order("horizon").order("sort_order");
  const context = (plan.founder_context ?? {}) as Partial<GtmFounderContext>;
  const research = plan.market_research as GtmMarketResearch | null;
  if (!research) return NextResponse.json({ message: "다운로드할 시장 조사 결과가 없습니다." }, { status: 409 });

  const marketSizes = research.marketSizing.map((entry) => `<article><h3>${entry.label}</h3><strong>${escapeHtml(entry.estimate)}</strong><p>${escapeHtml(entry.method)}</p>${list(entry.assumptions)}</article>`).join("");
  const competitors = research.competitors.map((entry) => `<tr><td>${escapeHtml(entry.name)}</td><td>${escapeHtml(entry.type)}</td><td>${escapeHtml(entry.relevance)}</td><td>${escapeHtml(entry.differentiationGap)}</td></tr>`).join("");
  const planItems = (items ?? []).map((item) => `<article><p><strong>${item.horizon}일 · ${escapeHtml(item.priority)}</strong></p><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.rationale)}</p><dl><dt>담당</dt><dd>${escapeHtml(item.owner_label)}</dd><dt>기한</dt><dd>${escapeHtml(item.due_date)}</dd><dt>완료 근거</dt><dd>${escapeHtml(item.completion_evidence)}</dd></dl></article>`).join("");
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>Global GTM 실행 보고서</title><style>body{font:16px/1.6 system-ui,sans-serif;color:#0a251b;max-width:1080px;margin:40px auto;padding:0 24px}h1{font-size:42px}h2{margin-top:48px;border-bottom:2px solid #188653;padding-bottom:8px}.meta,.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}.grid article,section>article{border:1px solid #d8e3dd;border-radius:16px;padding:20px;margin:12px 0}table{width:100%;border-collapse:collapse}th,td{text-align:left;vertical-align:top;border-bottom:1px solid #ddd;padding:10px}dt{font-weight:700}dd{margin:0 0 8px}@media print{body{margin:0}.no-print{display:none}}</style></head><body><button class="no-print" onclick="print()">PDF로 저장·인쇄</button><p>Borderless · AI GTM 어시스턴트</p><h1>${escapeHtml(context.offeringName || "Global GTM 실행 보고서")}</h1><p>${escapeHtml(plan.summary)}</p><section class="meta"><p><strong>론칭 유형</strong><br>${escapeHtml(context.offeringType)}</p><p><strong>목표국가</strong><br>${escapeHtml(context.targetCountry)}</p><p><strong>목표 고객</strong><br>${escapeHtml(context.targetCustomer)}</p><p><strong>작성일</strong><br>${escapeHtml(String(plan.updated_at).slice(0,10))}</p></section><h2>론칭 대상 정의</h2><p>${escapeHtml(context.offeringSummary)}</p><p><strong>고객 문제</strong><br>${escapeHtml(context.customerProblem)}</p><p><strong>핵심 가치</strong><br>${escapeHtml(context.coreValue)}</p><h2>AI 시장·경쟁 ${research.scope === "market_preresearch" ? "사전조사" : "판매 가능성 예비검증"}</h2><p>${escapeHtml(research.executiveSummary)}</p>${research.scope === "market_preresearch" ? "<p><strong>주의:</strong> 55문항 완료 전이므로 실제 판매 가능성은 판정하지 않았습니다.</p>" : `<p><strong>판매 가능성 판단:</strong> ${escapeHtml(research.sellability.summary)}</p>`}<div class="grid">${marketSizes}</div><h3>시장동향</h3>${list(research.trends.map((entry) => `${entry.title}: ${entry.finding} (${entry.sourceTitle})`))}<h3>주요 경쟁사</h3><table><thead><tr><th>이름</th><th>유형</th><th>관련성</th><th>차별화 공백</th></tr></thead><tbody>${competitors}</tbody></table><h3>다음 검증 과제</h3>${list(research.nextExperiments)}<h2>단계별 실행계획(30·60·90 Day Plan)</h2>${planItems || "<p>아직 실행 계획이 작성되지 않았습니다.</p>"}<h2>가정과 한계</h2>${list([...(plan.assumptions as string[] ?? []), ...research.limitations])}</body></html>`;
  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-disposition": `attachment; filename="global-gtm-report-${id}.html"`
    }
  });
}
