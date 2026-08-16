import type { Locale } from "@/lib/i18n";
import { getIntakeQuestions, type SurveyVersion } from "@/lib/intake-questions";
import type { ServiceOffering } from "@/lib/types";

type Copy = { ko: string; en: string };

interface AiAgentDefinition {
  id: string;
  productKind: "specialist" | "package";
  price: number;
  title: Copy;
  description: Copy;
  tags: string[];
  includedAgentIds: string[];
  deliverables: { ko: string[]; en: string[] };
  requiredInputs: { ko: string[]; en: string[] };
}

const requiredInputs = {
  ko: ["목표 국가와 고객, 판매할 제품 또는 서비스", "관련 준비도 진단 답변과 지금 가진 근거", "제약 조건과 쓸 수 있는 자원, 목표 기한"],
  en: ["Target country, customer, and offering", "Relevant readiness answers and evidence", "Constraints, resources, and deadline"]
};

const specialists: AiAgentDefinition[] = [
  {
    id: "ai-market-intelligence", productKind: "specialist", price: 199000,
    title: { ko: "심층 시장조사", en: "In-depth Market Research" },
    description: { ko: "어느 나라의 어떤 고객을 먼저 공략할지, 그 시장이 얼마나 큰지(TAM·SAM·SOM), 누가 이미 경쟁하고 있는지를 출처와 함께 정리합니다.", en: "Research target markets, ICP, TAM, SAM, SOM, beachhead market, and competition with traceable evidence." },
    tags: ["market-sizing", "target-market", "competition", "market-validation"], includedAgentIds: ["ai-market-intelligence"],
    deliverables: { ko: ["후보 국가와 목표 고객 비교", "시장규모 추정: 하향식·상향식 TAM·SAM·SOM과 교두보 시장 (최소·기준·최대)", "경쟁 구도와 근거 목록"], en: ["Market and ICP comparison", "In-depth Top-Down and Bottom-Up TAM, SAM, SOM, and Beachhead Market sizing (low/base/high)", "Competition and evidence ledger"] }, requiredInputs
  },
  {
    id: "ai-customer-validation", productKind: "specialist", price: 129000,
    title: { ko: "고객 검증·실증 시험", en: "Customer Validation" },
    description: { ko: "지금 가진 고객 반응이 근거로 충분한지 점검하고, 인터뷰와 유료 시범판매를 어떤 기준으로 성공·중단할지 설계합니다.", en: "Audit customer evidence and design interviews and paid pilots with KPIs and stop criteria." },
    tags: ["home-pmf", "market-testing", "customer-validation", "market-validation"], includedAgentIds: ["ai-customer-validation"],
    deliverables: { ko: ["고객 근거 점검", "인터뷰·유료 시범판매 설계", "성과 지표와 중단 기준"], en: ["Customer evidence audit", "Interview and paid-pilot design", "KPIs and stop criteria"] }, requiredInputs
  },
  {
    id: "ai-local-bmc", productKind: "specialist", price: 199000,
    title: { ko: "현지화 사업모델 설계", en: "Local Business Model Design" },
    description: { ko: "현지에 맞는 사업모델을 9개 항목으로 다시 짜고, 거래 방식과 가격·결제·고객 경험 가운데 무엇을 그대로 두고 무엇을 바꾸거나 시험할지 정리합니다.", en: "Design a local business model and the keep/change/test backlog across practices, price, payment, and customer journey." },
    tags: ["localization", "local-bmc", "bmlc", "lpa"], includedAgentIds: ["ai-local-bmc"],
    deliverables: { ko: ["현지 사업모델 9개 항목", "현지화 진단 6개 축(BMLC·LPA)", "유지·변경·시험 항목 목록"], en: ["Nine-block local BMC", "BMLC and six LPA axes", "Keep/change/test backlog"] }, requiredInputs
  },
  {
    id: "ai-market-entry-requirements", productKind: "specialist", price: 249000,
    title: { ko: "규제·진입 요건", en: "Regulatory & Entry Requirements" },
    description: { ko: "정부·기관의 공식 자료를 근거로 제품이 어떤 품목으로 분류될지, 어떤 인허가·인증·표시가 필요한지, 아직 확인되지 않은 위험은 무엇인지 정리합니다.", en: "Use official sources to map classification hypotheses, approvals, certification, labelling, and unresolved risks." },
    tags: ["regulation", "compliance", "certification", "market-entry", "legal"], includedAgentIds: ["ai-market-entry-requirements"],
    deliverables: { ko: ["제품 분류 가설", "공식 자료 기준 요건표", "미확인 위험과 재확인 시점"], en: ["Classification hypothesis", "Official-source requirements", "Open risks and review dates"] }, requiredInputs
  },
  {
    id: "ai-local-ecosystem", productKind: "specialist", price: 249000,
    title: { ko: "현지 생태계·네트워크", en: "Local Ecosystem & Network" },
    description: { ko: "도시와 산업 거점별로 만나야 할 곳과 파트너 후보를 찾고, 무엇을 확인해야 하는지, 한 곳에 의존하면 어떤 위험이 있는지까지 정리합니다.", en: "Map city and cluster stakeholders, partner candidates, validation questions, and dependency risks." },
    tags: ["partner", "local-network", "ecosystem", "distribution"], includedAgentIds: ["ai-local-ecosystem"],
    deliverables: { ko: ["생태계 지도", "파트너 후보와 검증 항목", "접촉 시 질문과 대체 경로"], en: ["Ecosystem map", "Partner shortlist and validation", "Outreach questions and alternatives"] }, requiredInputs
  },
  {
    id: "ai-tce-finance", productKind: "specialist", price: 149000,
    title: { ko: "진입 비용·자금 계획", en: "Entry Cost & Funding Plan" },
    description: { ko: "진출에 드는 총비용과 자금이 버티는 기간, 최소한으로 시작할 범위를 숫자로 계산하고, 어느 지점에서 예산을 다시 판단할지와 공급 여력이 충분한지도 함께 봅니다.", en: "Quantify total cost of entry, runway, minimum scope, budget gates, and capacity risks." },
    tags: ["resources", "tce", "finance", "resource-allocation", "unit-economics"], includedAgentIds: ["ai-tce-finance"],
    deliverables: { ko: ["총 진입비용과 자금 유지 기간", "시나리오 손익", "예산 재검토 시점과 공급 병목"], en: ["TCE and runway", "Scenario economics", "Budget gates and capacity bottlenecks"] }, requiredInputs
  },
  {
    id: "ai-gtm-operations", productKind: "specialist", price: 149000,
    title: { ko: "GTM 실행·현지 운영", en: "GTM Execution & Local Operations" },
    description: { ko: "어떤 방식으로 팔지 정하고, 누가 무엇을 책임지는지와 30·60·90일 계획, 성과 지표, 되돌릴 기준까지 바로 쓸 수 있는 문서로 만듭니다.", en: "Turn evidence into a GTM motion, RACI, KPIs, 30/60/90-day plan, and rollback criteria." },
    tags: ["gtm-plan", "local-plan", "local-team", "global-mindset", "gtm", "leadership", "organization"], includedAgentIds: ["ai-gtm-operations"],
    deliverables: { ko: ["한 장짜리 GTM 요약과 성과 지표 체계", "역할·책임 분담표(RACI)와 권한표", "30·60·90일 계획"], en: ["One-page GTM and KPI tree", "RACI and authority map", "30/60/90-day plan"] }, requiredInputs
  }
];

const specialistById = Object.fromEntries(specialists.map((specialist) => [specialist.id, specialist])) as Record<string, AiAgentDefinition>;
const packageScope = (includedAgentIds: string[]) => ({
  includedAgentIds,
  tags: ["package", ...includedAgentIds.flatMap((id) => specialistById[id].tags)]
});

const packages: AiAgentDefinition[] = [
  {
    id: "ai-market-opportunity", productKind: "package", price: 349000,
    title: { ko: "시장 가능성 패키지", en: "Market Opportunity Package" },
    description: { ko: "시장 조사와 고객 검증을 묶어, 어디서 누구에게 무엇부터 검증할지 정합니다.", en: "Combine market intelligence and customer validation to decide where, for whom, and what to test." },
    ...packageScope(["ai-market-intelligence", "ai-customer-validation"]),
    deliverables: { ko: ["시장·경쟁 보고서", "목표 고객과 시장규모", "고객 검증 계획"], en: ["Market and competition report", "ICP and market sizing", "Customer validation plan"] }, requiredInputs
  },
  {
    id: "ai-local-entry", productKind: "package", price: 649000,
    title: { ko: "현지화·진입 패키지", en: "Localization & Entry Package" },
    description: { ko: "현지화와 규제 대응, 파트너 네트워크를 하나의 진출 설계로 묶어 드립니다.", en: "Integrate localization, regulatory requirements, and local networks into one entry design." },
    ...packageScope(["ai-local-bmc", "ai-market-entry-requirements", "ai-local-ecosystem"]),
    deliverables: { ko: ["현지 사업모델(Local BMC)", "진입 요건표", "생태계·파트너 지도"], en: ["Local BMC", "Entry requirements", "Ecosystem and partner map"] }, requiredInputs
  },
  {
    id: "ai-execution-plan", productKind: "package", price: 349000,
    title: { ko: "실행계획 패키지", en: "Execution Planning Package" },
    description: { ko: "자금과 인력 계획, 현지 운영 방식을 내부 보고와 결재에 바로 쓸 수 있는 실행계획으로 만듭니다.", en: "Turn financial capacity and local operations into an approvable execution plan." },
    ...packageScope(["ai-tce-finance", "ai-gtm-operations"]),
    deliverables: { ko: ["총 진입비용과 예산 재검토 시점", "역할·책임 분담표와 성과 지표", "30·60·90일 계획"], en: ["TCE and budget gates", "RACI and KPIs", "30/60/90-day plan"] }, requiredInputs
  },
  {
    id: "ai-comprehensive-entry", productKind: "package", price: 1190000,
    title: { ko: "종합 진출 설계 패키지", en: "Comprehensive Market Entry Package" },
    description: { ko: "7개 AI 전문가의 결과를 서로 어긋나지 않게 맞춰, 경영진에게 보고할 하나의 실행 보고서로 정리합니다.", en: "Integrate all seven AI specialists into one consistent executive market-entry report." },
    ...packageScope(["ai-market-intelligence", "ai-customer-validation", "ai-local-bmc", "ai-market-entry-requirements", "ai-local-ecosystem", "ai-tce-finance", "ai-gtm-operations"]),
    deliverables: { ko: ["종합 진출 설계 보고서", "근거·가정·위험 목록", "통합 30·60·90일 계획"], en: ["Comprehensive entry report", "Evidence, assumptions, and risk ledger", "Integrated 30/60/90-day plan"] }, requiredInputs
  }
];

const instructions: Record<string, Copy> = {
  "ai-market-intelligence": { ko: "TAM·SAM·SOM·교두보 시장은 Top-Down과 Bottom-Up을 각각 산정한 뒤 low/base/high로 교차검증하고 산식·연도·통화를 제시하며 TAM ≥ SAM ≥ SOM을 지키세요. 직접·인접·대체 경쟁구도를 포함하세요.", en: "Estimate TAM, SAM, SOM, and the beachhead market separately with Top-Down and Bottom-Up methods, triangulate low/base/high, state formula, year, and currency, and keep TAM ≥ SAM ≥ SOM. Include direct, adjacent, and substitute competition." },
  "ai-customer-validation": { ko: "실제 수행하지 않은 인터뷰 결과를 만들지 말고 가설·표본·기간·행동 KPI·성공·중단 기준을 제시하세요.", en: "Do not invent interview outcomes. Define the hypothesis, sample, duration, behavioral KPIs, success criteria, and stop criteria." },
  "ai-local-bmc": { ko: "현지 BMC 9블록과 유지·필수변경·시험 항목을 현지 근거 또는 검증과제에 연결하세요.", en: "Cover all nine local BMC blocks and link each keep, required-change, or test decision to evidence or a validation task." },
  "ai-market-entry-requirements": { ko: "규제 요건은 공식출처를 우선하고 제품분류·법률·세무·인허가·계약 효력은 사람 검증 필요로 남기세요.", en: "Prioritize official regulatory sources and leave classification, legal, tax, approval, and contract-effect conclusions for human verification." },
  "ai-local-ecosystem": { ko: "후보별 역할·선정근거·최근 활동·검증 질문·대체경로를 제시하고 공개정보와 실제 관계·의향을 구분하세요.", en: "For each candidate give role, rationale, recent activity, validation questions, and alternatives; distinguish public evidence from actual relationships or intent." },
  "ai-tce-finance": { ko: "비용 범위·기간·통화·세금 포함 여부와 내부 입력·외부 추정을 분리하고 예산 Gate와 손실한도를 수치화하세요.", en: "Separate internal inputs from external estimates and state cost range, period, currency, tax treatment, budget gates, and loss limits." },
  "ai-gtm-operations": { ko: "각 액션에 한 명의 결과책임자·기한·완료증빙·성공·중단 기준을 두고 Critical 문항을 먼저 처리하세요.", en: "Give every action one accountable owner, timing, completion evidence, success and stop criteria, and handle Critical questions first." }
};

function buildSpecialistRules(version: SurveyVersion) {
  const rules: Record<string, { questionIds: string[]; instructions: Copy }> = Object.fromEntries(
    specialists.map((specialist) => [specialist.id, { questionIds: [], instructions: instructions[specialist.id] }])
  );
  for (const question of getIntakeQuestions("ko", version)) {
    const owner = question.itemId === "target-market" ? "ai-market-intelligence"
      : ["home-pmf", "market-testing"].includes(question.itemId) ? "ai-customer-validation"
      : ["bmlc-local-practice", "bmlc-hq-gap", "lpa-pricing-payment", "lpa-journey-blocker"].includes(question.id) ? "ai-local-bmc"
      : ["bmlc-classification", "bmlc-preconditions", "bmlc-na-basis"].includes(question.id) ? "ai-market-entry-requirements"
      : ["lpa-infra-partner", "lpa-bridge-person"].includes(question.id) || ["partner-acquisition", "partner-contract"].includes(question.itemId) ? "ai-local-ecosystem"
      : ["resources", "resource-allocation"].includes(question.itemId) || question.id === "lpa-net-price" ? "ai-tce-finance"
      : "ai-gtm-operations";
    rules[owner].questionIds.push(question.id);
  }
  return rules;
}

const specialistRules = buildSpecialistRules("5.0");

export const AI_AGENT_SERVICES = [...specialists, ...packages].map((definition) => {
  const rules = definition.includedAgentIds.map((id) => specialistRules[id]);
  return {
    ...definition,
    orchestrated: true,
    questionIds: [...new Set(rules.flatMap((rule) => rule.questionIds))],
    officialSourceQuestionIds: definition.includedAgentIds.includes("ai-market-entry-requirements") ? specialistRules["ai-market-entry-requirements"].questionIds : [],
    completionInstructions: rules.map((rule) => rule.instructions)
  };
});

function localize(
  definition: (typeof AI_AGENT_SERVICES)[number],
  locale: Locale,
  rules: ReturnType<typeof buildSpecialistRules>
): ServiceOffering {
  const en = locale === "en";
  const productRules = definition.includedAgentIds.map((id) => rules[id]);
  return {
    id: definition.id,
    providerName: en ? "Borderless AI Expert" : "Borderless AI 전문가",
    providerTitle: en ? "Evidence-led analysis" : "근거 기반 분석",
    type: "ai_agent",
    title: definition.title[locale],
    description: definition.description[locale],
    price: definition.price,
    durationLabel: en ? "Starts immediately after payment" : "결제 후 즉시 시작",
    tags: definition.tags,
    deliverables: definition.deliverables[locale],
    approved: true,
    rating: 0,
    reviewCount: 0,
    productKind: definition.productKind,
    includedAgentIds: definition.includedAgentIds,
    requiredInputs: definition.requiredInputs[locale],
    questionIds: [...new Set(productRules.flatMap((rule) => rule.questionIds))],
    officialSourceQuestionIds: definition.includedAgentIds.includes("ai-market-entry-requirements") ? rules["ai-market-entry-requirements"].questionIds : [],
    completionInstructions: productRules.map((rule) => rule.instructions[locale]),
    humanVerification: en
      ? ["Legal, tax, regulatory and contract effectiveness", "Actual interviews, partner intent and local relationships"]
      : ["법률·세무·규제 해석과 계약의 효력", "실제 인터뷰와 파트너 의향, 현지 관계"]
  };
}

export function getAiAgentServices(locale: Locale = "ko", version: SurveyVersion = "5.0") {
  const rules = buildSpecialistRules(version);
  return AI_AGENT_SERVICES.map((definition) => localize(definition, locale, rules));
}

export function resolveAiQuestionCatalogVersion(
  assessmentVersion: unknown,
  rolloutVersion: SurveyVersion
): SurveyVersion {
  return assessmentVersion === "4.0" || assessmentVersion === "5.0" ? assessmentVersion : rolloutVersion;
}

export function aiExpertServicesEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.AI_EXPERT_SERVICES_ENABLED === "true";
}

export function getAiAgentService(id: string, locale: Locale = "ko", version: SurveyVersion = "5.0") {
  const definition = AI_AGENT_SERVICES.find((service) => service.id === id);
  return definition ? localize(definition, locale, buildSpecialistRules(version)) : null;
}

export function matchAiAgentServices(tag: string, locale: Locale = "ko") {
  const services = getAiAgentServices(locale);
  return services.filter((service) => service.tags.includes(tag));
}
