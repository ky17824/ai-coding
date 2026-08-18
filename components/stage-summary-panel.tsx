"use client";

import React, { useState } from "react";
import type { StageSummary, StageSummaryStatus } from "@/lib/stage-summary";
import type { Locale } from "@/lib/i18n";

type Props = {
  assessmentId: string;
  locale: Locale;
  initialSummary: StageSummary | null;
  initialStatus: StageSummaryStatus;
  score: number;
};

export function StageSummaryPanel({
  assessmentId,
  locale,
  initialSummary,
  initialStatus,
  score
}: Props) {
  const en = locale === "en";
  const [summary, setSummary] = useState(initialSummary);
  const [status, setStatus] = useState(initialStatus);
  const [message, setMessage] = useState("");
  const passed = score >= 80;
  const headline = summary?.headline ?? (status === "generating"
    ? (en ? "Reviewing all Stage 1 responses" : "1단계 전체 답변을 검토하고 있습니다")
    : (en ? "A founder-ready assessment summary is needed" : "창업자가 이해할 수 있는 진단 총평이 필요합니다"));
  // "준비 1단계 통과 전입니다: 시장 검증과 …" 처럼 판정과 이유가 콜론으로 이어지면 두 줄로 나눠 보여 준다.
  const colon = headline.search(/[:：]/);
  const headlineLines = colon > 0 ? [headline.slice(0, colon + 1), headline.slice(colon + 1).trim()] : [headline];
  // 다음 이정표는 모델이 쓴 문장을 보여 주지 않고 고정 안내 한 문장만 둔다(내부 용어 Gate A 노출 문제도 함께 사라진다).
  const nextMilestone = en
    ? "Review each response below. Improve the gaps and retake the assessment, or create an action plan with AI."
    : "아래 ‘내 응답 진단’에서 문항별 응답 수준을 확인하시고 부족한 내용을 보완해 재진단하거나, AI와 함께 실행계획을 만들어 보세요.";

  async function generate() {
    setStatus("generating");
    setMessage(en ? "Creating your assessment summary…" : "진단 총평을 작성하고 있습니다…");
    try {
      const response = await fetch(`/api/assessments/${assessmentId}/stage-summary`, { method: "POST" });
      const payload = await response.json() as { status?: StageSummaryStatus; summary?: unknown; message?: string };
      if (!response.ok || !payload.summary || typeof payload.summary !== "object") throw new Error(payload.message);
      setSummary(payload.summary as StageSummary);
      setStatus("complete");
      setMessage(en ? "Assessment summary created." : "진단 총평이 작성되었습니다.");
    } catch {
      setStatus("failed");
      setMessage(en ? "We couldn't create the assessment summary." : "진단 총평을 생성하지 못했습니다.");
    }
  }

  return (
    <section className={`stage-summary panel stage-summary--${status}`} aria-labelledby="stage-summary-title">
      <div className="stage-summary__intro">
        <span className="page-kicker">{en ? "STAGE 1 ASSESSMENT SUMMARY" : "1단계 진단 총평"}</span>
        <div className="stage-summary__score">
          <strong>{score}%</strong>
          <small>{passed ? (en ? "Threshold met" : "통과 점수 충족") : (en ? "Needs reinforcement" : "보완 필요")}</small>
        </div>
        <h2 id="stage-summary-title">
          {headlineLines.map((line, index) => <span key={index}>{line}</span>)}
        </h2>
        <p>{summary?.overview ?? (status === "failed"
          ? (en ? "We couldn't create the assessment summary. Your assessment and answers are safely stored." : "진단 총평을 생성하지 못했습니다. 진단 결과와 답변은 정상적으로 저장되어 있습니다.")
          : (en ? "Create it once from the stored assessment. Reopening the dashboard will reuse the same summary." : "저장된 진단으로 한 번 작성하면 대시보드를 다시 열어도 같은 총평을 사용합니다."))}</p>
        {!summary && status !== "generating" && (
          <button type="button" className="button button--primary" onClick={generate}>
            {status === "failed"
              ? (en ? "Retry summary" : "총평 다시 생성")
              : (en ? "Create Stage 1 summary" : "1단계 총평 생성")}
          </button>
        )}
        <span className="sr-only" aria-live="polite">{message}</span>
      </div>

      {summary && (
        <div className="stage-summary__body">
          <section className="stage-summary__reason">
            <h3>{en ? "Why must this be resolved now?" : "왜 지금 해결해야 하나요?"}</h3>
            <p>{summary.whyItMatters}</p>
          </section>
          <section>
            <h3>{en ? "Priority actions" : "지금 우선할 행동"}</h3>
            <ol className="stage-summary__actions">
              {summary.priorityActions.map((action, index) => (
                <li key={`${action.title}-${index}`}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{action.title}</strong>
                    <p>{action.reason}</p>
                    <small><b>{en ? "Direction" : "진행 방향"}</b>{action.direction}</small>
                  </div>
                </li>
              ))}
            </ol>
          </section>
          <section className="stage-summary__reason">
            <h3>{en ? "Next milestone" : "다음 이정표"}</h3>
            <p>{nextMilestone}</p>
          </section>
        </div>
      )}
    </section>
  );
}
