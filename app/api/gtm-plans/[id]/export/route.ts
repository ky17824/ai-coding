import { NextResponse } from "next/server";
import { getRequestLocale } from "@/lib/i18n-server";
import type { GtmFounderContext, GtmMarketResearch } from "@/lib/types";
import type { GtmPlanItem, StoredGtmPlan } from "@/lib/types";
import { createSupabaseAdminClient, requireUser } from "@/lib/supabase/server";
import { localizeStoredGtmPlan } from "@/lib/content-localization";

const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]!));

const safeHref = (value: string | null) => {
  try {
    const url = new URL(value ?? "");
    return ["http:", "https:"].includes(url.protocol) ? escapeHtml(url.toString()) : null;
  } catch {
    return null;
  }
};

const list = (entries: unknown[]) => `<ul>${entries.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("")}</ul>`;

const coverageGapLabel = (gap: string, en: boolean) => en ? gap.replaceAll(":", " · ").replaceAll("-", " ") : ({
  "lane:demand": "수요·성장 조사", "lane:customer_behavior": "고객 행동 조사", "lane:channel": "유통·채널 조사",
  "lane:regulation": "규제 조사", "lane:product_culture": "제품·문화 조사", "lane:direct_competitors": "직접 경쟁사 조사",
  "lane:adjacent_competitors": "인접 경쟁사 조사", "lane:substitutes": "대체재 조사", "sources:min-8": "출처 8개 이상",
  "domains:min-8": "고유 도메인 8개 이상", "competitors:min-10": "경쟁 후보 10개 이상", "competitors:direct:min-3": "직접 경쟁 후보 3개 이상",
  "competitors:adjacent:min-2": "인접 경쟁 후보 2개 이상", "competitors:alternative:min-2": "대체재 2개 이상", "competitors:local:min-2": "현지 경쟁 후보 2개 이상",
  "competitors:regional-global:min-2": "지역·글로벌 경쟁 후보 2개 이상", "source-type:government:min-1": "정부·규제 출처 1개 이상",
  "source-type:industry:min-2": "산업자료 2개 이상", "source-type:retail:min-2": "현지 유통 출처 2개 이상", "source-type:company:min-3": "기업 공식 출처 3개 이상",
  "source-type:consumer:min-1": "소비자 출처 1개 이상"
}[gap] ?? gap);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const inline = new URL(request.url).searchParams.get("view") === "1";
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

  const marketSizes = research.marketSizing.map((entry) => {
    const title = entry.key === "beachhead" ? (en ? "Beachhead Market" : "교두보 시장(Beachhead Market)") : entry.label;
    const method = entry.method === "triangulated" ? (en ? "triangulated" : "상향식·하향식 교차검증") : (en ? "bottom up" : "상향식");
    const confidence = en ? entry.confidence : ({ high: "높음", medium: "보통", low: "낮음" }[entry.confidence]);
    const sourceKind = (kind: string) => en ? kind.replaceAll("_", " ") : ({ fact: "공개 사실", founder_input: "창업자 입력", proxy_assumption: "대리 가정" }[kind] ?? kind);
    const sources = entry.sources.length > 0
      ? `<h4>${en ? "Sources" : "근거 자료"}</h4><ul>${entry.sources.map((source) => { const href = safeHref(source.url); return `<li>${href ? `<a href="${href}">${escapeHtml(source.title)}</a>` : escapeHtml(source.title)}${source.publishedAt ? ` · ${escapeHtml(source.publishedAt)}` : ""}${source.checkedAt ? ` · ${en ? "checked" : "확인"} ${escapeHtml(source.checkedAt)}` : ""} · ${escapeHtml(sourceKind(source.kind))}</li>`; }).join("")}</ul>`
      : "";
    const calculationInputs = entry.calculationInputs.length > 0 ? `<h4>${en ? "Calculation inputs" : "계산 입력값"}</h4>${list(entry.calculationInputs.map((input) => `${input.name}: ${input.low}–${input.high} (${en ? "base" : "기준"} ${input.base}) ${input.unit} · ${input.sourceTitles.join(", ")}`))}` : "";
    const validation = entry.validation.length ? `<h4>${en ? "Validation" : "검증"}</h4>${list(entry.validation)}` : "";
    const cohesion = entry.cohesion ? `<p><strong>${en ? "Beachhead checks" : "교두보 시장 점검"}</strong><br>${escapeHtml(`${entry.cohesion.buysSimilarProducts ? "✓" : "✕"} ${en ? "similar products" : "유사 제품"} · ${entry.cohesion.similarSalesCycle ? "✓" : "✕"} ${en ? "similar sales cycle" : "유사 판매주기"} · ${entry.cohesion.wordOfMouthPotential ? "✓" : "✕"} ${en ? "word of mouth" : "입소문 가능성"} · ${entry.cohesion.notes}`)}</p>` : "";
    return `<article><h3>${escapeHtml(title)}</h3><strong>${escapeHtml(entry.estimate)}</strong><p>${entry.range ? `${entry.range.referenceYear} · ${escapeHtml(entry.range.currency)} · ` : ""}${escapeHtml(method)}</p><p><strong>${en ? "Formula" : "산식"}</strong><br>${escapeHtml(entry.formula)}</p>${calculationInputs}<p><strong>${en ? "Confidence" : "신뢰도"}</strong><br>${escapeHtml(confidence)}</p>${validation}${cohesion}${entry.assumptions.length ? `<h4>${en ? "Assumptions" : "가정"}</h4>${list(entry.assumptions)}` : ""}${entry.evidenceGaps.length ? `<h4>${en ? "Evidence gaps" : "근거 공백"}</h4>${list(entry.evidenceGaps)}` : ""}${entry.expansionPath.length ? `<p><strong>${en ? "Expansion path" : "인접시장 확장 경로"}</strong><br>${escapeHtml(entry.expansionPath.join(" → "))}</p>` : ""}${sources}</article>`;
  }).join("");
  const trendLabel = (value: string) => en ? value.replaceAll("_", " ") : ({ demand: "수요·성장", customer_behavior: "고객 행동", channel: "유통·채널", regulation: "규제", product_culture: "제품·문화" }[value] ?? value);
  const competitorLabel = (presence: string, type: string) => en ? `${presence} · ${type}` : `${{ local: "현지", regional: "지역", global: "글로벌" }[presence] ?? presence} · ${{ direct: "직접", adjacent: "인접", alternative: "대체재" }[type] ?? type}`;
  const sourceKindLabel = (value: string) => en ? value : ({ government: "정부·규제", industry: "산업자료", retail: "현지 유통", company: "기업 공식", consumer: "소비자", media: "미디어" }[value] ?? value);
  const trendCards = research.trends.map((entry) => `<article><p><strong>${escapeHtml(entry.title)}</strong> · ${escapeHtml(trendLabel(entry.category))}</p><p>${escapeHtml(en ? `${entry.confidence} confidence · ${entry.freshness}` : `신뢰도 ${{ low: "낮음", medium: "보통", high: "높음" }[entry.confidence]} · ${{ current: "최신", aging: "오래된 자료 포함", undated: "발행일 미상" }[entry.freshness]}`)}</p><p>${escapeHtml(entry.finding)}</p><p><strong>${en ? "Business implication" : "사업 시사점"}</strong><br>${escapeHtml(entry.implication)}</p>${list(entry.sources.map((source) => `${source.title}${source.publisher ? ` · ${source.publisher}` : ""}${source.publishedAt ? ` · ${source.publishedAt}` : ""}`))}</article>`).join("");
  const competitors = research.competitors.map((entry) => `<tr><td data-label="${en ? "Name" : "이름"}">${escapeHtml(entry.name)}</td><td data-label="${en ? "Type" : "유형"}">${escapeHtml(competitorLabel(entry.marketPresence, entry.type))}</td><td data-label="${en ? "Position" : "포지션"}">${escapeHtml(entry.relevance)}<br><strong>${en ? "Target customer" : "목표 고객"}</strong> ${escapeHtml(entry.targetCustomer)}<br><strong>${en ? "Value" : "제공 가치"}</strong> ${escapeHtml(entry.valueProposition)}${entry.strengths.length ? `<br><strong>${en ? "Strengths" : "강점"}</strong> ${escapeHtml(entry.strengths.join(" · "))}` : ""}${entry.weaknesses.length ? `<br><strong>${en ? "Weaknesses" : "약점"}</strong> ${escapeHtml(entry.weaknesses.join(" · "))}` : ""}</td><td data-label="${en ? "Price & channels" : "가격·채널"}">${escapeHtml(entry.pricePositioning)}${entry.channels.length ? `<br>${escapeHtml(entry.channels.join(" · "))}` : ""}</td><td data-label="${en ? "Differentiation gap" : "차별화 공백"}">${escapeHtml(entry.differentiationGap)}<br><strong>${en ? "Sources" : "출처"}</strong> ${escapeHtml(entry.sources.map((source) => source.title).join(" · "))}</td></tr>`).join("");
  const allResearchSources = [...new Map([...research.trends.flatMap((entry) => entry.sources), ...research.competitors.flatMap((entry) => entry.sources), ...research.contradictions.flatMap((entry) => entry.sources)].map((source) => [source.url || `${source.publisher}:${source.title}`, source])).values()];
  const sourceList = `<ul>${allResearchSources.map((source) => { const href = safeHref(source.url); return `<li>${href ? `<a href="${href}">${escapeHtml(source.title)}</a>` : escapeHtml(source.title)}${source.publisher ? ` · ${escapeHtml(source.publisher)}` : ""}${source.publishedAt ? ` · ${escapeHtml(source.publishedAt)}` : ""} · ${escapeHtml(sourceKindLabel(source.kind))}</li>`; }).join("")}</ul>`;
  const contradictions = research.contradictions.length ? `<h2>${en ? "Conflicting evidence" : "상충 근거"}</h2>${research.contradictions.map((entry) => `<article><h3>${escapeHtml(entry.topic)}</h3><p>${escapeHtml(entry.summary)}</p>${list(entry.sources.map((source) => `${source.title}${source.publisher ? ` · ${source.publisher}` : ""}`))}</article>`).join("")}` : "";
  const planItems = localizedPlan.items.map((item) => `<article><p><strong>${item.horizon} ${en ? "days" : "일"} · ${escapeHtml(item.priority)}</strong></p><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.rationale)}</p><dl><dt>${en ? "Owner" : "담당"}</dt><dd>${escapeHtml(item.ownerLabel)}</dd><dt>${en ? "Due date" : "기한"}</dt><dd>${escapeHtml(item.dueDate)}</dd><dt>${en ? "Completion evidence" : "완료 근거"}</dt><dd>${escapeHtml(item.completionEvidence)}</dd></dl></article>`).join("");
  const fontUrl = escapeHtml(new URL("/fonts/PretendardVariable.woff2", request.url).toString());
  const prefix = en ? "/en" : "";
  const toolbar = inline ? `<nav class="toolbar no-print"><a href="${prefix}/assistant/${escapeHtml(plan.assessment_id)}">← ${en ? "Back to assistant" : "어시스턴트로 돌아가기"}</a><span><button onclick="print()">${en ? "Print or save as PDF" : "PDF로 저장·인쇄"}</button><a href="${prefix}/api/gtm-plans/${escapeHtml(id)}/export">${en ? "Download HTML" : "HTML 다운로드"}</a></span></nav>` : `<button class="no-print" onclick="print()">${en ? "Print or save as PDF" : "PDF로 저장·인쇄"}</button>`;
  const html = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${en ? "Comprehensive Market Report" : "종합 시장보고서"}</title><style>@font-face{font-family:"Pretendard Variable";font-style:normal;font-weight:45 920;font-display:swap;src:url("${fontUrl}") format("woff2-variations")}*{box-sizing:border-box}body{font:16px/1.6 "Pretendard Variable",Pretendard,"Noto Sans KR",system-ui,sans-serif;color:#0a251b;max-width:1080px;margin:40px auto;padding:0 24px;background:#fbfcfa}a{color:#157a4c;overflow-wrap:anywhere}.toolbar{position:sticky;top:12px;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 16px;border:1px solid #d8e3dd;border-radius:14px;background:#fff;box-shadow:0 8px 24px #0a251b14}.toolbar span{display:flex;gap:10px}.toolbar a,.toolbar button{min-height:42px;border:1px solid #176c4c;border-radius:10px;padding:9px 14px;background:#fff;color:#0d583d;font:inherit;font-weight:750;text-decoration:none;cursor:pointer}.toolbar span a{background:#0d583d;color:#fff}h1{font-size:42px;line-height:1.15}h2{margin-top:48px;border-bottom:2px solid #188653;padding-bottom:8px}h3{font-size:24px}.meta,.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.grid article,section>article{border:1px solid #d8e3dd;border-radius:16px;padding:20px;margin:12px 0;background:#fff}table{width:100%;border-collapse:collapse;background:#fff}th,td{text-align:left;vertical-align:top;border-bottom:1px solid #ddd;padding:10px}dt{font-weight:700}dd{margin:0 0 8px}.notice{padding:12px;background:#fff6e8;border:1px solid #e7b876;border-radius:10px}@media(max-width:700px){body{margin:16px auto;padding:0 16px}h1{font-size:32px}.meta,.grid{grid-template-columns:1fr}.toolbar{position:static;align-items:stretch;flex-direction:column}.toolbar span{display:grid}.toolbar a,.toolbar button{text-align:center}table,thead,tbody,tr,th,td{display:block}thead{position:absolute;left:-9999px}tr{border:1px solid #d8e3dd;border-radius:12px;margin:12px 0;padding:10px}td{border:0}}@media print{body{margin:0;background:#fff}.no-print{display:none}}</style></head><body>${toolbar}${localizedPlan.translationFallback ? `<p class="notice">${en ? "Some saved content could not be translated and is shown in its original language." : "일부 저장 내용을 번역하지 못해 원문으로 표시합니다."}</p>` : ""}<p>Borderless · ${en ? "COMPREHENSIVE MARKET REPORT" : "종합 시장보고서"}</p><h1>${escapeHtml(context.offeringName || (en ? "Comprehensive Market Report" : "종합 시장보고서"))}</h1><p>${escapeHtml(research.executiveSummary)}</p><section class="meta"><p><strong>${en ? "Offering type" : "론칭 유형"}</strong><br>${escapeHtml(context.offeringType)}</p><p><strong>${en ? "Target country" : "목표국가"}</strong><br>${escapeHtml(context.targetCountry)}</p><p><strong>${en ? "Target customer" : "목표 고객"}</strong><br>${escapeHtml(context.targetCustomer)}</p><p><strong>${en ? "Updated" : "작성일"}</strong><br>${escapeHtml(String(plan.updated_at).slice(0,10))}</p></section><h2>${en ? "Offering Definition" : "론칭 대상 정의"}</h2><p>${escapeHtml(context.offeringSummary)}</p><p><strong>${en ? "Customer problem" : "고객 문제"}</strong><br>${escapeHtml(context.customerProblem)}</p><p><strong>${en ? "Core value" : "핵심 가치"}</strong><br>${escapeHtml(context.coreValue)}</p><h2>${en ? `AI ${research.scope === "market_preresearch" ? "Market & Competitive Research" : "Preliminary Sellability Review"}` : `AI 시장·경쟁 ${research.scope === "market_preresearch" ? "사전조사" : "판매 가능성 예비검증"}`}</h2><p>${escapeHtml(research.executiveSummary)}</p>${research.scope === "market_preresearch" ? (en ? "<p><strong>Note:</strong> Sellability was not assessed because the 55-question assessment is incomplete.</p>" : "<p><strong>주의:</strong> 55문항 완료 전이므로 실제 판매 가능성은 판정하지 않았습니다.</p>") : `<p><strong>${en ? "Sellability assessment" : "판매 가능성 판단"}:</strong> ${escapeHtml(research.sellability.summary)}</p>`}<h2>${en ? "Market boundary and size" : "시장 범위와 규모"}</h2><p>${escapeHtml(research.marketDefinition.included)}${research.marketDefinition.excluded ? ` · ${en ? "Excluded" : "제외"}: ${escapeHtml(research.marketDefinition.excluded)}` : ""}</p><div class="grid">${marketSizes}</div><h2>${en ? "Market trends" : "시장동향"}</h2>${list(research.trends.map((entry) => `${entry.title}: ${entry.finding} (${entry.sourceTitle})`))}<h2>${en ? "Competitive landscape" : "경쟁 구도"}</h2><table><caption>${en ? "Verified competitor candidates" : "확인된 경쟁 후보"}</caption><thead><tr><th>${en ? "Name" : "이름"}</th><th>${en ? "Type" : "유형"}</th><th>${en ? "Relevance" : "관련성"}</th><th>${en ? "Differentiation gap" : "차별화 공백"}</th></tr></thead><tbody>${competitors}</tbody></table><h2>${en ? "Next validation tasks" : "다음 검증 과제"}</h2>${list(research.nextExperiments)}${planItems ? `<h2>${en ? "Appendix · 30 · 60 · 90 Day Plan" : "부록 · 단계별 실행계획(30·60·90 Day Plan)"}</h2>${planItems}` : ""}<h2>${en ? "Assumptions & Limitations" : "가정과 한계"}</h2>${list([...localizedPlan.assumptions, ...research.limitations])}</body></html>`;
  const legacyTrends = `<h2>${en ? "Market trends" : "시장동향"}</h2>${list(research.trends.map((entry) => `${entry.title}: ${entry.finding} (${entry.sourceTitle})`))}`;
  const legacyCompetitors = `<h2>${en ? "Competitive landscape" : "경쟁 구도"}</h2><table><caption>${en ? "Verified competitor candidates" : "확인된 경쟁 후보"}</caption><thead><tr><th>${en ? "Name" : "이름"}</th><th>${en ? "Type" : "유형"}</th><th>${en ? "Relevance" : "관련성"}</th><th>${en ? "Differentiation gap" : "차별화 공백"}</th></tr></thead><tbody>${competitors}</tbody></table>`;
  const comprehensiveHtml = html
    .replace("</head>", "<style>@media(max-width:700px){td:before{content:attr(data-label);display:block;color:#157a4c;font-size:12px;font-weight:800}}</style></head>")
    .replace(legacyTrends, `<h2>${en ? "Research coverage" : "조사 커버리지"}</h2><p>${research.researchCoverage.lanes.length} ${en ? "research areas" : "개 조사영역"} · ${research.researchCoverage.sourceCount} ${en ? "unique sources" : "개 고유 출처"} · ${research.researchCoverage.uniqueDomainCount} ${en ? "domains" : "개 도메인"} · ${research.researchCoverage.competitorCount} ${en ? "competitors" : "개 경쟁 후보"}</p><p><strong>${en ? "Source mix" : "출처 구성"}</strong><br>${Object.entries(research.researchCoverage.sourceTypes).map(([kind, count]) => `${sourceKindLabel(kind)} ${count}`).join(" · ")}</p>${research.researchCoverage.coverageGaps.length ? `<p class="notice"><strong>${en ? "Coverage gaps" : "보완할 조사 범위"}</strong><br>${escapeHtml(research.researchCoverage.coverageGaps.map((gap) => coverageGapLabel(gap, en)).join(" · "))}</p>` : ""}<h2>${en ? "Market trends" : "시장동향"}</h2><div class="grid">${trendCards}</div>`)
    .replace(legacyCompetitors, `<h2>${en ? "Competitive landscape" : "경쟁 구도"}</h2><table><caption>${en ? "Verified competitor candidates" : "확인된 경쟁 후보"}</caption><thead><tr><th>${en ? "Name" : "이름"}</th><th>${en ? "Type" : "유형"}</th><th>${en ? "Relevance" : "관련성"}</th><th>${en ? "Price & channels" : "가격·채널"}</th><th>${en ? "Differentiation gap" : "차별화 공백"}</th></tr></thead><tbody>${competitors}</tbody></table>${contradictions}<h2>${en ? "Research sources" : "전체 조사 출처"}</h2>${sourceList}`);
  return new NextResponse(comprehensiveHtml, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-disposition": inline ? "inline" : `attachment; filename="global-gtm-report-${id}.html"`
    }
  });
}
