import type { Locale } from "@/lib/i18n";
import { INTAKE_QUESTIONS } from "@/lib/intake-questions";
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

const specialists: AiAgentDefinition[] = [
  ["ai-market-intelligence", 199000, "시장정보·시장규모", "Market Intelligence & Sizing", "후보국·ICP·TAM·SAM·SOM·교두보 시장과 경쟁구도를 근거와 함께 조사합니다.", "Research target markets, ICP, TAM, SAM, SOM, beachhead market, and competition with traceable evidence.", ["market-sizing", "target-market", "competition", "market-validation"], ["후보국·ICP 비교", "시장규모 low/base/high", "경쟁구도·근거 원장"], ["Market and ICP comparison", "Low/base/high market sizing", "Competition and evidence ledger"]],
  ["ai-customer-validation", 129000, "고객검증·실증시험", "Customer Validation", "기존 고객증거를 감사하고 인터뷰·유료 파일럿의 KPI와 중단 기준을 설계합니다.", "Audit customer evidence and design interviews and paid pilots with KPIs and stop criteria.", ["home-pmf", "market-testing", "customer-validation", "market-validation"], ["고객증거 감사", "인터뷰·유료 파일럿 설계", "KPI·중단 기준"], ["Customer evidence audit", "Interview and paid-pilot design", "KPIs and stop criteria"]],
  ["ai-local-bmc", 199000, "현지화·Local BMC", "Localization & Local BMC", "현지 BMC와 거래·가격·결제·고객여정의 유지·변경·시험 항목을 설계합니다.", "Design a local BMC and the keep/change/test backlog across practices, price, payment, and customer journey.", ["localization", "local-bmc", "bmlc", "lpa"], ["현지 BMC 9블록", "BMLC·LPA 6축", "유지·변경·시험 백로그"], ["Nine-block local BMC", "BMLC and six LPA axes", "Keep/change/test backlog"]],
  ["ai-market-entry-requirements", 249000, "규제·시장진입 요건", "Regulatory & Entry Requirements", "공식출처로 제품분류 가설과 인허가·인증·표시 요건 및 미확인 위험을 정리합니다.", "Use official sources to map classification hypotheses, approvals, certification, labelling, and unresolved risks.", ["regulation", "compliance", "certification", "market-entry", "legal"], ["제품분류 가설", "공식출처 요건표", "미확인 위험·재확인일"], ["Classification hypothesis", "Official-source requirements", "Open risks and review dates"]],
  ["ai-local-ecosystem", 249000, "현지 생태계·네트워크", "Local Ecosystem & Network", "도시·클러스터별 이해관계자와 파트너 후보, 검증 질문, 의존·전환 위험을 조사합니다.", "Map city and cluster stakeholders, partner candidates, validation questions, and dependency risks.", ["partner", "local-network", "ecosystem", "distribution"], ["생태계 지도", "파트너 후보·검증표", "접촉 질문·대체경로"], ["Ecosystem map", "Partner shortlist and validation", "Outreach questions and alternatives"]],
  ["ai-tce-finance", 149000, "TCE·재무·자원", "TCE, Finance & Resources", "총 진입비용·현금 버팀기간·최소 실행범위·예산 Gate와 용량 위험을 수치화합니다.", "Quantify total cost of entry, runway, minimum scope, budget gates, and capacity risks.", ["resources", "tce", "finance", "resource-allocation", "unit-economics"], ["TCE·현금 버팀기간", "시나리오 손익", "예산 Gate·용량 병목"], ["TCE and runway", "Scenario economics", "Budget gates and capacity bottlenecks"]],
  ["ai-gtm-operations", 149000, "GTM 실행·현지 운영모델", "GTM Execution & Local Operations", "GTM Motion·RACI·KPI·30·60·90일 계획과 롤백 기준을 실행 가능한 문서로 만듭니다.", "Turn evidence into a GTM motion, RACI, KPIs, 30/60/90-day plan, and rollback criteria.", ["gtm-plan", "local-plan", "local-team", "global-mindset", "gtm", "leadership", "organization"], ["GTM 1페이지·KPI 트리", "RACI·권한표", "30·60·90일 계획"], ["One-page GTM and KPI tree", "RACI and authority map", "30/60/90-day plan"]]
].map(([id, price, koTitle, enTitle, koDescription, enDescription, tags, koDeliverables, enDeliverables]) => ({
  id: id as string,
  productKind: "specialist" as const,
  price: price as number,
  title: { ko: koTitle as string, en: enTitle as string },
  description: { ko: koDescription as string, en: enDescription as string },
  tags: tags as string[],
  includedAgentIds: [id as string],
  deliverables: { ko: koDeliverables as string[], en: enDeliverables as string[] },
  requiredInputs: {
    ko: ["목표국가·고객·제품 또는 서비스", "관련 준비도 답변과 현재 증거", "제약·가용자원·계획기한"],
    en: ["Target country, customer, and offering", "Relevant readiness answers and evidence", "Constraints, resources, and deadline"]
  }
}));

const packages: AiAgentDefinition[] = [
  ["ai-market-opportunity", 349000, "시장 가능성 패키지", "Market Opportunity Package", "시장정보와 고객검증을 연결해 어디서 누구에게 무엇을 검증할지 결정합니다.", "Combine market intelligence and customer validation to decide where, for whom, and what to test.", [specialists[0].id, specialists[1].id], ["시장·경쟁 보고서", "ICP·시장규모", "고객검증 계획"], ["Market and competition report", "ICP and market sizing", "Customer validation plan"]],
  ["ai-local-entry", 649000, "현지화·진입 패키지", "Localization & Entry Package", "현지화·규제·네트워크를 하나의 진입설계로 통합합니다.", "Integrate localization, regulatory requirements, and local networks into one entry design.", [specialists[2].id, specialists[3].id, specialists[4].id], ["Local BMC", "진입요건표", "생태계·파트너 지도"], ["Local BMC", "Entry requirements", "Ecosystem and partner map"]],
  ["ai-execution-plan", 349000, "실행계획 패키지", "Execution Planning Package", "재무·자원과 현지 운영을 승인 가능한 실행계획으로 전환합니다.", "Turn financial capacity and local operations into an approvable execution plan.", [specialists[5].id, specialists[6].id], ["TCE·예산 Gate", "RACI·KPI", "30·60·90일 계획"], ["TCE and budget gates", "RACI and KPIs", "30/60/90-day plan"]],
  ["ai-comprehensive-entry", 1190000, "종합 진출설계 패키지", "Comprehensive Market Entry Package", "7개 AI 전문가 결과를 모순 없이 하나의 경영진 실행보고서로 통합합니다.", "Integrate all seven AI specialists into one consistent executive market-entry report.", specialists.map((item) => item.id), ["종합 진출설계 보고서", "근거·가정·위험 원장", "통합 30·60·90일 계획"], ["Comprehensive entry report", "Evidence, assumptions, and risk ledger", "Integrated 30/60/90-day plan"]]
].map(([id, price, koTitle, enTitle, koDescription, enDescription, includedAgentIds, koDeliverables, enDeliverables]) => ({
  id: id as string,
  productKind: "package" as const,
  price: price as number,
  title: { ko: koTitle as string, en: enTitle as string },
  description: { ko: koDescription as string, en: enDescription as string },
  tags: ["package", ...(includedAgentIds as string[]).flatMap((agentId) => specialists.find((item) => item.id === agentId)?.tags ?? [])],
  includedAgentIds: includedAgentIds as string[],
  deliverables: { ko: koDeliverables as string[], en: enDeliverables as string[] },
  requiredInputs: specialists[0].requiredInputs
}));

const specialistRules: Record<string, { questionIds: string[]; instructions: Copy }> = Object.fromEntries(
  specialists.map((specialist) => [specialist.id, { questionIds: [], instructions: { ko: "", en: "" } }])
);

for (const question of INTAKE_QUESTIONS) {
  const owner = question.itemId === "target-market" ? "ai-market-intelligence"
    : ["home-pmf", "market-testing"].includes(question.itemId) ? "ai-customer-validation"
    : ["bmlc-local-practice", "bmlc-hq-gap", "lpa-pricing-payment", "lpa-journey-blocker"].includes(question.id) ? "ai-local-bmc"
    : ["bmlc-classification", "bmlc-preconditions", "bmlc-na-basis"].includes(question.id) ? "ai-market-entry-requirements"
    : ["lpa-infra-partner", "lpa-bridge-person"].includes(question.id) || ["partner-acquisition", "partner-contract"].includes(question.itemId) ? "ai-local-ecosystem"
    : ["resources", "resource-allocation"].includes(question.itemId) || question.id === "lpa-net-price" ? "ai-tce-finance"
    : "ai-gtm-operations";
  specialistRules[owner].questionIds.push(question.id);
}

Object.assign(specialistRules, {
  "ai-market-intelligence": { ...specialistRules["ai-market-intelligence"], instructions: { ko: "TAM·SAM·SOM은 low/base/high와 산식·연도·통화를 제시하고 TAM ≥ SAM ≥ SOM을 지키세요. 교두보 시장과 직접·인접·대체 경쟁구도를 포함하세요.", en: "Provide TAM, SAM, and SOM low/base/high with formula, year, currency, and TAM ≥ SAM ≥ SOM. Include a beachhead market and direct, adjacent, and substitute competition." } },
  "ai-customer-validation": { ...specialistRules["ai-customer-validation"], instructions: { ko: "실제 수행하지 않은 인터뷰 결과를 만들지 말고 가설·표본·기간·행동 KPI·성공·중단 기준을 제시하세요.", en: "Do not invent interview outcomes. Define the hypothesis, sample, duration, behavioral KPIs, success criteria, and stop criteria." } },
  "ai-local-bmc": { ...specialistRules["ai-local-bmc"], instructions: { ko: "현지 BMC 9블록과 유지·필수변경·시험 항목을 현지 근거 또는 검증과제에 연결하세요.", en: "Cover all nine local BMC blocks and link each keep, required-change, or test decision to evidence or a validation task." } },
  "ai-market-entry-requirements": { ...specialistRules["ai-market-entry-requirements"], instructions: { ko: "규제 요건은 공식출처를 우선하고 제품분류·법률·세무·인허가·계약 효력은 사람 검증 필요로 남기세요.", en: "Prioritize official regulatory sources and leave classification, legal, tax, approval, and contract-effect conclusions for human verification." } },
  "ai-local-ecosystem": { ...specialistRules["ai-local-ecosystem"], instructions: { ko: "후보별 역할·선정근거·최근 활동·검증 질문·대체경로를 제시하고 공개정보와 실제 관계·의향을 구분하세요.", en: "For each candidate give role, rationale, recent activity, validation questions, and alternatives; distinguish public evidence from actual relationships or intent." } },
  "ai-tce-finance": { ...specialistRules["ai-tce-finance"], instructions: { ko: "비용 범위·기간·통화·세금 포함 여부와 내부 입력·외부 추정을 분리하고 예산 Gate와 손실한도를 수치화하세요.", en: "Separate internal inputs from external estimates and state cost range, period, currency, tax treatment, budget gates, and loss limits." } },
  "ai-gtm-operations": { ...specialistRules["ai-gtm-operations"], instructions: { ko: "각 액션에 한 명의 결과책임자·기한·완료증빙·성공·중단 기준을 두고 Critical 문항을 먼저 처리하세요.", en: "Give every action one accountable owner, timing, completion evidence, success and stop criteria, and handle Critical questions first." } }
});

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

function localize(definition: (typeof AI_AGENT_SERVICES)[number], locale: Locale): ServiceOffering {
  const en = locale === "en";
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
    questionIds: definition.questionIds,
    officialSourceQuestionIds: definition.officialSourceQuestionIds,
    completionInstructions: definition.completionInstructions.map((instruction) => instruction[locale]),
    humanVerification: en
      ? ["Legal, tax, regulatory and contract effectiveness", "Actual interviews, partner intent and local relationships"]
      : ["법률·세무·규제·계약 효력", "실제 인터뷰·파트너 의향·현지 관계"]
  };
}

export function getAiAgentServices(locale: Locale = "ko") {
  return AI_AGENT_SERVICES.map((definition) => localize(definition, locale));
}

export function aiExpertServicesEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.AI_EXPERT_SERVICES_ENABLED === "true";
}

export function getAiAgentService(id: string, locale: Locale = "ko") {
  const definition = AI_AGENT_SERVICES.find((service) => service.id === id);
  return definition ? localize(definition, locale) : null;
}

export function matchAiAgentServices(tag: string, locale: Locale = "ko") {
  const services = getAiAgentServices(locale);
  return services.filter((service) => service.tags.includes(tag));
}
