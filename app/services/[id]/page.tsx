import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { CheckoutButton } from "@/components/checkout-button";
import { getPublishedService } from "@/lib/services";
import { getAiPriceWithVat } from "@/lib/ai-agent-report";
import { getRequestLocale } from "@/lib/i18n-server";
import { TIER_FIRST_STEP } from "@/lib/catalog";
import { checkAdminBetaAccess } from "@/lib/admin-ai-beta";
import { createSupabaseServerClient, requireUser } from "@/lib/supabase/server";

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
  // 자격 판정은 서버에서만 한다. 허용 목록은 클라이언트로 나가지 않고, 결과 boolean만 전달한다.
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data: viewer } = user && supabase
    ? await supabase.from("profiles").select("role,deleted_at").eq("id", user.id).maybeSingle()
    : { data: null };
  const isBeta = Boolean(user) && checkAdminBetaAccess({
    userId: user!.id,
    profile: viewer ? { role: viewer.role, deletedAt: viewer.deleted_at } : null,
    isAiProduct: isAi
  }).eligible;

  return (
    <main className="app-page">
      <SiteHeader compact locale={locale} />
      <div className="app-container service-detail">
        <section className="service-main panel">
          <span className={`pill pill--${service.type}${service.tier ? ` pill--tier-${service.tier.toLowerCase()}` : ""}`}>{isAi ? (service.tierLabel ?? (service.productKind === "package" ? (en ? "AI Package" : "AI 패키지") : (en ? "AI Specialist" : "AI 전문가"))) : service.type === "mentoring" ? (en ? "1:1 Mentoring" : "1:1 멘토링") : (en ? "Consulting Package" : "컨설팅 패키지")}</span>
          <h1>{service.title}</h1>
          <p className="service-lead">{service.description}</p>
          <div className="provider-profile">
            <span className="avatar">AI</span>
            <span><strong>{service.providerName}</strong><small>{service.providerTitle}</small></span>
            <span className="service-model">{isAi ? (en ? "Evidence-led · User-controlled" : "근거 기반 · 사용자 확인") : `★ ${service.rating} (${service.reviewCount})`}</span>
          </div>
          <div className="detail-block"><h2>{en ? "Deliverables" : "결과물"}</h2><ul>{service.deliverables.map((item) => <li key={item}>{item}</li>)}</ul></div>
          <div className="detail-block"><h2>{en ? "How it works" : "진행 방식"}</h2>{isAi ? <ol>
            <li>{service.tier ? TIER_FIRST_STEP[service.tier][locale] : (en ? "Your saved readiness answers are loaded." : "저장된 준비도 진단 답변을 불러옵니다.")}</li>
            <li>{en ? "The AI asks up to two material follow-up rounds. Unknown answers become labelled analog assumptions, not facts." : "AI는 결과를 바꾸는 질문만 최대 2회 묻습니다. 모름 응답은 사실이 아니라 유사사례 가정으로 표시합니다."}</li>
            <li>{en ? "After you review assumptions, the frontier model produces a report and action plan with traceable sources." : "가정을 확인하면 프론티어 모델이 출처가 연결된 보고서와 실행계획을 만듭니다."}</li>
          </ol> : <ol><li>{en ? "After payment, goals and materials are organized in a questionnaire." : "결제 후 목표와 보유 자료를 사전 질문지로 정리합니다."}</li><li>{service.type === "mentoring" ? (en ? `A ${service.durationLabel} video session is held.` : `${service.durationLabel} 화상 세션을 진행합니다.`) : (en ? `Agreed milestones are delivered over ${service.durationLabel}.` : `${service.durationLabel} 동안 합의된 단계별 실행목표를 수행합니다.`)}</li><li>{en ? "The engagement closes after deliverable confirmation." : "결과물을 확인한 뒤 거래를 마칩니다."}</li></ol>}</div>
          {isAi && <><div className="detail-block"><h2>{en ? "Required inputs" : "필요정보"}</h2><ul>{service.requiredInputs?.map((item) => <li key={item}>{item}</li>)}</ul></div><div className="detail-block"><h2>{en ? "Limits of this service" : "이 서비스의 한계"}</h2><ul>{service.humanVerification?.map((item) => <li key={item}>{item}</li>)}</ul></div></>}
          <div className="detail-block"><h2>{en ? "Cancellation & refunds" : "취소·환불 정책"}</h2><ul>{(service.refundPolicy ?? (en
            ? ["A full refund is available before the service begins.", "Requests after service start are reviewed by an administrator."]
            : ["서비스 시작 전에는 전액 환불됩니다.", "시작 후 요청은 관리자가 주문 기록을 확인합니다."])).map((item) => <li key={item}>{item}</li>)}</ul></div>
        </section>
        <aside className="purchase-panel panel">
          {isBeta && <p className="notice-banner" role="status">
            <strong>{en ? "Admin beta test" : "관리자 베타 테스트"}</strong>
            <span>{en ? "This runs the real AI service without payment. The model, research, files, clarifications, report, and cost recording are identical to a paid order." : "결제 없이 실제 AI 실행 환경을 테스트합니다. 모델·검색·파일·추가질문·보고서·비용 기록은 운영과 동일합니다."}</span>
          </p>}
          <span>{isBeta ? (en ? "Charged to you" : "관리자 테스트 청구액") : (en ? "Service price" : "서비스 금액")}</span>
          <strong>{isBeta ? (en ? "₩0" : "0원") : en ? `₩${won.format(service.price)}` : `${won.format(service.price)}원`}</strong>
          <small>{isBeta
            ? (en ? `List price ₩${won.format(service.price)} · no checkout window opens` : `서비스 기준가 ${won.format(service.price)}원 · 결제창은 열리지 않습니다`)
            : isAi && amounts ? (en ? `VAT ₩${won.format(amounts.vatAmountKrw)} · Total ₩${won.format(amounts.grossAmountKrw)}` : `부가세 ${won.format(amounts.vatAmountKrw)}원 · 결제금액 ${won.format(amounts.grossAmountKrw)}원`) : service.durationLabel}</small>
          <div className="purchase-summary">
            <span><small>{en ? "Provider" : "제공자"}</small><strong>{service.providerName}</strong></span>
            <span><small>{en ? "Type" : "유형"}</small><strong>{isAi ? (service.productKind === "package" ? (en ? "AI package" : "AI 패키지") : (en ? "AI specialist" : "AI 전문가")) : service.type === "mentoring" ? (en ? "Mentoring" : "멘토링") : (en ? "Consulting" : "컨설팅")}</strong></span>
            <span><small>{en ? (isAi ? "Included" : "Duration") : (isAi ? "포함" : "제공기간")}</small><strong>{isAi ? (en ? "2 clarifications · 1 correction" : "추가질문 2회 · 사실 정정 1회") : service.durationLabel}</strong></span>
          </div>
          <CheckoutButton serviceId={service.id} title={service.title} amount={isBeta ? 0 : amounts?.grossAmountKrw ?? service.price} type={service.type} availableSlots={service.availableSlots} locale={locale} betaMode={isBeta} />
        </aside>
      </div>
    </main>
  );
}
