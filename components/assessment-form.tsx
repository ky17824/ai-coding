"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  INTAKE_ITEMS,
  INTAKE_QUESTIONS,
  POSITIVE_LEVEL
} from "@/lib/intake-questions";
import {
  GATE_THRESHOLD,
  STAGES,
  calculateReadiness,
  questionsOfStage,
  validateAssessmentAnswers
} from "@/lib/readiness";
import { recommendServices, SAMPLE_SERVICES } from "@/lib/service-data";
import type {
  EvidenceInput,
  ReadinessAnswer,
  ReadinessLevel,
  ReadinessResult
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
  resume = false
}: {
  isSignedIn: boolean;
  resume?: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, ReadinessLevel>>({});
  const [evidence, setEvidence] = useState<Record<string, EvidenceInput>>({});
  const [activeStage, setActiveStage] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReadinessResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [restoreMessage, setRestoreMessage] = useState("");
  const restored = useRef(false);

  const stage = STAGES[activeStage];
  const stageItems = INTAKE_ITEMS.filter((item) => item.stageId === stage.id);
  const answeredCount = Object.keys(answers).length;
  const progress = Math.round((answeredCount / INTAKE_QUESTIONS.length) * 100);

  const submittedAnswers = useMemo<ReadinessAnswer[]>(
    () =>
      INTAKE_QUESTIONS.filter((question) => answers[question.id] !== undefined).map(
        (question) => ({
          questionId: question.id,
          level: answers[question.id],
          evidence: evidence[question.id]
        })
      ),
    [answers, evidence]
  );

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

  function firstUnanswered(pool: typeof INTAKE_QUESTIONS) {
    return pool.find((question) => answers[question.id] === undefined);
  }

  function goNext() {
    const missing = firstUnanswered(questionsOfStage(stage.id));
    if (missing) {
      setErrors((current) => ({
        ...current,
        [missing.id]: "이 단계의 모든 문항에 답해주세요."
      }));
      document
        .getElementById(`question-${missing.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setActiveStage((current) => Math.min(current + 1, STAGES.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitAnswers(
    answersToSubmit: ReadinessAnswer[],
    restoredAnswers = false
  ) {
    setResult(calculateReadiness(answersToSubmit));
    setSaving(true);
    setSaved(false);
    try {
      const response = await fetch("/api/assessments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers: answersToSubmit })
      });
      const payload = (await response.json()) as { assessmentId?: string };
      setSaved(response.ok);
      setAssessmentId(response.ok ? (payload.assessmentId ?? null) : null);
      if (response.ok && restoredAnswers) clearPending();
    } catch {
      setSaved(false);
    } finally {
      setSaving(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function submit() {
    const missing = firstUnanswered(INTAKE_QUESTIONS);
    if (missing) {
      const item = INTAKE_ITEMS.find((entry) => entry.id === missing.itemId)!;
      setActiveStage(STAGES.findIndex((entry) => entry.id === item.stageId));
      setErrors((current) => ({
        ...current,
        [missing.id]: "모든 문항에 답해야 결과를 확인할 수 있습니다."
      }));
      return;
    }
    const validation = validateAssessmentAnswers(submittedAnswers);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    if (!isSignedIn) {
      savePending(submittedAnswers);
      window.location.href = "/signup?next=/assessment%3Fresume%3D1";
      return;
    }

    await submitAnswers(submittedAnswers);
  }

  useEffect(() => {
    if (!isSignedIn || restored.current) return;
    restored.current = true;
    const pending = loadPending();
    if (!pending) {
      if (resume) {
        setRestoreMessage("보관된 진단 응답을 찾지 못했습니다. 다시 진단해 주세요.");
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
    void submitAnswers(pending, true);
  }, [isSignedIn, resume]);

  if (result) {
    const matched = recommendServices(
      result.actions.map((action) => action.serviceTag)
    );
    const services =
      matched.length > 0
        ? matched
        : SAMPLE_SERVICES.filter((service) => service.approved).slice(0, 3);
    const current = result.stages.find(
      (entry) => entry.stageId === result.currentStageId
    );

    return (
      <div className="assessment-result">
        <div className="result-hero panel">
          <div>
            <span className="page-kicker">READINESS RESULT</span>
            <h1>
              지금은 <em>{result.status}</em> 단계입니다.
            </h1>
            <p>
              {result.achievedStageId
                ? `${
                    result.stages.find(
                      (entry) => entry.stageId === result.achievedStageId
                    )!.label
                  } 단계를 통과했습니다. 다음 단계는 각 단계 배점의 ${GATE_PERCENT}% 이상을 '해봤다' 이상으로 채우면 열립니다.`
                : `각 단계 배점의 ${GATE_PERCENT}% 이상을 '해봤다' 이상으로 채우면 다음 단계가 열립니다. 앞 단계를 통과해야 다음 단계로 넘어갑니다.`}
            </p>
            <div className="save-state" role="status">
              {saving
                ? "결과를 저장하고 있습니다."
                : saved
                  ? "조직 대시보드에 저장했습니다."
                  : "로컬 결과입니다. 로그인하면 조직 대시보드에 저장됩니다."}
            </div>
            {saved && assessmentId && (
              <Link
                href={`/assistant/${assessmentId}`}
                className="button button--primary"
              >
                AI GTM 실행계획 만들기 →
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
              <span>GATE {current?.gate}</span>
              <h2 id="hold-title">
                {current?.label} 단계를 아직 통과하지 못했습니다.
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
              <span className="page-kicker">PHASE GATES</span>
              <h2>단계별 통과 현황</h2>
            </span>
            <button
              className="button button--ghost"
              type="button"
              onClick={() => setResult(null)}
            >
              응답 수정
            </button>
          </div>
          <div className="domain-score-grid">
            {result.stages.map((entry) => (
              <div className="domain-score panel" key={entry.stageId}>
                <span>
                  {entry.label} · Gate {entry.gate}
                </span>
                <strong>{result.domainScores[entry.stageId]}%</strong>
                <div className="meter">
                  <span style={{ width: `${result.domainScores[entry.stageId]}%` }} />
                </div>
                <small>
                  {entry.passed
                    ? `통과 — ${entry.unlocks}`
                    : entry.blockers.length > 0
                      ? `필수 선결조건 ${entry.blockers.length}건 미해소`
                      : `${entry.positiveScore}/${entry.totalScore}점 · ${entry.scoreToPass}점 부족`}
                </small>
              </div>
            ))}
          </div>
        </section>

        {result.actions.length > 0 && (
          <section className="result-section">
            <span className="page-kicker">NEXT ACTIONS</span>
            <h2>{current?.label} 단계를 열기 위해 먼저 할 일</h2>
            <div className="action-list">
              {result.actions.map((action, index) => (
                <article className="action-row panel" key={action.questionId}>
                  <span className="action-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className={`priority priority--${action.urgency}`}>
                    {action.urgency}
                  </span>
                  <div>
                    <h3>{action.title}</h3>
                    <p>
                      담당: {action.owner} · 완료 확인: {action.completionEvidence}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="result-section">
          <span className="page-kicker">ROADMAP</span>
          <h2>전체 준비 순서</h2>
          <div className="journey-overview panel">
            {result.stages.map((entry, index) => (
              <div className="journey-phase" key={entry.stageId}>
                <span
                  className={entry.stageId === result.currentStageId ? "active" : ""}
                >
                  {entry.passed ? "✓" : index + 1}
                </span>
                <div>
                  <small>Gate {entry.gate} · 배점 {entry.totalScore}점</small>
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
              <span className="page-kicker">EXPERT SERVICES</span>
              <h2>
                {matched.length > 0
                  ? "현재 액션에 맞는 전문가"
                  : "지금 필요한 전문가와 바로 실행하세요"}
              </h2>
            </span>
            <Link href="/services" className="text-link">
              전체 서비스 보기 →
            </Link>
          </div>
          <div className="service-grid">
            {services.map((service) => (
              <ServiceCard service={service} key={service.id} />
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="assessment-layout">
      <aside className="assessment-sidebar panel">
        <span className="page-kicker">GLOBAL READINESS</span>
        <h1>해외 진출 준비도 진단</h1>
        <p>
          {INTAKE_QUESTIONS.length}개 문항으로 극초기·준비중·준비완료 세 단계를
          평가합니다. 아직 하지 않은 것을 골라도 불이익은 없습니다.
        </p>
        <div className="progress-block">
          <span>
            <strong>{answeredCount}</strong> / {INTAKE_QUESTIONS.length}
          </span>
          <div className="meter">
            <span style={{ width: `${progress}%` }} />
          </div>
          <small>{progress}% 완료</small>
        </div>
        <ol className="domain-nav">
          {STAGES.map((entry, index) => {
            const complete = questionsOfStage(entry.id).every(
              (question) => answers[question.id] !== undefined
            );
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  className={index === activeStage ? "active" : ""}
                  onClick={() => setActiveStage(index)}
                >
                  <span>{index + 1}</span>
                  {entry.label}
                  {complete && <small aria-label="완료">✓</small>}
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
            단계 {activeStage + 1} / {STAGES.length} · Gate {stage.gate}
          </span>
          <h2>{stage.label}</h2>
          <p>{stage.intro}</p>
        </div>
        {stageItems.map((item) => (
          <div key={item.id}>
            <h3 className="question-group">{item.label}</h3>
            {INTAKE_QUESTIONS.filter(
              (question) => question.itemId === item.id
            ).map((question) => {
              const index = INTAKE_QUESTIONS.indexOf(question);
              return (
                <article
                  className="question-card panel"
                  id={`question-${question.id}`}
                  key={question.id}
                >
                  <span className="question-number">
                    Q{String(index + 1).padStart(2, "0")}
                  </span>
                  <h3>{question.question}</h3>
                  <fieldset>
                    <legend className="sr-only">{question.question}</legend>
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
                          <span>{question.options[level - 1]}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  {(answers[question.id] ?? 0) >= POSITIVE_LEVEL && (
                    <label className="evidence-field">
                      <span>{question.followUp}</span>
                      <textarea
                        rows={2}
                        placeholder="선택 사항입니다. 적어주시면 전문가 검토가 정확해집니다."
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
                        계약서·고객 명부 원문은 넣지 마세요. 고객사는 '고객 A'처럼
                        익명으로 적으셔도 됩니다.
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
            이전 단계
          </button>
          {activeStage < STAGES.length - 1 ? (
            <button
              type="button"
              className="button button--primary"
              onClick={goNext}
            >
              다음 단계
            </button>
          ) : (
            <button
              type="button"
              className="button button--primary"
              onClick={submit}
            >
              진단 결과 보기
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
