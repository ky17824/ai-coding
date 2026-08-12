"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { CountUp } from "@/components/count-up";

export const READINESS_STAGES = [
  { score: 62, bars: [64, 72, 56, 42, 78, 61] },
  { score: 65, bars: [67, 75, 59, 45, 81, 64] },
  { score: 78, bars: [80, 88, 72, 58, 94, 77] },
  { score: 84, bars: [86, 94, 78, 64, 100, 83] }
] as const;

const STEP_MS = 2000;
const FADE_MS = 300;
const RESET_MS = 1200;

export function ReadinessPreview({
  scoreEyebrow,
  scoreLabel,
  chartLabels
}: {
  scoreEyebrow: string;
  scoreLabel: string;
  chartLabels: readonly string[];
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
      <div className="chart">
        {current.bars.map((height, index) => (
          <div className="chart__column" key={chartLabels[index]}>
            <span
              style={
                {
                  height: `${height}%`,
                  "--delay": `${index * 0.12}s`
                } as CSSProperties
              }
            />
            <small>{chartLabels[index]}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
