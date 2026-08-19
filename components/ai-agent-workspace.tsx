"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AiAgentReport } from "@/lib/ai-agent-report";
import { AiGenerationFlow, type GenerationStage } from "@/components/ai-generation-flow";
import { marketSizingHtml } from "@/lib/market-sizing-view";
import { ATTACHMENT_PDF_TIP, INPUT_AUDIT_LABEL, INTAKE_FIELD_LABEL } from "@/lib/catalog/copy";

/** 리스는 예약 시점에 now() + 15분으로 한 번만 잡힌다(010:168). 갱신되지 않으므로
 *  여기서 되돌리면 이번 시도의 실제 시작 시각이 나온다. 추정이 아니다. */
const LEASE_MS = 15 * 60 * 1000;

type Run = {
  order_id: string;
  status: "intake" | "clarifying" | "ready" | "generating" | "completed" | "failed";
  intake: Record<string, unknown>;
  input_audit: { field: string; status: "confirmed" | "unclear" | "missing" | "conflicting"; reason: string }[];
  reference_files: { storagePath: string; fileName: string; mimeType: string; sizeBytes: number }[];
  clarification_round: number;
  pending_questions: { id: string; question: string }[];
  assumptions: { field: string; basis: string }[];
  report: AiAgentReport | null;
  generation_count: number;
  model?: string | null;
  error_message?: string | null;
  lease_expires_at?: string | null;
  generation_stage?: GenerationStage | null;
  generation_stage_log?: Array<{ stage: string; at: string; attempt?: string }> | null;
  model_route_snapshot?: Record<string, { model: string; effort: string }> | null;
  research_summary?: { sources: number; findings: number } | null;
};

const fieldNames = ["objective", "offering", "targetCountry", "targetCustomer", "currentEvidence", "constraints", "resources", "deadline"] as const;
// 공통 8칸 이름은 lib/catalog/copy의 INTAKE_FIELD_LABEL 한 곳에서 온다(추가 질문 문장과 같은 표).
const fieldLabels = (locale: "ko" | "en") => Object.fromEntries(fieldNames.map((field) => [field, INTAKE_FIELD_LABEL[field][locale]])) as Record<(typeof fieldNames)[number], string>;
const copy = {
  ko: {
    ...fieldLabels("ko"),
    unknown: "모름 — 유사 사례로 추론", unknownShort: "모름", edit: "수정", fileHelpPrivacy: "보고서 생성을 위해 OpenAI에 비공개로 전송됩니다.", save: "필요 정보 확인하기", saving: "저장 중…", clarify: "추가 정보 제출", ready: "입력 완료", readyBody: "아래 정보와 유사 사례 가정을 확인하면 조사와 보고서 생성을 시작합니다.", generate: "가정 확인 후 보고서 만들기", generatingButton: "보고서 생성 시작 중…", generating: "프론티어 모델이 조사·분석 중입니다. 중단되었으면 ‘작업 이어가기’를 눌러 복구할 수 있습니다.", stalled: "이 시도는 응답이 끊긴 것으로 보입니다. ‘작업 이어가기’를 누르면 중단된 지점부터 다시 진행합니다.", resume: "작업 이어가기", retry: "보고서 생성 다시 시도", correction: "사실 정정 후 재생성", correctionFailed: "사실 정정 재생성에 실패했습니다. 이전 보고서는 그대로 유지되며, 포함된 정정 시도 1회는 사용된 것으로 처리됩니다.", download: "HTML 다운로드", report: "AI 전문가 보고서", human: "전문가 검증 필요", source: "근거 출처", actions: "실행 계획", assumptions: "가정", gaps: "증거 공백", limitations: "한계", contradictions: "모순과 해결", coverage: "준비도 문항 추적", sizing: "시장 규모 추정", files: "참고 파일", fileHelp: "PDF·PNG·JPG, 파일당 4MB, 최대 3개",
    intakeKicker: "필요 정보 입력", reviewKicker: "입력 확인", scopeLocked: "범위를 바꾸려면 새 주문이 필요합니다", intakeTitle: "AI 전문가가 해결할 업무를 설명해 주세요", intakeBody: "모르는 정보가 있어도 작업은 중단되지 않습니다. ‘모름’을 선택하면 신뢰도를 낮춘 유사 사례 가정으로 보완합니다.",
    serviceKicker: "서비스별 추가 정보", serviceTitle: "이 서비스에 필요한 추가 정보", serviceHelp: "비워 두면 추가 질문(최대 2회, 회당 4개)에서 다시 확인하고, 그래도 없으면 유사 사례 가정으로 표시합니다.", fileHints: "이 서비스에 유용한 자료"
  },
  en: {
    ...fieldLabels("en"),
    unknown: "Unknown — infer from analogs", unknownShort: "Unknown", edit: "Edit", fileHelpPrivacy: "Privately sent to OpenAI for report generation.", save: "Review required information", saving: "Saving…", clarify: "Submit details", ready: "Input complete", readyBody: "Review the information and analog assumptions before research and report generation.", generate: "Confirm assumptions and build report", generatingButton: "Starting report generation…", generating: "The frontier model is researching and analysing. Use resume if the previous attempt was interrupted.", stalled: "This attempt appears to have stopped responding. Resume picks the work back up.", resume: "Resume work", retry: "Retry report", correction: "Correct facts and regenerate", correctionFailed: "The correction attempt failed. The previous report is unchanged, and the included correction attempt was used.", download: "Download HTML", report: "AI expert report", human: "Human verification", source: "Sources", actions: "Action plan", assumptions: "Assumptions", gaps: "Evidence gaps", limitations: "Limitations", contradictions: "Contradictions and resolutions", coverage: "Readiness question trace", sizing: "Market sizing", files: "Reference files", fileHelp: "PDF, PNG, or JPG; 4 MB each; up to 3 files",
    intakeKicker: "AI EXPERT INTAKE", reviewKicker: "INPUT REVIEW", scopeLocked: "New order required to change scope", intakeTitle: "Describe what the AI expert should solve", intakeBody: "Unknown answers do not stop the work. Select unknown and the report will use labelled, lower-confidence analog assumptions.",
    serviceKicker: "SERVICE-SPECIFIC", serviceTitle: "Extra information this service needs", serviceHelp: "Blank fields come back in the follow-up questions (up to two rounds of four); anything still unknown is marked as an analog assumption in the report.", fileHints: "Useful files for this service"
  }
};

/**
 * 보고서 안의 영문 열거값을 화면 언어로 바꾼다. 스키마 값(fact, analog_assumption…)은
 * 계약이라 바꾸지 않고, 표시만 바꾼다.
 */
/** 제목 앞 번호를 뗀다. lib/ai-agent-report에 같은 함수가 있지만 그 모듈은 문항 데이터
 *  2천 줄을 끌고 오므로 클라이언트에서는 여기 사본을 쓴다. 저장 시점에 이미 정리되고,
 *  이것은 예전에 저장된 보고서를 위한 표시용 보정이다. */
function stripLeadingNumber(title: string) {
  return title.replace(/^\s*(?:\d+\s*[.)、]|[①-⑳])\s*/, "");
}

/** 저장된 보고서 본문에 남은 옛 표기를 표시에서 보정한다. 지시문은 이미 새 표기를 쓰지만, 예전 보고서와
 *  모델이 어긴 경우를 덮는다. 한 단어 쌍만 목록으로 관리하고 범용 교정기로 키우지 않는다. */
const DISPLAY_TERMS: ReadonlyArray<readonly [RegExp, string]> = [
  [/사람 검증/g, "전문가 검증"], // ko-copy-lint: allow (옛 표기 → 새 표기 사전)
  [/유사사례/g, "유사 사례"] // ko-copy-lint: allow
];
function normalizeReportText<T>(value: T): T {
  if (typeof value === "string") return DISPLAY_TERMS.reduce<string>((text, [pattern, next]) => text.replace(pattern, next), value) as T;
  if (Array.isArray(value)) return value.map(normalizeReportText) as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, normalizeReportText(item)])) as T;
  return value;
}

const reportLabels = {
  ko: {
    status: { fact: "확인된 사실", estimate: "추정", analog_assumption: "유사 사례 가정", human_verification: "전문가 검증 필요" },
    confidence: { high: "신뢰도 높음", medium: "신뢰도 보통", low: "신뢰도 낮음" },
    priority: { critical: "핵심", current_gate: "현재 단계 기준", low_score: "낮은 점수", other: "기타" },
    disposition: { used: "반영", excluded: "제외" },
    owner: "담당", timing: "시기", successMetric: "성공 기준", stopCondition: "중단 기준",
    basis: "근거", impact: "영향", relatedQuestions: "관련 준비도 문항"
  },
  en: {
    status: { fact: "Confirmed fact", estimate: "Estimate", analog_assumption: "Analog assumption", human_verification: "Needs human verification" },
    confidence: { high: "High confidence", medium: "Medium confidence", low: "Low confidence" },
    priority: { critical: "Critical", current_gate: "Current gate", low_score: "Low score", other: "Other" },
    disposition: { used: "Used", excluded: "Excluded" },
    owner: "Owner", timing: "Timing", successMetric: "Success metric", stopCondition: "Stop condition",
    basis: "Basis", impact: "Impact", relatedQuestions: "Related readiness questions"
  }
} as const;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

/** 상품에 포함된 전문가별 특화 입력칸. 주문 페이지가 카탈로그에서 계산해 넘긴다. */
export type ServiceInputSpec = { id: string; title: string; label: string; fileHint?: string };
// lib/ai-agent-report에 같은 두 함수가 있지만 그 모듈은 문항 데이터 2천 줄을 끌고 오므로(stripLeadingNumber와 같은 이유) 여기 사본을 쓴다.
const serviceField = (id: string) => `service:${id}`;
const serviceAgentId = (field: string) => field.startsWith("service:") ? field.slice("service:".length) : null;

export function AiAgentWorkspace({ initialRun, locale = "ko", questionLabels = {}, serviceInputs = [], feedbackFormUrl = null }: { initialRun: Run; locale?: "ko" | "en"; questionLabels?: Record<string, string>; serviceInputs?: ServiceInputSpec[]; /** 베타 테스터 주문일 때만 넘어온다. 보고서 완료 화면에 설문 안내를 띄운다. */ feedbackFormUrl?: string | null }) {
  const c = copy[locale];
  const L = reportLabels[locale];
  const questionLabel = (id: string) => questionLabels[id] ?? id;
  const [run, setRun] = useState(initialRun);
  // 헤더의 "진행 중 서비스" 알약은 서버 컴포넌트라 이 화면이 상태를 바꿔도 저절로 안 바뀐다.
  // 서버가 확인해 준 상태가 헤더가 마지막으로 그린 상태와 달라지면 router.refresh()로 서버
  // 컴포넌트만 다시 그린다(클라이언트 상태는 유지). 낙관적 표시가 아니라 서버 응답을 기준으로
  // 삼는 이유: 예약 RPC가 끝나기 전에 새로 고치면 헤더는 여전히 옛 상태를 읽는다.
  const router = useRouter();
  const headerStatus = useRef<string | null>(initialRun.status);
  const syncHeader = (status: string | null) => {
    if (headerStatus.current === status) return;
    headerStatus.current = status;
    router.refresh();
  };
  const [intake, setIntake] = useState<Record<string, string>>(() => Object.fromEntries(fieldNames.map((field) => [field, String(initialRun.intake?.[field] ?? "")])));
  const [serviceAnswers, setServiceAnswers] = useState<Record<string, string>>(() => {
    const stored = initialRun.intake?.serviceInputs;
    return Object.fromEntries(serviceInputs.map((item) => [item.id, String((stored && typeof stored === "object" ? (stored as Record<string, unknown>)[item.id] : "") ?? "")]));
  });
  // 준비도 진단 등에서 이미 채워져 들어온 칸은 읽기 전용 요약으로 접어 두고 "수정"을 눌러야 연다 — 8칸을 한꺼번에 펼치지 않는다.
  const [collapsedFields, setCollapsedFields] = useState<string[]>(() => fieldNames.filter((field) => String(initialRun.intake?.[field] ?? "").trim() !== ""));
  const [unknownFields, setUnknownFields] = useState<string[]>(() => Array.isArray(initialRun.intake?.unknownFields) ? initialRun.intake.unknownFields as string[] : []);
  const toggleUnknown = (field: string, checked: boolean) => setUnknownFields((current) => checked ? [...current, field] : current.filter((item) => item !== field));
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(initialRun.status === "completed" && initialRun.report && initialRun.error_message ? c.correctionFailed : "");
  const [editing, setEditing] = useState(initialRun.status === "intake");

  // 생성 중에만 실행 상태를 다시 읽는다. 진행 단계를 화면에 반영하고, 페이지를
  // 새로 열었을 때(생성 요청은 다른 탭에 있음) 완료 시점을 잡기 위한 것이다.
  //
  // busy는 이 탭이 생성 POST를 붙들고 있다는 뜻이다. 그때는 단계만 받는다.
  // 결과는 POST 응답이 알려주고, 예약 직전의 낡은 상태를 읽어 화면을 되돌리면 안 된다.
  useEffect(() => {
    if (run.status !== "generating") return;
    let cancelled = false;
    const poll = async () => {
      try {
        const response = await fetch(`/api/ai-agent-runs/${run.order_id}`, { cache: "no-store" });
        if (!response.ok) return;
        const { run: latest } = await response.json() as { run: Run };
        if (cancelled || !latest) return;
        syncHeader(latest.status);
        if (busy) {
          if (latest.status === "generating") setRun((current) => ({
            ...current,
            generation_stage: latest.generation_stage,
            lease_expires_at: latest.lease_expires_at,
            generation_stage_log: latest.generation_stage_log,
            model_route_snapshot: latest.model_route_snapshot,
            research_summary: latest.research_summary
          }));
          return;
        }
        setRun(latest);
        if (latest.status === "failed" && latest.error_message) setMessage(latest.error_message);
      } catch {
        // 폴링 실패는 무시한다. 다음 주기에 다시 시도한다.
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), 5000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [run.status, run.order_id, busy]);

  // 리스가 살아 있는 동안 '작업 이어가기'를 누르면 서버가 409로 막는다. 그래서
  // 버튼을 계속 보여 주면 누를 수 있는 것처럼 보이지만 아무 일도 일어나지 않는다.
  // 실제로 이어받을 수 있을 때만 내보낸다.
  const [leaseExpired, setLeaseExpired] = useState(false);
  useEffect(() => {
    const expiresAt = run.lease_expires_at;
    if (run.status !== "generating" || !expiresAt) { setLeaseExpired(false); return; }
    const check = () => setLeaseExpired(Date.parse(expiresAt) < Date.now());
    check();
    const timer = setInterval(check, 15_000);
    return () => clearInterval(timer);
  }, [run.status, run.lease_expires_at]);

  async function send(body: object) {
    const previousStatus = run.status;
    if ((body as { action?: string }).action === "generate") setRun((current) => ({ ...current, status: "generating" }));
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/ai-agent-runs/${run.order_id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, locale }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? (locale === "en" ? "The request failed." : "요청을 처리하지 못했습니다."));
      if (result.correctionFailed) {
        setRun((current) => ({ ...current, status: "completed", report: result.report ?? current.report, generation_count: result.generationCount ?? current.generation_count }));
        setMessage(c.correctionFailed);
        setEditing(false);
        syncHeader("completed");
        return;
      }
      if (result.run) { setRun(result.run); syncHeader(result.run.status); }
      if (result.report) { setRun((current) => ({ ...current, status: "completed", report: result.report, generation_count: current.generation_count + 1 })); syncHeader("completed"); }
      setEditing(false);
    } catch (error) {
      setRun((current) => ({ ...current, status: previousStatus }));
      // 서버가 실패를 기록했을 수 있다(status=failed). 헤더는 서버 값을 다시 읽게 한다.
      syncHeader(null);
      setMessage(error instanceof Error ? error.message : locale === "en" ? "The request failed." : "요청을 처리하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  function submitIntake() {
    void send({ action: "submit_intake", intake: { ...intake, serviceInputs: serviceAnswers, unknownFields } });
  }

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setMessage("");
    try {
      let referenceFiles = run.reference_files ?? [];
      for (const file of Array.from(files).slice(0, Math.max(0, 3 - referenceFiles.length))) {
        const form = new FormData();
        form.set("file", file);
        const response = await fetch(`/api/ai-agent-runs/${run.order_id}/upload-url`, { method: "POST", body: form });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message ?? c.fileHelp);
        referenceFiles = result.referenceFiles;
      }
      setRun((current) => ({ ...current, reference_files: referenceFiles }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : c.fileHelp);
    } finally {
      setBusy(false);
    }
  }

  function downloadReport() {
    if (!run.report) return;
    const report = normalizeReportText(run.report);
    const html = `<!doctype html><html lang="${locale}"><meta charset="utf-8"><title>${escapeHtml(report.title)}</title><style>body{font-family:"Pretendard Variable",Pretendard,"Noto Sans KR","Apple SD Gothic Neo",system-ui,sans-serif;max-width:900px;margin:40px auto;padding:0 24px;color:#10221b;line-height:1.65}h1,h2{color:#0e3b2b}section{margin:32px 0;padding:24px;border:1px solid #d9dfdb;border-radius:12px}small{color:#5f6d66}a{color:#1d7b4c}dl{display:grid;grid-template-columns:max-content 1fr;gap:4px 14px;margin:8px 0 0;font-size:14px}dt{color:#60726a}dd{margin:0}ol>li{margin:0 0 18px}details{margin:6px 0}</style><h1>${escapeHtml(report.title)}</h1><p>${escapeHtml(report.executiveSummary)}</p><section><h2>${escapeHtml(c.report)}</h2>${report.findings.map((item) => `<h3>${escapeHtml(stripLeadingNumber(item.title))}</h3><small>${escapeHtml(L.status[item.status])} · ${escapeHtml(L.confidence[item.confidence])}</small><p>${escapeHtml(item.summary)}</p>${item.actions.length ? `<ul>${item.actions.map((action) => `<li>${escapeHtml(action)}</li>`).join("")}</ul>` : ""}${item.questionIds.length ? `<details><summary>${escapeHtml(L.relatedQuestions)} · ${item.questionIds.length}</summary><ul>${item.questionIds.map((id) => `<li>${escapeHtml(questionLabel(id))}</li>`).join("")}</ul></details>` : ""}`).join("")}</section>${report.marketSizing ? `<section>${marketSizingHtml(report.marketSizing, locale)}</section>` : ""}<section><h2>${escapeHtml(c.actions)}</h2><ol>${report.actionPlan.map((item) => `<li><strong>${escapeHtml(stripLeadingNumber(item.title))}</strong><p>${escapeHtml(item.why)}</p><dl><dt>${escapeHtml(L.owner)}</dt><dd>${escapeHtml(item.owner)}</dd><dt>${escapeHtml(L.timing)}</dt><dd>${escapeHtml(item.timing)}</dd><dt>${escapeHtml(L.successMetric)}</dt><dd>${escapeHtml(item.successMetric)}</dd><dt>${escapeHtml(L.stopCondition)}</dt><dd>${escapeHtml(item.stopCondition)}</dd></dl></li>`).join("")}</ol></section><section><h2>${escapeHtml(c.source)}</h2><ul>${report.sources.map((source) => `<li><a href="${escapeHtml(/^https?:\/\//i.test(source.url) ? source.url : "#")}" rel="noopener noreferrer">${escapeHtml(source.title)}</a> — ${escapeHtml(source.publisher)} · ${escapeHtml(source.publishedAt)}</li>`).join("")}</ul></section><section><h2>${escapeHtml(c.human)}</h2><ul>${report.humanVerification.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section><section><h2>${escapeHtml(c.limitations)}</h2><ul>${report.limitations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${report.title.replace(/[^\p{L}\p{N}]+/gu, "-")}.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (run.status === "generating") return (
    <section className="ai-workspace panel">
      <div className="ai-workspace__progress" role="status" aria-live="polite">
        <AiGenerationFlow
          locale={locale}
          stage={run.generation_stage ?? null}
          startedAt={run.lease_expires_at ? new Date(Date.parse(run.lease_expires_at) - LEASE_MS).toISOString() : null}
          stageLog={run.generation_stage_log ?? undefined}
          routeSnapshot={run.model_route_snapshot}
          researchSummary={run.research_summary}
        />
        {leaseExpired && (
          <div className="ai-flow__stalled">
            <p>{c.stalled}</p>
            <button type="button" className="button button--soft button--small" onClick={() => void send({ action: "generate", assumptionsConfirmed: true })} disabled={busy}>{c.resume}</button>
          </div>
        )}
        {message && <p className="checkout-status" role="alert">{message}</p>}
      </div>
    </section>
  );

  if (run.status === "completed" && run.report && !editing) {
    const report = normalizeReportText(run.report);
    return <section className="ai-workspace ai-report panel">
      {message && <p className="notice-banner" role="alert">{message}</p>}
      {feedbackFormUrl && <div className="notice-banner notice-banner--warning beta-feedback" role="status">
        <strong>{locale === "en" ? "Beta tester survey · 5 minutes" : "베타 테스터 설문 · 5분"}</strong>
        <span>{locale === "en" ? "Tell us what was useful, what was off, and whether it is worth paying for — it shapes the next version." : "무엇이 유용했고 무엇이 아쉬웠는지, 돈을 내고 쓸 만한지 알려 주세요. 다음 버전에 반영됩니다."}</span>
        <a className="button button--primary button--small" href={feedbackFormUrl} target="_blank" rel="noreferrer">{locale === "en" ? "Open survey" : "설문 열기"}</a>
      </div>}
      <header className="ai-workspace__header"><span><small>{locale === "en" ? "Written by AI" : "AI 작성"}</small><h2>{report.title}</h2></span><div><button type="button" className="button button--soft button--small" onClick={downloadReport}>{c.download}</button>{run.generation_count < 2 && <button type="button" className="button button--primary button--small" onClick={() => setEditing(true)}>{c.correction}</button>}</div></header>
      <p className="ai-report__summary">{report.executiveSummary}</p>
      <div className="ai-report__grid">{report.findings.map((finding) => <article key={finding.title}>
        <span className={`pill ai-report__status ai-report__status--${finding.status}`}>{L.status[finding.status]} · {L.confidence[finding.confidence]}</span>
        <h3>{stripLeadingNumber(finding.title)}</h3>
        <p>{finding.summary}</p>
        {finding.actions.length > 0 && <ul>{finding.actions.map((action) => <li key={action}>{action}</li>)}</ul>}
        {finding.counterEvidence.length > 0 && <details><summary>{locale === "en" ? "Counter-evidence" : "반대 근거"}</summary><ul>{finding.counterEvidence.map((item) => <li key={item}>{item}</li>)}</ul></details>}
        {finding.questionIds.length > 0 && <details className="ai-report__questions"><summary>{L.relatedQuestions} · {finding.questionIds.length}</summary><ul>{finding.questionIds.map((id) => <li key={id}>{questionLabel(id)}</li>)}</ul></details>}
      </article>)}</div>
      {report.marketSizing && <div className="detail-block" dangerouslySetInnerHTML={{ __html: marketSizingHtml(report.marketSizing, locale) }} />}
      <div className="detail-block ai-report__plan"><h3>{c.actions}</h3><ol>{report.actionPlan.map((item) => <li key={item.title}>
        <strong>{stripLeadingNumber(item.title)}</strong>
        <p>{item.why}</p>
        <dl>
          <div><dt>{L.owner}</dt><dd>{item.owner}</dd></div>
          <div><dt>{L.timing}</dt><dd>{item.timing}</dd></div>
          <div><dt>{L.successMetric}</dt><dd>{item.successMetric}</dd></div>
          <div><dt>{L.stopCondition}</dt><dd>{item.stopCondition}</dd></div>
        </dl>
      </li>)}</ol></div>
      <div className="ai-report__columns"><div><h3>{c.assumptions}</h3><ul>{report.assumptions.map((item) => <li key={item.statement}><strong>{item.statement}</strong><small>{L.basis}: {item.basis} · {L.confidence[item.confidence]} · {L.impact}: {item.impact}</small></li>)}</ul></div><div><h3>{c.human}</h3><ul>{report.humanVerification.map((item) => <li key={item}>{item}</li>)}</ul></div></div>
      {report.sources.length > 0 && <details><summary>{c.source} · {report.sources.length}</summary><ul>{report.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a><small>{source.publisher} · {source.checkedAt}</small></li>)}</ul></details>}
      {report.evidenceGaps.length > 0 && <details><summary>{c.gaps} · {report.evidenceGaps.length}</summary><ul>{report.evidenceGaps.map((item) => <li key={item}>{item}</li>)}</ul></details>}
      {report.contradictions.length > 0 && <details><summary>{c.contradictions} · {report.contradictions.length}</summary><ul>{report.contradictions.map((item) => <li key={`${item.statementA}-${item.statementB}`}><strong>{item.statementA} ↔ {item.statementB}</strong><small>{item.resolution}</small></li>)}</ul></details>}
      {report.questionCoverage.length > 0 && <details><summary>{c.coverage} · {report.questionCoverage.length}</summary><ul>{report.questionCoverage.map((item) => <li key={item.questionId}><strong>{questionLabel(item.questionId)}</strong><small>{L.priority[item.priority]} · {L.disposition[item.disposition]} · {item.reason}</small></li>)}</ul></details>}
      <details><summary>{c.limitations}</summary><ul>{report.limitations.map((item) => <li key={item}>{item}</li>)}</ul></details>
    </section>;
  }

  if (run.status === "clarifying" && !editing) return <section className="ai-workspace panel"><span className="page-kicker">{locale === "en" ? `CLARIFICATION ${run.clarification_round + 1}/2` : `추가 질문 ${run.clarification_round + 1}/2`}</span><h2>{locale === "en" ? "Only information that can materially change the result" : "결과를 바꿀 수 있는 정보만 확인합니다"}</h2><div className="ai-intake-grid">{run.pending_questions.map((question) => <label key={question.id} className="ai-intake-field"><span>{question.question}</span><textarea value={answers[question.id] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} placeholder={locale === "en" ? "Enter details or unknown" : "답변 또는 모름"} /></label>)}</div><button type="button" className="button button--primary" onClick={() => void send({ action: "submit_clarification", answers })} disabled={busy}>{busy ? c.saving : c.clarify}</button>{message && <p className="checkout-status" role="alert">{message}</p>}</section>;

  if ((run.status === "ready" || run.status === "failed") && !editing) return <section className="ai-workspace panel"><span className="page-kicker">{c.reviewKicker}</span><h2>{c.ready}</h2><p>{c.readyBody}</p><dl className="ai-intake-review">{fieldNames.map((field) => { const audit = run.input_audit?.find((item) => item.field === field); const status = audit?.status ?? "missing"; return <div key={field}><dt>{c[field]} <span className={`pill ai-audit--${status}`}>{INPUT_AUDIT_LABEL[status][locale]}</span></dt><dd>{String(run.intake?.[field] || c.unknown)}</dd></div>; })}{serviceInputs.map((item) => { const audit = run.input_audit?.find((entry) => entry.field === serviceField(item.id)); const status = audit?.status ?? "missing"; const stored = run.intake?.serviceInputs; const value = stored && typeof stored === "object" ? (stored as Record<string, unknown>)[item.id] : ""; return <div key={item.id} className="ai-intake-review__service"><dt>{item.title} <span className={`pill ai-audit--${status}`}>{INPUT_AUDIT_LABEL[status][locale]}</span></dt><dd>{String(value || c.unknown)}</dd></div>; })}</dl>{run.reference_files?.length > 0 && <div className="notice-banner"><strong>{c.files} · </strong><span>{run.reference_files.map((file) => file.fileName).join(" · ")}</span></div>}{run.assumptions.length > 0 && <div className="notice-banner"><strong>{c.assumptions} · </strong><span>{run.assumptions.map((item) => { const id = serviceAgentId(item.field); return id ? serviceInputs.find((entry) => entry.id === id)?.title ?? id : c[item.field as keyof typeof c] ?? item.field; }).join(" · ")}</span></div>}<button type="button" className="button button--primary" onClick={() => void send({ action: "generate", assumptionsConfirmed: true })} disabled={busy}>{busy ? c.generatingButton : run.status === "failed" ? c.retry : c.generate}</button>{busy && <p className="ai-workspace__hint" role="status">{c.generating}</p>}{message && <p className="checkout-status" role="alert">{message}</p>}</section>;

  return <section className="ai-workspace panel"><span className="page-kicker">{c.intakeKicker}</span><h2>{c.intakeTitle}</h2><p>{c.intakeBody}</p><div className="ai-intake-grid">{fieldNames.map((field) => { const scopeLocked = run.generation_count > 0 && ["offering", "targetCountry", "targetCustomer"].includes(field); const wide = ["objective", "currentEvidence", "constraints", "resources"].includes(field) ? "ai-intake-field--wide" : ""; if (collapsedFields.includes(field)) return <div key={field} className={`ai-intake-field ai-intake-field--filled ${wide}`}><span>{c[field]}</span><p>{intake[field]}</p>{!scopeLocked && <button type="button" className="text-link" onClick={() => setCollapsedFields((current) => current.filter((item) => item !== field))}>{c.edit}</button>}{scopeLocked && <small>{c.scopeLocked}</small>}</div>; return <label key={field} className={`ai-intake-field ${wide}`}><span>{c[field]}</span><textarea value={intake[field]} disabled={scopeLocked || unknownFields.includes(field)} onChange={(event) => setIntake((current) => ({ ...current, [field]: event.target.value }))} /><small><input type="checkbox" aria-label={`${c[field]} — ${c.unknown}`} checked={unknownFields.includes(field)} disabled={scopeLocked || field === "objective"} onChange={(event) => toggleUnknown(field, event.target.checked)} /> {scopeLocked ? c.scopeLocked : c.unknownShort}</small></label>; })}</div>{serviceInputs.length > 0 && <section className="ai-service-inputs" role="group" aria-labelledby="service-inputs-title"><header><span className="page-kicker">{c.serviceKicker}</span><h3 id="service-inputs-title">{c.serviceTitle}</h3><p>{c.serviceHelp}</p></header><div className="ai-intake-grid">{serviceInputs.map((item) => { const field = serviceField(item.id); return <label key={item.id} className="ai-intake-field ai-intake-field--wide"><span>{item.title}</span><small>{item.label}</small><textarea value={serviceAnswers[item.id] ?? ""} disabled={unknownFields.includes(field)} onChange={(event) => setServiceAnswers((current) => ({ ...current, [item.id]: event.target.value }))} /><small><input type="checkbox" aria-label={`${item.title} — ${c.unknown}`} checked={unknownFields.includes(field)} onChange={(event) => toggleUnknown(field, event.target.checked)} /> {c.unknownShort}</small></label>; })}</div></section>}<label className="ai-file-upload"><span>{c.files}</span><input type="file" accept="application/pdf,image/png,image/jpeg" multiple disabled={busy || (run.reference_files?.length ?? 0) >= 3} onChange={(event) => void uploadFiles(event.target.files)} /><small>{c.fileHelp}{run.reference_files?.length ? ` · ${run.reference_files.map((file) => file.fileName).join(" · ")}` : ""}</small><small>{c.fileHelpPrivacy}</small>{serviceInputs.some((item) => item.fileHint) && <small>{c.fileHints} · {serviceInputs.filter((item) => item.fileHint).map((item) => `${item.title}: ${item.fileHint}`).join(" · ")} · {ATTACHMENT_PDF_TIP[locale]}</small>}</label><button type="button" className="button button--primary" onClick={submitIntake} disabled={busy}>{busy ? c.saving : c.save}</button>{message && <p className="checkout-status" role="alert">{message}</p>}</section>;
}
