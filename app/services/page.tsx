import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { ServiceCard } from "@/components/service-card";
import { getPublishedServices } from "@/lib/services";
import { getRequestLocale } from "@/lib/i18n-server";
import { aiExpertServicesEnabled } from "@/lib/ai-agent-services";
import { CATALOG_AREAS } from "@/lib/catalog/products";
import { AREA_LABEL } from "@/lib/catalog/copy";
import { localizedPath } from "@/lib/i18n";
import Link from "next/link";

export async function generateMetadata(): Promise<Metadata> {
  const en = (await getRequestLocale()) === "en";
  return { title: aiExpertServicesEnabled() ? (en ? "AI Expert Services" : "AI 전문가 서비스") : (en ? "Expert Services" : "전문가 서비스") };
}

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ tag?: string; area?: string }> }) {
  const locale = await getRequestLocale();
  const services = await getPublishedServices(locale);
  const params = await searchParams;
  const requestedTag = params.tag?.trim() ?? "";
  const requestedArea = params.area?.trim() ?? "";
  const byArea = requestedArea ? services.filter((service) => service.area === requestedArea) : services;
  const matched = requestedTag ? byArea.filter((service) => service.tags.includes(requestedTag)) : byArea;
  const visibleServices = matched.length ? matched : (requestedArea ? byArea : services);
  const en = locale === "en";
  const aiEnabled = aiExpertServicesEnabled();
  const specialists = visibleServices.filter((service) => service.productKind === "specialist");
  const packages = visibleServices.filter((service) => service.productKind === "package");

  return (
    <main className="app-page">
      <SiteHeader compact locale={locale} />
      <div className="app-container">
        <span className="page-kicker">{aiEnabled ? "AI EXPERT SERVICES" : "VERIFIED EXPERTS"}</span>
        <h1 className="page-title">{requestedTag && matched.length
          ? aiEnabled ? (en ? "AI experts matched to this action" : "이 실행에 맞는 AI 전문가") : (en ? "Vetted experts for this action" : "이 실행에 맞는 검증된 전문가")
          : aiEnabled ? (en ? "AI experts fill the gaps found in your assessment" : "진단에서 부족했던 부분을 AI 전문가가 채웁니다") : (en ? "Take your next action with vetted experts" : "검증된 전문가와 다음 액션을 실행하세요")}</h1>
        <p className="page-description">
          {aiEnabled ? (en ? "Your saved readiness answers carry over. After a few material follow-ups, a frontier model produces a sourced report and action plan." : "이미 입력한 준비도 진단 답변을 그대로 이어받습니다. 결론이 달라질 내용만 몇 가지 더 확인한 뒤, 출처를 밝힌 보고서와 실행계획을 만들어 드립니다.") : (en ? "Only standardized services from admin-approved mentors and consultants are listed." : "관리자 승인을 거친 멘토·컨설턴트의 표준화된 서비스만 공개됩니다.")}
        </p>
        {aiEnabled && <p className="notice-banner" role="status">{en ? "In-depth Market Research is available now; the remaining services launch in late August." : "현재 심층 시장 조사를 먼저 제공하며, 나머지 서비스는 8월 말 순차 출시합니다."}</p>}
        {requestedTag && <p className="notice-banner" role="status">{matched.length
          ? en ? `${matched.length} matching service${matched.length === 1 ? "" : "s"} found.` : `관련 ${aiEnabled ? "AI 전문가 " : ""}서비스 ${matched.length}개를 찾았습니다.`
          : en ? "No exact match is available, so the full catalog is shown." : "딱 맞는 서비스가 없어 전체 목록을 보여 드립니다."}</p>}
        {aiEnabled && <nav className="filter-row filter-row--areas" aria-label={en ? "Filter by readiness area" : "준비도 영역 필터"}>
          <Link href={localizedPath("/services", locale)} className={requestedArea ? undefined : "active"}>{en ? "All" : "전체"}</Link>
          {CATALOG_AREAS.map((area) => (
            <Link key={area} href={localizedPath(`/services?area=${encodeURIComponent(area)}`, locale)} className={requestedArea === area ? "active" : undefined}>{AREA_LABEL[area]?.[locale] ?? area}</Link>
          ))}
        </nav>}
        {!aiEnabled && <div className="filter-row"><button className="active" type="button">{en ? "All" : "전체"}</button><button type="button">{en ? "1:1 Mentoring" : "1:1 멘토링"}</button><button type="button">{en ? "Consulting Package" : "컨설팅 패키지"}</button></div>}
        {aiEnabled ? <>
          {specialists.length > 0 && <section className="service-catalog-section" aria-labelledby="specialist-services-title">
            <h2 id="specialist-services-title">{en ? "Choose only what you need" : "필요한 항목만 골라 진행하세요"}</h2>
            <div className="ai-service-boundary notice-banner">
              <strong>{en ? "AI handles research, calculations, and first drafts." : "조사와 계산, 초안 작성까지는 AI가 맡습니다."}</strong>
              <span>{en ? "Legal, tax and regulatory interpretation, contract effectiveness, actual interviews, and partner intent are marked for expert verification." : "법률·세무·규제 해석과 계약의 효력, 실제 인터뷰와 파트너 의향은 사람이 확인해야 할 항목으로 따로 표시합니다."}</span>
        </div>
            <div className="service-grid">{specialists.map((service) => <ServiceCard key={service.id} service={service} locale={locale} />)}</div>
          </section>}
          {packages.length > 0 && <section className="service-catalog-section" aria-labelledby="package-services-title">
            <h2 id="package-services-title">{en ? "Handle several needs together" : "여러 항목을 묶어 한 번에 진행하세요"}</h2>
            <div className="service-grid">{packages.map((service) => <ServiceCard key={service.id} service={service} locale={locale} />)}</div>
          </section>}
        </> : <div className="service-grid">{visibleServices.map((service) => <ServiceCard key={service.id} service={service} locale={locale} />)}</div>}
      </div>
    </main>
  );
}
