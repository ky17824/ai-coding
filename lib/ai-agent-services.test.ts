import { describe, expect, it } from "vitest";
import {
  AI_AGENT_SERVICES,
  getAiAgentService,
  getAiAgentServices,
  matchAiAgentServices,
  resolveAiQuestionCatalogVersion
} from "@/lib/ai-agent-services";

describe("AI expert service catalog", () => {
  it("publishes seven specialists and four packages with unique stable ids", () => {
    expect(AI_AGENT_SERVICES).toHaveLength(11);
    expect(new Set(AI_AGENT_SERVICES.map((service) => service.id)).size).toBe(11);
    expect(AI_AGENT_SERVICES.filter((service) => service.productKind === "specialist")).toHaveLength(7);
    expect(AI_AGENT_SERVICES.filter((service) => service.productKind === "package")).toHaveLength(4);
  });

  it("uses the approved initial prices and includes the orchestrator", () => {
    expect(getAiAgentService("ai-market-intelligence", "ko")?.price).toBe(199000);
    expect(getAiAgentService("ai-comprehensive-entry", "ko")?.price).toBe(1190000);
    expect(AI_AGENT_SERVICES.every((service) => service.orchestrated)).toBe(true);
    const specialistQuestionIds = AI_AGENT_SERVICES.filter((service) => service.productKind === "specialist").flatMap((service) => service.questionIds);
    expect(specialistQuestionIds).toHaveLength(46);
    expect(new Set(specialistQuestionIds).size).toBe(46);
    expect(AI_AGENT_SERVICES.every((service) => service.completionInstructions.length === service.includedAgentIds.length)).toBe(true);
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

    expect(ko?.title).toBe("심층시장조사");
    expect(ko?.deliverables).toEqual([
      "후보국·ICP 비교",
      "시장규모 Top-Down 및 Bottom-Up 심화 TAM, SAM, SOM, Beachhead Market (low/base/high)",
      "경쟁구도·근거 원장"
    ]);
    expect(en?.title).toBe("In-depth Market Research");
    expect(en?.deliverables?.[1]).toBe("In-depth Top-Down and Bottom-Up TAM, SAM, SOM, and Beachhead Market sizing (low/base/high)");
    expect(ko?.completionInstructions?.[0]).toContain("Top-Down과 Bottom-Up을 각각 산정");
  });
});
