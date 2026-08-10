"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  GtmAssistantQuestion,
  GtmFounderContext,
  GtmMarketResearch,
  GtmPlanDraft,
  GtmPlanItem,
  StoredGtmPlan
} from "@/lib/types";

interface Props {
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
  }[];
  initialPlan: StoredGtmPlan | null;
  initialQuestion: GtmAssistantQuestion | null;
}

export function GtmAssistant({ assessment, actions, initialPlan, initialQuestion }: Props) {
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
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [workshopFailed, setWorkshopFailed] = useState(false);
  const researchMatchesContext = Boolean(
    marketResearch &&
      marketResearch.offeringName === context.offeringName.trim() &&
      marketResearch.targetCountry === context.targetCountry.trim() &&
      marketResearch.targetCustomer === context.targetCustomer.trim()
  );

  async function runWorkshop(answerOverride?: string, forcePlan = false) {
    if (!researchMatchesContext || !researchConfirmed) {
      setNotice("시장·경쟁 사전조사를 만들고 확인한 뒤 실행 계획을 작성해 주세요.");
      return;
    }
    const answer = (answerOverride ?? message).trim();
    if (question && !answer && !forcePlan) {
      setNotice("답변하거나 ‘확인 필요’를 선택해 주세요.");
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
          founderContext: nextContext
        })
      });
      const payload = (await response.json()) as {
        message?: string;
        planId?: string;
        result?: GtmAssistantQuestion | GtmPlanDraft;
      };
      if (!response.ok || !payload.result || !payload.planId) {
        throw new Error(payload.message ?? "계획을 만들지 못했습니다.");
      }
      setPlanId(payload.planId);
      if (payload.result.kind === "next_question") {
        setQuestion(payload.result);
        setNotice("계획을 구체화하기 위해 여쭙습니다.");
      } else {
        setQuestion(null);
        setSummary(payload.result.summary);
        setItems(payload.result.items);
        setNotice(
          payload.result.generatedBy === "deterministic-fallback"
            ? "AI 연결 없이 진단 액션만으로 기본 계획을 만들었습니다."
            : "AI GTM 실행 계획 초안을 만들었습니다."
        );
      }
      setMessage("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "오류가 발생했습니다.");
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
        body: JSON.stringify({ assessmentId: assessment.id, founderContext: context })
      });
      const payload = (await response.json()) as {
        message?: string;
        planId?: string;
        result?: GtmMarketResearch;
      };
      if (!response.ok || !payload.result || !payload.planId) {
        throw new Error(payload.message ?? "시장·경쟁 사전조사를 만들지 못했습니다.");
      }
      setPlanId(payload.planId);
      setMarketResearch(payload.result);
      setResearchConfirmed(false);
      setNotice("AI 시장·경쟁 사전조사를 만들었습니다. 내용을 확인해 주세요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmResearch() {
    if (!planId) return;
    const response = await fetch(`/api/gtm-plans/${planId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "confirm_research" })
    });
    if (response.ok) {
      setResearchConfirmed(true);
      setNotice("시장·경쟁 사전조사를 확인했습니다. 실행 계획을 만들 수 있습니다.");
    } else {
      setNotice("시장·경쟁 사전조사를 확인 처리하지 못했습니다.");
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
        status: item.status
      })
    });
    setNotice(response.ok ? "계획 항목을 저장했습니다." : "계획 항목을 저장하지 못했습니다.");
  }

  async function approve() {
    if (!planId) return;
    const response = await fetch(`/api/gtm-plans/${planId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "approve" })
    });
    if (response.ok) {
      setPlanStatus("active");
      setNotice("계획을 승인하고 GTM 여정에 연결했습니다.");
    } else {
      setNotice("계획을 승인하지 못했습니다.");
    }
  }

  return (
    <div className="app-container assistant-layout">
      <aside className="assistant-sidebar panel">
        <span className="page-kicker">AI GTM 어시스턴트(AI GTM Assistant)</span>
        <h1>진단 결과를 실행 계획으로</h1>
        <p>55문항 결과와 저장된 액션만 사용해 단계별 실행계획(30·60·90 Day Plan)을 함께 만들어 드립니다.</p>
        <div className="assistant-score"><strong>{assessment.score}</strong><span>{assessment.status}</span></div>
        {assessment.isOnHold && (
          <ul>{assessment.gateMessages.map((message) => <li key={message}>{message}</li>)}</ul>
        )}
        <h2>진단 우선 액션</h2>
        <ol className="assistant-action-list">
          {actions.map((action) => <li key={action.id}><span>{action.priority === "P0" ? "우선순위 0(Priority 0)" : "우선순위 1(Priority 1)"}</span>{action.title}</li>)}
        </ol>
      </aside>

      <section className="assistant-workspace">
        <div className="question-heading">
          <span>창업자 공동계획 회의(Founder Workshop)</span>
          <h2>글로벌 론칭 대상과 초기 목표시장(Target Market)을 정의해 주세요.</h2>
          <p>무엇을 누구에게 왜 판매할지 먼저 정의하면 AI가 시장동향·규모·경쟁사를 조사하고 실행 계획에 반영합니다.</p>
        </div>
        <div className="assistant-context panel">
          <label>론칭 유형<select value={context.offeringType} onChange={(event) => setContext({ ...context, offeringType: event.target.value as GtmFounderContext["offeringType"] })}><option value="">선택</option><option value="product">제품</option><option value="service">서비스</option><option value="solution">솔루션</option><option value="hybrid">복합</option></select></label>
          <label>제품·서비스·솔루션 이름<input value={context.offeringName} onChange={(event) => setContext({ ...context, offeringName: event.target.value })} placeholder="예: 제조 품질 예측 솔루션" /></label>
          <label className="assistant-context__wide">론칭 대상 설명<textarea rows={2} value={context.offeringSummary} onChange={(event) => setContext({ ...context, offeringSummary: event.target.value })} placeholder="핵심 기능과 사용 상황을 간단히 설명해 주세요." /></label>
          <label>해결할 고객 문제<textarea rows={2} value={context.customerProblem} onChange={(event) => setContext({ ...context, customerProblem: event.target.value })} placeholder="고객이 지금 겪는 비용·시간·위험은 무엇인가요?" /></label>
          <label>핵심 가치<textarea rows={2} value={context.coreValue} onChange={(event) => setContext({ ...context, coreValue: event.target.value })} placeholder="기존 방식보다 나아지는 측정 가능한 결과는 무엇인가요?" /></label>
          <label>현재 대안<input value={context.currentAlternative} onChange={(event) => setContext({ ...context, currentAlternative: event.target.value })} placeholder="예: 엑셀 수작업, 현지 경쟁 제품" /></label>
          <label>차별성<input value={context.differentiation} onChange={(event) => setContext({ ...context, differentiation: event.target.value })} placeholder="고객이 바꿀 이유" /></label>
          <label>제공 방식<input value={context.deliveryModel} onChange={(event) => setContext({ ...context, deliveryModel: event.target.value })} placeholder="예: SaaS, 수출, 현지 파트너" /></label>
          <label>수익 방식<input value={context.revenueModel} onChange={(event) => setContext({ ...context, revenueModel: event.target.value })} placeholder="예: 월 구독, 건별 계약" /></label>
          <label>목표국가(Target Country)<input value={context.targetCountry} onChange={(event) => setContext({ ...context, targetCountry: event.target.value })} placeholder="예: 일본" /></label>
          <label>목표 고객<input value={context.targetCustomer} onChange={(event) => setContext({ ...context, targetCustomer: event.target.value })} placeholder="예: 도쿄 소재 중견 제조사" /></label>
          <label className="assistant-context__wide">현재 검증 근거<textarea rows={2} value={context.validationEvidence} onChange={(event) => setContext({ ...context, validationEvidence: event.target.value })} placeholder="인터뷰, 유료 고객, 실증시험(Market Testing) 등 현재 확인된 사실만 적어 주세요." /></label>
          <label>가용 자원(Resource)<input value={context.resources} onChange={(event) => setContext({ ...context, resources: event.target.value })} placeholder="예: 대표 1명, 월 300만 원" /></label>
          <label>목표 기한<input type="date" value={context.deadline} onChange={(event) => setContext({ ...context, deadline: event.target.value })} /></label>
          <label className="assistant-context__wide">제약<textarea rows={2} value={context.constraints} onChange={(event) => setContext({ ...context, constraints: event.target.value })} placeholder="예: 현지 법인을 세우기 전에 고객 검증이 필요합니다" /></label>
          <button className="button button--primary" type="button" onClick={runResearch} disabled={busy}>
            {busy ? "조사하고 있습니다…" : marketResearch ? "시장·경쟁 사전조사 다시 만들기" : "AI 시장·경쟁 사전조사"}
          </button>
        </div>

        {marketResearch && (
          <section className="assistant-research panel">
            <div className="dashboard-section__heading">
              <span><span className="page-kicker">AI 시장·경쟁 사전조사</span><h2>{marketResearch.offeringName} · {marketResearch.targetCountry}</h2></span>
              {researchMatchesContext && researchConfirmed ? <strong className="research-confirmed">확인 완료</strong> : researchMatchesContext ? <button className="button button--dark" type="button" onClick={confirmResearch}>조사 결과 확인</button> : <strong>입력 변경됨 · 다시 조사 필요</strong>}
            </div>
            <p>{marketResearch.executiveSummary}</p>
            {marketResearch.scope === "market_preresearch" && <p className="notice-banner">준비 1단계와 준비 2단계에서는 실제 판매 가능성을 판정하지 않고, 시장·경쟁 사전조사와 다음 검증 과제만 제공합니다.</p>}
            <div className="market-size-grid">{marketResearch.marketSizing.map((entry) => <article key={entry.label}><strong>{entry.label}</strong><span>{entry.estimate}</span><small>{entry.method}</small></article>)}</div>
            <div className="assistant-research-grid">
              <div><h3>시장동향</h3><ul>{marketResearch.trends.map((entry) => <li key={entry.title}><strong>{entry.title}</strong><span>{entry.finding}</span>{entry.url && <a href={entry.url} target="_blank" rel="noreferrer">{entry.sourceTitle} ↗</a>}</li>)}</ul></div>
              <div><h3>주요 경쟁사</h3><ul>{marketResearch.competitors.map((entry) => <li key={`${entry.name}-${entry.type}`}><strong>{entry.name}</strong><span>{entry.relevance}</span><small>{entry.differentiationGap}</small>{entry.url && <a href={entry.url} target="_blank" rel="noreferrer">근거 ↗</a>}</li>)}</ul></div>
            </div>
            <div><h3>다음 검증 과제</h3><ol>{marketResearch.nextExperiments.map((entry) => <li key={entry}>{entry}</li>)}</ol></div>
          </section>
        )}

        <div className="assistant-prompt panel">
          {question && (
            <>
              <div className="assistant-question-progress" aria-label="추가 확인 진행 상황">
                <span>필수 정보 {question.completedFields}/{question.totalFields} 완료</span>
                <span>추가 확인 {question.clarificationCount}/{question.clarificationLimit}</span>
              </div>
              <p className="assistant-question"><strong>{question.question}</strong><span>{question.reason}</span></p>
            </>
          )}
          <label>
            {question ? "답변" : "추가로 반영할 조건"}
            {question?.inputType === "date" ? (
              <input type="date" value={message} onChange={(event) => setMessage(event.target.value)} />
            ) : (
              <textarea
                rows={3}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={question ? "부족한 정보만 답해 주세요." : "선택 사항입니다. 비워 두시면 지금 정보만으로 계획을 만듭니다."}
              />
            )}
          </label>
          <div className="assistant-prompt-actions">
            <button className="button button--primary" type="button" onClick={() => runWorkshop()} disabled={busy}>
              {busy ? "계획을 작성하고 있습니다…" : question ? "답변하고 계속" : "AI GTM 계획 만들기"}
            </button>
            {question && (
              <button className="button button--ghost" type="button" onClick={() => runWorkshop("확인 필요")} disabled={busy}>
                확인 필요
              </button>
            )}
            {workshopFailed && (
              <button className="button button--ghost" type="button" onClick={() => runWorkshop(undefined, true)} disabled={busy}>
                현재 정보로 계획 만들기
              </button>
            )}
          </div>
        </div>
        {notice && <p className="notice-banner" role="status">{notice}</p>}

        {items.length > 0 && (
          <section className="assistant-plan">
            <div className="dashboard-section__heading">
              <span><span className="page-kicker">단계별 실행계획(30·60·90 Day Plan)</span><h2 className="plan-summary">{summary}</h2></span>
              {planStatus === "active" ? (
                <span className="assistant-plan-actions"><a className="button button--ghost" href={`/api/gtm-plans/${planId}/export`}>보고서 다운로드</a><Link className="button button--dark" href="/journey">승인된 여정 보기 →</Link></span>
              ) : (
                <span className="assistant-plan-actions"><a className="button button--ghost" href={`/api/gtm-plans/${planId}/export`}>보고서 다운로드</a><button className="button button--dark" type="button" onClick={approve}>계획 승인</button></span>
              )}
            </div>
            <div className="assistant-plan-list">
              {items.map((item, index) => (
                <article className="assistant-plan-item panel" key={item.id ?? `${item.title}-${index}`}>
                  <header><span className={`priority priority--${item.priority}`}>{item.priority === "P0" ? "우선순위 0(Priority 0)" : "우선순위 1(Priority 1)"}</span><strong>{item.horizon}일</strong>{item.expertRequired && <Link href={`/services?tag=${encodeURIComponent(item.serviceTag)}`}>전문가 확인 필요 →</Link>}</header>
                  <h3>{item.title}</h3>
                  <p>{item.rationale}</p>
                  <div className="assistant-plan-fields">
                    <label>담당<input value={item.ownerLabel} onChange={(event) => updateItem(index, { ownerLabel: event.target.value })} /></label>
                    <label>기한<input type="date" value={item.dueDate} onChange={(event) => updateItem(index, { dueDate: event.target.value })} /></label>
                    <label>상태<select value={item.status} onChange={(event) => updateItem(index, { status: event.target.value as GtmPlanItem["status"] })}><option value="not_started">진행 전</option><option value="in_progress">진행 중</option><option value="blocked">막힘</option><option value="completed">완료</option></select></label>
                    <label className="assistant-context__wide">완료 근거<input value={item.completionEvidence} onChange={(event) => updateItem(index, { completionEvidence: event.target.value })} /></label>
                  </div>
                  <footer><small>근거: {item.sources.map((source) => source.title).join(" · ")}</small><button type="button" className="text-link" onClick={() => saveItem(index)}>항목 저장</button></footer>
                </article>
              ))}
            </div>
          </section>
        )}
      </section>
    </div>
  );
}
