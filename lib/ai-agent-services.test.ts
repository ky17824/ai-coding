import { describe, expect, it } from "vitest";
import {
  AI_AGENT_SERVICES,
  getAiAgentService,
  getAiAgentServices,
  matchAiAgentServices
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
    expect(specialistQuestionIds).toHaveLength(55);
    expect(new Set(specialistQuestionIds).size).toBe(55);
    expect(AI_AGENT_SERVICES.every((service) => service.completionInstructions.length === service.includedAgentIds.length)).toBe(true);
  });

  it("localizes catalog copy and matches readiness action tags", () => {
    expect(getAiAgentServices("en")[0]?.providerName).toBe("Borderless AI Expert");
    expect(matchAiAgentServices("market-sizing", "ko")[0]?.id).toBe("ai-market-intelligence");
  });
});
