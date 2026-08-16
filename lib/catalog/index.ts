import type { Locale } from "@/lib/i18n";
import type { SurveyVersion } from "@/lib/intake-questions";
import type { ServiceOffering } from "@/lib/types";
import { CATALOG_PRODUCTS } from "./products";
import { BOUNDARY_INTRO, HUMAN_BOUNDARY, PRODUCT_COPY, PROVIDER, REQUIRED_INPUT_BY_AGENT, SHARED_REQUIRED_INPUT, TIER_BADGE, TIER_FIRST_STEP } from "./copy";
import { buildSpecialistRules, OFFICIAL_SOURCE_AGENT_ID } from "./rules";
import { LABOR_RATES, PLATFORM_FEE_RATE, type CatalogProduct, type Phase } from "./types";

export type { CatalogProduct, Phase, Tier } from "./types";
export { CATALOG_PRODUCTS } from "./products";
export { TIER_BADGE, BOUNDARY_INTRO, TIER_FIRST_STEP } from "./copy";
export { buildSpecialistRules, OFFICIAL_SOURCE_AGENT_ID } from "./rules";
export { LABOR_RATES, PLATFORM_FEE_RATE } from "./types";

/**
 * 2차(전문가 결합) 상품 노출 여부. 전문가 공급이 확보되기 전에는 꺼둔다.
 * 꺼져 있으면 목록·상세·결제 어느 경로로도 phase 2 상품에 도달할 수 없다.
 */
export function humanExpertProductsEnabled() {
  return process.env.HUMAN_EXPERT_PRODUCTS_ENABLED === "true";
}

function visiblePhases(): Phase[] {
  return humanExpertProductsEnabled() ? [1, 2] : [1];
}

export function listCatalogProducts(): CatalogProduct[] {
  const phases = visiblePhases();
  return CATALOG_PRODUCTS.filter((product) => phases.includes(product.phase));
}

export function getCatalogProduct(id: string): CatalogProduct | null {
  return listCatalogProducts().find((product) => product.id === id) ?? null;
}

/** 인건비 합계(원). 전문가 상품의 정산 하한이다. */
export function laborCost(product: CatalogProduct) {
  return (product.labor ?? []).reduce((total, unit) => total + LABOR_RATES[unit.role] * unit.hours, 0);
}

/** 전문가 수취액(원). AI 몫은 플랫폼이 전액 가져가고 인건비 부분만 정률로 나눈다. */
export function expertPayout(product: CatalogProduct) {
  const labor = laborCost(product);
  if (!labor) return 0;
  return Math.round((product.price - (product.aiPortion ?? 0)) * (1 - PLATFORM_FEE_RATE));
}

/**
 * 포함 상품의 낱개 가격 합계. `includedAgentIds`를 재귀적으로 펼치고 중복을 제거한다.
 * 단순 합산하면 중첩 패키지와 중복 제공을 놓친다.
 */
export function partsTotal(product: CatalogProduct, seen = new Set<string>()): number {
  const parts = product.includedAgentIds.filter((id) => id !== product.id);
  if (parts.length === 0) return product.price;
  let total = 0;
  for (const id of parts) {
    if (seen.has(id)) continue;
    seen.add(id);
    const part = CATALOG_PRODUCTS.find((item) => item.id === id);
    if (part) total += partsTotal(part, seen);
  }
  return total;
}

export function localizeCatalogProduct(
  product: CatalogProduct,
  locale: Locale,
  rules: ReturnType<typeof buildSpecialistRules>
): ServiceOffering {
  const copy = PRODUCT_COPY[product.id];
  const productRules = product.includedAgentIds.map((id) => rules[id]).filter(Boolean);
  return {
    id: product.id,
    providerName: PROVIDER.name[locale],
    providerTitle: PROVIDER.title[locale],
    type: "ai_agent",
    title: copy.title[locale],
    description: copy.description[locale],
    price: product.price,
    durationLabel: PROVIDER.duration[locale],
    tags: product.tags,
    deliverables: copy.deliverables[locale],
    approved: true,
    rating: 0,
    reviewCount: 0,
    productKind: product.productKind,
    includedAgentIds: product.includedAgentIds,
    // 공통 입력 + 포함 전문가별 추가 입력. 무엇을 준비해야 하는지가 상품마다 다르다.
    requiredInputs: [
      SHARED_REQUIRED_INPUT[locale],
      ...new Set(product.includedAgentIds.map((id) => REQUIRED_INPUT_BY_AGENT[id]?.[locale]).filter(Boolean))
    ] as string[],
    questionIds: [...new Set(productRules.flatMap((rule) => rule.questionIds))],
    officialSourceQuestionIds: product.includedAgentIds.includes(OFFICIAL_SOURCE_AGENT_ID)
      ? rules[OFFICIAL_SOURCE_AGENT_ID].questionIds
      : [],
    completionInstructions: productRules.map((rule) => rule.instructions[locale]),
    // 포함된 전문가의 경계만 모은다. 패키지는 합집합, 중복은 제거.
    humanVerification: [...new Set(product.includedAgentIds.map((id) => HUMAN_BOUNDARY[id]?.[locale]).filter(Boolean))] as string[],
    tier: product.tier,
    tierLabel: TIER_BADGE[product.tier][locale],
    area: product.area
  };
}

export function getCatalogServices(locale: Locale = "ko", version: SurveyVersion = "5.0"): ServiceOffering[] {
  const rules = buildSpecialistRules(version);
  return listCatalogProducts().map((product) => localizeCatalogProduct(product, locale, rules));
}

export function getCatalogService(id: string, locale: Locale = "ko", version: SurveyVersion = "5.0") {
  const product = getCatalogProduct(id);
  return product ? localizeCatalogProduct(product, locale, buildSpecialistRules(version)) : null;
}
