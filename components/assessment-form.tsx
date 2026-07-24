"use client";

import { useMemo, useState } from "react";
import { DOMAINS, READINESS_QUESTIONS } from "@/lib/readiness-data";
import {
  calculateReadiness,
  validateAssessmentAnswers
} from "@/lib/readiness";
import { recommendServices } from "@/lib/service-data";
import type {
  EvidenceInput,
  ReadinessAnswer,
  ReadinessLevel,
  ReadinessResult
} from "@/lib/types";
import { ServiceCard } from "@/components/service-card";

const LEVELS: { value: ReadinessLevel; label: string; description: string }[] = [
  { value: 0, label: "미착수", description: "아직 시작하지 않음" },
  { value: 1, label: "계획", description: "담당자·일정 논의 중" },
  { value: 2, label: "진행", description: "실행 중이나 완료 전" },
  { value: 3, label: "완료", description: "증거로 확인 가능" }
];

export function AssessmentForm() {
  const [answers, setAnswers] = useState<Record<string, ReadinessLevel>>({});
  const [evidence, setEvidence] = useState<Record<string, EvidenceInput>>({});
  const [activeDomain, setActiveDomain] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReadinessResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const domain = DOMAINS[activeDomain];
  const questions = READINESS_QUESTIONS.filter(
    (question) => question.domainId === domain.id
  );
  const answeredCount = Object.keys(answers).length;
  const progress = Math.round(
    (answeredCount / READINESS_QUESTIONS.length) * 100
  );

  const submittedAnswers = useMemo<ReadinessAnswer[]>(
    () =>
      READINESS_QUESTIONS.map((question) => ({
        questionId: question.id,
        level: answers[question.id] ?? 0,
        evidence: evidence[question.id]
      })),
    [answers, evidence]
  );

  function changeLevel(questionId: string, level: ReadinessLevel) {
    setAnswers((current) => ({ ...current, [questionId]: level }));
    setErrors((current) => {
      const next = { ...current };
      delete next[questionId];
      return next;
    });
    if (level !== 3) {
      setEvidence((current) => {
        const next = { ...current };
        delete next[questionId];
        return next;
      });
    }
  }

  function goNext() {
    const unanswered = questions.find(
      (question) => answers[question.id] === undefined
    );
    if (unanswered) {
      setErrors((current) => ({
        ...current,
        [unanswered.id]: "현재 영역의 모든 문항에 답해주세요."
      }));
      document
        .getElementById(`question-${unanswered.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setActiveDomain((current) => Math.min(current + 1, DOMAINS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    if (answeredCount < READINESS_QUESTIONS.length) {
      const firstMissing = READINESS_QUESTIONS.find(
        (question) => answers[question.id] === undefined
      );
      if (firstMissing) {
        const index = DOMAINS.findIndex(
          (item) => item.id === firstMissing.domainId
        );
        setActiveDomain(index);
        setErrors((current) => ({
          ...current,
          [firstMissing.id]: "모든 문항에 답해야 결과를 확인할 수 있습니다."
        }));
      }
      return;
    }
    const validation = validateAssessmentAnswers(submittedAnswers);
    if (!validation.valid) {
      setErrors(validation.errors);
      const firstError = READINESS_QUESTIONS.find(
        (question) => validation.errors[question.id]
      );
      if (firstError) {
        setActiveDomain(
          DOMAINS.findIndex((item) => item.id === firstError.domainId)
        );
      }
      return;
    }

    const calculated = calculateReadiness(submittedAnswers);
    setResult(calculated);
    setSaving(true);
    setSaved(false);

    try {
      const response = await fetch("/api/assessments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers: submittedAnswers })
      });
      setSaved(response.ok);
    } catch {
      setSaved(false);
    } finally {
      setSaving(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  if (result) {
    const services = recommendServices(
      result.actions.map((action) => action.serviceTag)
    );
    return (
      <div className="assessment-result">
        <div className="result-hero panel">
          <div>
            <span className="page-kicker">READINESS RESULT</span>
            <h1>
              현재 준비도는 <em>{result.status}</em> 단계입니다.
            </h1>
            <p>
              점수보다 중요한 것은 가장 큰 준비도 격차부터 실행하는
              것입니다. 아래 5개 액션을 여정에 추가해 보세요.
            </p>
            <div className="save-state" role="status">
              {saving
                ? "결과를 저장하고 있습니다."
                : saved
                  ? "조직 대시보드에 저장했습니다."
                  : "로컬 결과입니다. 로그인하면 조직 대시보드에 저장됩니다."}
            </div>
          </div>
          <div className="score-orb">
            <strong>{result.overallScore}</strong>
            <span>/ 100</span>
          </div>
        </div>

        {result.isOnHold && (
          <section className="hold-banner" aria-labelledby="hold-title">
            <div>
              <span>GO / NO-GO GATE</span>
              <h2 id="hold-title">지금은 진출 보류가 권장됩니다.</h2>
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
              <span className="page-kicker">DOMAIN SCORES</span>
              <h2>영역별 준비도</h2>
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
            {DOMAINS.map((item) => (
              <div className="domain-score panel" key={item.id}>
                <span>{item.label}</span>
                <strong>{result.domainScores[item.id]}</strong>
                <div className="meter">
                  <span style={{ width: `${result.domainScores[item.id]}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="result-section">
          <span className="page-kicker">TOP ACTIONS</span>
          <h2>가장 먼저 실행할 5가지</h2>
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
                    담당: {action.owner} · 완료 증거: {action.completionEvidence}
                  </p>
                </div>
                <button className="button button--small button--dark" type="button">
                  여정에 추가
                </button>
              </article>
            ))}
          </div>
        </section>

        {services.length > 0 && (
          <section className="result-section">
            <span className="page-kicker">MATCHED EXPERTS</span>
            <h2>현재 액션에 맞는 전문가</h2>
            <div className="service-grid">
              {services.map((service) => (
                <ServiceCard service={service} key={service.id} />
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="assessment-layout">
      <aside className="assessment-sidebar panel">
        <span className="page-kicker">GLOBAL READINESS</span>
        <h1>해외 진출 준비도 진단</h1>
        <p>15개 질문에 답하면 6개 영역의 현재 위치를 확인할 수 있습니다.</p>
        <div className="progress-block">
          <span>
            <strong>{answeredCount}</strong> / {READINESS_QUESTIONS.length}
          </span>
          <div className="meter">
            <span style={{ width: `${progress}%` }} />
          </div>
          <small>{progress}% 완료</small>
        </div>
        <ol className="domain-nav">
          {DOMAINS.map((item, index) => {
            const domainQuestions = READINESS_QUESTIONS.filter(
              (question) => question.domainId === item.id
            );
            const complete = domainQuestions.every(
              (question) => answers[question.id] !== undefined
            );
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={index === activeDomain ? "active" : ""}
                  onClick={() => setActiveDomain(index)}
                >
                  <span>{index + 1}</span>
                  {item.shortLabel}
                  {complete && <small aria-label="완료">✓</small>}
                </button>
              </li>
            );
          })}
        </ol>
      </aside>

      <section className="assessment-questions">
        <div className="question-heading">
          <span>
            영역 {activeDomain + 1} / {DOMAINS.length}
          </span>
          <h2>{domain.label}</h2>
        </div>
        {questions.map((question, index) => (
          <article
            className="question-card panel"
            id={`question-${question.id}`}
            key={question.id}
          >
            <span className="question-number">
              Q{String(index + 1).padStart(2, "0")}
            </span>
            <h3>{question.title}</h3>
            <p>{question.help}</p>
            <fieldset>
              <legend className="sr-only">{question.title}</legend>
              <div className="answer-grid">
                {LEVELS.map((level) => (
                  <label
                    className={`answer-option ${
                      answers[question.id] === level.value ? "selected" : ""
                    }`}
                    key={level.value}
                  >
                    <input
                      type="radio"
                      name={question.id}
                      value={level.value}
                      checked={answers[question.id] === level.value}
                      onChange={() => changeLevel(question.id, level.value)}
                    />
                    <strong>{level.label}</strong>
                    <small>{level.description}</small>
                  </label>
                ))}
              </div>
            </fieldset>
            {answers[question.id] === 3 && (
              <label className="evidence-field">
                <span>완료 증빙</span>
                <textarea
                  rows={2}
                  placeholder="관련 문서 링크 또는 확인 가능한 근거를 입력하세요."
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
                  민감한 원문은 입력하지 마세요. 로그인 후 PDF·PNG·JPG 파일을
                  비공개로 첨부할 수 있습니다.
                </small>
              </label>
            )}
            {errors[question.id] && (
              <p className="field-error" role="alert">
                {errors[question.id]}
              </p>
            )}
          </article>
        ))}
        <div className="assessment-controls">
          <button
            type="button"
            className="button button--ghost"
            disabled={activeDomain === 0}
            onClick={() => setActiveDomain((current) => current - 1)}
          >
            이전 영역
          </button>
          {activeDomain < DOMAINS.length - 1 ? (
            <button
              type="button"
              className="button button--primary"
              onClick={goNext}
            >
              다음 영역
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
