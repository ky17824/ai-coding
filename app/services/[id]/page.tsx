import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { CheckoutButton } from "@/components/checkout-button";
import { getPublishedService } from "@/lib/services";
import { getRequestLocale } from "@/lib/i18n-server";

const won = new Intl.NumberFormat("ko-KR");

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const locale = await getRequestLocale();
  const service = await getPublishedService(id, locale);
  return { title: service?.title ?? (locale === "en" ? "Expert Service" : "전문가 서비스") };
}

export default async function ServiceDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getRequestLocale();
  const service = await getPublishedService(id, locale);
  const en = locale === "en";
  if (!service || !service.approved) notFound();

  return (
    <main className="app-page">
      <SiteHeader compact locale={locale} />
      <div className="app-container service-detail">
        <section className="service-main panel">
          <span className={`pill pill--${service.type}`}>
            {service.type === "mentoring" ? (en ? "1:1 Mentoring" : "1:1 멘토링") : (en ? "Consulting Package" : "컨설팅 패키지")}
          </span>
          <h1>{service.title}</h1>
          <p className="service-lead">{service.description}</p>
          <div className="provider-profile">
            <span className="avatar">{service.providerName.slice(0, 1)}</span>
            <span>
              <strong>{service.providerName}</strong>
              <small>{service.providerTitle}</small>
            </span>
            <span className="rating">
              ★ {service.rating} ({service.reviewCount} {en ? "reviews" : "개 후기"})
            </span>
          </div>
          <div className="detail-block">
            <h2>{en ? "Deliverables" : "서비스 결과물"}</h2>
            <ul>
              {service.deliverables.map((deliverable) => (
                <li key={deliverable}>{deliverable}</li>
              ))}
            </ul>
          </div>
          <div className="detail-block">
            <h2>{en ? "How it works" : "진행 방식"}</h2>
            <ol>
              <li>{en ? "After payment, we will organize your goals and materials in a pre-session questionnaire." : "결제하시면 목표와 보유 자료를 사전 질문지로 정리해 드립니다."}</li>
              <li>
                {service.type === "mentoring"
                  ? (en ? `We will hold a ${service.durationLabel} video session.` : `${service.durationLabel} 화상 세션을 진행합니다.`)
                  : (en ? `We will work through the agreed milestones over ${service.durationLabel}.` : `${service.durationLabel} 동안 합의된 단계별 실행목표(Milestone)를 수행합니다.`)}
              </li>
              <li>{en ? "The engagement closes after you confirm the agreed deliverables." : "합의하신 결과물을 확인하신 뒤 거래를 마칩니다."}</li>
            </ol>
          </div>
          <div className="detail-block">
            <h2>{en ? "Cancellation & disputes" : "취소·분쟁 정책"}</h2>
            <p>
              {en ? "Full refunds are available before the service starts. Cancellations, no-shows, and quality disputes after the start are reviewed by an administrator using the order record and milestones." : "서비스 시작 전에는 전액 환불됩니다. 시작 이후의 취소·노쇼·품질 분쟁은 자동 판정하지 않으며, 주문 기록과 단계별 실행목표(Milestone)를 관리자가 확인합니다."}
            </p>
          </div>
        </section>
        <aside className="purchase-panel panel">
          <span>{en ? "Service price" : "서비스 금액"}</span>
          <strong>{en ? `₩${won.format(service.price)}` : `${won.format(service.price)}원`}</strong>
          <small>
            {en ? `${service.durationLabel} · Platform fees are deducted from the expert payout.` : `${service.durationLabel} · 플랫폼 수수료는 전문가 정산금에서 공제됩니다.`}
          </small>
          <div className="purchase-summary">
            <span>
                <small>{en ? "Expert" : "전문가"}</small>
              <strong>{service.providerName}</strong>
            </span>
            <span>
                <small>{en ? "Type" : "유형"}</small>
              <strong>
                {service.type === "mentoring" ? (en ? "Mentoring" : "멘토링") : (en ? "Consulting" : "컨설팅")}
              </strong>
            </span>
            <span>
                <small>{en ? "Duration" : "제공기간"}</small>
              <strong>{service.durationLabel}</strong>
            </span>
          </div>
          <CheckoutButton
            serviceId={service.id}
            title={service.title}
            amount={service.price}
            type={service.type}
            availableSlots={service.availableSlots}
            locale={locale}
          />
        </aside>
      </div>
    </main>
  );
}
