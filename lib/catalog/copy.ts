import type { Copy, CopyList, Tier } from "./types";

export interface ProductCopy {
  title: Copy;
  description: Copy;
  deliverables: CopyList;
}

/** 상품별 고객 화면 문구. 코드 로직과 분리되어 있어 비개발자도 이 파일만 검토하면 된다. */
export const PRODUCT_COPY: Record<string, ProductCopy> = {
  "ai-market-intelligence": {
    title: { ko: "심층 시장조사", en: "In-depth Market Research" },
    description: { ko: "어느 나라의 어떤 고객을 먼저 공략할지, 그 시장이 얼마나 큰지(TAM·SAM·SOM), 누가 이미 경쟁하고 있는지를 출처와 함께 정리합니다.", en: "Research target markets, ICP, TAM, SAM, SOM, beachhead market, and competition with traceable evidence." },
    deliverables: {
      ko: ["후보 국가와 목표 고객 비교", "시장규모 추정: 하향식·상향식 TAM·SAM·SOM과 교두보 시장 (최소·기준·최대)", "경쟁 구도와 근거 목록"],
      en: ["Market and ICP comparison", "In-depth Top-Down and Bottom-Up TAM, SAM, SOM, and Beachhead Market sizing (low/base/high)", "Competition and evidence ledger"]
    }
  },
  "ai-customer-validation": {
    title: { ko: "고객 검증·실증 시험", en: "Customer Validation" },
    description: { ko: "지금 가진 고객 반응이 근거로 충분한지 점검하고, 인터뷰와 유료 시범판매를 어떤 기준으로 성공·중단할지 설계합니다.", en: "Audit customer evidence and design interviews and paid pilots with KPIs and stop criteria." },
    deliverables: {
      ko: ["고객 근거 점검", "인터뷰·유료 시범판매 설계", "성과 지표와 중단 기준"],
      en: ["Customer evidence audit", "Interview and paid-pilot design", "KPIs and stop criteria"]
    }
  },
  "ai-local-bmc": {
    title: { ko: "현지화 사업모델 설계", en: "Local Business Model Design" },
    description: { ko: "현지에 맞는 사업모델을 9개 항목으로 다시 짜고, 거래 방식과 가격·결제·고객 경험 가운데 무엇을 그대로 두고 무엇을 바꾸거나 시험할지 정리합니다.", en: "Design a local business model and the keep/change/test backlog across practices, price, payment, and customer journey." },
    deliverables: {
      ko: ["현지 사업모델 9개 항목", "현지화 진단 6개 축(BMLC·LPA)", "유지·변경·시험 항목 목록"],
      en: ["Nine-block local BMC", "BMLC and six LPA axes", "Keep/change/test backlog"]
    }
  },
  "ai-entry-requirements": {
    title: { ko: "규제 요건 조사", en: "Regulatory Requirements Research" },
    description: { ko: "정부·기관의 공식 자료를 근거로 어떤 인허가·인증·표시가 필요한지, 아직 확인되지 않은 위험은 무엇인지 정리합니다. 품목 분류의 확정은 자격자 검토가 필요합니다.", en: "Use official sources to map required approvals, certification, labelling, and unresolved risks. Confirming the product classification itself requires a licensed expert." },
    deliverables: {
      ko: ["공식 자료 기준 요건표", "미확인 위험과 재확인 시점", "분류 확정에 필요한 확인 항목"],
      en: ["Official-source requirements", "Open risks and review dates", "What a licensed expert still needs to confirm"]
    }
  },
  "ai-partner-research": {
    title: { ko: "파트너·생태계 조사", en: "Partner & Ecosystem Research" },
    description: { ko: "도시와 산업 거점별로 만나야 할 곳과 파트너 후보를 찾고, 무엇을 확인해야 하는지, 한 곳에 의존하면 어떤 위험이 있는지까지 정리합니다.", en: "Map city and cluster stakeholders, partner candidates, validation questions, and dependency risks." },
    deliverables: {
      ko: ["생태계 지도", "파트너 후보와 검증 항목", "접촉 시 질문과 대체 경로"],
      en: ["Ecosystem map", "Partner shortlist and validation", "Outreach questions and alternatives"]
    }
  },
  "ai-tce-finance": {
    title: { ko: "진입 비용·자금 계획", en: "Entry Cost & Funding Plan" },
    description: { ko: "진출에 드는 총비용과 자금이 버티는 기간, 최소한으로 시작할 범위를 숫자로 계산하고, 어느 지점에서 예산을 다시 판단할지와 공급 여력이 충분한지도 함께 봅니다.", en: "Quantify total cost of entry, runway, minimum scope, budget gates, and capacity risks." },
    deliverables: {
      ko: ["총 진입비용과 자금 유지 기간", "시나리오 손익", "예산 재검토 시점과 공급 병목"],
      en: ["TCE and runway", "Scenario economics", "Budget gates and capacity bottlenecks"]
    }
  },
  "ai-gtm-operations": {
    title: { ko: "GTM 실행·현지 운영", en: "GTM Execution & Local Operations" },
    description: { ko: "어떤 방식으로 팔지 정하고, 누가 무엇을 책임지는지와 30·60·90일 계획, 성과 지표, 되돌릴 기준까지 바로 쓸 수 있는 문서로 만듭니다.", en: "Turn evidence into a GTM motion, RACI, KPIs, 30/60/90-day plan, and rollback criteria." },
    deliverables: {
      ko: ["한 장짜리 GTM 요약과 성과 지표 체계", "역할·책임 분담표(RACI)와 권한표", "30·60·90일 계획"],
      en: ["One-page GTM and KPI tree", "RACI and authority map", "30/60/90-day plan"]
    }
  },
  "pkg-feasibility": {
    title: { ko: "진출 가능성 진단", en: "Market Entry Feasibility" },
    description: { ko: "시장 규모와 규제 요건, 파트너 후보를 한 번에 조사해 이 나라에 들어갈 만한지부터 판단합니다.", en: "Research market size, regulatory requirements, and partner candidates together to judge whether this market is worth entering." },
    deliverables: {
      ko: ["시장규모와 경쟁 구도", "공식 자료 기준 규제 요건", "파트너 후보와 접촉 질문"],
      en: ["Market sizing and competition", "Official-source regulatory requirements", "Partner candidates and outreach questions"]
    }
  },
  "pkg-entry-design": {
    title: { ko: "진출 설계", en: "Market Entry Design" },
    description: { ko: "AI가 할 수 있는 조사와 설계를 모두 묶어, 어디에 무엇을 가지고 들어가 어떻게 팔지까지 한 번에 정리합니다.", en: "Bundle every AI-completable research and design step into one plan: where to enter, with what, and how to sell." },
    deliverables: {
      ko: ["시장·규제·파트너 조사 일체", "현지 사업모델과 고객 검증 설계", "진입 비용과 30·60·90일 실행계획"],
      en: ["Market, regulatory, and partner research", "Local business model and validation design", "Entry cost and a 30/60/90-day plan"]
    }
  },
  "hx-classification": {
    title: { ko: "제품 분류·인허가 확정", en: "Product Classification & Approval Sign-off" },
    description: { ko: "관세사·변리사가 AI 조사 결과를 검토해 품목 분류와 필요한 인허가를 확정합니다.", en: "A licensed customs or patent attorney reviews the AI research and confirms the classification and required approvals." },
    deliverables: { ko: ["확정된 품목 분류", "필요 인허가 목록과 근거", "자격자 검토 의견"], en: ["Confirmed classification", "Required approvals with basis", "Licensed expert opinion"] }
  },
  "hx-classification-plus": {
    title: { ko: "제품 분류·인허가 확정 (심화)", en: "Product Classification & Approval Sign-off (Extended)" },
    description: { ko: "품목이 여러 갈래이거나 규제가 겹치는 경우, 자격자가 시간을 더 들여 대안까지 검토합니다.", en: "For products with competing classifications or overlapping rules, the expert spends more time and reviews alternatives." },
    deliverables: { ko: ["확정된 품목 분류와 대안 검토", "필요 인허가 목록과 근거", "자격자 검토 의견"], en: ["Confirmed classification with alternatives", "Required approvals with basis", "Licensed expert opinion"] }
  },
  "hx-gtm-review": {
    title: { ko: "GTM 실행계획 검토·코칭", en: "GTM Plan Review & Coaching" },
    description: { ko: "현장에서 GTM을 실행해 본 전문가가 계획의 현실성을 점검하고 무엇을 먼저 할지 함께 정합니다.", en: "An operator who has run GTM in the field checks whether the plan is realistic and helps set the first moves." },
    deliverables: { ko: ["실행 가능성 검토 의견", "우선순위 조정안", "1시간 코칭 세션"], en: ["Feasibility review", "Reprioritized plan", "One-hour coaching session"] }
  },
  "hx-partner-verify": {
    title: { ko: "파트너 실재·평판 검증", en: "Partner Verification" },
    description: { ko: "현지 전문가가 후보 파트너가 실제로 존재하고 거래할 만한 곳인지 직접 확인합니다.", en: "A local expert verifies that candidate partners actually exist and are worth dealing with." },
    deliverables: { ko: ["후보별 실재 확인 결과", "평판·거래 이력", "거래 시 유의사항"], en: ["Existence check per candidate", "Reputation and track record", "What to watch for"] }
  },
  "hx-partner-intro": {
    title: { ko: "파트너 접촉·소개", en: "Partner Outreach & Introduction" },
    description: { ko: "현지 전문가가 후보 파트너에게 직접 접촉해 의향을 확인하고 자리를 연결합니다.", en: "A local expert contacts candidate partners directly, checks their intent, and makes the introduction." },
    deliverables: { ko: ["접촉 결과와 반응", "의향 확인된 후보", "첫 미팅 연결"], en: ["Outreach results", "Candidates with confirmed intent", "First meeting arranged"] }
  },
  "hx-interview": {
    title: { ko: "현지 고객 인터뷰 대행", en: "Local Customer Interviews" },
    description: { ko: "현지 전문가가 목표 고객을 직접 인터뷰하고 원문 그대로의 반응을 전달합니다.", en: "A local expert interviews target customers directly and reports what they actually said." },
    deliverables: { ko: ["인터뷰 기록", "고객 표현 그대로의 반응", "가설 검증 결과"], en: ["Interview transcripts", "Verbatim customer language", "Hypothesis results"] }
  },
  "hx-mentor-1h": {
    title: { ko: "멘토 상담 (1시간)", en: "Mentor Session (1 hour)" },
    description: { ko: "먼저 해외에 나가 본 창업자·실무자와 1시간 동안 지금 막힌 지점을 이야기합니다.", en: "One hour with a founder or operator who has already gone abroad, on whatever is blocking you now." },
    deliverables: { ko: ["1시간 상담", "논의 요약", "다음 액션 제안"], en: ["One-hour session", "Discussion summary", "Suggested next actions"] }
  },
  "hx-mentor-2h": {
    title: { ko: "멘토 상담 (2시간)", en: "Mentor Session (2 hours)" },
    description: { ko: "자료를 함께 보며 깊이 논의해야 할 때 쓰는 2시간 상담입니다.", en: "A two-hour session for when you need to go through documents together." },
    deliverables: { ko: ["2시간 상담", "자료 검토 의견", "다음 액션 제안"], en: ["Two-hour session", "Review of your materials", "Suggested next actions"] }
  }
};

export const REQUIRED_INPUTS: CopyList = {
  ko: ["목표 국가와 고객, 판매할 제품 또는 서비스", "관련 준비도 진단 답변과 지금 가진 근거", "제약 조건과 쓸 수 있는 자원, 목표 기한"],
  en: ["Target country, customer, and offering", "Relevant readiness answers and evidence", "Constraints, resources, and deadline"]
};

export const HUMAN_VERIFICATION: CopyList = {
  ko: ["법률·세무·규제 해석과 계약의 효력", "실제 인터뷰와 파트너 의향, 현지 관계"],
  en: ["Legal, tax, regulatory and contract effectiveness", "Actual interviews, partner intent and local relationships"]
};

export const PROVIDER: { name: Copy; title: Copy; duration: Copy } = {
  name: { ko: "Borderless AI 전문가", en: "Borderless AI Expert" },
  title: { ko: "근거 기반 분석", en: "Evidence-led analysis" },
  duration: { ko: "결제 후 즉시 시작", en: "Starts immediately after payment" }
};

/** 계층 배지. 카드 상단 pill 자리를 대체한다. */
export const TIER_BADGE: Record<Tier, Copy> = {
  A: { ko: "AI 전용", en: "AI only" },
  B: { ko: "AI + 내 정보", en: "AI + your input" },
  C: { ko: "전문가 검토", en: "Expert review" },
  D: { ko: "전문가 진행", en: "Expert-led" },
  M: { ko: "멘토", en: "Mentor" }
};

/** 화면 필터의 영역 라벨. products.ts의 `area` 값이 키다. */
export const AREA_LABEL: Record<string, Copy> = {
  "시장·경쟁": { ko: "시장·경쟁", en: "Market" },
  "고객 검증": { ko: "고객 검증", en: "Customer" },
  "현지화": { ko: "현지화", en: "Localization" },
  "규제": { ko: "규제", en: "Regulation" },
  "파트너": { ko: "파트너", en: "Partners" },
  "자금": { ko: "자금", en: "Funding" },
  "실행": { ko: "실행", en: "Execution" }
};
