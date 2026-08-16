import { getIntakeQuestions, type SurveyVersion } from "@/lib/intake-questions";
import type { Copy } from "./types";

/**
 * 유료 실행 계약. 가격이 아니라 이 값들이 보고서 생성 시점에 요구된다
 * (`app/api/ai-agent-runs/[orderId]/route.ts`의 paidServiceSchema가 questionIds와
 * completionInstructions에 최소 1개를 강제한다).
 *
 * 의존 방향은 규칙 → 상품이다. 이 파일이 products.ts의 id를 참조하지, 그 반대가 아니다.
 */
export const COMPLETION_INSTRUCTIONS: Record<string, Copy> = {
  "ai-market-intelligence": { ko: "TAM·SAM·SOM·교두보 시장은 Top-Down과 Bottom-Up을 각각 산정한 뒤 low/base/high로 교차검증하고 산식·연도·통화를 제시하며 TAM ≥ SAM ≥ SOM을 지키세요. 직접·인접·대체 경쟁구도를 포함하세요.", en: "Estimate TAM, SAM, SOM, and the beachhead market separately with Top-Down and Bottom-Up methods, triangulate low/base/high, state formula, year, and currency, and keep TAM ≥ SAM ≥ SOM. Include direct, adjacent, and substitute competition." },
  "ai-customer-validation": { ko: "실제 수행하지 않은 인터뷰 결과를 만들지 말고 가설·표본·기간·행동 KPI·성공·중단 기준을 제시하세요.", en: "Do not invent interview outcomes. Define the hypothesis, sample, duration, behavioral KPIs, success criteria, and stop criteria." },
  "ai-local-bmc": { ko: "현지 BMC 9블록과 유지·필수변경·시험 항목을 현지 근거 또는 검증과제에 연결하세요.", en: "Cover all nine local BMC blocks and link each keep, required-change, or test decision to evidence or a validation task." },
  "ai-market-entry-requirements": { ko: "규제 요건은 공식출처를 우선하고 제품분류·법률·세무·인허가·계약 효력은 사람 검증 필요로 남기세요.", en: "Prioritize official regulatory sources and leave classification, legal, tax, approval, and contract-effect conclusions for human verification." },
  "ai-local-ecosystem": { ko: "후보별 역할·선정근거·최근 활동·검증 질문·대체경로를 제시하고 공개정보와 실제 관계·의향을 구분하세요.", en: "For each candidate give role, rationale, recent activity, validation questions, and alternatives; distinguish public evidence from actual relationships or intent." },
  "ai-tce-finance": { ko: "비용 범위·기간·통화·세금 포함 여부와 내부 입력·외부 추정을 분리하고 예산 Gate와 손실한도를 수치화하세요.", en: "Separate internal inputs from external estimates and state cost range, period, currency, tax treatment, budget gates, and loss limits." },
  "ai-gtm-operations": { ko: "각 액션에 한 명의 결과책임자·기한·완료증빙·성공·중단 기준을 두고 Critical 문항을 먼저 처리하세요.", en: "Give every action one accountable owner, timing, completion evidence, success and stop criteria, and handle Critical questions first." }
};

/**
 * 공식 출처 인용을 강제할 상품. 문자열을 여러 곳에 하드코딩하면
 * 개명 시 조용히 꺼지므로 한 곳에서만 선언한다.
 */
export const OFFICIAL_SOURCE_AGENT_ID = "ai-market-entry-requirements";

/** 진단 문항 → 담당 전문가. 여기서 빠진 문항은 마지막 분기로 떨어진다. */
export function buildSpecialistRules(version: SurveyVersion) {
  const rules: Record<string, { questionIds: string[]; instructions: Copy }> = Object.fromEntries(
    Object.entries(COMPLETION_INSTRUCTIONS).map(([id, instructions]) => [id, { questionIds: [], instructions }])
  );
  for (const question of getIntakeQuestions("ko", version)) {
    const owner = question.itemId === "target-market" ? "ai-market-intelligence"
      : ["home-pmf", "market-testing"].includes(question.itemId) ? "ai-customer-validation"
      : ["bmlc-local-practice", "bmlc-hq-gap", "lpa-pricing-payment", "lpa-journey-blocker"].includes(question.id) ? "ai-local-bmc"
      : ["bmlc-classification", "bmlc-preconditions", "bmlc-na-basis"].includes(question.id) ? OFFICIAL_SOURCE_AGENT_ID
      : ["lpa-infra-partner", "lpa-bridge-person"].includes(question.id) || ["partner-acquisition", "partner-contract"].includes(question.itemId) ? "ai-local-ecosystem"
      : ["resources", "resource-allocation"].includes(question.itemId) || question.id === "lpa-net-price" ? "ai-tce-finance"
      : "ai-gtm-operations";
    rules[owner].questionIds.push(question.id);
  }
  return rules;
}
