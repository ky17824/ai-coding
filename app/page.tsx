import type { CSSProperties } from "react";
import Link from "next/link";
import { BackgroundPaths } from "@/components/background-paths";
import { CountUp } from "@/components/count-up";
import { ArrowIcon, CheckIcon, LockIcon } from "@/components/icons";
import { SiteHeader } from "@/components/site-header";
import { MobileAutoScroll } from "@/components/mobile-autoscroll";

const steps = [
  {
    number: "01",
    title: "대표님 회사의 해외진출 준비도를 확인하세요",
    description:
      "55개 문항으로 극초기·준비중·준비완료 중 지금 어느 단계인지 확인합니다."
  },
  {
    number: "02",
    title: "맞춤형 진단으로 대응방안을 확인하세요",
    description:
      "가장 큰 준비도 격차부터 책임자·기한·완료 기준이 있는 액션으로 바꿉니다."
  },
  {
    number: "03",
    title: "검증된 전문가가 여러분과 함께 합니다",
    description:
      "필요한 순간에 승인된 멘토와 컨설팅 패키지를 예약하고 여정 안에서 관리합니다."
  }
];

const trustPrinciples = [
  "GLOBAL CLASS 방법론 기반",
  "근거 중심 준비도 진단",
  "승인된 전문가 서비스"
];

export default function HomePage() {
  return (
    <main>
      <MobileAutoScroll />
      <div className="landing-shell">
        <BackgroundPaths />
        <SiteHeader />
        <section className="hero">
          <div className="hero__copy">
            <span className="eyebrow">
              <span className="eyebrow-dot" />
              Global GTM Journey
            </span>
            <h1>
              <span>
                <em>해외 진출</em>,
              </span>
              <span>
                <em>준비</em>된 만큼
              </span>
              <span>
                <em>성공</em> 할 수 있습니다
              </span>
            </h1>
            <p>
              준비도를 객관적으로 진단하고, 지금 필요한 액션과 전문가를
              연결해 글로벌 진출의 전 과정을 한눈에 관리하세요.
            </p>
            <div className="hero__actions">
              <Link href="/assessment" className="button button--primary">
                무료 준비도 진단 시작
                <ArrowIcon />
              </Link>
              <Link href="/dashboard" className="text-link">
                데모 대시보드 보기
              </Link>
            </div>
            <p className="privacy-note">
              <LockIcon /> 이메일로 참여하는 비공개 베타입니다.
            </p>
          </div>
          <div className="hero__visual" aria-label="준비도 대시보드 미리보기">
            <div className="preview-window">
              <div className="preview-window__bar">
                <span />
                <span />
                <span />
                <small>Readiness overview</small>
              </div>
              <div className="preview-window__body">
                <div className="preview-title">
                  <span>
                    <small>GLOBAL READINESS</small>
                    <strong>진출 준비도</strong>
                  </span>
                  <span className="preview-score">
                    <CountUp to={68} />
                  </span>
                </div>
                <div className="chart">
                  {[64, 72, 56, 42, 78, 61].map((value, index) => (
                    <div className="chart__column" key={value}>
                      <span
                        style={
                          {
                            height: `${value}%`,
                            "--delay": `${index * 0.12}s`
                          } as CSSProperties
                        }
                      />
                      <small>{["시장", "리더십", "선정", "현지화", "조직", "GTM"][index]}</small>
                    </div>
                  ))}
                </div>
                <div className="preview-action">
                  <span className="action-number">01</span>
                  <span>
                    <small>가장 먼저 할 일</small>
                    <strong>보안·컴플라이언스 갭 분석</strong>
                  </span>
                  <span className="pill">P0</span>
                </div>
              </div>
            </div>
            <div className="floating-card floating-card--top">
              <CheckIcon />
              <span>
                <strong>근거 기반 진단</strong>
                <small>완료에는 증빙이 필요해요</small>
              </span>
            </div>
            <div className="floating-card floating-card--bottom">
              <span className="avatar">김</span>
              <span>
                <strong>검증된 전문가</strong>
                <small>승인된 멘토·컨설턴트만</small>
              </span>
            </div>
          </div>
        </section>
      </div>

      <section className="trust-strip" aria-label="서비스 원칙">
        <div className="trust-strip__track">
          {[false, true].map((duplicate) => (
            <div
              className="trust-strip__group"
              aria-hidden={duplicate || undefined}
              key={duplicate ? "duplicate" : "primary"}
            >
              {trustPrinciples.map((principle) => (
                <span key={principle}>{principle}</span>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <span className="eyebrow">HOW IT WORKS</span>
          <h2>막연한 해외 진출을<br />실행 가능한 여정으로</h2>
        </div>
        <div className="steps-grid">
          {steps.map((step) => (
            <article className="step-card" key={step.number}>
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cta-band">
        <span>
          <small>준비된 글로벌 진출의 시작</small>
          <h2>우리 회사의 현재 위치를 확인해 보세요.</h2>
        </span>
        <Link href="/assessment" className="button button--light">
          준비도 진단 시작 <ArrowIcon />
        </Link>
      </section>
    </main>
  );
}
