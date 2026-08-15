import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

describe("market research readiness scope", () => {
  it("does not use a fixed answer count", () => {
    expect(source).toContain("getMarketResearchScope");
    expect(source).not.toContain("length === 55");
    expect(source).toContain("survey_version,sales_motion");
  });

  it("uses Sol for every market-research generation step", () => {
    expect(source).toContain("const sharedRequest = {\n      model: MARKET_SIZING_MODEL");
    expect(source).toContain("const [synthesisResponse, privateSizingResponse]");
    expect(source.match(/model: MARKET_SIZING_MODEL/g)).toHaveLength(3);
    expect(source.match(/model: ASSISTANT_MODEL/g)).toHaveLength(2);
    expect(source).toContain("const privateFounderContext = Object.fromEntries");
    expect(source).toContain("absence of optional founder inputs as negative evidence or an evidence gap");
    expect(source).toContain("const constraintsMatch =");
    expect(source).toContain("constraintsMatch && existingPlan.market_research_locale");
  });

  it("keeps sanitized private documents out of tool-enabled requests", () => {
    const sharedRequest = source.slice(source.indexOf("const sharedRequest ="), source.indexOf("const sizingInstructions ="));
    expect(sharedRequest).not.toContain("sanitizedDocumentEvidence");
    expect(source).toContain("privateDocumentEvidence: sanitizedDocumentEvidence");
  });
});
