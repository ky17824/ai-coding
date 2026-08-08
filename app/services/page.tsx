import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { ServiceCard } from "@/components/service-card";
import { getPublishedServices } from "@/lib/services";

export const metadata: Metadata = { title: "전문가 서비스" };

export default async function ServicesPage() {
  const services = await getPublishedServices();
  return (
    <main className="app-page">
      <SiteHeader compact />
      <div className="app-container">
        <span className="page-kicker">VERIFIED EXPERTS</span>
        <h1 className="page-title">검증된 전문가와 다음 액션을 실행하세요</h1>
        <p className="page-description">
          관리자 승인을 거친 멘토·컨설턴트의 표준화된 서비스만 공개됩니다.
          추천 순서는 준비도 액션과 전문 분야의 일치도에 따라 정해집니다.
        </p>
        <div className="filter-row" aria-label="서비스 유형 필터">
          <button className="active" type="button">전체</button>
          <button type="button">1:1 멘토링</button>
          <button type="button">컨설팅 패키지</button>
        </div>
        {services.length > 0 ? (
          <div className="service-grid">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        ) : (
          <div className="empty-state panel">
            <strong>현재 공개된 전문가 서비스가 없습니다.</strong>
            <p>승인된 서비스가 등록되면 이곳에 표시됩니다.</p>
          </div>
        )}
      </div>
    </main>
  );
}
