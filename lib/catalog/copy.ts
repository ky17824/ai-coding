import type { Copy, CopyList, Tier } from "./types";

export interface ProductCopy {
  title: Copy;
  description: Copy;
  deliverables: CopyList;
}

/** 상품별 고객 화면 문구. 코드 로직과 분리되어 있어 비개발자도 이 파일만 검토하면 된다. */
export const PRODUCT_COPY: Record<string, ProductCopy> = {
  "ai-market-intelligence": {
    title: { ko: "심층 시장 조사", en: "In-depth Market Research" },
    description: { ko: "어느 국가의 어떤 고객군을 우선 공략할지, 시장 규모(TAM·SAM·SOM)는 얼마나 되는지, 어떤 경쟁사가 진출해 있는지를 출처와 함께 정리합니다.", en: "Research target markets, ICP, TAM, SAM, SOM, beachhead market, and competition with traceable evidence." },
    deliverables: {
      ko: ["후보 국가와 목표 고객 비교", "시장 규모 추정: 하향식·상향식 TAM·SAM·SOM과 교두보 시장(최소·기준·최대)", "경쟁 구도와 근거 목록"],
      en: ["Market and ICP comparison", "In-depth Top-Down and Bottom-Up TAM, SAM, SOM, and Beachhead Market sizing (low/base/high)", "Competition and evidence ledger"]
    }
  },
  "ai-customer-validation": {
    title: { ko: "고객 검증·실증 시험", en: "Customer Validation" },
    description: { ko: "현재 확보한 고객 반응이 충분한 근거인지 점검하고, 인터뷰와 유료 시범 판매의 성공·중단 기준을 설계합니다.", en: "Audit customer evidence and design interviews and paid pilots with KPIs and stop criteria." },
    deliverables: {
      ko: ["고객 근거 점검", "인터뷰·유료 시범 판매 설계", "성과 지표와 중단 기준"],
      en: ["Customer evidence audit", "Interview and paid-pilot design", "KPIs and stop criteria"]
    }
  },
  "ai-local-bmc": {
    title: { ko: "현지화 사업 모델 설계", en: "Local Business Model Design" },
    description: { ko: "현지에 맞는 사업 모델을 9개 항목으로 재구성하고, 거래 방식과 가격·결제·고객 경험 가운데 유지할 항목과 변경하거나 시험할 항목을 정리합니다.", en: "Design a local business model and the keep/change/test backlog across practices, price, payment, and customer journey." },
    deliverables: {
      ko: ["현지 사업 모델 9개 항목", "현지화 진단 6개 축(BMLC·LPA)", "유지·변경·시험 항목 목록"],
      en: ["Nine-block local BMC", "BMLC and six LPA axes", "Keep/change/test backlog"]
    }
  },
  "ai-entry-requirements": {
    title: { ko: "규제 요건 조사", en: "Regulatory Requirements Research" },
    description: { ko: "정부와 관계 기관의 공식 자료를 근거로 어떤 인허가·인증·표시가 필요한지, 아직 확인되지 않은 위험은 무엇인지 정리합니다. 품목 분류의 확정은 자격자 검토가 필요합니다.", en: "Use official sources to map required approvals, certification, labelling, and unresolved risks. Confirming the product classification itself requires a licensed expert." },
    deliverables: {
      ko: ["공식 자료 기준 요건표", "미확인 위험과 재확인 시점", "분류 확정에 필요한 확인 항목"],
      en: ["Official-source requirements", "Open risks and review dates", "What a licensed expert still needs to confirm"]
    }
  },
  "ai-partner-research": {
    title: { ko: "파트너·생태계 조사", en: "Partner & Ecosystem Research" },
    description: { ko: "도시와 산업 거점별로 접촉해야 할 기관과 파트너 후보를 찾고, 확인할 사항과 특정 파트너에 의존할 때의 위험까지 정리합니다.", en: "Map city and cluster stakeholders, partner candidates, validation questions, and dependency risks." },
    deliverables: {
      ko: ["생태계 지도", "파트너 후보와 검증 항목", "접촉 시 질문과 대체 경로"],
      en: ["Ecosystem map", "Partner shortlist and validation", "Outreach questions and alternatives"]
    }
  },
  "ai-tce-finance": {
    title: { ko: "진입 비용·자금 계획", en: "Entry Cost & Funding Plan" },
    description: { ko: "진출에 필요한 총비용과 가용 자금으로 운영할 수 있는 기간, 최소 실행 범위를 계산하고, 예산 재검토 시점과 공급 여력도 함께 분석합니다.", en: "Quantify total cost of entry, runway, minimum scope, budget gates, and capacity risks." },
    deliverables: {
      ko: ["총 진입 비용과 자금 유지 기간", "시나리오별 손익", "예산 재검토 시점과 공급 병목"],
      en: ["TCE and runway", "Scenario economics", "Budget gates and capacity bottlenecks"]
    }
  },
  "ai-gtm-operations": {
    title: { ko: "GTM 실행·현지 운영", en: "GTM Execution & Local Operations" },
    description: { ko: "판매 방식과 담당자의 책임을 정하고, 30·60·90일 실행 계획, 성과 지표, 재검토·철수 기준을 즉시 활용할 수 있는 문서로 작성합니다.", en: "Turn evidence into a GTM motion, RACI, KPIs, 30/60/90-day plan, and rollback criteria." },
    deliverables: {
      ko: ["1페이지 GTM 요약과 성과 지표 체계", "역할·책임 분담표(RACI)와 권한표", "30·60·90일 계획"],
      en: ["One-page GTM and KPI tree", "RACI and authority map", "30/60/90-day plan"]
    }
  },
  "pkg-feasibility": {
    title: { ko: "진출 가능성 진단", en: "Market Entry Feasibility" },
    description: { ko: "시장 규모와 규제 요건, 파트너 후보를 함께 조사하여 해당 국가에 진출할 가치가 있는지 판단합니다.", en: "Research market size, regulatory requirements, and partner candidates together to judge whether this market is worth entering." },
    deliverables: {
      ko: ["시장 규모와 경쟁 구도", "공식 자료 기준 규제 요건", "파트너 후보와 접촉 질문"],
      en: ["Market sizing and competition", "Official-source regulatory requirements", "Partner candidates and outreach questions"]
    }
  },
  "pkg-entry-design": {
    title: { ko: "진출 설계", en: "Market Entry Design" },
    description: { ko: "AI가 수행할 수 있는 조사와 설계를 종합하여 어느 시장에 어떤 제품으로 진출하고 어떻게 판매할지 정리합니다.", en: "Bundle every AI-completable research and design step into one plan: where to enter, with what, and how to sell." },
    deliverables: {
      ko: ["시장·규제·파트너 조사 결과 종합", "현지 사업 모델과 고객 검증 설계", "진입 비용과 30·60·90일 실행 계획"],
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
    title: { ko: "GTM 실행 계획 검토·코칭", en: "GTM Plan Review & Coaching" },
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

/**
 * 결제 후 입력 화면의 공통 8칸 이름. 입력 화면·입력 확인·추가 질문 문장이 같은 표를 써야
 * 사용자가 "아까 그 항목"으로 알아본다(전에는 화면과 서버가 각자 사본을 들고 있어 어긋났다).
 */
export const INTAKE_FIELD_LABEL: Record<string, Copy> = {
  objective: { ko: "이번 업무로 내릴 결정", en: "Decision to make" },
  offering: { ko: "제품·서비스", en: "Offering" },
  targetCountry: { ko: "목표 국가·도시", en: "Target country and city" },
  targetCustomer: { ko: "목표 고객", en: "Target customer" },
  currentEvidence: { ko: "현재 보유한 증거·자료·URL", en: "Current evidence, materials, and URLs" },
  constraints: { ko: "제약·금지사항", en: "Constraints and exclusions" },
  resources: { ko: "가용 예산·인력·기간", en: "Available budget, people, and time" },
  deadline: { ko: "계획 기한", en: "Planning deadline" }
};

/** 입력 확인 화면의 항목 상태 배지. 코드값(confirmed…)은 계약이라 그대로 두고 표시만 바꾼다. */
export const INPUT_AUDIT_LABEL: Record<"confirmed" | "unclear" | "missing" | "conflicting", Copy> = {
  confirmed: { ko: "확인됨", en: "confirmed" },
  unclear: { ko: "불명확", en: "unclear" },
  missing: { ko: "미입력", en: "missing" },
  conflicting: { ko: "상충", en: "conflicting" }
};

/** 주문 상세 상단의 주문 상태 배지. 표에 없는 값은 코드값 그대로 보인다. */
export const ORDER_STATUS_LABEL: Record<string, Copy> = {
  pending: { ko: "결제 대기", en: "pending" },
  paid: { ko: "결제 완료", en: "paid" },
  service_started: { ko: "진행 중", en: "in progress" },
  completed: { ko: "완료", en: "completed" },
  cancelled: { ko: "취소", en: "cancelled" },
  refunded: { ko: "환불", en: "refunded" },
  disputed: { ko: "환불 검토 중", en: "under review" }
};

/** 어느 상품에나 필요한 기본 입력. 준비도 진단을 마쳤다면 대부분 자동으로 채워진다. */
export const SHARED_REQUIRED_INPUT: Copy = {
  ko: "목표 국가와 고객은 준비도 진단에서 불러옵니다. 판매할 제품 또는 서비스는 여기에서 확인해 주세요.",
  en: "Target country and customer come from your readiness answers. Confirm the offering here."
};

/**
 * 상품별 추가 입력. 전 상품에 같은 세 줄을 붙이면 무엇을 준비해야 하는지 알 수 없다.
 * B 계층은 여기 적힌 회사 내부 정보가 없으면 결과가 유사사례 가정으로 채워진다.
 *
 * 상세 페이지의 "필요 정보"이자, 결제 후 입력 화면의 상품별 칸(intake.serviceInputs)의
 * 보조문구이자, 비워 두면 나가는 추가질문 문구다. 세 곳이 같은 문장을 써야 사용자가
 * "아까 본 그 항목"으로 알아본다.
 */
export const REQUIRED_INPUT_BY_AGENT: Record<string, Copy> = {
  "ai-market-intelligence": { ko: "비교할 후보 국가·도시(쉼표로 구분)와 단가·ARPU 등 상향식 산정에 쓸 근거", en: "Candidate countries or cities to compare (comma-separated) and unit price or ARPU for bottom-up sizing." },
  "ai-entry-requirements": { ko: "제품의 소재·성분·용도 등 품목 분류에 영향을 주는 정보", en: "Materials, ingredients, and intended use — anything that affects classification." },
  "ai-partner-research": { ko: "필요한 파트너의 역할(유통·총판·시공 등)과 우선 도시", en: "The partner role you need (distributor, reseller, installer) and priority cities." },
  "ai-customer-validation": { ko: "지금까지 확보한 고객 반응과 그 근거(인터뷰 기록, 유료 전환 기록 등)", en: "Customer responses so far and the evidence behind them (interviews, paid conversions)." },
  "ai-local-bmc": { ko: "현재 사업 모델: 가격·결제·전달 방식", en: "Your current business model: price, payment, and delivery." },
  // 가용 자금·기간은 공통 칸(가용 예산·인력·기간, 계획기한)이 받는다. 여기서는 그 칸이 못 받는 것만 묻는다.
  "ai-tce-finance": { ko: "월 인건비·고정비 등 비용 항목, 통화, 세금 포함 여부 (가용 자금과 기한은 위 공통 칸에)", en: "Cost lines such as monthly payroll and fixed costs, currency, and whether figures include tax (funds and deadline go in the shared fields above)." },
  "ai-gtm-operations": { ko: "조직 구성과 담당자별 권한 범위", en: "Your team, who owns what, and their authority." }
};

/** 첨부 안내. 형식 제한(PDF·PNG·JPG)을 코드로 풀기 전에 문구로 흡수한다. */
export const ATTACHMENT_HINT_BY_AGENT: Record<string, Copy> = {
  "ai-market-intelligence": { ko: "자체 판매·가격 데이터", en: "your own sales or pricing data" },
  "ai-entry-requirements": { ko: "사양서·성분표·인증서", en: "spec sheet, composition, certificates" },
  "ai-partner-research": { ko: "기존 접촉·파트너 목록", en: "existing contacts or partner list" },
  "ai-customer-validation": { ko: "인터뷰·전환·파일럿 기록", en: "interview, conversion, or pilot records" },
  "ai-local-bmc": { ko: "가격표·결제·전달 흐름", en: "price list, payment and delivery flow" },
  "ai-tce-finance": { ko: "비용표·예산 근거", en: "cost table or budget basis" },
  "ai-gtm-operations": { ko: "조직도·RACI·기존 실행 계획", en: "org chart, RACI, existing plan" }
};
export const ATTACHMENT_PDF_TIP: Copy = { ko: "엑셀·워드·PPT는 PDF로 내보내 첨부해 주세요.", en: "Export Excel, Word, or PowerPoint files to PDF before attaching." };

/** 계층별 진행 방식 1단계. A는 공개 자료만으로, B는 회사 내부 정보가 있어야 끝난다. */
export const TIER_FIRST_STEP: Record<Tier, Copy> = {
  A: { ko: "공개 자료를 바탕으로 진행하므로 목표 국가와 고객, 제품 또는 서비스만 확인하면 시작할 수 있습니다.", en: "This runs on public sources, so it starts once the country, customer, and offering are confirmed." },
  B: { ko: "회사 내부 정보가 필요합니다. 아래의 필요 정보를 입력하지 않으면 해당 내용은 유사 사례를 바탕으로 한 가정으로 표시됩니다.", en: "This needs information only you have. Anything you leave blank is filled with a labelled analog assumption." },
  C: { ko: "AI 조사 결과를 먼저 만들고, 배정된 자격자가 검토를 시작합니다.", en: "The AI research runs first, then the assigned licensed expert begins review." },
  D: { ko: "담당 전문가를 배정한 뒤 일정을 조율합니다.", en: "An expert is assigned and the schedule is arranged with you." },
  M: { ko: "멘토를 배정한 뒤 상담 일정을 잡습니다.", en: "A mentor is assigned and the session is scheduled." }
};

/**
 * 이 보고서가 **결론 내리지 않는** 항목. 제공 범위의 경계이지 딜리버리 항목이 아니다.
 * 상품마다 실제로 걸리는 경계가 다르므로 포함된 전문가별로 선언하고, 패키지는 합집합을 쓴다.
 * 전 상품에 같은 문구를 붙이면 자금 계획 상품에도 "파트너 의향"이 뜨는 식으로 어긋난다.
 */
export const HUMAN_BOUNDARY: Record<string, Copy> = {
  "ai-market-intelligence": { ko: "추정에 쓰인 가정을 받아들일지 여부는 직접 판단하셔야 합니다.", en: "Whether to accept the assumptions behind the estimates is your call." },
  "ai-entry-requirements": { ko: "품목 분류와 인허가 가능 여부를 확정하려면 관할 기관이나 관세사·변리사의 확인이 필요합니다.", en: "Confirming the classification and whether approval is obtainable requires the authority or a licensed expert." },
  "ai-partner-research": { ko: "파트너의 실재 여부와 거래 의향은 직접 접촉해 확인하셔야 합니다.", en: "Whether a partner is real and willing to deal requires contacting them yourself." },
  "ai-customer-validation": { ko: "인터뷰와 시범 판매의 설계까지만 제공하며, 실제 실행은 직접 하셔야 합니다.", en: "Running the interviews and pilots themselves; we design them, you execute." },
  "ai-local-bmc": { ko: "현지 관행에 대한 최종 판단은 현지에서 직접 확인하셔야 합니다.", en: "The final read on local practice needs confirmation on the ground." },
  "ai-tce-finance": { ko: "세무 처리와 계약의 효력은 세무·법률 전문가의 자문이 필요합니다.", en: "Tax treatment and contract effectiveness need a tax or legal advisor." },
  "ai-gtm-operations": { ko: "조직 내 역할 배정과 실제 실행은 포함되지 않으며, 계획까지만 제공합니다.", en: "Assigning owners inside your organization and executing the plan; we provide the plan." }
};

/**
 * 상품 단위 경계 재정의. 포함 상품에서 유도하면 안 되는 경우에 쓴다.
 * 예: hx-classification은 `ai-entry-requirements`를 포함하지만, 그 상품의 경계였던
 * "관세사 확인이 필요합니다"를 그대로 물려받으면 정작 그 확인을 파는 상품이
 * 자기 자신을 경계로 표시하게 된다.
 */
export const PRODUCT_BOUNDARY: Record<string, CopyList> = {
  "hx-classification": {
    ko: ["자격자의 검토 의견이며 관할 기관의 사전심사 결정이 아닙니다. 실제 통관·인허가 심사 결과는 기관이 판단합니다."],
    en: ["This is a licensed expert's opinion, not an advance ruling. The authority decides the actual customs and approval outcome."]
  },
  "hx-classification-plus": {
    ko: ["자격자의 검토 의견이며 관할 기관의 사전심사 결정이 아닙니다. 실제 통관·인허가 심사 결과는 기관이 판단합니다."],
    en: ["This is a licensed expert's opinion, not an advance ruling. The authority decides the actual customs and approval outcome."]
  },
  "hx-gtm-review": {
    ko: ["실행은 직접 하셔야 합니다. 검토 의견이며 성과를 보장하지 않습니다."],
    en: ["Execution stays with you. This is a review, not a performance guarantee."]
  },
  "hx-partner-verify": {
    ko: ["확인 시점 기준의 정보입니다. 거래 성사나 파트너의 이후 행위를 보장하지 않습니다."],
    en: ["Findings are as of the date checked. Neither a deal nor the partner's later conduct is guaranteed."]
  },
  "hx-partner-intro": {
    ko: ["접촉과 소개까지입니다. 계약 체결과 그 조건은 직접 협상하셔야 합니다."],
    en: ["Scope ends at the introduction. Signing and terms are yours to negotiate."]
  },
  "hx-interview": {
    ko: ["인터뷰 대상의 응답이며 시장 전체의 판단이 아닙니다. 표본 수가 적을수록 해석에 주의가 필요합니다."],
    en: ["These are the interviewees' answers, not a market-wide verdict. Read a small sample with care."]
  },
  "hx-mentor-1h": {
    ko: ["상담 의견이며 실행과 그 결과는 직접 책임지셔야 합니다.", "법률·세무·규제 판단이 필요한 사안은 해당 자격자에게 확인하셔야 합니다."],
    en: ["A mentor's view; execution and its outcome remain yours.", "Anything needing legal, tax, or regulatory judgment goes to a licensed expert."]
  },
  "hx-mentor-2h": {
    ko: ["상담 의견이며 실행과 그 결과는 직접 책임지셔야 합니다.", "법률·세무·규제 판단이 필요한 사안은 해당 자격자에게 확인하셔야 합니다."],
    en: ["A mentor's view; execution and its outcome remain yours.", "Anything needing legal, tax, or regulatory judgment goes to a licensed expert."]
  }
};

/** 상품 단위 필요정보 재정의. 전문가 상품은 포함 AI 상품과 준비물이 다르다. */
export const PRODUCT_REQUIRED_INPUT: Record<string, CopyList> = {
  "hx-classification": {
    ko: ["제품 사양서·성분표와 실제 용도", "이미 검토한 HS코드 후보가 있다면 함께 전달해 주세요."],
    en: ["Product spec, composition, and actual use", "Any HS code candidates you have already considered."]
  },
  "hx-classification-plus": {
    ko: ["제품 사양서·성분표와 실제 용도", "분류가 갈릴 수 있는 유사 제품이나 기존 통관 이력"],
    en: ["Product spec, composition, and actual use", "Similar products or past customs history where classification could diverge."]
  },
  "hx-gtm-review": {
    ko: ["검토받을 GTM 계획 문서", "조직 구성과 담당자, 목표 기한"],
    en: ["The GTM plan to review", "Your team, owners, and target date."]
  },
  "hx-partner-verify": {
    ko: ["검증받을 파트너 후보 (3곳 내외)", "각 후보에게 확인하고 싶은 항목"],
    en: ["Partner candidates to verify (about three)", "What you want checked on each."]
  },
  "hx-partner-intro": {
    ko: ["접촉할 후보와 제안하려는 거래 조건", "영문 또는 현지어 회사 소개 자료"],
    en: ["Who to contact and the terms you intend to propose", "A company introduction in English or the local language."]
  },
  "hx-interview": {
    ko: ["인터뷰 대상 조건 (업종·직무·규모 등)", "확인하고 싶은 가설과 질문"],
    en: ["Who to interview (industry, role, size)", "The hypotheses and questions to test."]
  },
  "hx-mentor-1h": {
    ko: ["상담에서 다루고 싶은 주제와 지금 막힌 지점"],
    en: ["What you want to cover and where you are stuck."]
  },
  "hx-mentor-2h": {
    ko: ["상담에서 다루고 싶은 주제와 지금 막힌 지점", "함께 볼 자료 (계획서·재무·계약서 등)"],
    en: ["What you want to cover and where you are stuck", "Materials to go through together (plan, financials, contracts)."]
  }
};

/**
 * 한계 블록의 첫 항목. A·B에만 둔다 — 전문가 검토가 없다는 사실은 이 두 계층에서만
 * 알려야 할 정보이고, C·D·M은 각자의 경계 문구가 이미 더 정확하게 말하고 있어
 * 계층 문구를 덧붙이면 군더더기가 된다.
 */
export const TIER_DISCLOSURE: Partial<Record<Tier, Copy>> = {
  A: { ko: "전문가 검토는 포함되지 않습니다.", en: "Expert review is not included." },
  B: { ko: "전문가 검토는 포함되지 않습니다.", en: "Expert review is not included." }
};

/** 취소·환불 정책. 다른 블록과 같이 불릿으로 나간다. */
export const REFUND_POLICY: CopyList = {
  ko: [
    "보고서 생성 시작 전에는 전액 환불됩니다.",
    "보고서 생성이 시작된 뒤의 환불 요청은 주문 및 생성 기록을 기준으로 검토합니다."
  ],
  en: [
    "A full refund is available before report generation begins.",
    "Requests after generation starts are reviewed using the order and generation record."
  ]
};
export const PROVIDER: { name: Copy; title: Copy; duration: Copy } = {
  name: { ko: "Borderless AI 전문가", en: "Borderless AI Expert" },
  title: { ko: "근거 기반 분석", en: "Evidence-led analysis" },
  duration: { ko: "결제 후 즉시 시작", en: "Starts immediately after payment" }
};

/** 아직 열지 않은 상품의 배지·안내. LAUNCHED_PRODUCT_IDS(products.ts)에 없는 상품에 붙는다. */
export const COMING_SOON: { badge: Copy; notice: Copy; cta: Copy } = {
  badge: { ko: "8월 말 출시 예정", en: "Launching late August" },
  notice: { ko: "이 서비스는 8월 말에 출시됩니다. 지금은 심층 시장 조사를 먼저 이용하실 수 있습니다.", en: "This service launches in late August. In-depth Market Research is available now." },
  cta: { ko: "심층 시장 조사 보기", en: "See In-depth Market Research" }
};

/** 계층 배지. 카드 상단 pill 자리를 대체한다. */
export const TIER_BADGE: Record<Tier, Copy> = {
  A: { ko: "AI 전용", en: "AI only" },
  B: { ko: "AI + 사용자 제공 정보", en: "AI + your input" },
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
