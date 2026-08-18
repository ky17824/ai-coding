"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";
// 순수 데이터 모듈이라 서버 전용 의존성이 없다 — 클라이언트 번들에 넣어도 안전하다.
import { modelLabel } from "@/lib/ai-models/catalog";

/**
 * 생성 중 진행 상황을 실제 단계로 표시한다.
 *
 * 이 화면은 서버가 기록한 generation_stage만 그린다. 시간에 맞춰 저 혼자 넘어가는
 * 애니메이션은 넣지 않는다. 진행이 멈추면 화면도 멈춰야 한다 — 그것이 사실이고,
 * 사용자가 '작업 이어가기'를 눌러야 할 때를 알 수 있는 유일한 단서다.
 * 움직이는 것은 현재 단계 하나의 표시뿐이며, 그것은 "이 단계가 진행 중"이라는
 * 사실만 나타낸다. 단계 안의 진척도는 서버가 모르므로 그리지 않는다.
 *
 * 연결선의 흐르는 점도 같은 규칙을 따른다 — CSS 애니메이션(app/globals.css)뿐이고
 * 몇 초짜리인지, 몇 %인지를 재는 타이머가 아니다. "지금 이 단계로 작업이 흘러 들어가고
 * 있다"는 사실만 나타낸다.
 */

export const GENERATION_STAGES = ["context", "research", "verify", "report", "finalize"] as const;
export type GenerationStage = (typeof GENERATION_STAGES)[number];

/** 단계 → model_route_snapshot의 키. verify·finalize는 모델 호출이 없는 로컬 단계라 대응이 없다. */
const STAGE_ROUTE_KEY: Partial<Record<GenerationStage, string>> = {
  context: "classification",
  research: "public_research",
  report: "final_report"
};

/** 출처·발견 수가 의미를 갖는 단계. research 자신은 조사가 끝나기 전이라 아직 값이 없다. */
const STAGES_WITH_RESEARCH_SUMMARY = new Set<GenerationStage>(["verify", "report", "finalize"]);

const copy = {
  ko: {
    heading: "AI 전문가가 작업 중입니다",
    waiting: "진행 단계를 확인하는 중입니다.",
    elapsed: (minutes: number) => `${minutes}분 경과`,
    stageElapsed: (seconds: number) => (seconds < 60 ? `이 단계 ${seconds}초 경과` : `이 단계 ${Math.floor(seconds / 60)}분 ${seconds % 60}초 경과`),
    working: (model: string) => `${model} · 작성 중`,
    sources: (sources: number, findings: number) => `출처 ${sources}건 · 조사 결과 ${findings}건`,
    started: "시작",
    closeNote: "이 화면을 닫아도 작업은 계속되며, 다시 들어오면 이어서 볼 수 있습니다.",
    stageExpectation: {
      research: "보통 1분 안팎",
      report: "보통 3~4분(가장 긴 단계)",
      finalize: "몇 초"
    } as Partial<Record<GenerationStage, string>>,
    stages: {
      context: { title: "입력 정리", body: "제출한 정보와 준비도 진단을 분류하고 조사 범위를 정합니다." },
      research: { title: "공개 자료 조사", body: "웹에서 근거를 찾고 출처 URL을 모읍니다. 최대 8회 검색합니다." },
      verify: { title: "출처 검증", body: "인용한 URL이 실제 검색 결과인지 대조합니다. 확인되지 않은 출처는 버립니다." },
      report: { title: "보고서 작성", body: "모은 근거를 엮어 결론, 가정, 실행 계획을 씁니다." },
      finalize: { title: "최종 점검·저장", body: "준비도 문항 추적과 모순을 검사하고 저장합니다." }
    }
  },
  en: {
    heading: "The AI expert is working",
    waiting: "Checking the current stage.",
    elapsed: (minutes: number) => `${minutes} min elapsed`,
    stageElapsed: (seconds: number) => (seconds < 60 ? `${seconds}s in this stage` : `${Math.floor(seconds / 60)}m ${seconds % 60}s in this stage`),
    working: (model: string) => `${model} · writing`,
    sources: (sources: number, findings: number) => `${sources} sources · ${findings} findings`,
    started: "Started",
    closeNote: "You can close this page — the work continues and you can come back to it.",
    stageExpectation: {
      research: "Usually around 1 minute",
      report: "Usually 3–4 minutes — the longest stage",
      finalize: "A few seconds"
    } as Partial<Record<GenerationStage, string>>,
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
  startedAt,
  stageLog,
  routeSnapshot,
  researchSummary
}: {
  locale: Locale;
  stage: GenerationStage | null;
  /** 이번 시도가 시작된 시각. 경과 시간은 추정이 아니라 실제 값이다. */
  startedAt?: string | null;
  /** 단계 시작 로그. 활성 단계의 경과 시간을 여기서 구한다 — 화면을 연 시각이 아니다. */
  stageLog?: Array<{ stage: string; at: string }>;
  /** 예약 시점에 고정된 단계별 모델. verify·finalize는 로컬 단계라 대응 키가 없다. */
  routeSnapshot?: Record<string, { model: string; effort: string }> | null;
  /** 조사 단계가 끝난 뒤에만 존재한다. */
  researchSummary?: { sources: number; findings: number } | null;
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

  // 활성 단계 안에서 보낸 시간. stageLog는 그 단계로 넘어간 실제 시각을 기록하므로
  // 화면을 새로 열어도 같은 값이 나온다 — 위 minutes와 같은 이유다.
  const [stageSeconds, setStageSeconds] = useState<number | null>(null);
  useEffect(() => {
    const entry = stage && stageLog ? [...stageLog].reverse().find((item) => item.stage === stage) : undefined;
    if (!entry) { setStageSeconds(null); return; }
    const began = new Date(entry.at).getTime();
    if (Number.isNaN(began)) { setStageSeconds(null); return; }
    const tick = () => setStageSeconds(Math.max(0, Math.floor((Date.now() - began) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [stage, stageLog]);

  return (
    <div className="ai-flow">
      <div className="ai-flow__head">
        <strong>{c.heading}</strong>
        {minutes !== null && <span className="ai-flow__elapsed">{c.elapsed(minutes)}</span>}
      </div>
      <ol className="ai-flow__steps">
        {GENERATION_STAGES.map((key, index) => {
          const state = activeIndex < 0 ? "pending" : index < activeIndex ? "done" : index === activeIndex ? "active" : "pending";
          const routeKey = STAGE_ROUTE_KEY[key];
          const model = state === "active" && routeKey ? routeSnapshot?.[routeKey]?.model : undefined;
          const showSources = state === "active" && STAGES_WITH_RESEARCH_SUMMARY.has(key) && Boolean(researchSummary);
          return (
            <li key={key} className={`ai-flow__step ai-flow__step--${state}`} aria-current={state === "active" ? "step" : undefined}>
              <span className="ai-flow__marker" aria-hidden="true" />
              <div className="ai-flow__body">
                <strong>{c.stages[key].title}</strong>
                <span>{c.stages[key].body}</span>
                {state === "active" && (stageSeconds !== null || model || showSources) && (
                  <div className="ai-flow__meta">
                    {stageSeconds !== null && <span>{c.stageElapsed(stageSeconds)}</span>}
                    {model && <span>{c.working(modelLabel(model))}</span>}
                    {showSources && researchSummary && <span>{c.sources(researchSummary.sources, researchSummary.findings)}</span>}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="ai-flow__note">
        {activeIndex < 0 ? c.waiting : <>{stage && c.stageExpectation[stage] ? `${c.stageExpectation[stage]}. ` : ""}{c.closeNote}</>}
      </p>
    </div>
  );
}
