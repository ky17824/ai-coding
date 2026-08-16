import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AnswerQuestionChart } from "@/components/answer-question-chart";

const answers = [
  {
    questionId: "question-1",
    number: 1,
    question: "반복 가능한 실행 체계가 있나요?",
    level: 2 as const,
    answerText: "계획만 세웠습니다.",
    meaning: "실행 근거가 부족합니다.",
    status: "needs_work" as const,
    statusLabel: "보완 필요",
    action: "실행 일정을 정합니다.",
    completionEvidence: "실행 일정",
    hasEvidence: false
  },
  {
    questionId: "question-2",
    number: 2,
    question: "필수 준비를 완료했나요?",
    level: 1 as const,
    answerText: "아직 시작하지 않았습니다.",
    meaning: "필수 선결 조건이 남았습니다.",
    status: "blocker" as const,
    statusLabel: "필수 선결 조건",
    action: "담당자와 기한을 정합니다.",
    completionEvidence: "담당자와 기한",
    hasEvidence: false
  },
  {
    questionId: "question-3",
    number: 3,
    question: "실행 사례가 있나요?",
    level: 4 as const,
    answerText: "반복 실행하고 있습니다.",
    meaning: "검증된 강점입니다.",
    status: "strength" as const,
    statusLabel: "강점",
    action: null,
    completionEvidence: "운영 기록",
    hasEvidence: true
  }
];

describe("AnswerQuestionChart", () => {
  it("shows every response as a level bar and opens the highest-priority unfinished answer", () => {
    const html = renderToStaticMarkup(
      <AnswerQuestionChart answers={answers} locale="ko" stageLabel="준비 1단계" />
    );

    expect(html.match(/class="answer-question-bar answer/g)).toHaveLength(3);
    expect(html).toContain("answer-question-bar--level-4");
    expect(html).toContain("answer-question-bar--level-1");
    expect(html).toContain("aria-pressed=\"true\"");
    expect(html).toContain("Q02 필수 준비를 완료했나요?");
    expect(html).toContain("담당자와 기한을 정합니다.");
    expect(html).toContain("점수 인정 3단계 · 테두리: 게이트 상태");
    expect(html).toContain("aria-live=\"polite\"");
    expect(html).not.toContain("반복 가능한 실행 체계가 있나요?</h3>");
  });
});
