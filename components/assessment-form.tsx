"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  applyOffering,
  POSITIVE_LEVEL,
  getIntakeItems,
  getIntakeQuestions,
  getIntakeStages,
  type OfferingType
} from "@/lib/intake-questions";
import { localizedPath, type Locale } from "@/lib/i18n";
import {
  GATE_THRESHOLD,
  calculateReadiness,
  hasPassedStage,
  questionsOfStage,
  validateAssessmentAnswers
} from "@/lib/readiness";
import { recommendServices } from "@/lib/service-data";
import type {
  EvidenceInput,
  ReadinessAnswer,
  ReadinessLevel,
  ReadinessResult,
  ServiceOffering,
  TargetMarketContext
} from "@/lib/types";
import { ServiceCard } from "@/components/service-card";
import {
  clearPending,
  loadPending,
  savePending
} from "@/lib/pending-assessment";

const LEVELS: ReadinessLevel[] = [1, 2, 3, 4];
const GATE_PERCENT = Math.round(GATE_THRESHOLD * 100);

export function AssessmentForm({
  isSignedIn,
  resume = false,
  initialAnswers = [],
  initialTargetMarket,
  locale = "ko",
  availableServices = []
}: {
  isSignedIn: boolean;
  resume?: boolean;
  initialAnswers?: ReadinessAnswer[];
  initialTargetMarket?: TargetMarketContext;
  locale?: Locale;
  /** 실제 공개된 전문가 서비스. 비어 있으면 추천 영역을 감춘다. */
  availableServices?: ServiceOffering[];
}) {
  const stages = getIntakeStages(locale);
  const items = getIntakeItems(locale);
  const questions = getIntakeQuestions(locale);
  const c = locale === "en" ? {
    stageIncomplete: "Please answer every question in this stage.",
    saveFailed: "We could not save your assessment results.",
    allRequired: "Answer every question to view your results.",
    pendingMissing: "We could not find a saved assessment. Please start again.",
    resultKicker: "Global Readiness Results",
    currentStatus: (status: string) => `Your current status is ${status}.`,
    passedSummary: (label: string) => `You passed ${label}. The next stage opens when at least ${GATE_PERCENT}% of its weighted score is backed by execution-level responses or better.`,
    gateSummary: `The next stage opens when at least ${GATE_PERCENT}% of its weighted score is backed by execution-level responses or better. Stages must be passed in order.`,
    saving: "Saving your results…",
    saved: "Saved to your organization dashboard.",
    localOnly: "These results are stored on this device only. Sign in to save them to your organization dashboard.",
    assistant: "Build an AI GTM Action Plan →",
    stageNotPassed: (label: string) => `${label} has not been passed yet.`,
    stageGates: "Stage Gates",
    stageProgress: "Progress by stage",
    edit: "Edit responses",
    passed: "Passed",
    prerequisites: (count: number) => `${count} required prerequisite${count === 1 ? "" : "s"} remaining`,
    points: (positive: number, total: number, remaining: number) => `${positive}/${total} points · ${remaining} more needed`,
    nextActions: "Next Actions",
    openStage: (label: string) => `What to do before ${label} opens`,
    owner: "Owner",
    proof: "Completion evidence",
    priority0: "Priority 0",
    priority1: "Priority 1",
    roadmap: "Roadmap",
    fullSequence: "Full readiness sequence",
    weighted: "Weighted score",
    expertServices: "AI Expert Services",
    matchedExperts: "Experts matched to your current actions",
    expertPrompt: "Move forward with the expert support you need now",
    allServices: "View all services →",
    readiness: "Global Readiness",
    title: "Global Market-Entry Readiness Assessment",
    description: `${questions.length} questions assess Readiness Stages 1, 2, and 3. There is no penalty for selecting work you have not started yet.`,
    offering: "What are you taking to market?",
    offeringBoth: "Not sure yet",
    offeringProduct: "Product",
    offeringService: "Service",
    offeringHint: "Your choice adjusts the wording of the questions.",
    complete: "complete",
    completed: "Completed",
    stage: "Stage",
    targetLegend: "Confirm your initial target market before Readiness Stage 3",
    targetHelp: "From Readiness Stage 2 onward, you must confirm a target country and customer segment before advancing.",
    country: "Initial target country",
    countryPlaceholder: "e.g., Japan",
    customer: "Target customer segment",
    customerPlaceholder: "e.g., Mid-sized manufacturers in Tokyo",
    confirmTarget: "I confirm this as the initial target market for this global expansion.",
    evidenceOptional: "Optional. Sharing a brief example helps experts review your readiness more accurately.",
    evidencePrivacy: "Do not enter original contracts or customer lists. You may anonymize names, such as “Customer A.”",
    previous: "Previous stage",
    next: "Next stage",
    savingStage: "Saving stage…",
    savingAssessment: "Saving assessment…",
    viewResult: "View assessment results"
  } : null;
  const initialResult = calculateReadiness(initialAnswers, initialTargetMarket, locale);
  const initialStageIndex = Math.max(
    0,
    stages.findIndex((entry) => entry.id === initialResult.currentStageId)
  );
  const [answers, setAnswers] = useState<Record<string, ReadinessLevel>>(
    Object.fromEntries(initialAnswers.map((answer) => [answer.questionId, answer.level]))
  );
  // 대표님이 파는 것이 정해지기 전까지 문항은 «제품·서비스»로 묻는다.
  // ponytail: 이 선택은 진단 한 번에만 남는다. 회사마다 기억시키려면
  // organizations 에 칸을 하나 늘린다.
  const [offering, setOffering] = useState<OfferingType>("both");
  const [evidence, setEvidence] = useState<Record<string, EvidenceInput>>(
    Object.fromEntries(
      initialAnswers.filter((answer) => answer.evidence).map((answer) => [answer.questionId, answer.evidence!])
    )
  );
  const [activeStage, setActiveStage] = useState(initialStageIndex);
  const [unlockedStage, setUnlockedStage] = useState(initialStageIndex);
  const [targetCountry, setTargetCountry] = useState(initialTargetMarket?.targetCountry ?? "");
  const [targetCustomerSegment, setTargetCustomerSegment] = useState(
    initialTargetMarket?.targetCustomerSegment ?? ""
  );
  const [targetMarketConfirmed, setTargetMarketConfirmed] = useState(
    Boolean(initialTargetMarket?.confirmed || initialTargetMarket?.confirmedAt)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReadinessResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [restoreMessage, setRestoreMessage] = useState("");
  const restored = useRef(false);

  const stage = stages[activeStage];
  const stageItems = items.filter((item) => item.stageId === stage.id);
  const answeredCount = Object.keys(answers).length;
  const progress = Math.round((answeredCount / questions.length) * 100);

  const submittedAnswers = useMemo<ReadinessAnswer[]>(
    () =>
      questions.filter((question) => answers[question.id] !== undefined).map(
        (question) => ({
          questionId: question.id,
          level: answers[question.id],
          evidence: evidence[question.id]
        })
      ),
    [answers, evidence, questions]
  );
  const targetMarket: TargetMarketContext = {
    targetCountry,
    targetCustomerSegment,
    confirmed: targetMarketConfirmed
  };

  function changeLevel(questionId: string, level: ReadinessLevel) {
    setAnswers((current) => ({ ...current, [questionId]: level }));
    setErrors((current) => {
      const next = { ...current };
      delete next[questionId];
      return next;
    });
    if (level < POSITIVE_LEVEL) {
      setEvidence((current) => {
        const next = { ...current };
        delete next[questionId];
        return next;
      });
    }
  }

  function firstUnanswered(pool: typeof questions) {
    return pool.find((question) => answers[question.id] === undefined);
  }

  function answersThroughStage(stageIndex: number) {
    const questionIds = new Set(
      stages.slice(0, stageIndex + 1).flatMap((entry) =>
        questionsOfStage(entry.id, locale).map((question) => question.id)
      )
    );
    return submittedAnswers.filter((answer) => questionIds.has(answer.questionId));
  }

  async function goNext() {
    const missing = firstUnanswered(questionsOfStage(stage.id, locale));
    if (missing) {
      setErrors((current) => ({
        ...current,
        [missing.id]: c?.stageIncomplete ?? "이 단계의 모든 문항에 답해 주세요."
      }));
      document
        .getElementById(`question-${missing.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const completedAnswers = answersThroughStage(activeStage);
    if (!hasPassedStage(completedAnswers, stage.id, targetMarket, locale)) {
      await finishAssessment(completedAnswers);
      return;
    }
    const nextStage = Math.min(activeStage + 1, stages.length - 1);
    setUnlockedStage(nextStage);
    setActiveStage(nextStage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitAnswers(
    answersToSubmit: ReadinessAnswer[],
    restoredAnswers = false,
    openDashboard = false
  ) {
    if (!openDashboard) setResult(calculateReadiness(answersToSubmit, targetMarket, locale));
    setSaving(true);
    setSaved(false);
    try {
      const response = await fetch("/api/assessments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers: answersToSubmit, offering, targetMarket, locale })
      });
      const payload = (await response.json()) as {
        assessmentId?: string;
        message?: string;
      };
      setSaved(response.ok);
      setAssessmentId(response.ok ? (payload.assessmentId ?? null) : null);
      if (response.ok) {
        if (restoredAnswers) clearPending();
        if (openDashboard) window.location.href = localizedPath("/dashboard", locale);
      } else {
        setRestoreMessage(payload.message ?? c?.saveFailed ?? "진단 결과를 저장하지 못했습니다.");
      }
    } catch {
      setSaved(false);
      setRestoreMessage(c?.saveFailed ?? "진단 결과를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function finishAssessment(answersToSubmit: ReadinessAnswer[]) {
    const validation = validateAssessmentAnswers(answersToSubmit, locale);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    if (!isSignedIn) {
      savePending(answersToSubmit);
      const resumePath = localizedPath("/assessment?resume=1", locale);
      window.location.href = `${localizedPath("/signup", locale)}?next=${encodeURIComponent(resumePath)}`;
      return;
    }
    await submitAnswers(answersToSubmit, false, true);
  }

  async function submit() {
    const missing = firstUnanswered(questions);
    if (missing) {
      const item = items.find((entry) => entry.id === missing.itemId)!;
      setActiveStage(stages.findIndex((entry) => entry.id === item.stageId));
      setErrors((current) => ({
        ...current,
        [missing.id]: c?.allRequired ?? "모든 문항에 답해야 결과를 확인할 수 있습니다."
      }));
      return;
    }
    await finishAssessment(answersThroughStage(activeStage));
  }

  useEffect(() => {
    if (!isSignedIn || restored.current) return;
    restored.current = true;
    const pending = loadPending();
    if (!pending) {
      if (resume) {
        setRestoreMessage(c?.pendingMissing ?? "보관된 진단 응답을 찾지 못했습니다. 처음부터 다시 진단해 주세요.");
      }
      return;
    }
    setAnswers(
      Object.fromEntries(
        pending.map((answer) => [answer.questionId, answer.level])
      )
    );
    setEvidence(
      Object.fromEntries(
        pending
          .filter((answer) => answer.evidence)
          .map((answer) => [answer.questionId, answer.evidence!])
      )
    );
    void submitAnswers(pending, true, true);
  }, [isSignedIn, resume]);

  if (result) {
    const matched = recommendServices(
      availableServices,
      result.actions.map((action) => action.serviceTag),
      3
    );
    const services =
      matched.length > 0
        ? matched
        : availableServices.filter((service) => service.approved).slice(0, 3);
    const current = result.stages.find(
      (entry) => entry.stageId === result.currentStageId
    );

    return (
      <div className="assessment-result">
        <div className="result-hero panel">
          <div>
            <span className="page-kicker">{c?.resultKicker ?? "시장진입 준비도(Global Readiness) 결과"}</span>
            <h1>{c ? c.currentStatus(result.status) : <>지금은 <em>{result.status}</em>입니다.</>}</h1>
            <p>
              {result.achievedStageId
                ? c?.passedSummary(result.stages.find((entry) => entry.stageId === result.achievedStageId)!.label)
                  ?? `${result.stages.find((entry) => entry.stageId === result.achievedStageId)!.label}를 통과했습니다. 다음 단계는 각 단계 배점의 ${GATE_PERCENT}% 이상을 '해봤다' 이상으로 채우면 열립니다.`
                : c?.gateSummary ?? `각 단계 배점의 ${GATE_PERCENT}% 이상을 '해봤다' 이상으로 채우면 다음 단계가 열립니다. 앞 단계를 통과해야 다음 단계로 넘어갑니다.`}
            </p>
            <div className="save-state" role="status">
              {saving
                ? c?.saving ?? "결과를 저장하고 있습니다."
                : saved
                  ? c?.saved ?? "조직 대시보드에 저장했습니다."
                  : c?.localOnly ?? "이 기기에만 저장된 결과입니다. 로그인하시면 조직 대시보드에 저장됩니다."}
            </div>
            {saved && assessmentId && (
              <Link
                href={localizedPath(`/assistant/${assessmentId}`, locale)}
                className="button button--primary"
              >
                {c?.assistant ?? "AI GTM 실행 계획 만들기 →"}
              </Link>
            )}
          </div>
          <div className="score-orb">
            <strong>{result.overallScore}</strong>
            <span>/ 100</span>
          </div>
        </div>

        {result.isOnHold && (
          <section className="hold-banner" aria-labelledby="hold-title">
            <div>
              <span>{c?.stageGates ?? "단계 통과 기준(Stage Gate)"} {current?.gate}</span>
              <h2 id="hold-title">
                {c && current ? c.stageNotPassed(current.label) : `${current?.label}를 아직 통과하지 못했습니다.`}
              </h2>
            </div>
            <ul>
              {result.gateMessages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="result-section">
          <div className="section-heading section-heading--row">
            <span>
              <span className="page-kicker">{c?.stageGates ?? "단계별 통과 기준(Stage Gate)"}</span>
              <h2>{c?.stageProgress ?? "단계별 통과 현황"}</h2>
            </span>
            <button
              className="button button--ghost"
              type="button"
              onClick={() => setResult(null)}
            >
              {c?.edit ?? "응답 수정"}
            </button>
          </div>
          <div className="domain-score-grid">
            {result.stages.map((entry) => (
              <div className="domain-score panel" key={entry.stageId}>
                <span>
                  {entry.label} · {c?.stageGates ?? "단계 통과 기준(Stage Gate)"} {entry.gate}
                </span>
                <strong>{result.domainScores[entry.stageId]}%</strong>
                <div className="meter">
                  <span style={{ width: `${result.domainScores[entry.stageId]}%` }} />
                </div>
                <small>
                  {entry.passed
                    ? `${c?.passed ?? "통과"} — ${entry.unlocks}`
                    : entry.blockers.length > 0
                      ? c?.prerequisites(entry.blockers.length) ?? `필수 선결 조건 ${entry.blockers.length}건이 남았습니다`
                      : c?.points(entry.positiveScore, entry.totalScore, entry.scoreToPass) ?? `${entry.positiveScore}/${entry.totalScore}점 · ${entry.scoreToPass}점이 부족합니다`}
                </small>
              </div>
            ))}
          </div>
        </section>

        {result.actions.length > 0 && (
          <section className="result-section">
            <span className="page-kicker">{c?.nextActions ?? "다음 실행항목(Next Actions)"}</span>
            <h2>{c && current ? c.openStage(current.label) : `${current?.label}를 열기 위해 먼저 할 일`}</h2>
            <div className="action-list">
              {result.actions.map((action, index) => (
                <article className="action-row panel" key={action.questionId}>
                  <span className="action-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className={`priority priority--${action.urgency}`}>
                    {action.urgency === "P0"
                      ? c?.priority0 ?? "우선순위 0(Priority 0)"
                      : c?.priority1 ?? "우선순위 1(Priority 1)"}
                  </span>
                  <div>
                    <h3>{action.title}</h3>
                    <p>
                      {c?.owner ?? "담당"}: {action.owner} · {c?.proof ?? "완료 확인"}: {action.completionEvidence}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="result-section">
          <span className="page-kicker">{c?.roadmap ?? "실행 일정표(Roadmap)"}</span>
          <h2>{c?.fullSequence ?? "전체 준비 순서"}</h2>
          <div className="journey-overview panel">
            {result.stages.map((entry, index) => (
              <div className="journey-phase" key={entry.stageId}>
                <span
                  className={entry.stageId === result.currentStageId ? "active" : ""}
                >
                  {entry.passed ? "✓" : index + 1}
                </span>
                <div>
                  <small>{c?.stageGates ?? "단계 통과 기준(Stage Gate)"} {entry.gate} · {c?.weighted ?? "배점"} {entry.totalScore}</small>
                  <h3>{entry.label}</h3>
                  <p>{entry.unlocks}</p>
                </div>
                <strong>{result.domainScores[entry.stageId]}%</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="result-section">
          <div className="section-heading section-heading--row">
            <span>
              <span className="page-kicker">{c?.expertServices ?? "AI 전문가 서비스"}</span>
              <h2>
                {matched.length > 0
                  ? c?.matchedExperts ?? "현재 액션에 맞는 전문가"
                  : c?.expertPrompt ?? "지금 필요한 전문가와 바로 실행하세요"}
              </h2>
            </span>
            <Link href={localizedPath("/services", locale)} className="text-link">
              {c?.allServices ?? "전체 서비스 보기 →"}
            </Link>
          </div>
          <div className="service-grid">
            {services.map((service) => (
              <ServiceCard service={service} key={service.id} locale={locale} />
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="assessment-layout">
      <aside className="assessment-sidebar panel">
        <span className="page-kicker">{c?.readiness ?? "시장진입 준비도(Global Readiness)"}</span>
        <h1>{c?.title ?? "글로벌 진출 준비도 진단"}</h1>
        <p>{c?.description ?? `${questions.length}개 문항으로 준비 1단계·준비 2단계·준비 3단계 세 단계를 진단합니다. 아직 하지 않은 항목을 고르셔도 불이익은 없습니다.`}</p>
        <div className="offering-picker">
          <span>{c?.offering ?? "대표님이 파시는 것은"}</span>
          <div>
            {(
              [
                ["both", c?.offeringBoth ?? "아직 정하기 어려움"],
                ["product", c?.offeringProduct ?? "제품"],
                ["service", c?.offeringService ?? "서비스"]
              ] as const
            ).map(([value, label]) => (
              <label className={offering === value ? "selected" : ""} key={value}>
                <input
                  type="radio"
                  name="offering"
                  checked={offering === value}
                  onChange={() => setOffering(value)}
                />
                {label}
              </label>
            ))}
          </div>
          <small>{c?.offeringHint ?? "고르시면 문항이 그 표현으로 바뀝니다."}</small>
        </div>

        <div className="progress-block">
          <span>
            <strong>{answeredCount}</strong> / {questions.length}
          </span>
          <div className="meter">
            <span style={{ width: `${progress}%` }} />
          </div>
          <small>{progress}% {c?.complete ?? "완료"}</small>
        </div>
        <ol className="domain-nav">
          {stages.map((entry, index) => {
            const complete = questionsOfStage(entry.id, locale).every(
              (question) => answers[question.id] !== undefined
            );
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  className={index === activeStage ? "active" : ""}
                  disabled={index > unlockedStage}
                  onClick={() => setActiveStage(index)}
                >
                  <span>{index + 1}</span>
                  {entry.label}
                  {complete && <small aria-label={c?.completed ?? "완료"}>✓</small>}
                </button>
              </li>
            );
          })}
        </ol>
      </aside>

      <section className="assessment-questions">
        {restoreMessage && (
          <p className="notice-banner" role="alert">
            {restoreMessage}
          </p>
        )}
        <div className="question-heading">
          <span>
            {c?.stage ?? "단계"} {activeStage + 1} / {stages.length} · {c?.stageGates ?? "단계 통과 기준(Stage Gate)"} {stage.gate}
          </span>
          <h2>{stage.label}</h2>
          <p>{stage.intro}</p>
        </div>
        {activeStage >= 1 && (
          <fieldset className="target-market-confirmation panel">
            <legend>{c?.targetLegend ?? "준비 3단계 전 초기 목표시장 확인"}</legend>
            <p>{c?.targetHelp ?? "준비 2단계부터는 창업자가 직접 확정한 목표국가와 목표 고객군이 있어야 다음 단계로 넘어갑니다."}</p>
            <div>
              <label>
                {c?.country ?? "초기 목표국가"}
                <input
                  value={targetCountry}
                  onChange={(event) => {
                    setTargetCountry(event.target.value);
                    setTargetMarketConfirmed(false);
                  }}
                  placeholder={c?.countryPlaceholder ?? "예: 일본"}
                />
              </label>
              <label>
                {c?.customer ?? "목표 고객군"}
                <input
                  value={targetCustomerSegment}
                  onChange={(event) => {
                    setTargetCustomerSegment(event.target.value);
                    setTargetMarketConfirmed(false);
                  }}
                  placeholder={c?.customerPlaceholder ?? "예: 도쿄 소재 중견 제조사"}
                />
              </label>
            </div>
            <label className="target-market-confirmation__check">
              <input
                type="checkbox"
                checked={targetMarketConfirmed}
                disabled={!targetCountry.trim() || !targetCustomerSegment.trim()}
                onChange={(event) => setTargetMarketConfirmed(event.target.checked)}
              />
              {c?.confirmTarget ?? "위 정보를 이번 글로벌 진출의 초기 목표시장으로 확인합니다."}
            </label>
          </fieldset>
        )}
        {stageItems.map((item) => (
          <div key={item.id}>
            <h3 className="question-group">{item.label}</h3>
            {questions.filter(
              (question) => question.itemId === item.id
            ).map((question) => {
              const index = questions.indexOf(question);
              return (
                <article
                  className="question-card panel"
                  id={`question-${question.id}`}
                  key={question.id}
                >
                  <span className="question-number">
                    Q{String(index + 1).padStart(2, "0")}
                  </span>
                  <h3>{applyOffering(question.question, offering, locale)}</h3>
                  <fieldset>
                    <legend className="sr-only">
                      {applyOffering(question.question, offering, locale)}
                    </legend>
                    <div className="answer-grid">
                      {LEVELS.map((level) => (
                        <label
                          className={`answer-option ${
                            answers[question.id] === level ? "selected" : ""
                          }`}
                          key={level}
                        >
                          <input
                            type="radio"
                            name={question.id}
                            value={level}
                            checked={answers[question.id] === level}
                            onChange={() => changeLevel(question.id, level)}
                          />
                          <span>{applyOffering(question.options[level - 1], offering, locale)}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  {(answers[question.id] ?? 0) >= POSITIVE_LEVEL && (
                    <label className="evidence-field">
                      <span>{applyOffering(question.followUp, offering, locale)}</span>
                      <textarea
                        rows={2}
                        placeholder={c?.evidenceOptional ?? "선택 사항입니다. 적어 주시면 전문가 검토가 더 정확해집니다."}
                        value={evidence[question.id]?.value ?? ""}
                        onChange={(event) =>
                          setEvidence((current) => ({
                            ...current,
                            [question.id]: {
                              kind: event.target.value.startsWith("http")
                                ? "url"
                                : "note",
                              value: event.target.value
                            }
                          }))
                        }
                      />
                      <small>
                        {c?.evidencePrivacy ?? "계약서나 고객 명부 원본은 넣지 마세요. 고객사 이름은 '고객 A'처럼 익명으로 적으셔도 됩니다."}
                      </small>
                    </label>
                  )}
                  {errors[question.id] && (
                    <p className="field-error" role="alert">
                      {errors[question.id]}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        ))}
        <div className="assessment-controls">
          <button
            type="button"
            className="button button--ghost"
            disabled={activeStage === 0}
            onClick={() => setActiveStage((current) => current - 1)}
          >
            {c?.previous ?? "이전 단계"}
          </button>
          {activeStage < stages.length - 1 ? (
            <button
              type="button"
              className="button button--primary"
              disabled={saving}
              onClick={goNext}
            >
              {saving ? c?.savingStage ?? "단계를 저장하는 중" : c?.next ?? "다음 단계"}
            </button>
          ) : (
            <button
              type="button"
              className="button button--primary"
              disabled={saving}
              onClick={submit}
            >
              {saving ? c?.savingAssessment ?? "진단을 저장하는 중" : c?.viewResult ?? "진단 결과 보기"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
