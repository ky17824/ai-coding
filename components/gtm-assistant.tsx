"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  GtmAssistantQuestion,
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
  };
  actions: {
    id: string;
    title: string;
    priority: string;
    completionEvidence: string;
  }[];
  initialPlan: StoredGtmPlan | null;
}

export function GtmAssistant({ assessment, actions, initialPlan }: Props) {
  const pendingQuestion = initialPlan?.items.length === 0
    ? initialPlan.recentMessages.filter((entry) => entry.role === "assistant").at(-1)?.content
    : undefined;
  const [planId, setPlanId] = useState(initialPlan?.id ?? "");
  const [planStatus, setPlanStatus] = useState(initialPlan?.status ?? "draft");
  const [summary, setSummary] = useState(initialPlan?.summary ?? "");
  const [items, setItems] = useState<GtmPlanItem[]>(initialPlan?.items ?? []);
  const [question, setQuestion] = useState<GtmAssistantQuestion | null>(
    pendingQuestion
      ? {
          kind: "next_question",
          questionKey: "resume",
          question: pendingQuestion,
          reason: "이 답변을 반영해 실행 계획을 이어서 작성합니다.",
          inputType: "text",
          options: [],
          generatedBy: "gpt-5.6-luna"
        }
      : null
  );
  const [message, setMessage] = useState("");
  const [context, setContext] = useState({
    targetCountry: initialPlan?.founderContext.targetCountry ?? "",
    targetCustomer: initialPlan?.founderContext.targetCustomer ?? "",
    resources: initialPlan?.founderContext.resources ?? "",
    deadline: initialPlan?.founderContext.deadline ?? "",
    constraints: initialPlan?.founderContext.constraints ?? ""
  });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function runWorkshop() {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/gtm-assistant/turn", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assessmentId: assessment.id, message, founderContext: context })
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
    } finally {
      setBusy(false);
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
        <span className="page-kicker">AI GTM ASSISTANT</span>
        <h1>진단 결과를 실행 계획으로</h1>
        <p>55문항 결과와 저장된 액션만 사용해 30·60·90일 계획을 함께 만들어 드립니다.</p>
        <div className="assistant-score"><strong>{assessment.score}</strong><span>{assessment.status}</span></div>
        {assessment.isOnHold && (
          <ul>{assessment.gateMessages.map((message) => <li key={message}>{message}</li>)}</ul>
        )}
        <h2>진단 우선 액션</h2>
        <ol className="assistant-action-list">
          {actions.map((action) => <li key={action.id}><span>{action.priority}</span>{action.title}</li>)}
        </ol>
      </aside>

      <section className="assistant-workspace">
        <div className="question-heading">
          <span>FOUNDER WORKSHOP</span>
          <h2>대표님의 계획을 말씀해 주세요.</h2>
          <p>고객 이름과 연락처, 계약서 원본은 입력하지 마세요. 목표와 제약 조건만 알려 주시면 됩니다.</p>
        </div>
        <div className="assistant-context panel">
          <label>목표 국가<input value={context.targetCountry} onChange={(event) => setContext({ ...context, targetCountry: event.target.value })} placeholder="예: 일본" /></label>
          <label>목표 고객<input value={context.targetCustomer} onChange={(event) => setContext({ ...context, targetCustomer: event.target.value })} placeholder="예: 도쿄 소재 중견 제조사" /></label>
          <label>가용 자원<input value={context.resources} onChange={(event) => setContext({ ...context, resources: event.target.value })} placeholder="예: 대표 1명, 월 300만 원" /></label>
          <label>목표 기한<input type="date" value={context.deadline} onChange={(event) => setContext({ ...context, deadline: event.target.value })} /></label>
          <label className="assistant-context__wide">제약<textarea rows={2} value={context.constraints} onChange={(event) => setContext({ ...context, constraints: event.target.value })} placeholder="예: 현지 법인을 세우기 전에 고객 검증이 필요합니다" /></label>
        </div>

        <div className="assistant-prompt panel">
          {question && <p className="assistant-question"><strong>{question.question}</strong><span>{question.reason}</span></p>}
          <label>
            {question ? "답변" : "추가로 반영할 조건"}
            <textarea rows={3} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="선택 사항입니다. 비워 두시면 지금 정보만으로 계획을 만듭니다." />
          </label>
          <button className="button button--primary" type="button" onClick={runWorkshop} disabled={busy}>
            {busy ? "계획을 작성하고 있습니다…" : question ? "답변하고 계속" : "AI GTM 계획 만들기"}
          </button>
        </div>
        {notice && <p className="notice-banner" role="status">{notice}</p>}

        {items.length > 0 && (
          <section className="assistant-plan">
            <div className="dashboard-section__heading">
              <span><span className="page-kicker">30 · 60 · 90 DAY PLAN</span><h2>{summary}</h2></span>
              {planStatus === "active" ? (
                <Link className="button button--dark" href="/journey">승인된 여정 보기 →</Link>
              ) : (
                <button className="button button--dark" type="button" onClick={approve}>계획 승인</button>
              )}
            </div>
            <div className="assistant-plan-list">
              {items.map((item, index) => (
                <article className="assistant-plan-item panel" key={item.id ?? `${item.title}-${index}`}>
                  <header><span className={`priority priority--${item.priority}`}>{item.priority}</span><strong>{item.horizon}일</strong>{item.expertRequired && <Link href={`/services?tag=${encodeURIComponent(item.serviceTag)}`}>전문가 확인 필요 →</Link>}</header>
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
