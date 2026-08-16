import type { Locale } from "@/lib/i18n";
import type { SurveyVersion } from "@/lib/intake-questions";
import {
  buildSpecialistRules,
  getCatalogService,
  getCatalogServices,
  listCatalogProducts,
  localizeCatalogProduct,
  OFFICIAL_SOURCE_AGENT_ID
} from "@/lib/catalog";

/**
 * 상품·가격·문구·규칙의 정의는 전부 `lib/catalog`에 있다. 이 파일은 기존 호출부가
 * 그대로 동작하도록 남겨둔 얇은 어댑터다. 상품을 고칠 일이 있으면 카탈로그를 고친다.
 */
export const AI_AGENT_SERVICES = listCatalogProducts().map((product) => {
  const rules = buildSpecialistRules("5.0");
  const productRules = product.includedAgentIds.map((id) => rules[id]).filter(Boolean);
  return {
    ...product,
    orchestrated: true as const,
    questionIds: [...new Set(productRules.flatMap((rule) => rule.questionIds))],
    officialSourceQuestionIds: product.includedAgentIds.includes(OFFICIAL_SOURCE_AGENT_ID)
      ? rules[OFFICIAL_SOURCE_AGENT_ID].questionIds
      : [],
    completionInstructions: productRules.map((rule) => rule.instructions)
  };
});

export function getAiAgentServices(locale: Locale = "ko", version: SurveyVersion = "5.0") {
  return getCatalogServices(locale, version);
}

export function getAiAgentService(id: string, locale: Locale = "ko", version: SurveyVersion = "5.0") {
  return getCatalogService(id, locale, version);
}

export function matchAiAgentServices(tag: string, locale: Locale = "ko") {
  return getAiAgentServices(locale).filter((service) => service.tags.includes(tag));
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

export { localizeCatalogProduct };
