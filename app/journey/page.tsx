import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { JOURNEY_PHASES } from "@/lib/readiness-data";

export const metadata: Metadata = { title: "Global GTM 여정" };

const detailedSteps = [
  "본국 PMF 및 확장성 검증",
  "리더십 동의와 4대 약속",
  "후보 시장 선정",
  "현장 현지화 발견",
  "BMLC 작성",
  "LPA 작성",
  "총 진입비용 산정",
  "글로벌 성장 피치덱",
  "가설 검증과 반복",
  "모멘텀 빌더 구축",
  "글로벌 스케일 3대 기둥"
];

export default function JourneyPage() {
  return (
    <main className="app-page">
      <SiteHeader compact />
      <div className="app-container">
        <span className="page-kicker">GLOBAL GTM JOURNEY</span>
        <h1 className="page-title">진출 준비부터 확장까지 한 흐름으로</h1>
        <p className="page-description">
          Global Class 11단계를 세 구간으로 묶었습니다. 일정이 아니라 완료
          증거가 있어야 다음 단계로 이동합니다.
        </p>
        <div className="journey-board">
          {JOURNEY_PHASES.map((phase, phaseIndex) => (
            <section className="journey-column panel" key={phase.id}>
              <header>
                <span>0{phaseIndex + 1}</span>
                <div>
                  <h2>{phase.label}</h2>
                  <p>{phase.description}</p>
                </div>
              </header>
              <div className="journey-step-list">
                {phase.steps.map((step) => (
                  <article key={step}>
                    <span className={step <= 3 ? "done" : step === 4 ? "active" : ""}>
                      {step <= 3 ? "✓" : step}
                    </span>
                    <div>
                      <small>STEP {step}</small>
                      <h3>{detailedSteps[step - 1]}</h3>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
