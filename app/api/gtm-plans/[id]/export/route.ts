import { NextResponse } from "next/server";
import { getRequestLocale } from "@/lib/i18n-server";
import type { GtmFounderContext, GtmMarketResearch } from "@/lib/types";
import type { GtmPlanItem, MarketResearchDocument, StoredGtmPlan } from "@/lib/types";
import { createSupabaseAdminClient, requireUser } from "@/lib/supabase/server";
import { localizeStoredGtmPlan } from "@/lib/content-localization";
import { resolveAssessmentQuestions } from "@/lib/readiness";
import type { SurveyVersion } from "@/lib/intake-questions";
import type { ReadinessAnswer, ReadinessLevel, SalesMotion } from "@/lib/types";
import { buildReferenceIndex, renderBibliography, renderCitationLinks } from "./citations";

const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]!));

const cleanReportText = (value: unknown, en: boolean) => String(value ?? "")
  .replace(/\(\[([^\]]+)]\(https?:\/\/[^\s)]+\)\)/gi, "$1")
  .replace(/\[([^\]]+)]\(https?:\/\/[^\s)]+\)/gi, "$1")
  .replace(/https?:\/\/[^\s<>"')\]]+/gi, "")
  .replace(/\bproxy_assumption\b/g, en ? "proxy assumption" : "대리 가정")
  .replace(/\s{2,}/g, " ")
  .trim();

const reportText = (value: unknown, en: boolean) => escapeHtml(cleanReportText(value, en));
const list = (entries: unknown[], en: boolean) => `<ul>${entries.map((entry) => `<li>${reportText(entry, en)}</li>`).join("")}</ul>`;

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
    .select("id,organization_id,assessment_id,status,summary,assumptions,founder_context,market_research,market_research_documents,market_research_confirmed_at,recent_messages,turn_count,generation_count,model,content_locale,founder_context_locale,market_research_locale,updated_at")
    .eq("id", id).maybeSingle();
  if (!plan || plan.organization_id !== profile?.organization_id) {
    return NextResponse.json({ message: en ? "We couldn't find the plan." : "계획을 찾을 수 없습니다." }, { status: 404 });
  }
  const { data: items } = await admin.from("gtm_plan_items").select("*").eq("plan_id", id)
    .order("horizon").order("sort_order");
  let readinessApplicabilityHtml = "";
  if (plan.assessment_id) {
    const [assessmentResult, answersResult] = await Promise.all([
      admin.from("assessments").select("survey_version,sales_motion,target_country,target_customer_segment,target_market_confirmed_at")
        .eq("id", plan.assessment_id).maybeSingle(),
      admin.from("readiness_answers").select("question_id,level").eq("assessment_id", plan.assessment_id).limit(55)
    ]);
    if (assessmentResult.error || answersResult.error) {
      return NextResponse.json({ message: en ? "We couldn't load the readiness coverage." : "준비도 문항 적용 범위를 불러오지 못했습니다." }, { status: 500 });
    }
    const assessment = assessmentResult.data;
    const answerRows = answersResult.data;
    if (assessment) {
      const surveyVersion: SurveyVersion = assessment.survey_version === "5.0" ? "5.0" : "4.0";
      const salesMotion: SalesMotion = ["direct", "partner", "hybrid", "unknown"].includes(assessment.sales_motion ?? "")
        ? assessment.sales_motion as SalesMotion
        : "unknown";
      const readinessAnswers: ReadinessAnswer[] = (answerRows ?? []).flatMap((row) => [1, 2, 3, 4].includes(Number(row.level))
        ? [{ questionId: row.question_id, level: Number(row.level) as ReadinessLevel }]
        : []);
      const resolved = resolveAssessmentQuestions({
        surveyVersion,
        salesMotion,
        targetMarket: {
          targetCountry: assessment.target_country ?? "",
          targetCustomerSegment: assessment.target_customer_segment ?? "",
          confirmed: Boolean(assessment.target_market_confirmed_at)
        },
        answers: readinessAnswers
      });
      const answered = new Set(readinessAnswers.map((answer) => answer.questionId));
      const reasonLabels: Record<string, string> = en ? {
        direct_entry: "Direct entry selected; partner-only questions do not apply",
        paid_evidence_missing: "No paid-customer evidence; revenue-concentration question does not apply",
        target_country_missing: "Target-country questions deferred until a country is selected",
        sales_motion_unknown: "Partner questions deferred until a sales motion is selected",
        local_test_not_started: "Issue-resolution question deferred until a local test starts"
      } : {
        direct_entry: "직접 진출을 선택해 파트너 전용 문항은 해당 없음",
        paid_evidence_missing: "유료 고객 증거가 없어 매출 집중도 문항은 해당 없음",
        target_country_missing: "목표국가가 정해질 때까지 현지 문항 보류",
        sales_motion_unknown: "판매 방식이 정해질 때까지 파트너 문항 보류",
        local_test_not_started: "현지 시험을 시작할 때까지 문제 해결 문항 보류"
      };
      const reasonCounts = new Map<string, number>();
      [
        ...resolved.deferredGroups.map((group) => ({ reason: group.reason, count: group.questionIds.length })),
        ...(salesMotion === "direct" && resolved.notApplicableIds.some((questionId) => questionId !== "alloc-concentration")
          ? [{ reason: "direct_entry", count: resolved.notApplicableIds.filter((questionId) => questionId !== "alloc-concentration").length }]
          : []),
        ...(resolved.notApplicableIds.includes("alloc-concentration")
          ? [{ reason: "paid_evidence_missing", count: 1 }]
          : [])
      ].forEach(({ reason, count }) => reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + count));
      const reasons = [...reasonCounts].map(([reason, count]) => `${reasonLabels[reason] ?? reason} (${count})`);
      readinessApplicabilityHtml = `<h2>${en ? "Readiness question coverage" : "준비도 문항 적용 범위"}</h2><div class="readiness-stats"><p><strong>${resolved.requiredIds.filter((questionId) => answered.has(questionId)).length}/${resolved.requiredIds.length}</strong><span>${en ? "Required answered" : "필수 응답"}</span></p><p><strong>${resolved.deferredIds.length}</strong><span>${en ? "Deferred" : "보류"}</span></p><p><strong>${resolved.notApplicableIds.length}</strong><span>${en ? "Not applicable" : "해당 없음"}</span></p></div>${reasons.length ? `<div class="readiness-reasons">${list(reasons, en)}</div>` : ""}`;
    }
  }
  const localizedPlan = await localizeStoredGtmPlan(admin, plan.organization_id, {
    id: plan.id,
    assessmentId: plan.assessment_id,
    status: plan.status,
    summary: plan.summary,
    assumptions: (plan.assumptions as string[]) ?? [],
    founderContext: (plan.founder_context ?? {}) as Partial<GtmFounderContext>,
    marketResearch: plan.market_research as GtmMarketResearch | null,
    marketResearchDocuments: (plan.market_research_documents ?? []) as MarketResearchDocument[],
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
  } satisfies StoredGtmPlan, locale, { waitForMissing: true });
  const context = localizedPlan.founderContext;
  const research = localizedPlan.marketResearch;
  if (!research) return NextResponse.json({ message: en ? "There is no market research to download." : "다운로드할 시장 조사 결과가 없습니다." }, { status: 409 });
  const referenceIndex = buildReferenceIndex([
    ...research.marketSizing.flatMap((entry) => [
      ...entry.calculationInputs.flatMap((input) => input.sources),
      ...entry.sources
    ]),
    ...research.trends.flatMap((entry) => entry.sources),
    ...research.competitors.flatMap((entry) => entry.sources),
    ...research.contradictions.flatMap((entry) => entry.sources)
  ]);
  const citations = (sources: Parameters<typeof renderCitationLinks>[1]) => renderCitationLinks(referenceIndex, sources);

  const researchDocumentSummaryHtml = localizedPlan.marketResearchDocuments?.length
    ? `<h3>${en ? "Customer documents used" : "사용자 자료 반영"}</h3><p>${en ? "Only sanitized evidence counts are shown; original files are not included in this report." : "이 보고서에는 정제된 근거의 개수만 표시하며 원본 파일 내용은 포함하지 않습니다."}</p>${list(localizedPlan.marketResearchDocuments.map((document) => {
      const status = en
        ? ({ uploaded: "waiting for analysis", processed: "analyzed", failed: "analysis failed", cleanup_pending: "deletion pending" }[document.status])
        : ({ uploaded: "분석 대기", processed: "분석 완료", failed: "분석 실패", cleanup_pending: "원본 삭제 대기" }[document.status]);
      const facts = (document.evidence?.facts.length ?? 0) + (document.evidence?.numericFacts.length ?? 0);
      const gaps = document.evidence?.gaps.length ?? 0;
      const contradictions = document.evidence?.contradictions.length ?? 0;
      return en
        ? `${document.displayName} · ${status} · evidence ${facts} · gaps ${gaps} · contradictions ${contradictions}`
        : `${document.displayName} · ${status} · 근거 ${facts}개 · 공백 ${gaps}개 · 상충 ${contradictions}개`;
    }), en)}`
    : "";

  const marketSizes = research.marketSizing.map((entry) => {
    const title = entry.key === "beachhead" ? (en ? "Beachhead Market" : "교두보 시장(Beachhead Market)") : entry.label;
    const method = entry.method === "top_down"
      ? (en ? "Top-Down · public-evidence estimate" : "Top-Down · 공개자료 기반 하향식 추정")
      : entry.method === "triangulated"
        ? (en ? "triangulated" : "상향식·하향식 교차검증")
        : (en ? "bottom up" : "상향식");
    const confidence = en ? entry.confidence : ({ high: "높음", medium: "보통", low: "낮음" }[entry.confidence]);
    const status = entry.status === "estimated" ? (en ? "Estimated" : "추정치") : (en ? "Insufficient evidence" : "근거 부족");
    const sources = entry.sources.length > 0
      ? `<p><strong>${en ? "Sources" : "근거 자료"}</strong> ${citations(entry.sources)}</p>`
      : "";
    const calculationInputs = entry.calculationInputs.length > 0 ? `<h4>${en ? "Calculation inputs" : "계산 입력값"}</h4><ul>${entry.calculationInputs.map((input) => `<li>${reportText(`${input.name}: ${input.low}–${input.high} (${en ? "base" : "기준"} ${input.base}) ${input.unit}`, en)} · ${citations(input.sources)}</li>`).join("")}</ul>` : "";
    const keyLimitation = entry.evidenceGaps.length ? `<p class="key-limitation"><strong>${en ? "Key limitation" : "핵심 한계"}</strong><br>${reportText(entry.evidenceGaps.join(" · "), en)}</p>` : "";
    const validation = entry.validation.length ? `<h4>${en ? "Validation" : "검증"}</h4>${list(entry.validation, en)}` : "";
    const cohesion = entry.cohesion ? `<p><strong>${en ? "Beachhead checks" : "교두보 시장 점검"}</strong><br>${reportText(`${entry.cohesion.buysSimilarProducts ? "✓" : "✕"} ${en ? "similar products" : "유사 제품"} · ${entry.cohesion.similarSalesCycle ? "✓" : "✕"} ${en ? "similar sales cycle" : "유사 판매주기"} · ${entry.cohesion.wordOfMouthPotential ? "✓" : "✕"} ${en ? "word of mouth" : "입소문 가능성"} · ${entry.cohesion.notes}`, en)}</p>` : "";
    const detail = `${calculationInputs}<p><strong>${en ? "Confidence" : "신뢰도"}</strong><br>${reportText(confidence, en)}</p>${validation}${cohesion}${entry.assumptions.length ? `<h4>${en ? "Assumptions" : "가정"}</h4>${list(entry.assumptions, en)}` : ""}${entry.expansionPath.length ? `<p><strong>${en ? "Expansion path" : "인접시장 확장 경로"}</strong><br>${reportText(entry.expansionPath.join(" → "), en)}</p>` : ""}${sources}`;
    return `<article class="market-card"><h3>${reportText(title, en)}</h3><strong>${reportText(entry.estimate, en)}</strong><p class="market-status"><strong>${en ? "Status" : "상태"}</strong><br>${status}</p><p><strong>${en ? "Formula" : "산식"}</strong><br>${reportText(entry.formula, en)}</p>${keyLimitation}<p class="market-method">${entry.range ? `${entry.range.referenceYear} · ${reportText(entry.range.currency, en)} · ` : ""}${reportText(method, en)}</p>${detail ? `<details class="market-details"><summary>${en ? "View calculation details" : "계산 근거·가정 보기"}</summary>${detail}</details>` : ""}</article>`;
  }).join("");
  const trendLabel = (value: string) => en ? value.replaceAll("_", " ") : ({ demand: "수요·성장", customer_behavior: "고객 행동", channel: "유통·채널", regulation: "규제", product_culture: "제품·문화" }[value] ?? value);
  const competitorLabel = (presence: string, type: string) => en ? `${presence} · ${type}` : `${{ local: "현지", regional: "지역", global: "글로벌" }[presence] ?? presence} · ${{ direct: "직접", adjacent: "인접", alternative: "대체재" }[type] ?? type}`;
  const sourceKindLabel = (value: string) => en ? value.replaceAll("_", " ") : ({ government: "정부·규제", industry: "산업자료", retail: "현지 유통", company: "기업 공식", consumer: "소비자", media: "미디어", fact: "공개 사실", founder_input: "창업자 입력", proxy_assumption: "대리 가정" }[value] ?? value);
  const trendCards = research.trends.map((entry) => `<article class="primary-card"><p><strong>${reportText(entry.title, en)}</strong> · ${reportText(trendLabel(entry.category), en)}</p><p class="card-meta">${reportText(en ? `${entry.confidence} confidence · ${entry.freshness}` : `신뢰도 ${{ low: "낮음", medium: "보통", high: "높음" }[entry.confidence]} · ${{ current: "최신", aging: "오래된 자료 포함", undated: "발행일 미상" }[entry.freshness]}`, en)}</p><p>${reportText(entry.finding, en)}</p><p><strong>${en ? "Business implication" : "사업 시사점"}</strong><br>${reportText(entry.implication, en)}</p><p><strong>${en ? "Sources" : "출처"}</strong> ${citations(entry.sources)}</p></article>`).join("");
  const competitors = research.competitors.map((entry) => `<article class="competitor-card"><header><h3>${reportText(entry.name, en)}</h3><span>${reportText(competitorLabel(entry.marketPresence, entry.type), en)}</span></header><p>${reportText(entry.relevance, en)}</p><dl><dt>${en ? "Target customer" : "목표 고객"}</dt><dd>${reportText(entry.targetCustomer, en)}</dd><dt>${en ? "Value" : "제공 가치"}</dt><dd>${reportText(entry.valueProposition, en)}</dd>${entry.strengths.length ? `<dt>${en ? "Strengths" : "강점"}</dt><dd>${reportText(entry.strengths.join(" · "), en)}</dd>` : ""}${entry.weaknesses.length ? `<dt>${en ? "Weaknesses" : "약점"}</dt><dd>${reportText(entry.weaknesses.join(" · "), en)}</dd>` : ""}<dt>${en ? "Price & channels" : "가격·채널"}</dt><dd>${reportText([entry.pricePositioning, ...entry.channels].filter(Boolean).join(" · "), en)}</dd><dt>${en ? "Differentiation gap" : "차별화 공백"}</dt><dd>${reportText(entry.differentiationGap, en)}</dd></dl><p><strong>${en ? "Sources" : "출처"}</strong> ${citations(entry.sources)}</p></article>`).join("");
  const sourceList = renderBibliography(referenceIndex, sourceKindLabel);
  const contradictions = research.contradictions.map((entry) => `<article class="primary-card"><h3>${reportText(entry.topic, en)}</h3><p>${reportText(entry.summary, en)}</p><p><strong>${en ? "Sources" : "출처"}</strong> ${citations(entry.sources)}</p></article>`).join("");
  const planItems = localizedPlan.items.map((item) => `<article class="primary-card"><p><strong>${item.horizon} ${en ? "days" : "일"} · ${reportText(item.priority, en)}</strong></p><h3>${reportText(item.title, en)}</h3><p>${reportText(item.rationale, en)}</p><dl><dt>${en ? "Owner" : "담당"}</dt><dd>${reportText(item.ownerLabel, en)}</dd><dt>${en ? "Due date" : "기한"}</dt><dd>${reportText(item.dueDate, en)}</dd><dt>${en ? "Completion evidence" : "완료 근거"}</dt><dd>${reportText(item.completionEvidence, en)}</dd></dl></article>`).join("");
  const fontUrl = escapeHtml(new URL("/fonts/PretendardVariable.woff2", request.url).toString());
  const prefix = en ? "/en" : "";
  const toolbar = inline ? `<nav class="toolbar no-print"><a href="${prefix}/assistant/${escapeHtml(plan.assessment_id)}">← ${en ? "Back to assistant" : "어시스턴트로 돌아가기"}</a><span><button onclick="print()">${en ? "Print or save as PDF" : "PDF로 저장·인쇄"}</button><a href="${prefix}/api/gtm-plans/${escapeHtml(id)}/export">${en ? "Download HTML" : "HTML 다운로드"}</a></span></nav>` : `<nav class="toolbar no-print"><button onclick="print()">${en ? "Print or save as PDF" : "PDF로 저장·인쇄"}</button></nav>`;
  const decision = research.scope === "market_preresearch"
    ? (en ? "Sellability was not assessed because the current readiness prerequisites are incomplete." : "현재 준비도 선결 조건이 완료되지 않아 실제 판매 가능성은 판정하지 않았습니다.")
    : research.sellability.summary;
  const offeringTypeKey = String(context.offeringType ?? "");
  const offeringType = ({ product: en ? "Product" : "제품", service: en ? "Service" : "서비스", solution: en ? "Solution" : "솔루션" } as Record<string, string>)[offeringTypeKey] ?? offeringTypeKey;
  const coverageGaps = research.researchCoverage.coverageGaps.length
    ? `<p class="notice"><strong>${en ? "Coverage gaps" : "보완할 조사 범위"}</strong><br>${reportText(research.researchCoverage.coverageGaps.map((gap) => coverageGapLabel(gap, en)).join(" · "), en)}</p>`
    : "";
  const styles = `@font-face{font-family:"Pretendard Variable";font-style:normal;font-weight:45 920;font-display:swap;src:url("${fontUrl}") format("woff2-variations")}*{box-sizing:border-box}body{font:16px/1.65 "Pretendard Variable",Pretendard,"Noto Sans KR",system-ui,sans-serif;color:#10221b;max-width:1120px;margin:40px auto;padding:0 24px;background:#f2f0eb}a{color:#1d7b4c;overflow-wrap:anywhere}.toolbar{position:sticky;top:12px;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:20px;padding:12px 16px;border:1px solid #d9dfdb;border-radius:12px;background:#fff;box-shadow:0 1px 3px #10221b1f,0 8px 22px #10221b14}.toolbar span{display:flex;gap:10px}.toolbar a,.toolbar button{min-height:42px;border:1px solid #0e3b2b;border-radius:999px;padding:9px 14px;background:#fff;color:#0e3b2b;font:inherit;font-weight:750;text-decoration:none;cursor:pointer}.toolbar span a{background:#0e3b2b;color:#fff}.toolbar a:hover,.toolbar button:hover{border-color:#1d7b4c;background:#f8f7f4}.toolbar span a:hover{background:#2b5148;color:#fff}.toolbar a:active,.toolbar button:active{transform:scale(.97);box-shadow:0 1px 2px #10221b24}.toolbar a:focus-visible,.toolbar button:focus-visible,summary:focus-visible{outline:3px solid #1d7b4c40;outline-offset:2px}.report-cover{margin-bottom:20px;padding:64px 48px;border-radius:16px;background:#0e3b2b;color:#fff}.report-cover p{margin:0 0 12px;color:#dce9e2}.report-cover h1{max-width:800px;margin:0;font-size:48px;line-height:1.12;letter-spacing:-.04em}.report-cover .cover-context{margin-top:28px}.report-meta{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:40px}.report-meta p,.primary-card,.market-card,.competitor-card,.decision-callout,.definition-card{border:1px solid #d9dfdb;border-radius:12px;padding:20px;background:#fff;box-shadow:0 0 .5px #10221b24,0 2px 6px #10221b14}.report-meta p{margin:0}.report-meta strong{display:block;font-size:28px;color:#0e3b2b}.report-section{margin-top:40px}.report-section>h2{margin:0 0 16px;color:#0e3b2b;font-size:30px;letter-spacing:-.02em}.report-section h3{font-size:21px}.decision-callout{border-left:6px solid #1d7b4c;background:#f7fbf8}.decision-callout strong{color:#0e3b2b}.source-note{margin:0 0 24px;color:#60726a;font-size:14px}.readiness-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.readiness-stats p{margin:0;padding:16px;border:1px solid #d9dfdb;border-radius:12px;background:#fff}.readiness-stats strong{display:block;font-size:24px;color:#0e3b2b}.readiness-stats span{color:#60726a}.readiness-reasons{margin-top:12px;padding:12px 16px;border-radius:12px;background:#e7f2ec}.readiness-reasons ul{margin:0;padding-left:20px}.definition-card>p{margin-top:0}.definition-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin:20px 0 0}.definition-grid div{padding-top:12px;border-top:1px solid #d9dfdb}.definition-grid dt{color:#60726a;font-size:14px}.definition-grid dd{margin:4px 0 0}.market-grid,.trend-grid,.competitor-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.primary-card,.market-card,.competitor-card{margin:0;min-width:0}.market-card>strong{display:block;margin-bottom:12px;color:#0e3b2b;font-size:28px}.market-status{display:inline-flex;gap:8px;margin:0 0 12px;padding:4px 10px;border-radius:999px;background:#e7f2ec}.market-method,.card-meta{color:#60726a}.key-limitation{padding:12px;border-left:4px solid #1d7b4c;background:#f7fbf8}.market-details{margin-top:16px;border-top:1px solid #d9dfdb;padding-top:12px}.market-details summary{color:#1d7b4c;font-weight:750;cursor:pointer}.market-details[open] summary{margin-bottom:12px}.competitor-card header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.competitor-card header h3{margin:0}.competitor-card header span{flex:none;padding:4px 10px;border-radius:999px;background:#e7f2ec;color:#0e3b2b;font-size:13px;font-weight:750}.competitor-card dl{display:grid;grid-template-columns:110px 1fr;gap:8px 12px;margin:16px 0}.competitor-card dt{color:#60726a}.competitor-card dd{margin:0;min-width:0}.citation{font-weight:800;text-decoration:none}dt{font-weight:700}.notice{padding:12px;background:#fff6eb;border:1px solid #f1c7a0;border-radius:12px}.bibliography li{margin-bottom:10px}@media(max-width:800px){.report-meta{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:700px){body{margin:16px auto;padding:0 16px}.report-cover{padding:36px 24px}.report-cover h1{font-size:34px}.report-meta,.readiness-stats,.definition-grid,.market-grid,.trend-grid,.competitor-grid{grid-template-columns:1fr}.toolbar{position:static;align-items:stretch;flex-direction:column}.toolbar span{display:grid}.toolbar a,.toolbar button{text-align:center}.competitor-card dl{grid-template-columns:1fr}.competitor-card dd{margin-bottom:8px}}@media(prefers-reduced-motion:reduce){.toolbar a,.toolbar button{transition:none}.toolbar a:active,.toolbar button:active{transform:none!important}}@media print{body{max-width:none;margin:0;padding:0;background:#fff}.toolbar,.no-print{display:none}.report-cover,.report-meta p,.primary-card,.market-card,.competitor-card,.decision-callout,.definition-card{box-shadow:none}.report-cover{print-color-adjust:exact;-webkit-print-color-adjust:exact}.primary-card,.market-card,.competitor-card,.report-meta p{break-inside:avoid;page-break-inside:avoid}.market-details:not([open])>*{display:block!important}.market-details summary{display:none!important}}`;
  const html = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${en ? "Comprehensive Market Report" : "종합 시장보고서"}</title><style>${styles}</style></head><body>${toolbar}<header class="report-cover"><p>Borderless · ${en ? "COMPREHENSIVE MARKET REPORT" : "종합 시장보고서"}</p><h1>${reportText(context.offeringName || (en ? "Comprehensive Market Report" : "종합 시장보고서"), en)}</h1><p class="cover-context">${reportText(context.targetCountry, en)} · ${reportText(context.targetCustomer, en)} · ${escapeHtml(String(plan.updated_at).slice(0,10))}</p></header><section class="report-meta" aria-label="${en ? "Research summary" : "조사 요약"}"><p><strong>${research.researchCoverage.lanes.length}</strong>${en ? "Research areas" : "조사영역"}</p><p><strong>${research.researchCoverage.sourceCount}</strong>${en ? "Unique sources" : "고유 출처"}</p><p><strong>${research.researchCoverage.uniqueDomainCount}</strong>${en ? "Domains" : "도메인"}</p><p><strong>${research.researchCoverage.competitorCount}</strong>${en ? "Competitors" : "경쟁 후보"}</p></section>${localizedPlan.translationFallback ? `<p class="source-note">${en ? "Product names, company names, and source titles may remain in their original language." : "제품명·회사명·출처 제목은 원문으로 표시될 수 있습니다."}</p>` : ""}<main><section class="report-section"><h2>${en ? "Executive summary" : "경영진 요약"}</h2><p>${reportText(research.executiveSummary, en)}</p><aside class="decision-callout"><strong>${en ? "Decision" : "의사결정"}</strong><p>${reportText(decision, en)}</p></aside></section>${readinessApplicabilityHtml ? `<section class="report-section">${readinessApplicabilityHtml}</section>` : ""}<section class="report-section"><h2>${en ? "Offering definition" : "론칭 대상 정의"}</h2><div class="definition-card"><p>${reportText(context.offeringSummary, en)}</p><dl class="definition-grid"><div><dt>${en ? "Offering type" : "론칭 유형"}</dt><dd>${reportText(offeringType, en)}</dd></div><div><dt>${en ? "Customer problem" : "고객 문제"}</dt><dd>${reportText(context.customerProblem, en)}</dd></div><div><dt>${en ? "Core value" : "핵심 가치"}</dt><dd>${reportText(context.coreValue, en)}</dd></div></dl>${researchDocumentSummaryHtml}</div></section><section class="report-section"><h2>${en ? "Market boundary and size" : "시장 범위와 규모"}</h2><p>${reportText(research.marketDefinition.included, en)}${research.marketDefinition.excluded ? ` · ${en ? "Excluded" : "제외"}: ${reportText(research.marketDefinition.excluded, en)}` : ""}</p><div class="market-grid">${marketSizes}</div></section><section class="report-section"><h2>${en ? "Market trends" : "시장동향"}</h2><p><strong>${en ? "Source mix" : "출처 구성"}</strong><br>${Object.entries(research.researchCoverage.sourceTypes).map(([kind, count]) => `${sourceKindLabel(kind)} ${count}`).join(" · ")}</p>${coverageGaps}<div class="trend-grid">${trendCards}</div></section><section class="report-section"><h2>${en ? "Competitive landscape" : "경쟁 구도"}</h2><div class="competitor-grid">${competitors}</div></section>${contradictions ? `<section class="report-section"><h2>${en ? "Conflicting evidence" : "상충 근거"}</h2>${contradictions}</section>` : ""}<section class="report-section"><h2>${en ? "Next validation tasks" : "다음 검증 과제"}</h2>${list(research.nextExperiments, en)}</section>${planItems ? `<section class="report-section"><h2>${en ? "30 · 60 · 90 Day Plan" : "단계별 실행계획(30·60·90 Day Plan)"}</h2>${planItems}</section>` : ""}<section class="report-section"><h2>${en ? "Assumptions & limitations" : "가정과 한계"}</h2>${list([...localizedPlan.assumptions, ...research.limitations], en)}</section><section class="report-section bibliography"><h2>${en ? "Bibliography" : "참고문헌"}</h2>${sourceList}</section></main></body></html>`;
  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-disposition": inline ? "inline" : `attachment; filename="global-gtm-report-${id}.html"`
    }
  });
}
