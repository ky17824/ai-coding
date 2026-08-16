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
  "ai-market-entry-requirements": {
    title: { ko: "규제·진입 요건", en: "Regulatory & Entry Requirements" },
    description: { ko: "정부·기관의 공식 자료를 근거로 제품이 어떤 품목으로 분류될지, 어떤 인허가·인증·표시가 필요한지, 아직 확인되지 않은 위험은 무엇인지 정리합니다.", en: "Use official sources to map classification hypotheses, approvals, certification, labelling, and unresolved risks." },
    deliverables: {
      ko: ["제품 분류 가설", "공식 자료 기준 요건표", "미확인 위험과 재확인 시점"],
      en: ["Classification hypothesis", "Official-source requirements", "Open risks and review dates"]
    }
  },
  "ai-local-ecosystem": {
    title: { ko: "현지 생태계·네트워크", en: "Local Ecosystem & Network" },
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
  "ai-market-opportunity": {
    title: { ko: "시장 가능성 패키지", en: "Market Opportunity Package" },
    description: { ko: "시장 조사와 고객 검증을 묶어, 어디서 누구에게 무엇부터 검증할지 정합니다.", en: "Combine market intelligence and customer validation to decide where, for whom, and what to test." },
    deliverables: {
      ko: ["시장·경쟁 보고서", "목표 고객과 시장규모", "고객 검증 계획"],
      en: ["Market and competition report", "ICP and market sizing", "Customer validation plan"]
    }
  },
  "ai-local-entry": {
    title: { ko: "현지화·진입 패키지", en: "Localization & Entry Package" },
    description: { ko: "현지화와 규제 대응, 파트너 네트워크를 하나의 진출 설계로 묶어 드립니다.", en: "Integrate localization, regulatory requirements, and local networks into one entry design." },
    deliverables: {
      ko: ["현지 사업모델(Local BMC)", "진입 요건표", "생태계·파트너 지도"],
      en: ["Local BMC", "Entry requirements", "Ecosystem and partner map"]
    }
  },
  "ai-execution-plan": {
    title: { ko: "실행계획 패키지", en: "Execution Planning Package" },
    description: { ko: "자금과 인력 계획, 현지 운영 방식을 내부 보고와 결재에 바로 쓸 수 있는 실행계획으로 만듭니다.", en: "Turn financial capacity and local operations into an approvable execution plan." },
    deliverables: {
      ko: ["총 진입비용과 예산 재검토 시점", "역할·책임 분담표와 성과 지표", "30·60·90일 계획"],
      en: ["TCE and budget gates", "RACI and KPIs", "30/60/90-day plan"]
    }
  },
  "ai-comprehensive-entry": {
    title: { ko: "종합 진출 설계 패키지", en: "Comprehensive Market Entry Package" },
    description: { ko: "7개 AI 전문가의 결과를 서로 어긋나지 않게 맞춰, 경영진에게 보고할 하나의 실행 보고서로 정리합니다.", en: "Integrate all seven AI specialists into one consistent executive market-entry report." },
    deliverables: {
      ko: ["종합 진출 설계 보고서", "근거·가정·위험 목록", "통합 30·60·90일 계획"],
      en: ["Comprehensive entry report", "Evidence, assumptions, and risk ledger", "Integrated 30/60/90-day plan"]
    }
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
