import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { ServiceCard } from "@/components/service-card";
import { getPublishedServices } from "@/lib/services";
import { getRequestLocale } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getRequestLocale()) === "en" ? "Expert Services" : "전문가 서비스" };
}

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ tag?: string }> }) {
  const locale = await getRequestLocale();
  const services = await getPublishedServices(locale);
  const requestedTag = (await searchParams).tag?.trim() ?? "";
  const matchedServices = requestedTag
    ? services.filter((service) => service.tags.includes(requestedTag))
    : services;
  const visibleServices = matchedServices.length > 0 ? matchedServices : services;
  const en = locale === "en";
  return (
    <main className="app-page">
      <SiteHeader compact locale={locale} />
      <div className="app-container">
        <span className="page-kicker">VERIFIED EXPERTS</span>
        <h1 className="page-title">{requestedTag && matchedServices.length > 0
          ? en ? "Vetted experts for this action" : "이 실행에 맞는 검증된 전문가"
          : en ? "Take your next action with vetted experts" : "검증된 전문가와 다음 액션을 실행하세요"}</h1>
        <p className="page-description">
          {en ? "Only standardized services from admin-approved mentors and consultants are listed. Recommendations are matched to your readiness actions and areas of expertise." : "관리자 승인을 거친 멘토·컨설턴트의 표준화된 서비스만 공개됩니다. 추천 순서는 준비도 액션과 전문 분야의 일치도에 따라 정해집니다."}
        </p>
        {requestedTag && (
          <p className="notice-banner" role="status">
            {matchedServices.length > 0
              ? en ? `${matchedServices.length} matching service${matchedServices.length === 1 ? "" : "s"} found.` : `관련 서비스 ${matchedServices.length}개를 찾았습니다.`
              : en ? "No exact match is available yet, so all approved services are shown." : "현재 정확히 일치하는 전문가가 없어 전체 승인 서비스를 안내합니다."}
          </p>
        )}
        <div className="filter-row" aria-label={en ? "Service type filter" : "서비스 유형 필터"}>
          <button className="active" type="button">{en ? "All" : "전체"}</button>
          <button type="button">{en ? "1:1 Mentoring" : "1:1 멘토링"}</button>
          <button type="button">{en ? "Consulting Package" : "컨설팅 패키지"}</button>
        </div>
        <div className="service-grid">
          {visibleServices.map((service) => (
            <ServiceCard key={service.id} service={service} locale={locale} />
          ))}
        </div>
      </div>
    </main>
  );
}
