import { describe, expect, it } from "vitest";
import {
  AI_AGENT_SERVICES,
  getAiAgentService,
  getAiAgentServices,
  matchAiAgentServices,
  resolveAiQuestionCatalogVersion
} from "@/lib/ai-agent-services";

describe("AI expert service catalog", () => {
  it("re-exports the catalog through the legacy adapter", () => {
    expect(AI_AGENT_SERVICES.map((service) => service.id)).toEqual([
      "ai-market-intelligence", "ai-entry-requirements", "ai-partner-research",
      "ai-customer-validation", "ai-local-bmc", "ai-tce-finance", "ai-gtm-operations",
      "pkg-feasibility", "pkg-entry-design"
    ]);
    expect(AI_AGENT_SERVICES.every((service) => service.orchestrated)).toBe(true);
    expect(AI_AGENT_SERVICES.every((service) => service.completionInstructions.length === service.includedAgentIds.length)).toBe(true);
    const specialistQuestionIds = AI_AGENT_SERVICES.filter((service) => service.productKind === "specialist").flatMap((service) => service.questionIds);
    expect(specialistQuestionIds).toHaveLength(46);
    expect(new Set(specialistQuestionIds).size).toBe(46);
  });

  it("freezes question ownership to the paid assessment version", () => {
    const v4 = getAiAgentServices("ko", "4.0")
      .filter((service) => service.productKind === "specialist")
      .flatMap((service) => service.questionIds ?? []);
    const v5 = getAiAgentServices("ko", "5.0")
      .filter((service) => service.productKind === "specialist")
      .flatMap((service) => service.questionIds ?? []);
    expect(v4).toHaveLength(55);
    expect(new Set(v4).size).toBe(55);
    expect(v5).toHaveLength(46);
    expect(new Set(v5).size).toBe(46);
    expect(Object.fromEntries(getAiAgentServices("ko", "4.0").filter((service) => service.productKind === "specialist").map((service) => [service.id, service.questionIds]))).toEqual({
      "ai-market-intelligence": ["mkt-icp-count", "mkt-icp-source", "mkt-inbound-signal", "mkt-country-compare", "mkt-bias-check"],
      "ai-customer-validation": ["pmf-paid-conversion", "pmf-churn-cases", "pmf-buying-roles", "pmf-customer-words", "test-environment", "test-defects", "test-message-worked", "test-no-discount", "test-counter-evidence"],
      "ai-local-bmc": ["bmlc-local-practice", "bmlc-hq-gap", "lpa-pricing-payment", "lpa-journey-blocker"],
      "ai-entry-requirements": ["bmlc-classification", "bmlc-preconditions", "bmlc-na-basis"],
      "ai-partner-research": ["lpa-infra-partner", "lpa-bridge-person", "partner-actual-work", "partner-economics", "partner-ecosystem-interviews", "partner-shortfall", "partner-cold-check", "contract-control", "contract-exit", "contract-switch-cost", "contract-dependency-limit"],
      "ai-tce-finance": ["res-tce", "res-cash-runway", "res-no-grant-scope", "res-owner-time", "res-key-person-risk", "lpa-net-price", "alloc-milestone-budget", "alloc-capacity", "alloc-conditional-limit", "alloc-concentration"],
      "ai-gtm-operations": ["mvc-purpose-alignment", "mvc-stop-criteria", "mvc-resource-priority", "mvc-reference-market", "plan-hypothesis-kpi", "plan-stop-rule", "plan-single-tracker", "plan-change-control", "org-single-owner", "org-continuity", "org-decision-cases", "org-local-authority", "org-escalation"]
    });
    expect(Object.fromEntries(getAiAgentServices("ko", "5.0").filter((service) => service.productKind === "specialist").map((service) => [service.id, service.questionIds]))).toEqual({
      "ai-market-intelligence": ["mkt-icp-count", "mkt-country-compare"],
      "ai-customer-validation": ["pmf-paid-conversion", "pmf-churn-cases", "pmf-buying-roles", "pmf-customer-words", "test-environment", "test-defects", "test-message-worked", "test-no-discount", "test-counter-evidence"],
      "ai-local-bmc": ["bmlc-local-practice", "lpa-journey-blocker"],
      "ai-entry-requirements": ["bmlc-classification", "bmlc-preconditions", "bmlc-na-basis"],
      "ai-partner-research": ["lpa-infra-partner", "lpa-bridge-person", "partner-actual-work", "partner-economics", "partner-ecosystem-interviews", "partner-shortfall", "partner-cold-check", "contract-control", "contract-exit", "contract-switch-cost", "contract-dependency-limit"],
      "ai-tce-finance": ["res-tce", "res-cash-runway", "res-no-grant-scope", "res-owner-time", "lpa-net-price", "alloc-milestone-budget", "alloc-capacity", "alloc-concentration"],
      "ai-gtm-operations": ["mvc-purpose-alignment", "mvc-resource-priority", "mvc-reference-market", "plan-hypothesis-kpi", "plan-stop-rule", "plan-single-tracker", "plan-change-control", "org-single-owner", "org-continuity", "org-local-authority", "org-escalation"]
    });
  });

  it("uses the rollout catalog when a new order has no assessment", () => {
    expect(resolveAiQuestionCatalogVersion(null, "5.0")).toBe("5.0");
    expect(resolveAiQuestionCatalogVersion("4.0", "5.0")).toBe("4.0");
  });

  it("localizes catalog copy and matches readiness action tags", () => {
    expect(getAiAgentServices("en")[0]?.providerName).toBe("Borderless AI Expert");
    expect(matchAiAgentServices("market-sizing", "ko")[0]?.id).toBe("ai-market-intelligence");
  });

  it("presents market intelligence as in-depth market research", () => {
    const ko = getAiAgentService("ai-market-intelligence", "ko");
    const en = getAiAgentService("ai-market-intelligence", "en");

    expect(ko?.title).toBe("심층 시장조사");
    expect(ko?.deliverables).toEqual([
      "후보 국가와 목표 고객 비교",
      "시장규모 추정: 하향식·상향식 TAM·SAM·SOM과 교두보 시장 (최소·기준·최대)",
      "경쟁 구도와 근거 목록"
    ]);
    expect(en?.title).toBe("In-depth Market Research");
    expect(en?.deliverables?.[1]).toBe("In-depth Top-Down and Bottom-Up TAM, SAM, SOM, and Beachhead Market sizing (low/base/high)");
    expect(ko?.completionInstructions?.[0]).toContain("Top-Down과 Bottom-Up을 각각 산정");
  });

  it("uses plain Korean service names", () => {
    expect(getAiAgentService("ai-local-bmc", "ko")?.title).toBe("현지화 사업모델 설계");
    expect(getAiAgentService("ai-local-bmc", "en")?.title).toBe("Local Business Model Design");
    expect(getAiAgentService("ai-tce-finance", "ko")?.title).toBe("진입 비용·자금 계획");
    expect(getAiAgentService("ai-tce-finance", "en")?.title).toBe("Entry Cost & Funding Plan");
    // 필요정보는 상품별로 달라졌다. 상세 계약은 lib/catalog/catalog.test.ts가 검증한다.
    expect(getAiAgentService("pkg-entry-design", "ko")?.requiredInputs?.[0]).toContain("목표 국가와 고객");
  });
});
