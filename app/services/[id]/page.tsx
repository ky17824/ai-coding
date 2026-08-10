import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { CheckoutButton } from "@/components/checkout-button";
import { SAMPLE_SERVICES } from "@/lib/service-data";
import { getPublishedService } from "@/lib/services";

const won = new Intl.NumberFormat("ko-KR");

export function generateStaticParams() {
  return SAMPLE_SERVICES.map((service) => ({ id: service.id }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const service = await getPublishedService(id);
  return { title: service?.title ?? "전문가 서비스" };
}

export default async function ServiceDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = await getPublishedService(id);
  if (!service || !service.approved) notFound();

  return (
    <main className="app-page">
      <SiteHeader compact />
      <div className="app-container service-detail">
        <section className="service-main panel">
          <span className={`pill pill--${service.type}`}>
            {service.type === "mentoring" ? "1:1 멘토링" : "컨설팅 패키지"}
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
              ★ {service.rating} ({service.reviewCount}개 후기)
            </span>
          </div>
          <div className="detail-block">
            <h2>서비스 결과물</h2>
            <ul>
              {service.deliverables.map((deliverable) => (
                <li key={deliverable}>{deliverable}</li>
              ))}
            </ul>
          </div>
          <div className="detail-block">
            <h2>진행 방식</h2>
            <ol>
              <li>결제하시면 목표와 보유 자료를 사전 질문지로 정리해 드립니다.</li>
              <li>
                {service.type === "mentoring"
                  ? `${service.durationLabel} 화상 세션을 진행합니다.`
                  : `${service.durationLabel} 동안 합의된 단계별 실행목표(Milestone)를 수행합니다.`}
              </li>
              <li>합의하신 결과물을 확인하신 뒤 거래를 마칩니다.</li>
            </ol>
          </div>
          <div className="detail-block">
            <h2>취소·분쟁 정책</h2>
            <p>
              서비스 시작 전에는 전액 환불됩니다. 시작 이후의 취소·노쇼·품질
              분쟁은 자동 판정하지 않으며, 주문 기록과 단계별 실행목표(Milestone)를 관리자가
              확인합니다.
            </p>
          </div>
        </section>
        <aside className="purchase-panel panel">
          <span>서비스 금액</span>
          <strong>{won.format(service.price)}원</strong>
          <small>
            {service.durationLabel} · 플랫폼 수수료는 전문가 정산금에서
            공제됩니다.
          </small>
          <div className="purchase-summary">
            <span>
              <small>전문가</small>
              <strong>{service.providerName}</strong>
            </span>
            <span>
              <small>유형</small>
              <strong>
                {service.type === "mentoring" ? "멘토링" : "컨설팅"}
              </strong>
            </span>
            <span>
              <small>제공기간</small>
              <strong>{service.durationLabel}</strong>
            </span>
          </div>
          <CheckoutButton
            serviceId={service.id}
            title={service.title}
            amount={service.price}
            type={service.type}
            availableSlots={service.availableSlots}
          />
        </aside>
      </div>
    </main>
  );
}
