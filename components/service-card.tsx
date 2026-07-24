import Link from "next/link";
import type { ServiceOffering } from "@/lib/types";
import { ArrowIcon } from "@/components/icons";

const won = new Intl.NumberFormat("ko-KR");

export function ServiceCard({ service }: { service: ServiceOffering }) {
  return (
    <article className="service-card">
      <div className="service-card__topline">
        <span className={`pill pill--${service.type}`}>
          {service.type === "mentoring" ? "1:1 멘토링" : "컨설팅 패키지"}
        </span>
        <span className="rating" aria-label={`평점 ${service.rating}`}>
          ★ {service.rating} <small>({service.reviewCount})</small>
        </span>
      </div>
      <h3>{service.title}</h3>
      <p>{service.description}</p>
      <div className="provider-line">
        <span className="avatar">{service.providerName.slice(0, 1)}</span>
        <span>
          <strong>{service.providerName}</strong>
          <small>{service.providerTitle}</small>
        </span>
      </div>
      <div className="service-card__footer">
        <span>
          <strong>{won.format(service.price)}원</strong>
          <small>{service.durationLabel}</small>
        </span>
        <Link
          href={`/services/${service.id}`}
          className="icon-button"
          aria-label={`${service.title} 상세 보기`}
        >
          <ArrowIcon />
        </Link>
      </div>
    </article>
  );
}
