import Link from "next/link";
import type { ServiceOffering } from "@/lib/types";
import { localizedPath, type Locale } from "@/lib/i18n";

const won = new Intl.NumberFormat("ko-KR");

export function ServiceCard({ service, locale = "ko" }: { service: ServiceOffering; locale?: Locale }) {
  return (
    <article className="service-card">
      <div className="service-card__topline">
        <span className={`pill pill--${service.type}${service.tier ? ` pill--tier-${service.tier.toLowerCase()}` : ""}`}>
          {service.type === "mentoring"
            ? locale === "en" ? "1:1 Mentoring" : "1:1 멘토링"
            : service.type === "ai_agent"
              ? service.tierLabel ?? (service.productKind === "package" ? (locale === "en" ? "AI Package" : "AI 패키지") : (locale === "en" ? "AI Specialist" : "AI 전문가"))
              : locale === "en" ? "Consulting Package" : "컨설팅 패키지"}
        </span>
        {service.type !== "ai_agent" ? <span className="rating" aria-label={`${locale === "en" ? "Rating" : "평점"} ${service.rating}`}>★ {service.rating} <small>({service.reviewCount})</small></span> : null}
      </div>
      <h3>{service.title}</h3>
      <p>{service.description}</p>
      {service.type === "ai_agent" ? (
        <ul className="service-card__deliverables" aria-label={locale === "en" ? "Key deliverables" : "주요 결과물"}>
          {service.deliverables.slice(0, 2).map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : (
        <div className="provider-line">
          <span className="avatar">{service.providerName.slice(0, 1)}</span>
          <span>
            <strong>{service.providerName}</strong>
            <small>{service.providerTitle}</small>
          </span>
        </div>
      )}
      <div className="service-card__footer">
        <span>
          <strong>{locale === "en" ? `₩${won.format(service.price)}` : `${won.format(service.price)}원`}</strong>
          {service.type === "ai_agent" ? <small>{locale === "en" ? "VAT excluded" : "부가세 별도"}</small> : null}
          <small>{service.durationLabel}</small>
        </span>
        <Link
          href={localizedPath(`/services/${service.id}`, locale)}
          className="button button--soft button--small"
          aria-label={`${service.title} ${locale === "en" ? "details" : "자세히 보기"}`}
        >
          {locale === "en" ? "Details" : "자세히 보기"}
        </Link>
      </div>
    </article>
  );
}
