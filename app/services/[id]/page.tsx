import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { CheckoutButton } from "@/components/checkout-button";
import { getPublishedService } from "@/lib/services";
import { getAiPriceWithVat } from "@/lib/ai-agent-report";
import { getRequestLocale } from "@/lib/i18n-server";

const won = new Intl.NumberFormat("ko-KR");

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const locale = await getRequestLocale();
  const service = await getPublishedService(id, locale);
  return { title: service?.title ?? (locale === "en" ? "Expert Service" : "전문가 서비스") };
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getRequestLocale();
  const service = await getPublishedService(id, locale);
  const en = locale === "en";
  if (!service || !service.approved) notFound();
  const isAi = service.type === "ai_agent";
  const amounts = isAi ? getAiPriceWithVat(service.price) : null;

  return (
    <main className="app-page">
      <SiteHeader compact locale={locale} />
      <div className="app-container service-detail">
        <section className="service-main panel">
          <span className={`pill pill--${service.type}`}>{isAi ? (service.productKind === "package" ? (en ? "AI Expert Package" : "AI 전문가 패키지") : (en ? "AI Specialist" : "AI 전문가")) : service.type === "mentoring" ? (en ? "1:1 Mentoring" : "1:1 멘토링") : (en ? "Consulting Package" : "컨설팅 패키지")}</span>
          <h1>{service.title}</h1>
          <p className="service-lead">{service.description}</p>
          <div className="provider-profile">
            <span className="avatar">AI</span>
            <span><strong>{service.providerName}</strong><small>{service.providerTitle}</small></span>
            <span className="service-model">{isAi ? (en ? "Evidence-led · User-controlled" : "근거 기반 · 사용자 확인") : `★ ${service.rating} (${service.reviewCount})`}</span>
          </div>
          <div className="detail-block"><h2>{en ? "Deliverables" : "결과물"}</h2><ul>{service.deliverables.map((item) => <li key={item}>{item}</li>)}</ul></div>
          <div className="detail-block"><h2>{en ? "How it works" : "진행 방식"}</h2>{isAi ? <ol>
            <li>{en ? "Your saved readiness answers are loaded and you add the target country, customer, offering, evidence, and constraints." : "저장된 준비도 답변을 불러오고 목표국가·고객·제품·증거·제약을 보완합니다."}</li>
            <li>{en ? "The AI asks up to two material follow-up rounds. Unknown answers become labelled analog assumptions, not facts." : "AI는 결과를 바꾸는 질문만 최대 2회 묻습니다. 모름 응답은 사실이 아니라 유사사례 가정으로 표시합니다."}</li>
            <li>{en ? "After you review assumptions, GPT-5.6 Sol produces a report and action plan with traceable sources." : "가정을 확인하면 GPT-5.6 Sol이 출처가 연결된 보고서와 실행계획을 만듭니다."}</li>
          </ol> : <ol><li>{en ? "After payment, goals and materials are organized in a questionnaire." : "결제 후 목표와 보유 자료를 사전 질문지로 정리합니다."}</li><li>{service.type === "mentoring" ? (en ? `A ${service.durationLabel} video session is held.` : `${service.durationLabel} 화상 세션을 진행합니다.`) : (en ? `Agreed milestones are delivered over ${service.durationLabel}.` : `${service.durationLabel} 동안 합의된 단계별 실행목표를 수행합니다.`)}</li><li>{en ? "The engagement closes after deliverable confirmation." : "결과물을 확인한 뒤 거래를 마칩니다."}</li></ol>}</div>
          {isAi && <><div className="detail-block"><h2>{en ? "Required inputs" : "필요정보"}</h2><ul>{service.requiredInputs?.map((item) => <li key={item}>{item}</li>)}</ul></div><div className="detail-block"><h2>{en ? "Expert verification" : "전문가 검증"}</h2><ul>{service.humanVerification?.map((item) => <li key={item}>{item}</li>)}</ul></div></>}
          <div className="detail-block"><h2>{en ? "Cancellation & refunds" : "취소·환불 정책"}</h2><p>{isAi ? (en ? "A full refund is available before report generation begins. Requests after generation starts are reviewed using the order and generation record." : "보고서 생성 시작 전에는 전액 환불됩니다. 생성 시작 후 요청은 주문·생성 기록을 기준으로 검토합니다.") : (en ? "A full refund is available before the service begins. Requests after service start are reviewed by an administrator." : "서비스 시작 전에는 전액 환불됩니다. 시작 후 요청은 관리자가 주문 기록을 확인합니다.")}</p></div>
        </section>
        <aside className="purchase-panel panel">
          <span>{en ? "Service price" : "서비스 금액"}</span>
          <strong>{en ? `₩${won.format(service.price)}` : `${won.format(service.price)}원`}</strong>
          <small>{isAi && amounts ? (en ? `VAT ₩${won.format(amounts.vatAmountKrw)} · Total ₩${won.format(amounts.grossAmountKrw)}` : `부가세 ${won.format(amounts.vatAmountKrw)}원 · 결제금액 ${won.format(amounts.grossAmountKrw)}원`) : service.durationLabel}</small>
          <div className="purchase-summary">
            <span><small>{en ? "Provider" : "제공자"}</small><strong>{service.providerName}</strong></span>
            <span><small>{en ? "Type" : "유형"}</small><strong>{isAi ? (service.productKind === "package" ? (en ? "AI package" : "AI 패키지") : (en ? "AI specialist" : "AI 전문가")) : service.type === "mentoring" ? (en ? "Mentoring" : "멘토링") : (en ? "Consulting" : "컨설팅")}</strong></span>
            <span><small>{en ? (isAi ? "Included" : "Duration") : (isAi ? "포함" : "제공기간")}</small><strong>{isAi ? (en ? "2 clarifications · 1 correction" : "추가질문 2회 · 사실 정정 1회") : service.durationLabel}</strong></span>
          </div>
          <CheckoutButton serviceId={service.id} title={service.title} amount={amounts?.grossAmountKrw ?? service.price} type={service.type} availableSlots={service.availableSlots} locale={locale} />
        </aside>
      </div>
    </main>
  );
}
