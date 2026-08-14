import { Fragment } from "react";
import Link from "next/link";
import { BackgroundPaths } from "@/components/background-paths";
import { ArrowIcon, LockIcon } from "@/components/icons";
import { ReadinessPreview } from "@/components/readiness-preview";
import { SiteHeader } from "@/components/site-header";
import { MobileAutoScroll } from "@/components/mobile-autoscroll";
import { localizedPath, t, type Locale } from "@/lib/i18n";

export function Landing({ locale }: { locale: Locale }) {
  const m = t(locale);
  return (
    // 루트 layout의 <html lang>은 두 로케일이 공유하므로 여기서 서브트리 언어를 선언한다.
    <main lang={locale}>
      <MobileAutoScroll />
      <div className="landing-shell">
        <BackgroundPaths />
        <SiteHeader locale={locale} landing />
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
              <Link href={localizedPath("/assessment", locale)} className="button button--primary">
                {m.hero.primaryCta}
                <ArrowIcon />
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
                <ReadinessPreview
                  scoreEyebrow={m.preview.scoreEyebrow}
                  scoreLabel={m.preview.scoreLabel}
                  chartLabels={m.preview.chartLabels}
                />
                <div className="preview-action">
                  <span className="action-number">01</span>
                  <span>
                    <small>{m.preview.actionEyebrow}</small>
                    <strong>{m.preview.actionLabel}</strong>
                  </span>
                  <span className="pill">{m.preview.priority}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

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
          {m.steps.items.map((step) => {
            const content = <><span>{step.number}</span><h3>{step.title}</h3><p>{step.description}</p></>;
            return step.number === "04"
              ? <Link className="step-card" href={localizedPath("/services", locale)} key={step.number}>{content}</Link>
              : <article className="step-card" key={step.number}>{content}</article>;
          })}
        </div>
      </section>

      <section className="cta-band">
        <span>
          <small>{m.ctaBand.eyebrow}</small>
          <h2>{m.ctaBand.heading}</h2>
        </span>
        <Link href={localizedPath("/assessment", locale)} className="button button--light">
          {m.ctaBand.button} <ArrowIcon />
        </Link>
      </section>
    </main>
  );
}
