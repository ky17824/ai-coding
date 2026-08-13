"use client";

import Link from "next/link";
import { useState } from "react";
import { localizedPath, type Locale } from "@/lib/i18n";
import { marketResearchContextSignature } from "@/lib/market-sizing";
import { buildCompetitorOverview, buildTrendOverview, type ResearchOverview } from "@/lib/research-overview";
import type {
  GtmAssistantQuestion,
  GtmFounderContext,
  GtmMarketCompetitor,
  GtmMarketResearch,
  GtmMarketSizingEntry,
  GtmMarketTrend,
  GtmPlanDraft,
  GtmPlanItem,
  StoredGtmPlan
} from "@/lib/types";

interface Props {
  locale: Locale;
  assessment: {
    id: string;
    score: number;
    status: string;
    isOnHold: boolean;
    gateMessages: string[];
    targetCountry: string;
    targetCustomer: string;
  };
  actions: {
    id: string;
    title: string;
    priority: string;
    completionEvidence: string;
    owner?: string;
  }[];
  initialPlan: StoredGtmPlan | null;
  initialQuestion: GtmAssistantQuestion | null;
}

function safeExternalUrl(value: string | null) {
  try {
    const url = new URL(value ?? "");
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function MarketSizeCard({ entry, en }: { entry: GtmMarketSizingEntry; en: boolean }) {
  const title = entry.key === "beachhead"
    ? en ? "Beachhead Market" : "교두보 시장"
    : entry.label;
  const confidence = en
    ? `${entry.confidence} confidence`
    : `신뢰도 ${entry.confidence === "high" ? "높음" : entry.confidence === "medium" ? "보통" : "낮음"}`;
  const method = entry.method === "triangulated"
    ? en ? "triangulated" : "상향식·하향식 교차검증"
    : en ? "bottom up" : "상향식";
  const sourceKind = (kind: string) => en
    ? kind.replaceAll("_", " ")
    : ({ fact: "공개 사실", founder_input: "창업자 입력", proxy_assumption: "대리 가정" }[kind] ?? kind);
  const sourceKinds = new Set(entry.calculationInputs.flatMap((input) => input.sources.map((source) => source.kind)));
  const estimateBasis = sourceKinds.has("founder_input")
    ? en ? "Founder input + external evidence" : "입력·외부자료 추정"
    : en ? "External evidence estimate" : "외부 자료 기반 추정";
  return (
    <article>
      <div className="market-size-card__heading"><strong>{title}</strong><em data-status={entry.status}>{entry.status === "estimated" ? `${estimateBasis} · ${confidence}` : en ? "Sizing paused · insufficient evidence" : "산정 보류 · 근거 부족"}</em></div>
      <span>{entry.estimate}</span>
      {entry.range && <small>{entry.range.referenceYear} · {entry.range.currency} · {method}</small>}
      <p>{entry.formula}</p>
      <details>
        <summary>{en ? "Formula, evidence, and assumptions" : "산식·근거·가정 보기"}</summary>
        {entry.calculationInputs.length > 0 && <><b>{en ? "Calculation inputs" : "계산 입력값"}</b><ul>{entry.calculationInputs.map((input) => <li key={`${input.name}-${input.unit}`}><strong>{input.name}</strong>: {input.low.toLocaleString()}–{input.high.toLocaleString()} ({en ? "base" : "기준"} {input.base.toLocaleString()}) {input.unit}<small>{input.sourceTitles.join(" · ")}</small></li>)}</ul></>}
        {entry.validation.length > 0 && <ul>{entry.validation.map((item) => <li key={item}>{item}</li>)}</ul>}
        {entry.assumptions.length > 0 && <><b>{en ? "Assumptions" : "가정"}</b><ul>{entry.assumptions.map((item) => <li key={item}>{item}</li>)}</ul></>}
        {entry.evidenceGaps.length > 0 && <><b>{en ? "Evidence gaps" : "근거 공백"}</b><ul>{entry.evidenceGaps.map((item) => <li key={item}>{item}</li>)}</ul></>}
        {entry.cohesion && <p>{en ? "Beachhead checks" : "교두보 시장 점검"}: {[
          entry.cohesion.buysSimilarProducts && (en ? "similar products" : "유사 제품"),
          entry.cohesion.similarSalesCycle && (en ? "similar sales cycle" : "유사 판매주기"),
          entry.cohesion.wordOfMouthPotential && (en ? "word of mouth" : "입소문 가능성")
        ].filter(Boolean).join(" · ") || (en ? "Not yet verified" : "아직 확인되지 않음")}</p>}
        {entry.expansionPath.length > 0 && <p>{en ? "Expansion path" : "인접시장 확장 경로"}: {entry.expansionPath.join(" → ")}</p>}
        {entry.sources.length > 0 && <><b>{en ? "Sources" : "근거 자료"}</b><ul>{entry.sources.map((source) => { const href = safeExternalUrl(source.url); return <li key={`${source.title}-${source.url ?? source.kind}`}>{href ? <a href={href} target="_blank" rel="noreferrer">{source.title} ↗</a> : source.title}<small>{source.publisher}{source.publishedAt ? ` · ${source.publishedAt}` : ""}{source.checkedAt ? ` · ${en ? "checked" : "확인"} ${source.checkedAt}` : ""} · {sourceKind(source.kind)}</small></li>; })}</ul></>}
      </details>
    </article>
  );
}

function TrendList({ entries, en }: { entries: GtmMarketTrend[]; en: boolean }) {
  const categories: Record<GtmMarketTrend["category"], [string, string]> = {
    demand: ["수요·성장", "Demand & growth"],
    customer_behavior: ["고객 행동", "Customer behavior"],
    channel: ["유통·채널", "Distribution & channels"],
    regulation: ["규제", "Regulation"],
    product_culture: ["제품·문화", "Product & culture"]
  };
  return <ul className="research-finding-list">{entries.map((entry) => <li key={`${entry.category}-${entry.title}`}><span className="research-tag">{categories[entry.category][en ? 1 : 0]}</span><strong>{entry.title}</strong><small>{en ? `${entry.confidence} confidence · ${entry.freshness}` : `신뢰도 ${{ low: "낮음", medium: "보통", high: "높음" }[entry.confidence]} · ${{ current: "최신", aging: "오래된 자료 포함", undated: "발행일 미상" }[entry.freshness]}`}</small><span>{entry.finding}</span><small><b>{en ? "Implication" : "사업 시사점"}</b> · {entry.implication}</small><span className="research-source-links">{entry.sources.map((source) => { const href = safeExternalUrl(source.url); return href ? <a key={`${entry.title}-${source.url}`} href={href} target="_blank" rel="noreferrer">{source.title}{source.publisher ? ` · ${source.publisher}` : ""} ↗</a> : <span key={`${entry.title}-${source.title}`}>{source.title}{source.publisher ? ` · ${source.publisher}` : ""}</span>; })}</span></li>)}</ul>;
}

function CompetitorList({ entries, en }: { entries: GtmMarketCompetitor[]; en: boolean }) {
  const typeLabel = (entry: GtmMarketCompetitor) => en
    ? `${entry.marketPresence} · ${entry.type}`
    : `${{ local: "현지", regional: "지역", global: "글로벌" }[entry.marketPresence]} · ${{ direct: "직접", adjacent: "인접", alternative: "대체재" }[entry.type]}`;
  return <ul className="research-competitor-list">{entries.map((entry) => <li key={`${entry.name}-${entry.type}`}><span className="research-tag">{typeLabel(entry)}</span><strong>{entry.name}</strong><small>{en ? `${entry.confidence} confidence · ${entry.freshness}` : `신뢰도 ${{ low: "낮음", medium: "보통", high: "높음" }[entry.confidence]} · ${{ current: "최신", aging: "오래된 자료 포함", undated: "발행일 미상" }[entry.freshness]}`}</small><span>{entry.relevance}</span><small><b>{en ? "Target customer" : "목표 고객"}</b> · {entry.targetCustomer}</small><small><b>{en ? "Value proposition" : "제공 가치"}</b> · {entry.valueProposition}</small>{entry.pricePositioning && <small><b>{en ? "Price" : "가격대"}</b> · {entry.pricePositioning}</small>}{entry.channels.length > 0 && <small><b>{en ? "Channels" : "채널"}</b> · {entry.channels.join(" · ")}</small>}{entry.strengths.length > 0 && <small><b>{en ? "Strengths" : "강점"}</b> · {entry.strengths.join(" · ")}</small>}{entry.weaknesses.length > 0 && <small><b>{en ? "Weaknesses" : "약점"}</b> · {entry.weaknesses.join(" · ")}</small>}<small><b>{en ? "Differentiation opportunity" : "차별화 기회"}</b> · {entry.differentiationGap}</small><span className="research-source-links">{entry.sources.map((source) => { const href = safeExternalUrl(source.url); return href ? <a key={`${entry.name}-${source.url}`} href={href} target="_blank" rel="noreferrer">{source.title}{source.publisher ? ` · ${source.publisher}` : ""} ↗</a> : <span key={`${entry.name}-${source.title}`}>{source.title}{source.publisher ? ` · ${source.publisher}` : ""}</span>; })}</span></li>)}</ul>;
}

function ResearchOverviewCard({ overview, en, kind }: { overview: ResearchOverview; en: boolean; kind: "trends" | "competitors" }) {
  const headline = kind === "trends"
    ? en ? `${overview.count} findings synthesized across ${overview.groups.length} market signals` : `${overview.count}개 조사 결과를 ${overview.groups.length}개 시장 신호로 종합했습니다`
    : en ? `${overview.count} competitors mapped across ${overview.groups.length} competitive groups` : `${overview.count}개 경쟁 후보를 ${overview.groups.length}개 경쟁군으로 종합했습니다`;
  return <article className="research-overview-card"><div><strong>{headline}</strong><span className="research-tag">{en ? `${overview.sourceCount} sources` : `출처 ${overview.sourceCount}개`}</span></div><dl>{overview.groups.map((group) => <div key={group.label}><dt>{group.label}</dt><dd>{group.items.join(" · ")}</dd></div>)}</dl></article>;
}

function coverageGapLabel(gap: string, en: boolean) {
  if (en) return gap.replaceAll(":", " · ").replaceAll("-", " ");
  const labels: Record<string, string> = {
    "lane:demand": "수요·성장 조사",
    "lane:customer_behavior": "고객 행동 조사",
    "lane:channel": "유통·채널 조사",
    "lane:regulation": "규제 조사",
    "lane:product_culture": "제품·문화 조사",
    "lane:direct_competitors": "직접 경쟁사 조사",
    "lane:adjacent_competitors": "인접 경쟁사 조사",
    "lane:substitutes": "대체재 조사",
    "sources:min-8": "출처 8개 이상",
    "domains:min-8": "고유 도메인 8개 이상",
    "competitors:min-10": "경쟁 후보 10개 이상",
    "competitors:direct:min-3": "직접 경쟁 후보 3개 이상",
    "competitors:adjacent:min-2": "인접 경쟁 후보 2개 이상",
    "competitors:alternative:min-2": "대체재 2개 이상",
    "competitors:local:min-2": "현지 경쟁 후보 2개 이상",
    "competitors:regional-global:min-2": "지역·글로벌 경쟁 후보 2개 이상",
    "source-type:government:min-1": "정부·규제 출처 1개 이상",
    "source-type:industry:min-2": "산업자료 2개 이상",
    "source-type:retail:min-2": "현지 유통 출처 2개 이상",
    "source-type:company:min-3": "기업 공식 출처 3개 이상",
    "source-type:consumer:min-1": "소비자 출처 1개 이상"
  };
  return labels[gap] ?? gap;
}

export function GtmAssistant({ assessment, actions, initialPlan, initialQuestion, locale }: Props) {
  const en = locale === "en";
  const [planId, setPlanId] = useState(initialPlan?.id ?? "");
  const [planStatus, setPlanStatus] = useState(initialPlan?.status ?? "draft");
  const [summary, setSummary] = useState(initialPlan?.summary ?? "");
  const [items, setItems] = useState<GtmPlanItem[]>(initialPlan?.items ?? []);
  const [question, setQuestion] = useState<GtmAssistantQuestion | null>(initialQuestion);
  const [message, setMessage] = useState("");
  const [context, setContext] = useState<GtmFounderContext>({
    offeringType: initialPlan?.founderContext.offeringType ?? "",
    offeringName: initialPlan?.founderContext.offeringName ?? "",
    offeringSummary: initialPlan?.founderContext.offeringSummary ?? "",
    customerProblem: initialPlan?.founderContext.customerProblem ?? "",
    coreValue: initialPlan?.founderContext.coreValue ?? "",
    currentAlternative: initialPlan?.founderContext.currentAlternative ?? "",
    differentiation: initialPlan?.founderContext.differentiation ?? "",
    deliveryModel: initialPlan?.founderContext.deliveryModel ?? "",
    revenueModel: initialPlan?.founderContext.revenueModel ?? "",
    expectedPrice: initialPlan?.founderContext.expectedPrice ?? "",
    annualPurchaseFrequency: initialPlan?.founderContext.annualPurchaseFrequency ?? "",
    initialReachableCustomers: initialPlan?.founderContext.initialReachableCustomers ?? "",
    threeYearSalesCapacity: initialPlan?.founderContext.threeYearSalesCapacity ?? "",
    validationEvidence: initialPlan?.founderContext.validationEvidence ?? "",
    targetCountry: initialPlan?.founderContext.targetCountry ?? assessment.targetCountry,
    targetCustomer: initialPlan?.founderContext.targetCustomer ?? assessment.targetCustomer,
    resources: initialPlan?.founderContext.resources ?? "",
    deadline: initialPlan?.founderContext.deadline ?? "",
    constraints: initialPlan?.founderContext.constraints ?? ""
  });
  const [marketResearch, setMarketResearch] = useState<GtmMarketResearch | null>(
    initialPlan?.marketResearch ?? null
  );
  const [researchConfirmed, setResearchConfirmed] = useState(
    Boolean(initialPlan?.marketResearchConfirmedAt)
  );
  const [researchNeedsInputs, setResearchNeedsInputs] = useState(
    initialPlan?.marketResearch?.marketSizingMethodologyVersion === "legacy" && initialPlan?.marketResearchConfirmedAt
      ? false
      : Boolean(initialPlan?.marketResearch?.marketSizing.some((entry) => entry.status === "insufficient_evidence"))
  );
  const [researchDisplaySignature, setResearchDisplaySignature] = useState(
    initialPlan?.marketResearch ? marketResearchContextSignature(initialPlan.founderContext) : ""
  );
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [workshopFailed, setWorkshopFailed] = useState(false);
  const researchMatchesContext = Boolean(
    marketResearch && researchDisplaySignature === marketResearchContextSignature(context)
  );

  async function runWorkshop(answerOverride?: string, forcePlan = false) {
    if (!researchMatchesContext || !researchConfirmed) {
      setNotice(en ? "Create and confirm the market and competitive research before drafting the execution plan." : "시장·경쟁 사전조사를 만들고 확인한 뒤 실행 계획을 작성해 주세요.");
      return;
    }
    const answer = (answerOverride ?? message).trim();
    if (question && !answer && !forcePlan) {
      setNotice(en ? "Answer the question or select ‘Needs verification.’" : "답변하거나 ‘확인 필요’를 선택해 주세요.");
      return;
    }
    const nextContext = question && answer
      ? { ...context, [question.questionKey]: answer } as GtmFounderContext
      : context;
    if (nextContext !== context) setContext(nextContext);
    setBusy(true);
    setNotice("");
    setWorkshopFailed(false);
    try {
      const response = await fetch("/api/gtm-assistant/turn", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assessmentId: assessment.id,
          message: answer,
          questionKey: question?.questionKey ?? "",
          forcePlan,
          founderContext: nextContext,
          locale
        })
      });
      const payload = (await response.json()) as {
        message?: string;
        planId?: string;
        result?: GtmAssistantQuestion | GtmPlanDraft;
      };
      if (!response.ok || !payload.result || !payload.planId) {
        throw new Error(payload.message ?? (en ? "We couldn't create the plan." : "계획을 만들지 못했습니다."));
      }
      setPlanId(payload.planId);
      if (payload.result.kind === "next_question") {
        setQuestion(payload.result);
        setNotice(en ? "One more detail will help us make the plan specific." : "계획을 구체화하기 위해 여쭙습니다.");
      } else {
        setQuestion(null);
        setSummary(payload.result.summary);
        setItems(payload.result.items);
        setNotice(
          payload.result.generatedBy === "deterministic-fallback"
            ? en ? "We created a baseline plan from your assessment actions without AI." : "AI 연결 없이 진단 액션만으로 기본 계획을 만들었습니다."
            : en ? "Your AI-assisted GTM execution plan is ready for review." : "AI GTM 실행 계획 초안을 만들었습니다."
        );
      }
      setMessage("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : en ? "Something went wrong." : "오류가 발생했습니다.");
      setWorkshopFailed(true);
    } finally {
      setBusy(false);
    }
  }

  async function runResearch() {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/gtm-assistant/research", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assessmentId: assessment.id, founderContext: context, locale })
      });
      const payload = (await response.json()) as {
        message?: string;
        planId?: string;
        result?: GtmMarketResearch;
        needsEvidence?: boolean;
        confirmed?: boolean;
      };
      if (!response.ok || !payload.result || !payload.planId) {
        throw new Error(payload.message ?? (en ? "We couldn't complete the market and competitive research." : "시장·경쟁 사전조사를 만들지 못했습니다."));
      }
      setPlanId(payload.planId);
      setMarketResearch(payload.result);
      setResearchConfirmed(Boolean(payload.confirmed));
      setResearchNeedsInputs(Boolean(payload.needsEvidence));
      setResearchDisplaySignature(marketResearchContextSignature(context));
      setNotice(payload.message ?? (en ? "The AI market and competitive research is ready. Review it before continuing." : "AI 시장·경쟁 사전조사를 만들었습니다. 내용을 확인해 주세요."));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : en ? "Something went wrong." : "오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmResearch() {
    if (!planId || researchNeedsInputs) return;
    const response = await fetch(`/api/gtm-plans/${planId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "confirm_research", locale })
    });
    if (response.ok) {
      setResearchConfirmed(true);
      setNotice(en ? "Research confirmed. You can now create the execution plan." : "시장·경쟁 사전조사를 확인했습니다. 실행 계획을 만들 수 있습니다.");
    } else {
      setNotice(en ? "We couldn't confirm the research." : "시장·경쟁 사전조사를 확인 처리하지 못했습니다.");
    }
  }

  function updateItem(index: number, patch: Partial<GtmPlanItem>) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    );
  }

  async function saveItem(index: number) {
    const item = items[index];
    if (!planId || !item.id) return;
    setNotice("");
    const response = await fetch(`/api/gtm-plans/${planId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "update_item",
        itemId: item.id,
        ownerLabel: item.ownerLabel,
        dueDate: item.dueDate,
        completionEvidence: item.completionEvidence,
        status: item.status,
        locale
      })
    });
    setNotice(response.ok ? (en ? "Plan item saved." : "계획 항목을 저장했습니다.") : (en ? "We couldn't save the plan item." : "계획 항목을 저장하지 못했습니다."));
  }

  async function approve() {
    if (!planId) return;
    const response = await fetch(`/api/gtm-plans/${planId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "approve", locale })
    });
    if (response.ok) {
      setPlanStatus("active");
      setNotice(en ? "Plan approved and added to your GTM Journey." : "계획을 승인하고 GTM 여정에 연결했습니다.");
    } else {
      setNotice(en ? "We couldn't approve the plan." : "계획을 승인하지 못했습니다.");
    }
  }

  return (
    <div className="app-container assistant-layout">
      <aside className="assistant-sidebar panel">
        <span className="page-kicker">{en ? "AI GTM ASSISTANT" : "AI GTM 어시스턴트"}</span>
        <h1>{en ? "Turn your assessment into an execution plan" : "진단 결과를 실행 계획으로"}</h1>
        <p>{en ? "Build a staged 30-, 60-, and 90-day plan from your 55 assessment answers and saved actions." : "55문항 결과와 저장된 액션만 사용해 단계별 실행계획(30·60·90 Day Plan)을 함께 만들어 드립니다."}</p>
        <div className="assistant-score"><strong>{assessment.score}</strong><span>{assessment.status}</span></div>
        {assessment.isOnHold && (
          <ul>{assessment.gateMessages.map((message) => <li key={message}>{message}</li>)}</ul>
        )}
        <h2>{en ? "Priority actions" : "진단 우선 액션"}</h2>
        <ol className="assistant-action-list">
          {actions.map((action) => <li key={action.id}><span>{en ? `Priority ${action.priority === "P0" ? "0" : "1"}` : action.priority === "P0" ? "우선순위 0" : "우선순위 1"}</span>{action.title}</li>)}
        </ol>
      </aside>

      <section className="assistant-workspace">
        {initialPlan?.translationFallback && (
          <p className="notice-banner" role="status">
            {en ? "Some saved content could not be translated, so the original text is shown." : "일부 저장 내용을 번역하지 못해 원문으로 표시합니다."}
          </p>
        )}
        <div className="question-heading">
          <span>{en ? "FOUNDER WORKSHOP" : "창업자 공동계획 회의"}</span>
          <h2>{en ? "Define what you are launching and your initial target market." : "글로벌 론칭 대상과 초기 목표시장을 정의해 주세요."}</h2>
          <p>{en ? "Tell us what you sell, who buys it, and why. AI will research the market, market size, and competitors, then use the findings in your plan." : "무엇을 누구에게 왜 판매할지 먼저 정의하면 AI가 시장동향·규모·경쟁사를 조사하고 실행 계획에 반영합니다."}</p>
        </div>
        <div className="assistant-context panel">
          <label>{en ? "Offering type" : "론칭 유형"}<select value={context.offeringType} onChange={(event) => setContext({ ...context, offeringType: event.target.value as GtmFounderContext["offeringType"] })}><option value="">{en ? "Select" : "선택"}</option><option value="product">{en ? "Product" : "제품"}</option><option value="service">{en ? "Service" : "서비스"}</option><option value="solution">{en ? "Solution" : "솔루션"}</option><option value="hybrid">{en ? "Hybrid" : "복합"}</option></select></label>
          <label>{en ? "Offering name" : "제품·서비스·솔루션 이름"}<input value={context.offeringName} onChange={(event) => setContext({ ...context, offeringName: event.target.value })} placeholder={en ? "e.g., Manufacturing quality prediction platform" : "예: 제조 품질 예측 솔루션"} /></label>
          <label className="assistant-context__wide">{en ? "Offering summary" : "론칭 대상 설명"}<textarea rows={2} value={context.offeringSummary} onChange={(event) => setContext({ ...context, offeringSummary: event.target.value })} placeholder={en ? "Briefly describe the core capability and how customers use it." : "핵심 기능과 사용 상황을 간단히 설명해 주세요."} /></label>
          <label>{en ? "Customer problem" : "해결할 고객 문제"}<textarea rows={2} value={context.customerProblem} onChange={(event) => setContext({ ...context, customerProblem: event.target.value })} placeholder={en ? "What cost, delay, or risk does the customer face today?" : "고객이 지금 겪는 비용·시간·위험은 무엇인가요?"} /></label>
          <label>{en ? "Core value" : "핵심 가치"}<textarea rows={2} value={context.coreValue} onChange={(event) => setContext({ ...context, coreValue: event.target.value })} placeholder={en ? "What measurable outcome improves over the current approach?" : "기존 방식보다 나아지는 측정 가능한 결과는 무엇인가요?"} /></label>
          <label>{en ? "Current alternative" : "현재 대안"}<input value={context.currentAlternative} onChange={(event) => setContext({ ...context, currentAlternative: event.target.value })} placeholder={en ? "e.g., Manual spreadsheets or a local competitor" : "예: 엑셀 수작업, 현지 경쟁 제품"} /></label>
          <label>{en ? "Differentiation" : "차별성"}<input value={context.differentiation} onChange={(event) => setContext({ ...context, differentiation: event.target.value })} placeholder={en ? "Why would customers switch?" : "고객이 바꿀 이유"} /></label>
          <label>{en ? "Delivery model" : "제공 방식"}<input value={context.deliveryModel} onChange={(event) => setContext({ ...context, deliveryModel: event.target.value })} placeholder={en ? "e.g., SaaS, export, or local partner" : "예: SaaS, 수출, 현지 파트너"} /></label>
          <label>{en ? "Revenue model" : "수익 방식"}<input value={context.revenueModel} onChange={(event) => setContext({ ...context, revenueModel: event.target.value })} placeholder={en ? "e.g., Monthly subscription or project fee" : "예: 월 구독, 건별 계약"} /></label>
          <label>{en ? "Expected price or annual contract value" : "예상 가격·연간 계약금액"}<input value={context.expectedPrice} onChange={(event) => setContext({ ...context, expectedPrice: event.target.value })} placeholder={en ? "e.g., US$120/year or US$20K ACV" : "예: 연 US$120 또는 연간 계약금액 US$20K"} /></label>
          <label>{en ? "Annual purchase frequency or term" : "연간 구매 빈도·계약기간"}<input value={context.annualPurchaseFrequency} onChange={(event) => setContext({ ...context, annualPurchaseFrequency: event.target.value })} placeholder={en ? "e.g., 2 purchases/year or 12-month contract" : "예: 연 2회 또는 12개월 계약"} /></label>
          <label>{en ? "Initially reachable customers" : "초기에 직접 접근 가능한 고객 수"}<input value={context.initialReachableCustomers} onChange={(event) => setContext({ ...context, initialReachableCustomers: event.target.value })} placeholder={en ? "e.g., 30 qualified retailers through one partner" : "예: 파트너를 통해 접촉 가능한 유통사 30곳"} /></label>
          <label>{en ? "Three-year sales capacity" : "3년 판매·공급 가능 범위"}<input value={context.threeYearSalesCapacity} onChange={(event) => setContext({ ...context, threeYearSalesCapacity: event.target.value })} placeholder={en ? "e.g., US$500K or 5,000 units" : "예: US$500K 또는 5,000개"} /></label>
          <label>{en ? "Target country" : "목표국가"}<input value={context.targetCountry} onChange={(event) => setContext({ ...context, targetCountry: event.target.value })} placeholder={en ? "e.g., Japan" : "예: 일본"} /></label>
          <label>{en ? "Target customer" : "목표 고객"}<input value={context.targetCustomer} onChange={(event) => setContext({ ...context, targetCustomer: event.target.value })} placeholder={en ? "e.g., Mid-sized manufacturers in Tokyo" : "예: 도쿄 소재 중견 제조사"} /></label>
          <label className="assistant-context__wide">{en ? "Current validation evidence" : "현재 검증 근거"}<textarea rows={2} value={context.validationEvidence} onChange={(event) => setContext({ ...context, validationEvidence: event.target.value })} placeholder={en ? "List only confirmed evidence, such as interviews, paying customers, or market tests." : "인터뷰, 유료 고객, 시장 실증시험 등 현재 확인된 사실만 적어 주세요."} /></label>
          <label>{en ? "Available resources" : "가용 자원"}<input value={context.resources} onChange={(event) => setContext({ ...context, resources: event.target.value })} placeholder={en ? "e.g., Founder, 20 hours/week, $2,000/month" : "예: 대표 1명, 월 300만 원"} /></label>
          <label>{en ? "Target date" : "목표 기한"}<input type="date" value={context.deadline} onChange={(event) => setContext({ ...context, deadline: event.target.value })} /></label>
          <label className="assistant-context__wide">{en ? "Constraints" : "제약"}<textarea rows={2} value={context.constraints} onChange={(event) => setContext({ ...context, constraints: event.target.value })} placeholder={en ? "e.g., We need customer validation before forming a local entity." : "예: 현지 법인을 세우기 전에 고객 검증이 필요합니다"} /></label>
          <button className="button button--primary" type="button" onClick={runResearch} disabled={busy}>
            {busy ? (en ? "Researching…" : "조사하고 있습니다…") : marketResearch ? (en ? "Run research again" : "시장·경쟁 사전조사 다시 만들기") : (en ? "Run AI market research" : "AI 시장·경쟁 사전조사")}
          </button>
        </div>

        {marketResearch && (
          <section className="assistant-research panel">
            <div className="dashboard-section__heading">
              <span><span className="page-kicker">{en ? "AI MARKET & COMPETITIVE RESEARCH" : "AI 시장·경쟁 사전조사"}</span><h2>{marketResearch.offeringName} · {marketResearch.targetCountry}</h2></span>
              {researchNeedsInputs ? <strong>{en ? "Evidence needed · add inputs and rerun" : "근거 보완 필요 · 입력 후 다시 조사"}</strong> : researchMatchesContext && researchConfirmed ? <strong className="research-confirmed">{en ? "Confirmed" : "확인 완료"}</strong> : researchMatchesContext ? <button className="button button--dark" type="button" onClick={confirmResearch}>{en ? "Confirm research" : "조사 결과 확인"}</button> : <strong>{en ? "Inputs changed · run research again" : "입력 변경됨 · 다시 조사 필요"}</strong>}
            </div>
            <p>{marketResearch.executiveSummary}</p>
            {marketResearch.scope === "market_preresearch" && <p className="notice-banner">{en ? "At Readiness Stages 1 and 2, this report does not judge commercial viability. It provides preliminary market research and the next validation tasks." : "준비 1단계와 준비 2단계에서는 실제 판매 가능성을 판정하지 않고, 시장·경쟁 사전조사와 다음 검증 과제만 제공합니다."}</p>}
            <div className="research-coverage" aria-label={en ? "Research coverage" : "조사 커버리지"}>
              <span><strong>{marketResearch.researchCoverage.lanes.length}</strong><small>{en ? "research areas" : "조사영역"}</small></span>
              <span><strong>{marketResearch.researchCoverage.sourceCount}</strong><small>{en ? "unique sources" : "고유 출처"}</small></span>
              <span><strong>{marketResearch.researchCoverage.competitorCount}</strong><small>{en ? "competitors" : "경쟁 후보"}</small></span>
              <span><strong>{marketResearch.researchCoverage.coverageGaps.length === 0 ? (en ? "Met" : "충족") : (en ? "Limited" : "보완 필요")}</strong><small>{en ? "evidence coverage" : "근거 구성"}</small></span>
            </div>
            <p className="market-definition research-overview-card"><strong>{en ? "Market boundary" : "시장 범위"}</strong>{" "}{marketResearch.marketDefinition.included}{marketResearch.marketDefinition.excluded ? ` · ${en ? "Excluded" : "제외"}: ${marketResearch.marketDefinition.excluded}` : ""}</p>
            <div className="market-size-grid">{marketResearch.marketSizing.map((entry) => <MarketSizeCard key={entry.key} entry={entry} en={en} />)}</div>
            <section className="research-section"><h3>{en ? "Market trends" : "시장동향"}</h3><ResearchOverviewCard overview={buildTrendOverview(marketResearch.trends, en)} en={en} kind="trends" /><details><summary>{en ? `View evidence for all ${marketResearch.trends.length} findings` : `전체 ${marketResearch.trends.length}개 조사 근거 보기`}</summary><TrendList entries={marketResearch.trends} en={en} /></details></section>
            <section className="research-section"><h3>{en ? "Competitive landscape" : "경쟁 구도"}</h3><ResearchOverviewCard overview={buildCompetitorOverview(marketResearch.competitors, en)} en={en} kind="competitors" /><details><summary>{en ? `View evidence for all ${marketResearch.competitors.length} competitors` : `전체 ${marketResearch.competitors.length}개 경쟁 근거 보기`}</summary><CompetitorList entries={marketResearch.competitors} en={en} /></details></section>
            {marketResearch.contradictions.length > 0 && <section className="research-section research-contradictions"><h3>{en ? "Conflicting evidence" : "상충 근거"}</h3><ul>{marketResearch.contradictions.map((entry) => <li key={entry.topic}><strong>{entry.topic}</strong><span>{entry.summary}</span></li>)}</ul></section>}
            <details className="research-coverage-details"><summary>{en ? "Research coverage and source mix" : "조사 범위와 출처 구성"}</summary><p>{en ? "Source mix" : "출처 구성"}: {Object.entries(marketResearch.researchCoverage.sourceTypes).map(([kind, count]) => `${en ? kind : ({ government: "정부·규제", industry: "산업자료", retail: "현지 유통", company: "기업 공식", consumer: "소비자", media: "미디어" }[kind] ?? kind)} ${count}`).join(" · ")}</p>{marketResearch.researchCoverage.coverageGaps.length > 0 && <p>{en ? "Coverage gaps" : "보완할 조사 범위"}: {marketResearch.researchCoverage.coverageGaps.map((gap) => coverageGapLabel(gap, en)).join(" · ")}</p>}</details>
            <div><h3>{en ? "Next validation tasks" : "다음 검증 과제"}</h3><ol>{marketResearch.nextExperiments.map((entry) => <li key={entry}>{entry}</li>)}</ol></div>
            <div className="research-report-cta">
              <span><span className="page-kicker">COMPREHENSIVE MARKET REPORT</span><strong>{en ? "Review the market, evidence, competitors, and validation tasks in one report." : "시장 범위부터 경쟁 구도와 검증 과제까지 하나의 보고서로 검토하세요."}</strong></span>
              {planId && researchMatchesContext ? (
                <span className="assistant-plan-actions">
                  <a className="button button--primary" href={`${localizedPath(`/api/gtm-plans/${planId}/export`, locale)}?view=1`} target="_blank" rel="noreferrer">{en ? "View comprehensive market report ↗" : "종합 시장보고서 보기 ↗"}</a>
                  <a className="button button--ghost" href={localizedPath(`/api/gtm-plans/${planId}/export`, locale)}>{en ? "Download HTML" : "HTML 다운로드"}</a>
                </span>
              ) : <small>{en ? "Run research with the current inputs to open the report." : "현재 입력으로 다시 조사하면 보고서를 열 수 있습니다."}</small>}
            </div>
          </section>
        )}

        <div className="assistant-prompt panel">
          {question && (
            <>
              <div className="assistant-question-progress" aria-label={en ? "Clarification progress" : "추가 확인 진행 상황"}>
                <span>{en ? `Required inputs ${question.completedFields}/${question.totalFields}` : `필수 정보 ${question.completedFields}/${question.totalFields} 완료`}</span>
                <span>{en ? `Clarifications ${question.clarificationCount}/${question.clarificationLimit}` : `추가 확인 ${question.clarificationCount}/${question.clarificationLimit}`}</span>
              </div>
              <p className="assistant-question"><strong>{question.question}</strong><span>{question.reason}</span></p>
            </>
          )}
          <label>
            {question ? (en ? "Answer" : "답변") : (en ? "Additional conditions" : "추가로 반영할 조건")}
            {question?.inputType === "date" ? (
              <input type="date" value={message} onChange={(event) => setMessage(event.target.value)} />
            ) : (
              <textarea
                rows={3}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={question ? (en ? "Provide only the missing detail." : "부족한 정보만 답해 주세요.") : (en ? "Optional. Leave blank to create the plan with the information already provided." : "선택 사항입니다. 비워 두시면 지금 정보만으로 계획을 만듭니다.")}
              />
            )}
          </label>
          <div className="assistant-prompt-actions">
            <button className="button button--primary" type="button" onClick={() => runWorkshop()} disabled={busy}>
              {busy ? (en ? "Drafting your plan…" : "계획을 작성하고 있습니다…") : question ? (en ? "Answer and continue" : "답변하고 계속") : (en ? "Create AI GTM plan" : "AI GTM 계획 만들기")}
            </button>
            {question && (
              <button className="button button--ghost" type="button" onClick={() => runWorkshop(en ? "Needs verification" : "확인 필요")} disabled={busy}>
                {en ? "Needs verification" : "확인 필요"}
              </button>
            )}
            {workshopFailed && (
              <button className="button button--ghost" type="button" onClick={() => runWorkshop(undefined, true)} disabled={busy}>
                {en ? "Create plan with current information" : "현재 정보로 계획 만들기"}
              </button>
            )}
          </div>
        </div>
        {notice && <p className="notice-banner" role="status">{notice}</p>}

        {items.length > 0 && (
          <section className="assistant-plan">
            <div className="dashboard-section__heading">
              <span><span className="page-kicker">{en ? "30 · 60 · 90 DAY PLAN" : "단계별 실행계획(30·60·90 Day Plan)"}</span><h2 className="plan-summary">{summary}</h2></span>
              {planStatus === "active" ? (
                <span className="assistant-plan-actions"><a className="button button--ghost" href={localizedPath(`/api/gtm-plans/${planId}/export`, locale)}>{en ? "Download report" : "보고서 다운로드"}</a><Link className="button button--dark" href={localizedPath("/journey", locale)}>{en ? "View approved journey →" : "승인된 여정 보기 →"}</Link></span>
              ) : (
                <span className="assistant-plan-actions"><a className="button button--ghost" href={localizedPath(`/api/gtm-plans/${planId}/export`, locale)}>{en ? "Download report" : "보고서 다운로드"}</a><button className="button button--dark" type="button" onClick={approve}>{en ? "Approve plan" : "계획 승인"}</button></span>
              )}
            </div>
            <div className="assistant-plan-list">
              {items.map((item, index) => (
                <article className="assistant-plan-item panel" key={item.id ?? `${item.title}-${index}`}>
                  <header><span className={`priority priority--${item.priority}`}>{en ? `Priority ${item.priority === "P0" ? "0" : "1"}` : item.priority === "P0" ? "우선순위 0" : "우선순위 1"}</span><strong>{item.horizon} {en ? "days" : "일"}</strong>{item.expertRequired && <Link className="button button--ghost button--small" href={localizedPath(`/services?tag=${encodeURIComponent(item.serviceTag)}`, locale)}>{en ? "Find an expert →" : "전문가 연결 →"}</Link>}</header>
                  <h3>{item.title}</h3>
                  <p>{item.rationale}</p>
                  <div className="assistant-plan-fields">
                    <label>{en ? "Owner" : "담당"}<input value={item.ownerLabel} onChange={(event) => updateItem(index, { ownerLabel: event.target.value })} /></label>
                    <label>{en ? "Due date" : "기한"}<input type="date" value={item.dueDate} onChange={(event) => updateItem(index, { dueDate: event.target.value })} /></label>
                    <label>{en ? "Status" : "상태"}<select value={item.status} onChange={(event) => updateItem(index, { status: event.target.value as GtmPlanItem["status"] })}><option value="not_started">{en ? "Not started" : "진행 전"}</option><option value="in_progress">{en ? "In progress" : "진행 중"}</option><option value="blocked">{en ? "Blocked" : "막힘"}</option><option value="completed">{en ? "Completed" : "완료"}</option></select></label>
                    <label className="assistant-context__wide">{en ? "Completion evidence" : "완료 근거"}<input value={item.completionEvidence} onChange={(event) => updateItem(index, { completionEvidence: event.target.value })} /></label>
                  </div>
                  <footer><small>{en ? "Sources" : "근거"}: {item.sources.map((source) => source.title).join(" · ")}</small><button type="button" className="button button--small" onClick={() => saveItem(index)}>{en ? "Save item" : "항목 저장"}</button></footer>
                </article>
              ))}
            </div>
          </section>
        )}
      </section>
    </div>
  );
}
