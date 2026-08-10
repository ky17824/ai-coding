import type { ServiceOffering } from "@/lib/types";

export const SAMPLE_SERVICES: ServiceOffering[] = [
  {
    id: "svc-unit-economics",
    providerName: "김서윤",
    providerTitle: "B2B SaaS 매출 운영(Revenue Operations) 파트너",
    type: "mentoring",
    title: "글로벌 확장 전 단위 경제성(Unit Economics) 점검",
    description:
      "현재 고객 데이터를 기준으로 고객 생애가치(Customer Lifetime Value) 대비 고객획득비용(Customer Acquisition Cost), 고객획득비용 회수기간(CAC Payback Period), 순매출유지율(Net Revenue Retention)의 계산 방식과 개선 우선순위를 함께 정리합니다.",
    price: 180000,
    durationLabel: "90분",
    tags: ["unit-economics", "gtm"],
    deliverables: ["핵심 지표 진단표", "90일 개선 우선순위"],
    approved: true,
    rating: 4.9,
    reviewCount: 18,
    availableSlots: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        startsAt: "2026-07-29T14:00:00+09:00",
        endsAt: "2026-07-29T15:30:00+09:00"
      },
      {
        id: "11111111-1111-4111-8111-111111111112",
        startsAt: "2026-07-31T10:00:00+09:00",
        endsAt: "2026-07-31T11:30:00+09:00"
      }
    ]
  },
  {
    id: "svc-market-validation",
    providerName: "박정민",
    providerTitle: "전 KOTRA 시장개척 PM",
    type: "consulting",
    title: "초기 집중시장(Beachhead Market) 검증 단기 집중 실행(Sprint)",
    description:
      "이상적 고객 프로필(Ideal Customer Profile)을 좁히고 상향식 시장규모 산정(Bottom-up Market Sizing), 고객 인터뷰, 자발적 수요 신호를 3주 동안 검증합니다.",
    price: 2200000,
    durationLabel: "3주",
    tags: ["market-validation"],
    deliverables: ["시장 우선순위표", "인터뷰 가이드", "상향식 시장규모 산정(Bottom-up Market Sizing)"],
    approved: true,
    rating: 4.8,
    reviewCount: 12
  },
  {
    id: "svc-leadership",
    providerName: "이현우",
    providerTitle: "글로벌 조직·전략 외부 자문가(Advisor)",
    type: "mentoring",
    title: "경영진 글로벌 진출 관계자 목표 합의(Stakeholder Alignment)",
    description:
      "2~3년 자원 계획과 본사·현지 의사결정 권한, 중단 기준을 한 장으로 합의하도록 돕습니다.",
    price: 240000,
    durationLabel: "90분",
    tags: ["leadership", "organization"],
    deliverables: ["리더십 합의 체크리스트", "권한 배분 초안"],
    approved: true,
    rating: 4.9,
    reviewCount: 9,
    availableSlots: [
      {
        id: "11111111-1111-4111-8111-111111111113",
        startsAt: "2026-07-30T16:00:00+09:00",
        endsAt: "2026-07-30T17:30:00+09:00"
      }
    ]
  },
  {
    id: "svc-compliance",
    providerName: "최유진",
    providerTitle: "글로벌 개인정보·보안 컨설턴트",
    type: "consulting",
    title: "글로벌 B2B 보안·법규 준수(Compliance) 차이 분석(Gap Analysis)",
    description:
      "목표 고객의 보안·개인정보·조달 요건과 현재 상태의 차이를 식별하고 실행 일정표(Roadmap)를 만듭니다.",
    price: 2800000,
    durationLabel: "4주",
    tags: ["compliance"],
    deliverables: ["요건 차이 분석(Gap Analysis)", "담당자·실행 일정표(Roadmap)", "전문가 검토 범위"],
    approved: true,
    rating: 4.7,
    reviewCount: 7
  },
  {
    id: "svc-gtm-motion",
    providerName: "정재훈",
    providerTitle: "글로벌 B2B GTM 리드",
    type: "consulting",
    title: "첫 글로벌 시장 시장진입 실행방식(GTM Motion) 설계",
    description:
      "가격과 구매 복잡도에 맞춰 주력 시장진입 실행방식(GTM Motion) 하나를 선택하고 검증 고객 전환 단계(Funnel)와 중단 기준을 설계합니다.",
    price: 1900000,
    durationLabel: "3주",
    tags: ["gtm", "market-validation"],
    deliverables: ["GTM 1페이지 캔버스", "실험 예정 목록(Experiment Backlog)", "최소 대시보드"],
    approved: true,
    rating: 4.9,
    reviewCount: 15
  },
  {
    id: "svc-funding",
    providerName: "한수민",
    providerTitle: "수출지원사업 전문 멘토",
    type: "mentoring",
    title: "수출바우처·글로벌 지원사업 매칭",
    description:
      "현재 기업 조건에 맞는 유효 공고만 선별하고 신청 전 보완할 증빙과 일정을 정리합니다.",
    price: 120000,
    durationLabel: "60분",
    tags: ["funding"],
    deliverables: ["지원사업 후보표", "신청 준비 체크리스트"],
    approved: true,
    rating: 4.8,
    reviewCount: 22,
    availableSlots: [
      {
        id: "11111111-1111-4111-8111-111111111114",
        startsAt: "2026-08-03T11:00:00+09:00",
        endsAt: "2026-08-03T12:00:00+09:00"
      }
    ]
  }
];

export function recommendServices(tags: string[], limit = 3) {
  const wanted = new Set(tags);
  return SAMPLE_SERVICES.filter(
    (service) =>
      service.approved && service.tags.some((tag) => wanted.has(tag))
  )
    .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
    .slice(0, limit);
}
