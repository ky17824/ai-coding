"use client";

import React, { useId, useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { ReadinessLevel } from "@/lib/types";

type AnswerStatus = "blocker" | "deferred" | "needs_work" | "passed" | "strength";

export type QuestionChartAnswer = {
  questionId: string;
  number: number;
  question: string;
  level: ReadinessLevel;
  answerText: string;
  meaning: string;
  status: AnswerStatus;
  statusLabel: string;
  action: string | null;
  completionEvidence: string;
  hasEvidence: boolean;
};

export function AnswerQuestionChart({
  answers,
  locale,
  stageLabel
}: {
  answers: QuestionChartAnswer[];
  locale: Locale;
  stageLabel: string;
}) {
  const en = locale === "en";
  const detailId = useId();
  const detailHeadingId = `${detailId}-heading`;
  const initialAnswer = (["blocker", "deferred", "needs_work"] as AnswerStatus[])
    .map((status) => answers.find((answer) => answer.status === status))
    .find(Boolean) ?? answers[0];
  const [selectedQuestionId, setSelectedQuestionId] = useState(initialAnswer?.questionId ?? "");
  const selected = answers.find((answer) => answer.questionId === selectedQuestionId) ?? initialAnswer;

  if (!selected) return null;

  return (
    <div className="answer-question-chart">
      <div className="answer-question-chart__heading">
        <span>
          <strong>{en ? "Responses by question" : "문항별 응답 수준"}</strong>
          <small>{en ? "Select a bar to review the answer and next step." : "막대를 선택하면 답변과 다음 행동을 확인할 수 있습니다."}</small>
        </span>
        <small>{en ? "Bar height: Level 1–4 · line: score-eligible Level 3 · required evidence checked separately" : "막대 높이: 응답 1~4단계 · 선: 점수 인정 3단계 · 필수 근거 별도 확인"}</small>
      </div>

      <div
        className="answer-question-chart__viewport"
        role="group"
        aria-label={en ? `${stageLabel} responses by question` : `${stageLabel} 문항별 응답 수준`}
        tabIndex={0}
      >
        <div
          className="answer-question-chart__bars"
          style={{ gridTemplateColumns: `repeat(${answers.length}, minmax(34px, 1fr))` }}
        >
          <span className="answer-question-chart__pass-line" aria-hidden="true" />
          {answers.map((answer) => {
            const label = `Q${String(answer.number).padStart(2, "0")}`;
            const active = answer.questionId === selected.questionId;
            return (
              <button
                type="button"
                className={`answer-question-bar answer-question-bar--${answer.status} answer-question-bar--level-${answer.level}${active ? " is-active" : ""}`}
                key={answer.questionId}
                aria-label={`${label} ${answer.question}. ${en ? "Level" : "응답"} ${answer.level}/4, ${answer.statusLabel}`}
                aria-pressed={active}
                aria-controls={detailId}
                onClick={() => setSelectedQuestionId(answer.questionId)}
              >
                <span className="answer-question-bar__track" aria-hidden="true">
                  <span />
                </span>
                <strong>{label}</strong>
                <small>{answer.level}/4</small>
              </button>
            );
          })}
        </div>
      </div>

      <div className="answer-chart-legend" aria-label={en ? "Response status legend" : "문항 상태 범례"}>
        <span><i className="answer-question-legend--blocker" />{en ? "Required" : "필수 선결 조건"}</span>
        <span><i className="answer-question-legend--deferred" />{en ? "90-day task" : "90일 검증"}</span>
        <span><i className="answer-question-legend--needs-work" />{en ? "Needs work" : "보완 필요"}</span>
        <span><i className="answer-question-legend--passed" />{en ? "Passed" : "통과"}</span>
        <span><i className="answer-question-legend--strength" />{en ? "Strength" : "강점"}</span>
      </div>

      <article
        id={detailId}
        className={`panel answer-question-detail answer-question-detail--${selected.status}`}
        aria-labelledby={detailHeadingId}
        aria-live="polite"
        aria-atomic="true"
      >
        <header>
          <h3 id={detailHeadingId}>
            <small>Q{String(selected.number).padStart(2, "0")}</small>
            {selected.question}
          </h3>
          <strong>{selected.statusLabel}</strong>
        </header>
        <dl>
          <div><dt>{en ? "My answer" : "내 답변"}</dt><dd>{selected.answerText}</dd></div>
          <div><dt>{en ? "What it means" : "답변의 의미"}</dt><dd>{selected.meaning}</dd></div>
          {selected.action && <div><dt>{en ? "Next action" : "다음 행동"}</dt><dd>{selected.action}</dd></div>}
          <div><dt>{selected.hasEvidence ? (en ? "Submitted evidence" : "제출한 증거") : (en ? "Definition of done" : "완료 기준")}</dt><dd>{selected.completionEvidence}</dd></div>
        </dl>
      </article>
    </div>
  );
}
