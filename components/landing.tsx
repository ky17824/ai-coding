import { Fragment, type CSSProperties } from "react";
import Link from "next/link";
import { BackgroundPaths } from "@/components/background-paths";
import { CountUp } from "@/components/count-up";
import { ArrowIcon, CheckIcon, LockIcon } from "@/components/icons";
import { SiteHeader } from "@/components/site-header";
import { MobileAutoScroll } from "@/components/mobile-autoscroll";
import { t, type Locale } from "@/lib/i18n";

export function Landing({ locale }: { locale: Locale }) {
  const m = t(locale);
  return (
    // 루트 layout의 <html lang>은 두 로케일이 공유하므로 여기서 서브트리 언어를 선언한다.
    <main lang={locale}>
      <MobileAutoScroll />
      <div className="landing-shell">
        <BackgroundPaths />
        <SiteHeader locale={locale} />
        <section className="hero">
          <div className="hero__copy">
            <span className="eyebrow">
              <span className="eyebrow-dot" />
              {m.hero.eyebrow}
            </span>
            <h1>
              {m.hero.headline.map((line) => (
                <span key={line.em}>
                  <em>{line.em}</em>
                  {line.after}
                </span>
              ))}
            </h1>
            <p>{m.hero.body}</p>
            <div className="hero__actions">
              <Link href="/assessment" className="button button--primary">
                {m.hero.primaryCta}
                <ArrowIcon />
              </Link>
              <Link href="/dashboard" className="text-link">
                {m.hero.secondaryCta}
              </Link>
            </div>
            <p className="privacy-note">
              <LockIcon /> {m.hero.privacyNote}
            </p>
          </div>
          <div className="hero__visual" aria-label={m.preview.ariaLabel}>
            <div className="preview-window">
              <div className="preview-window__bar">
                <span />
                <span />
                <span />
                <small>{m.preview.windowTitle}</small>
              </div>
              <div className="preview-window__body">
                <div className="preview-title">
                  <span>
                    <small>{m.preview.scoreEyebrow}</small>
                    <strong>{m.preview.scoreLabel}</strong>
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
                      <small>{m.preview.chartLabels[index]}</small>
                    </div>
                  ))}
                </div>
                <div className="preview-action">
                  <span className="action-number">01</span>
                  <span>
                    <small>{m.preview.actionEyebrow}</small>
                    <strong>{m.preview.actionLabel}</strong>
                  </span>
                  <span className="pill">우선순위 0(Priority 0)</span>
                </div>
              </div>
            </div>
            <div className="floating-card floating-card--top">
              <CheckIcon />
              <span>
                <strong>{m.preview.evidenceTitle}</strong>
                <small>{m.preview.evidenceNote}</small>
              </span>
            </div>
            <div className="floating-card floating-card--bottom">
              <span className="avatar">{m.preview.expertAvatar}</span>
              <span>
                <strong>{m.preview.expertTitle}</strong>
                <small>{m.preview.expertNote}</small>
              </span>
            </div>
          </div>
        </section>
      </div>

      <section className="trust-strip" aria-label={m.trust.ariaLabel}>
        <div className="trust-strip__track">
          {[false, true].map((duplicate) => (
            <div
              className="trust-strip__group"
              aria-hidden={duplicate || undefined}
              key={duplicate ? "duplicate" : "primary"}
            >
              {m.trust.items.map((principle) => (
                <span key={principle}>{principle}</span>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="section section--steps">
        <div className="section-heading">
          <span className="eyebrow">{m.steps.eyebrow}</span>
          <h2>
            {m.steps.headingLines.map((line, index) => (
              <Fragment key={line}>
                {index > 0 && <br />}
                {line}
              </Fragment>
            ))}
          </h2>
        </div>
        <div className="steps-grid">
          {m.steps.items.map((step) => (
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
          <small>{m.ctaBand.eyebrow}</small>
          <h2>{m.ctaBand.heading}</h2>
        </span>
        <Link href="/assessment" className="button button--light">
          {m.ctaBand.button} <ArrowIcon />
        </Link>
      </section>
    </main>
  );
}
