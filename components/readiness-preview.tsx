"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { CountUp } from "@/components/count-up";
import { StageGateBar } from "@/components/stage-gate-bar";

/** 준비 1·2·3단계 점수. 마지막 장면에서 1단계가 통과 기준(80%)을 넘는다 — 제품이 실제로 보여 주는 것과 같은 그림. */
export const READINESS_STAGES = [
  { score: 32, bars: [32, 0, 0] },
  { score: 58, bars: [58, 12, 0] },
  { score: 74, bars: [74, 30, 0] },
  { score: 84, bars: [84, 46, 8] }
] as const;
export const GATE_PERCENT = 80;

const STEP_MS = 2000;
const FADE_MS = 300;
const RESET_MS = 1200;

export function ReadinessPreview({
  scoreEyebrow,
  scoreLabel,
  chartLabels,
  gateLabel,
  verdictBefore,
  verdictAfter
}: {
  scoreEyebrow: string;
  scoreLabel: string;
  chartLabels: readonly string[];
  gateLabel: string;
  verdictBefore: readonly string[];
  verdictAfter: readonly string[];
}) {
  const [stage, setStage] = useState(0);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStage(READINESS_STAGES.length - 1);
      return;
    }

    let timer = 0;
    let current = 0;
    const schedule = () => {
      timer = window.setTimeout(() => {
        if (current < READINESS_STAGES.length - 1) {
          current += 1;
          setStage(current);
          schedule();
          return;
        }

        setResetting(true);
        timer = window.setTimeout(() => {
          current = 0;
          setStage(0);
          timer = window.setTimeout(() => {
            setResetting(false);
            schedule();
          }, RESET_MS);
        }, FADE_MS);
      }, STEP_MS);
    };

    schedule();
    return () => window.clearTimeout(timer);
  }, []);

  const current = READINESS_STAGES[stage];
  const verdict = current.score >= GATE_PERCENT ? verdictAfter : verdictBefore;

  return (
    <div className={`readiness-preview${resetting ? " is-resetting" : ""}`}>
      <div className="preview-title">
        <span>
          <small>{scoreEyebrow}</small>
          <strong>{scoreLabel}</strong>
        </span>
        <span className="preview-score">
          <CountUp to={current.score} />%
        </span>
      </div>
      <div className="preview-stages">
        <StageGateBar
          stages={current.bars.map((value, index) => ({ id: `s${index + 1}`, label: chartLabels[index], value }))}
          current="s1"
          gate={GATE_PERCENT / 100}
        />
        <small className="preview-gate">{gateLabel}</small>
      </div>
      <p className="preview-verdict"><span>{verdict[0]}</span><span>{verdict[1]}</span></p>
    </div>
  );
}
