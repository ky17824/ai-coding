import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { ServiceCard } from "@/components/service-card";
import { getPublishedServices } from "@/lib/services";
import { getRequestLocale } from "@/lib/i18n-server";
import { aiExpertServicesEnabled } from "@/lib/ai-agent-services";

export async function generateMetadata(): Promise<Metadata> {
  const en = (await getRequestLocale()) === "en";
  return { title: aiExpertServicesEnabled() ? (en ? "AI Expert Services" : "AI 전문가 서비스") : (en ? "Expert Services" : "전문가 서비스") };
}

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ tag?: string }> }) {
  const locale = await getRequestLocale();
  const services = await getPublishedServices(locale);
  const requestedTag = (await searchParams).tag?.trim() ?? "";
  const matched = requestedTag ? services.filter((service) => service.tags.includes(requestedTag)) : services;
  const visibleServices = matched.length ? matched : services;
  const en = locale === "en";
  const aiEnabled = aiExpertServicesEnabled();

  return (
    <main className="app-page">
      <SiteHeader compact locale={locale} />
      <div className="app-container">
        <span className="page-kicker">{aiEnabled ? "AI EXPERT SERVICES" : "VERIFIED EXPERTS"}</span>
        <h1 className="page-title">{requestedTag && matched.length
          ? aiEnabled ? (en ? "AI experts matched to this action" : "이 실행에 맞는 AI 전문가") : (en ? "Vetted experts for this action" : "이 실행에 맞는 검증된 전문가")
          : aiEnabled ? (en ? "Turn readiness gaps into expert work" : "준비도 격차를 AI 전문가 업무로 전환하세요") : (en ? "Take your next action with vetted experts" : "검증된 전문가와 다음 액션을 실행하세요")}</h1>
        <p className="page-description">
          {aiEnabled ? (en ? "After payment, GPT-5.6 Sol reuses your readiness answers, asks only material follow-ups, and produces an evidence-led report and action plan." : "결제 후 GPT-5.6 Sol이 준비도 답변을 재사용하고 결과를 바꾸는 정보만 추가로 확인한 뒤 근거 기반 보고서와 실행계획을 만듭니다.") : (en ? "Only standardized services from admin-approved mentors and consultants are listed." : "관리자 승인을 거친 멘토·컨설턴트의 표준화된 서비스만 공개됩니다.")}
        </p>
        {aiEnabled && <div className="ai-service-boundary notice-banner">
          <strong>{en ? "AI completes research, calculations, drafts and plans." : "AI가 조사·계산·초안·계획을 완성합니다."}</strong>
          <span>{en ? "Legal, tax, regulatory, contract effectiveness, actual interviews and partner intent remain marked for human verification." : "법률·세무·규제·계약 효력, 실제 인터뷰와 파트너 의향은 사람 검증 필요로 표시합니다."}</span>
        </div>}
        {requestedTag && <p className="notice-banner" role="status">{matched.length
          ? en ? `${matched.length} matching service${matched.length === 1 ? "" : "s"} found.` : `관련 ${aiEnabled ? "AI 전문가 " : ""}서비스 ${matched.length}개를 찾았습니다.`
          : en ? "No exact match is available, so the full catalog is shown." : "정확히 일치하는 상품이 없어 전체 AI 전문가 서비스를 안내합니다."}</p>}
        {!aiEnabled && <div className="filter-row"><button className="active" type="button">{en ? "All" : "전체"}</button><button type="button">{en ? "1:1 Mentoring" : "1:1 멘토링"}</button><button type="button">{en ? "Consulting Package" : "컨설팅 패키지"}</button></div>}
        <div className="service-grid">
          {visibleServices.map((service) => <ServiceCard key={service.id} service={service} locale={locale} />)}
        </div>
      </div>
    </main>
  );
}
