import { describe, expect, it } from "vitest";
import { buildMarketResearchCoverage, calculateMarketSizing, getMissingMarketSizingInputs, marketResearchContextSignature, marketSizingEvidenceSchema, marketSizingMatchesCountry, normalizeMarketResearch, type MarketSizingEvidence } from "./market-sizing";
import type { GtmMarketCompetitor, GtmMarketTrend, GtmResearchSource } from "./types";

const range = (low: number, base: number, high: number) => ({ low, base, high });
const source = {
  title: "Official market data",
  url: "https://example.com/market",
  publisher: "Example Statistics",
  publishedAt: "2025-06-01",
  checkedAt: "2026-08-13",
  kind: "fact" as const
};
const source2 = { ...source, title: "Independent market data", url: "https://example.org/market", publisher: "Independent Statistics" };
function evidence(): MarketSizingEvidence {
  return {
    methodologyVersion: "market-sizing-v3-top-down" as const,
    targetCountry: "Singapore",
    currency: "USD",
    referenceYear: 2026,
    marketDefinition: {
      included: "Target-country category buyers",
      excluded: "Unrelated categories",
      annualRevenueUnit: "Annual customer spend"
    },
    tam: {
      status: "estimated" as const,
      topDownPaths: [{
        name: "Country category revenue A",
        range: range(900_000, 950_000, 1_050_000),
        formula: "Published category revenue",
        sources: [source2]
      }, {
        name: "Country category revenue B",
        range: range(800_000, 950_000, 1_150_000),
        formula: "Parent market × target-segment share",
        sources: [source]
      }],
      cagrPercent: range(5, 7, 9),
      assumptions: [],
      evidenceGaps: [],
      sensitivityDrivers: ["Published market range"]
    },
    sam: {
      status: "estimated" as const,
      filters: [{
        kind: "geography" as const,
        name: "Reachable target segment",
        factor: range(0.35, 0.4, 0.45),
        sources: [source]
      }, ...(["customer_fit", "channel", "regulatory"] as const).map((kind) => ({
        kind,
        name: kind,
        factor: range(1, 1, 1),
        sources: [source]
      }))],
      regulationPrerequisite: "Local product registration",
      assumptions: [],
      evidenceGaps: [],
      sensitivityDrivers: ["Segment eligibility"]
    },
    som: {
      status: "estimated" as const,
      horizonYears: 3,
      sharePercent: range(1, 3, 5),
      shareSources: [source],
      assumptions: [],
      evidenceGaps: [],
      sensitivityDrivers: ["Obtainable share"]
    },
    beachhead: {
      status: "estimated" as const,
      segment: "Singapore clean-beauty retailers",
      shareOfSam: range(0.1, 0.2, 0.3),
      shareSources: [source],
      cohesion: {
        buysSimilarProducts: true,
        similarSalesCycle: true,
        wordOfMouthPotential: true,
        notes: "A concentrated retailer community"
      },
      expansionPath: ["Malaysia specialty retail", "ASEAN ecommerce"],
      assumptions: [],
      evidenceGaps: [],
      sensitivityDrivers: ["First-segment share"]
    }
  };
}

describe("market sizing", () => {
  it("recomputes TAM, SAM, SOM, and Beachhead Market using Top-Down evidence only", () => {
    const input = evidence();
    expect(marketSizingEvidenceSchema.safeParse(input).success).toBe(true);
    const result = calculateMarketSizing(input, "en");

    expect(result.map((entry) => entry.key)).toEqual(["tam", "sam", "som", "beachhead"]);
    expect(result.map((entry) => entry.method)).toEqual(["top_down", "top_down", "top_down", "top_down"]);
    expect(result[0].range).toMatchObject(range(850_000, 950_000, 1_100_000));
    expect(result[1].range).toMatchObject(range(297_500, 380_000, 495_000));
    expect(result[2].range).toMatchObject(range(2_975, 11_400, 24_750));
    expect(result[3].range).toMatchObject(range(29_750, 76_000, 148_500));
    expect(result.flatMap((entry) => entry.sources).some((entry) => entry.kind === "founder_input")).toBe(false);
  });

  it("keeps Top-Down evidence in the founder target country", () => {
    const input = evidence();

    expect(marketSizingMatchesCountry(input, "Singapore")).toBe(true);
    input.targetCountry = "Malaysia";
    expect(marketSizingMatchesCountry(input, "Singapore")).toBe(false);
  });

  it("rejects founder inputs from Top-Down evidence", () => {
    const input = structuredClone(evidence()) as unknown as {
      tam: { topDownPaths: Array<{ sources: Array<Record<string, unknown>> }> };
    };
    input.tam.topDownPaths[0].sources[0] = { ...source, kind: "founder_input" };

    expect(marketSizingEvidenceSchema.safeParse(input).success).toBe(false);
  });

  it("derives estimate status from validated evidence instead of model status flags", () => {
    const input = evidence();
    input.tam.status = "insufficient_evidence";
    input.sam.status = "insufficient_evidence";
    input.som.status = "insufficient_evidence";
    input.beachhead.status = "insufficient_evidence";

    expect(calculateMarketSizing(input, "en").map((entry) => entry.status)).toEqual([
      "estimated", "estimated", "estimated", "estimated"
    ]);
  });

  it("requires two top-down paths and all three Beachhead cohesion checks", () => {
    const input = evidence();
    input.tam.topDownPaths = [input.tam.topDownPaths[0]] as typeof input.tam.topDownPaths;
    input.beachhead.cohesion.wordOfMouthPotential = false;

    const result = calculateMarketSizing(input, "en");

    expect(result[0].status).toBe("insufficient_evidence");
    expect(result[3].status).toBe("insufficient_evidence");
  });

  it("turns stale or untraceable evidence into named gaps instead of throwing", () => {
    const input = evidence();
    input.tam.topDownPaths[0].sources[0] = { ...source, url: null, publishedAt: null };

    const result = calculateMarketSizing(input, "en");

    expect(result[0].status).toBe("insufficient_evidence");
    expect(result[0].evidenceGaps.join(" ")).toContain("source URL and publication date");
  });

  it("enforces the normal 1–5% SOM range at the schema boundary", () => {
    const input = evidence();
    input.som.sharePercent = range(0.5, 1, 2);
    expect(marketSizingEvidenceSchema.safeParse(input).success).toBe(false);
    input.som.sharePercent = range(10, 20, 30);

    expect(marketSizingEvidenceSchema.safeParse(input).success).toBe(false);
    input.som.sharePercent = range(1, 3, 5);
    input.som.horizonYears = 2;
    expect(marketSizingEvidenceSchema.safeParse(input).success).toBe(false);
  });

  it("blocks stale fact sources in SAM, SOM, and Beachhead inputs", () => {
    const input = evidence();
    const stale = { ...source, publishedAt: "2020-01-01" };
    input.sam.filters[0].sources = [stale];
    input.som.shareSources = [stale];
    input.beachhead.shareSources = [stale];

    const result = calculateMarketSizing(input, "en");

    expect(result.slice(1).map((entry) => entry.status)).toEqual([
      "insufficient_evidence", "insufficient_evidence", "insufficient_evidence"
    ]);
  });

  it("applies the same recency gate to sourced proxy assumptions", () => {
    const input = evidence();
    input.som.shareSources = [{ ...source, kind: "proxy_assumption", publishedAt: "2020-01-01" }];

    expect(calculateMarketSizing(input, "en")[2].status).toBe("insufficient_evidence");
  });

  it("rejects future-dated sizing evidence", () => {
    const input = evidence();
    input.tam.topDownPaths[0].sources[0] = { ...source, checkedAt: "2099-01-01" };

    const result = calculateMarketSizing(input, "en");

    expect(result[0].status).toBe("insufficient_evidence");
    expect(result[0].evidenceGaps.join(" ")).toContain("future");
  });

  it("rejects incomplete SAM filters and impossible calendar dates", () => {
    const input = evidence();
    input.sam.filters.pop();
    input.tam.topDownPaths[0].sources[0] = { ...source, checkedAt: "2026-99-99" };

    const result = calculateMarketSizing(input, "en");

    expect(result[0].status).toBe("insufficient_evidence");
    expect(result[1].status).toBe("insufficient_evidence");
    expect(result[1].evidenceGaps.join(" ")).toContain("regulatory");
    expect(result[0].evidenceGaps.join(" ")).toContain("valid ISO calendar dates");
  });

  it("preflights sizing inputs and invalidates signatures when research evidence changes", () => {
    const complete = {
      expectedPrice: "US$120/year",
      annualPurchaseFrequency: "annual",
      initialReachableCustomers: "30 retailers",
      threeYearSalesCapacity: "US$500K",
      validationEvidence: "5 interviews"
    };

    expect(getMissingMarketSizingInputs({ ...complete, threeYearSalesCapacity: "" })).toEqual(["threeYearSalesCapacity"]);
    expect(marketResearchContextSignature(complete)).not.toBe(marketResearchContextSignature({ ...complete, validationEvidence: "10 interviews" }));
    expect(marketResearchContextSignature({ ...complete, validationEvidence: "founder@example.com" }))
      .toBe(marketResearchContextSignature({ ...complete, validationEvidence: "[이메일]" }));
    expect(marketResearchContextSignature(complete, ["sha-a"]))
      .not.toBe(marketResearchContextSignature(complete, ["sha-b"]));
    expect(marketResearchContextSignature(complete, ["sha-b", "sha-a"]))
      .toBe(marketResearchContextSignature(complete, ["sha-a", "sha-b"]));
  });

  it("maps legacy LAM cards to Beachhead Market without rewriting stored data", () => {
    const normalized = normalizeMarketResearch({
      kind: "market_research",
      scope: "market_preresearch",
      targetCountry: "Singapore",
      targetCustomer: "Retailers",
      offeringName: "Lip balm",
      executiveSummary: "Summary",
      trends: [{ title: "Demand", finding: "Growing", sourceTitle: "Retail report", url: "https://retail.example/market" }],
      marketSizing: [{
        label: "LAM",
        estimate: "$20K",
        method: "LAM = reachable outlets × annual revenue",
        assumptions: ["LAM uses the pilot scope"],
        sourceTitles: []
      }],
      competitors: [{ name: "Brand A", type: "direct", relevance: "Same customer", differentiationGap: "Price", sourceTitle: "Brand A", url: "https://brand.example" }],
      sellability: { available: false, verdict: "not_assessed", summary: "Not assessed", evidenceGaps: [] },
      nextExperiments: [],
      limitations: [],
      generatedAt: "2026-08-13T00:00:00.000Z",
      generatedBy: "gpt-5.6-luna"
    });

    expect(normalized?.marketSizing[0]).toMatchObject({
      key: "beachhead",
      label: "Beachhead Market",
      estimate: "$20K",
      formula: "Beachhead Market = reachable outlets × annual revenue",
      assumptions: ["Beachhead Market uses the pilot scope"]
    });
    expect(normalized).toMatchObject({
      researchMethodologyVersion: "legacy",
      trends: [{ category: "demand", implication: "", sources: [{ title: "Retail report" }] }],
      competitors: [{ marketPresence: "global", channels: [], sources: [{ title: "Brand A" }] }],
      researchCoverage: { sourceCount: 2, uniqueDomainCount: 2, competitorCount: 1 }
    });
  });

  it("preserves the Top-Down methodology when reading saved research", () => {
    const normalized = normalizeMarketResearch({
      kind: "market_research",
      scope: "market_preresearch",
      marketSizing: [],
      marketSizingMethodologyVersion: "market-sizing-v3-top-down"
    });

    expect(normalized?.marketSizingMethodologyVersion).toBe("market-sizing-v3-top-down");
  });

  it("marks the eight-lane, diversified research target as covered", () => {
    const kinds: GtmResearchSource["kind"][] = ["government", "industry", "industry", "retail", "retail", "company", "company", "company", "consumer", "media", "media", "media", "media", "media", "media"];
    const researchSource = (index: number): GtmResearchSource => ({ title: `Source ${index}`, url: `https://source${index}.example/report`, publisher: `Publisher ${index}`, publishedAt: "2026-01-01", checkedAt: "2026-08-13", kind: kinds[index] });
    const categories: GtmMarketTrend["category"][] = ["demand", "customer_behavior", "channel", "regulation", "product_culture"];
    const trends = categories.map((category, index) => ({ category, title: `Trend ${index}`, finding: "Finding", implication: "Implication", confidence: "medium" as const, freshness: "current" as const, sources: [researchSource(index)], sourceTitle: `Source ${index}`, url: `https://source${index}.example/report` }));
    const competitors = Array.from({ length: 10 }, (_, index): GtmMarketCompetitor => ({ name: `Competitor ${index}`, type: index < 4 ? "direct" : index < 7 ? "adjacent" : "alternative", marketPresence: index < 4 ? "local" : index < 7 ? "regional" : "global", pricePositioning: "mid", targetCustomer: "Target customer", valueProposition: "Value", channels: [], strengths: [], weaknesses: [], relevance: "Relevant", differentiationGap: "Gap", confidence: "medium", freshness: "current", sources: [researchSource(index + 5)], sourceTitle: `Source ${index + 5}`, url: `https://source${index + 5}.example/report` }));

    expect(buildMarketResearchCoverage(trends, competitors)).toMatchObject({
      lanes: expect.arrayContaining(["demand", "customer_behavior", "channel", "regulation", "product_culture", "direct_competitors", "adjacent_competitors", "substitutes"]),
      sourceCount: 15,
      uniqueDomainCount: 15,
      competitorCount: 10,
      coverageGaps: []
    });
  });
});
