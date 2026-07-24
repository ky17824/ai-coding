import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { DOMAINS, JOURNEY_PHASES, READINESS_QUESTIONS } from "@/lib/readiness-data";
import { calculateReadiness } from "@/lib/readiness";
import { recommendServices } from "@/lib/service-data";
import { ServiceCard } from "@/components/service-card";
import type { ReadinessAnswer, ReadinessLevel } from "@/lib/types";

export const metadata: Metadata = { title: "GTM 여정 대시보드" };

const demoLevels: Record<string, ReadinessLevel> = {
  pmf: 2,
  "unit-economics": 2,
  "leadership-resources": 2,
  "local-autonomy": 1,
  "bottom-up-tam": 2,
  "organic-signal": 1,
  discovery: 1,
  bmlc: 1,
  "security-compliance": 0,
  "localization-premium": 1,
  interpreneur: 1,
  "universal-values": 2,
  "feedback-loops": 1,
  "gtm-motion": 2,
  "funding-programs": 1
};

const demoAnswers: ReadinessAnswer[] = READINESS_QUESTIONS.map((question) => ({
  questionId: question.id,
  level: demoLevels[question.id] ?? 0
}));
const result = calculateReadiness(demoAnswers);
const services = recommendServices(
  result.actions.map((action) => action.serviceTag)
);

export default function DashboardPage() {
  return (
    <main className="app-page">
      <SiteHeader compact />
      <div className="app-container dashboard">
        <div className="dashboard-heading">
          <span>
            <span className="page-kicker">ACME LABS · GLOBAL JOURNEY</span>
            <h1 className="page-title">
              좋은 아침입니다. 다음 진출 준비를 이어가세요.
            </h1>
            <p className="page-description">
              가장 큰 준비도 격차와 이번 주 실행 항목을 기준으로 정리했습니다.
            </p>
          </span>
          <Link href="/assessment" className="button button--primary">
            진단 업데이트
          </Link>
        </div>

        <section className="dashboard-overview">
          <article className="readiness-summary panel">
            <div className="summary-title">
              <span>
                <small>GLOBAL READINESS</small>
                <h2>진출 준비도</h2>
              </span>
              <span className="summary-score">
                <strong>{result.overallScore}</strong>
                <small>{result.status}</small>
              </span>
            </div>
            <div className="domain-bars">
              {DOMAINS.map((domain) => (
                <div key={domain.id}>
                  <span>
                    <small>{domain.shortLabel}</small>
                    <strong>{result.domainScores[domain.id]}</strong>
                  </span>
                  <div className="meter">
                    <span style={{ width: `${result.domainScores[domain.id]}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="next-session panel">
            <span className="page-kicker">NEXT SESSION</span>
            <div className="calendar-date">
              <strong>29</strong>
              <span>7월<br />수요일</span>
            </div>
            <h2>글로벌 확장 전 Unit Economics 점검</h2>
            <p>김서윤 멘토 · 오후 2:00 · 90분</p>
            <button className="button button--ghost button--full" type="button">
              예약 상세 보기
            </button>
          </article>
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section__heading">
            <span>
              <span className="page-kicker">PRIORITY ACTIONS</span>
              <h2>지금 가장 중요한 액션</h2>
            </span>
            <Link href="/journey" className="text-link">
              전체 여정 보기 →
            </Link>
          </div>
          <div className="dashboard-action-list">
            {result.actions.map((action, index) => (
              <article className="dashboard-action panel" key={action.questionId}>
                <span className="action-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <span className={`priority priority--${action.urgency}`}>
                    {action.urgency}
                  </span>
                  <h3>{action.title}</h3>
                  <p>
                    {action.owner} · {action.completionEvidence}
                  </p>
                </div>
                <label className="completion-check">
                  <input type="checkbox" />
                  <span>완료</span>
                </label>
              </article>
            ))}
          </div>
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section__heading">
            <span>
              <span className="page-kicker">JOURNEY</span>
              <h2>Global GTM 여정</h2>
            </span>
          </div>
          <div className="journey-overview panel">
            {JOURNEY_PHASES.map((phase, index) => (
              <div className="journey-phase" key={phase.id}>
                <span className={index === 0 ? "active" : ""}>
                  {index < 1 ? "✓" : index + 1}
                </span>
                <div>
                  <small>{phase.steps.length}개 세부 단계</small>
                  <h3>{phase.label}</h3>
                  <p>{phase.description}</p>
                </div>
                <strong>{index === 0 ? "62%" : "0%"}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section__heading">
            <span>
              <span className="page-kicker">RECOMMENDED</span>
              <h2>준비도에 맞는 전문가 서비스</h2>
            </span>
            <Link href="/services" className="text-link">
              전체 보기 →
            </Link>
          </div>
          <div className="service-grid">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
