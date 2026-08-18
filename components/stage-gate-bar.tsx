// Borderless의 시그니처 장치 — 준비 1·2·3단계를 세 칸으로 나눈 진행 막대와 칸마다 있는 통과 기준선(80%)
import type { CSSProperties } from "react";
import { GATE_THRESHOLD } from "@/lib/readiness";

export type StageGateStage = { id: string; label: string; value: number };

/**
 * 순수 표현 컴포넌트(서버·클라이언트 어디서나). `current`는 지금 서 있는 단계 — 그 칸만 mint 트랙.
 * size "md"는 라벨·값을 함께 그리고(대시보드·랜딩), "sm"은 막대만(카드·상단 요약).
 * animate=true면 첫 그림에서 0→값으로 한 번 채워진다(reduced-motion에서는 즉시).
 */
export function StageGateBar({
  stages,
  current,
  size = "md",
  animate = false,
  gate = GATE_THRESHOLD,
  ariaLabel
}: {
  stages: readonly StageGateStage[];
  current?: string;
  size?: "sm" | "md";
  animate?: boolean;
  gate?: number;
  ariaLabel?: string;
}) {
  const gatePercent = Math.round(gate * 100);
  return (
    <div
      className={`stage-gate stage-gate--${size}${animate ? " stage-gate--animate" : ""}`}
      role="img"
      aria-label={ariaLabel ?? stages.map((stage) => `${stage.label} ${stage.value}%`).join(", ")}
      style={{ "--gate": `${gatePercent}%` } as CSSProperties}
    >
      {stages.map((stage, index) => {
        const value = Math.max(0, Math.min(100, Math.round(stage.value)));
        return (
          <div className={`stage-gate__cell${current === stage.id ? " is-current" : ""}${value >= gatePercent ? " is-passed" : ""}`} key={stage.id}>
            {size === "md" && <span className="stage-gate__meta"><small>{stage.label}</small><strong>{value}%</strong></span>}
            <span className="stage-gate__track">
              <span className="stage-gate__fill" style={{ width: `${value}%`, "--delay": `${index * 120}ms` } as CSSProperties} />
            </span>
          </div>
        );
      })}
    </div>
  );
}
