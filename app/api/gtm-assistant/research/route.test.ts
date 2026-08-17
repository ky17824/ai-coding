import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

describe("market research readiness scope", () => {
  it("does not use a fixed answer count", () => {
    expect(source).toContain("getMarketResearchScope");
    expect(source).not.toContain("length === 55");
    expect(source).toContain("survey_version,sales_motion");
  });

  it("uses Luna and public Top-Down evidence without private sizing overrides", () => {
    expect(source).toContain("const sharedRequest = {\n      model: ASSISTANT_MODEL");
    expect(source).toContain("const synthesisResponse = await");
    expect(source).not.toContain("MARKET_SIZING_MODEL");
    expect(source.match(/model: ASSISTANT_MODEL/g)).toHaveLength(4);
    expect(source).toContain('marketSizingMethodologyVersion === "market-sizing-v3-top-down"');
    expect(source).toContain("marketSizingV3TopDownUpgradeAttemptedAt");
    expect(source).not.toContain("privateSizingResponse");
    expect(source).not.toContain("mergeFounderSizingOverrides");
    expect(source).toContain("const privateFounderContext = Object.fromEntries");
    expect(source).toContain("absence of optional founder inputs as negative evidence or an evidence gap");
    expect(source).toContain("const constraintsMatch =");
    expect(source).toContain("constraintsMatch && existingPlan.market_research_locale");
  });

  it("drops only unverified citations and preserves verified research", () => {
    expect(source).toContain("stripUnverifiedSources");
    expect(source).toContain("droppedUrls");
    expect(source).not.toContain("if (unverifiedUrls.length > 0)");
  });

  it("finishes inside the platform deadline and uses the reduced search budget", () => {
    expect(source).toContain("export const maxDuration = 800");
    expect(source).toContain("RESEARCH_DEADLINE_MS = 285_000");
    expect(source).toContain("PUBLIC_RESEARCH_TIMEOUT_MS = 205_000");
    // A retry of a long call can never fit inside the deadline; SDK default retries pushed runs past Vercel's 300s kill.
    expect(source.match(/maxRetries: 0/g)).toHaveLength(5);
    expect(source).toContain('reasoning: { effort: "medium", context: "current_turn" },\n        max_tool_calls: 5');
    expect(source).toContain("SYNTHESIS_TIMEOUT_MS = 55_000");
    expect(source).toContain("max_tool_calls: 3");
    expect(source).toContain("max_tool_calls: 4");
    expect(source).toContain("max_tool_calls: 5");
    expect(source).not.toContain("max_tool_calls: 8");
  });

  it("uses the database attempt lifecycle instead of incrementing quota before research", () => {
    expect(source).toContain('rpc("reserve_market_research_attempt"');
    expect(source).toContain('rpc("complete_market_research_attempt"');
    expect(source).toContain('rpc("fail_market_research_attempt"');
    expect(source).not.toContain("market_research_count: reservationCount + 1");
    expect(source).toContain('timeout ? "research_timeout"');
  });

  it("keeps sanitized private documents out of tool-enabled requests", () => {
    const sharedRequest = source.slice(source.indexOf("const sharedRequest ="), source.indexOf("const sizingInstructions ="));
    expect(sharedRequest).not.toContain("sanitizedDocumentEvidence");
    expect(source).toContain("privateDocumentEvidence: sanitizedDocumentEvidence");
  });

  it("returns the durable research-limit state on cached and final responses", () => {
    expect(source).toContain("researchLimitReached: researchQuotaDecision(");
    expect(source).toContain("researchLimitReached: reservationCount >= 2");
  });
});
