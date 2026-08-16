"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";

/**
 * 생성 중 진행 상황을 실제 단계로 표시한다.
 *
 * 이 화면은 서버가 기록한 generation_stage만 그린다. 시간에 맞춰 저 혼자 넘어가는
 * 애니메이션은 넣지 않는다. 진행이 멈추면 화면도 멈춰야 한다 — 그것이 사실이고,
 * 사용자가 '작업 이어가기'를 눌러야 할 때를 알 수 있는 유일한 단서다.
 * 움직이는 것은 현재 단계 하나의 표시뿐이며, 그것은 "이 단계가 진행 중"이라는
 * 사실만 나타낸다. 단계 안의 진척도는 서버가 모르므로 그리지 않는다.
 */

export const GENERATION_STAGES = ["context", "research", "verify", "report", "finalize"] as const;
export type GenerationStage = (typeof GENERATION_STAGES)[number];

const copy = {
  ko: {
    heading: "AI 전문가가 작업 중입니다",
    waiting: "진행 단계를 확인하는 중입니다.",
    elapsed: (minutes: number) => `${minutes}분 경과`,
    started: "시작",
    note: "보통 3~6분 걸립니다. 이 화면을 닫아도 작업은 계속되며, 다시 들어오면 이어서 볼 수 있습니다.",
    stages: {
      context: { title: "입력 정리", body: "제출한 정보와 준비도 진단을 분류하고 조사 범위를 정합니다." },
      research: { title: "공개 자료 조사", body: "웹에서 근거를 찾고 출처 URL을 모읍니다. 최대 8회 검색합니다." },
      verify: { title: "출처 검증", body: "인용한 URL이 실제 검색 결과인지 대조합니다. 확인되지 않은 출처는 버립니다." },
      report: { title: "보고서 작성", body: "모은 근거를 엮어 결론, 가정, 실행계획을 씁니다." },
      finalize: { title: "최종 점검·저장", body: "준비도 문항 추적과 모순을 검사하고 저장합니다." }
    }
  },
  en: {
    heading: "The AI expert is working",
    waiting: "Checking the current stage.",
    elapsed: (minutes: number) => `${minutes} min elapsed`,
    started: "Started",
    note: "This usually takes 3–6 minutes. You can close this page — the work continues and you can come back to it.",
    stages: {
      context: { title: "Organising input", body: "Classifies your information and readiness assessment, and sets the research scope." },
      research: { title: "Public research", body: "Searches the web for evidence and collects source URLs, up to eight searches." },
      verify: { title: "Source verification", body: "Checks every cited URL against the actual search results and drops what cannot be verified." },
      report: { title: "Writing the report", body: "Turns the evidence into conclusions, assumptions, and an action plan." },
      finalize: { title: "Final checks and saving", body: "Traces the readiness questions, checks contradictions, and saves." }
    }
  }
};

export function AiGenerationFlow({
  locale,
  stage,
  startedAt
}: {
  locale: Locale;
  stage: GenerationStage | null;
  /** 이번 시도가 시작된 시각. 경과 시간은 추정이 아니라 실제 값이다. */
  startedAt?: string | null;
}) {
  const c = copy[locale === "en" ? "en" : "ko"];
  const activeIndex = stage ? GENERATION_STAGES.indexOf(stage) : -1;

  const [minutes, setMinutes] = useState<number | null>(null);
  useEffect(() => {
    if (!startedAt) return;
    const began = new Date(startedAt).getTime();
    if (Number.isNaN(began)) return;
    const tick = () => setMinutes(Math.max(0, Math.floor((Date.now() - began) / 60000)));
    tick();
    const timer = setInterval(tick, 30_000);
    return () => clearInterval(timer);
  }, [startedAt]);

  return (
    <div className="ai-flow">
      <div className="ai-flow__head">
        <strong>{c.heading}</strong>
        {minutes !== null && <span className="ai-flow__elapsed">{c.elapsed(minutes)}</span>}
      </div>
      <ol className="ai-flow__steps">
        {GENERATION_STAGES.map((key, index) => {
          const state = activeIndex < 0 ? "pending" : index < activeIndex ? "done" : index === activeIndex ? "active" : "pending";
          return (
            <li key={key} className={`ai-flow__step ai-flow__step--${state}`} aria-current={state === "active" ? "step" : undefined}>
              <span className="ai-flow__marker" aria-hidden="true" />
              <div className="ai-flow__body">
                <strong>{c.stages[key].title}</strong>
                <span>{c.stages[key].body}</span>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="ai-flow__note">{activeIndex < 0 ? c.waiting : c.note}</p>
    </div>
  );
}
