import { describe, expect, it } from "vitest";
import { buildMarketResearchCoverage, calculateMarketSizing, getMissingMarketSizingInputs, marketResearchContextSignature, marketSizingEvidenceSchema, marketSizingScenarioMatchesCountry, mergeFounderSizingOverrides, normalizeMarketResearch, type MarketSizingEvidence } from "./market-sizing";
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
const filterKinds = ["demographic", "employment", "income", "behavior", "channel"] as const;
const scenarioFilters = (inactive?: (typeof filterKinds)[number]) => filterKinds.map((kind) => ({
  kind,
  name: kind,
  active: kind !== inactive,
  factor: kind === "demographic" ? range(0.5, 0.5, 0.5) : range(1, 1, 1),
  sources: [source]
}));

function evidence(): MarketSizingEvidence {
  return {
    methodologyVersion: "market-sizing-v2" as const,
    currency: "USD",
    referenceYear: 2026,
    marketDefinition: {
      included: "Target-country category buyers",
      excluded: "Unrelated categories",
      annualRevenueUnit: "Annual customer spend"
    },
    scenarioAnalysis: {
      decisionVariable: "Income threshold",
      selectedScenario: "A" as const,
      scenarios: [
        {
          key: "A" as const,
          country: "Singapore",
          definition: "Founder ICP",
          startingPopulation: range(1800, 2000, 2200),
          startingPopulationSources: [source],
          filters: scenarioFilters(),
          annualRevenuePerCustomer: range(900, 1000, 1100),
          annualRevenuePerCustomerSources: [source],
          recommendation: "selected" as const,
          rationale: "Matches the founder target"
        },
        {
          key: "B" as const,
          country: "Singapore",
          definition: "Broader ICP",
          startingPopulation: range(1800, 2000, 2200),
          startingPopulationSources: [source],
          filters: scenarioFilters("demographic"),
          annualRevenuePerCustomer: range(850, 950, 1050),
          annualRevenuePerCustomerSources: [source],
          recommendation: "review" as const,
          rationale: "Tests removal of the income threshold"
        },
        {
          key: "C" as const,
          country: "Malaysia",
          definition: "Same ICP in an alternate market",
          startingPopulation: range(3000, 3500, 4000),
          startingPopulationSources: [source],
          filters: scenarioFilters(),
          annualRevenuePerCustomer: range(700, 800, 900),
          annualRevenuePerCustomerSources: [source],
          recommendation: "review" as const,
          rationale: "Tests a larger nearby market"
        }
      ]
    },
    tam: {
      status: "estimated" as const,
      bottomUp: {
        customerCount: range(900, 1000, 1100),
        annualRevenuePerCustomer: range(900, 1000, 1100),
        formula: "Customer count × annual revenue per customer",
        customerCountSources: [source],
        annualRevenuePerCustomerSources: [source]
      },
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
      sensitivityDrivers: ["Customer count"]
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
      capacityRevenue: range(10_000, 25_000, 60_000),
      shareSources: [source],
      capacitySources: [source],
      assumptions: [],
      evidenceGaps: [],
      sensitivityDrivers: ["Sales capacity"]
    },
    beachhead: {
      status: "estimated" as const,
      segment: "Singapore clean-beauty retailers",
      customerCount: range(20, 25, 30),
      annualRevenuePerCustomer: range(900, 1000, 1100),
      customerCountSources: [source],
      annualRevenuePerCustomerSources: [source],
      cohesion: {
        buysSimilarProducts: true,
        similarSalesCycle: true,
        wordOfMouthPotential: true,
        notes: "A concentrated retailer community"
      },
      expansionPath: ["Malaysia specialty retail", "ASEAN ecommerce"],
      assumptions: [],
      evidenceGaps: [],
      sensitivityDrivers: ["Reachable retailer count"]
    }
  };
}

describe("market sizing", () => {
  it("merges only founder overrides without changing public evidence", () => {
    const input = evidence();
    const publicTopDown = structuredClone(input.tam.topDownPaths);
    const merged = mergeFounderSizingOverrides(input, {
      tamCustomerCount: range(30, 40, 50),
      tamAnnualRevenuePerCustomer: range(100, 120, 140),
      somCapacityRevenue: range(5_000, 8_000, 10_000),
      beachheadCustomerCount: range(10, 20, 30),
      beachheadAnnualRevenuePerCustomer: range(100, 120, 140)
    }, "2026-08-13", "en");

    expect(merged.tam.topDownPaths).toEqual(publicTopDown);
    expect(merged.tam.bottomUp.customerCountSources[0]).toMatchObject({ kind: "founder_input", url: null });
    expect(merged.som.capacityRevenue?.base).toBe(8_000);
    expect(input.tam.bottomUp.customerCount?.base).toBe(1_000);
    const tam = calculateMarketSizing(merged, "en")[0];
    expect(tam.calculationInputs.some((entry) => entry.name.startsWith("Scenario A"))).toBe(false);
    expect(tam.calculationInputs.map((entry) => entry.name)).toEqual(expect.arrayContaining([
      "Founder customer/end-user count", "Founder annual revenue per customer"
    ]));
  });

  it("recomputes TAM, SAM, SOM, and a directly counted Beachhead Market", () => {
    const input = evidence();
    expect(marketSizingEvidenceSchema.safeParse(input).success).toBe(true);
    const result = calculateMarketSizing(input, "en");

    expect(result.map((entry) => entry.key)).toEqual(["tam", "sam", "som", "beachhead"]);
    expect(result[0].range?.base).toBe(975_000);
    expect(result[1].range?.base).toBe(390_000);
    expect(result[2].range?.base).toBe(11_700);
    expect(result[3].range?.base).toBe(25_000);
    expect(result[0].validation).toContain("top-down/bottom-up variance 5.1%");
    expect(result[0].calculationInputs).toHaveLength(9);
    expect(result[3].calculationInputs[0]).toMatchObject({ unit: "count", sourceTitles: ["Official market data"] });
    expect(result[3].calculationInputs[0].sources[0].url).toBe("https://example.com/market");
    expect(result[3].validation).toContain("Beachhead is below the US$5 million planning benchmark; treat this as a warning, not a hard rejection.");
  });

  it("derives the selected ICP customer count from structured funnel stages", () => {
    const input = evidence();
    input.tam.bottomUp.customerCount = range(9_000_000, 10_000_000, 11_000_000);

    const result = calculateMarketSizing(input, "en");

    expect(result[0].range?.base).toBe(975_000);
    expect(result[0].calculationInputs[0]).toMatchObject({ name: "Scenario A starting population", base: 2000 });
    expect(result[0].assumptions.join(" ")).toContain("Scenario B TAM");
    expect(result[0].validation).toContain("Selected ICP scenario A · Income threshold");
  });

  it("keeps the selected sizing scenario in the founder target country", () => {
    const input = evidence();

    expect(marketSizingScenarioMatchesCountry(input, "Singapore")).toBe(true);
    input.scenarioAnalysis.selectedScenario = "B";
    input.scenarioAnalysis.scenarios[1].country = "Malaysia";
    expect(marketSizingScenarioMatchesCountry(input, "Singapore")).toBe(false);
  });

  it("shows only active Scenario B inputs and a server-owned formula", () => {
    const input = evidence();
    input.scenarioAnalysis.selectedScenario = "B";
    input.scenarioAnalysis.scenarios[0].recommendation = "review";
    input.scenarioAnalysis.scenarios[1].recommendation = "selected";
    input.tam.bottomUp.formula = "Ignore the ICP funnel and use all buyers";

    const tam = calculateMarketSizing(input, "en")[0];

    expect(tam.formula).not.toContain("Ignore");
    expect(tam.calculationInputs.some((entry) => entry.name === "demographic")).toBe(false);
    expect(tam.formula).not.toContain("demographic");
    expect(tam.formula).toContain("employment × income × behavior × channel");
  });

  it("caps SOM at the stated operational capacity", () => {
    const input = evidence();
    input.som.capacityRevenue = range(5_000, 8_000, 10_000);

    expect(calculateMarketSizing(input, "en")[2].range).toMatchObject({
      low: 2_905,
      base: 8_000,
      high: 10_000
    });
  });

  it("uses the public ICP funnel when founder bottom-up inputs are unavailable", () => {
    const input = evidence();
    input.tam.bottomUp.customerCount = null;
    input.tam.bottomUp.annualRevenuePerCustomer = null;
    input.tam.bottomUp.customerCountSources = [];
    input.tam.bottomUp.annualRevenuePerCustomerSources = [];

    const result = calculateMarketSizing(input, "en");

    expect(result[0]).toMatchObject({ status: "estimated", range: range(830_000, 975_000, 1_155_000), confidence: "high" });
    expect(result[0].evidenceGaps).not.toContain("Countable customers and annual revenue per customer");
    expect(result[1]).toMatchObject({ status: "estimated", range: range(290_500, 390_000, 519_750) });
    expect(result[2]).toMatchObject({ status: "estimated", range: range(2_905, 11_700, 25_987.5) });
    expect(result[3].status).toBe("estimated");
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
    input.tam.topDownPaths.pop();
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
    input.beachhead.customerCountSources = [stale];

    const result = calculateMarketSizing(input, "en");

    expect(result.slice(1).map((entry) => entry.status)).toEqual([
      "insufficient_evidence", "insufficient_evidence", "insufficient_evidence"
    ]);
  });

  it("applies the same recency gate to sourced proxy assumptions", () => {
    const input = evidence();
    input.som.capacitySources = [{ ...source, kind: "proxy_assumption", publishedAt: "2020-01-01" }];

    expect(calculateMarketSizing(input, "en")[2].status).toBe("insufficient_evidence");
  });

  it("rejects incomplete scenario sets and future-dated sizing evidence", () => {
    const input = evidence();
    input.scenarioAnalysis.scenarios[2].key = "B";
    input.scenarioAnalysis.scenarios[0].startingPopulationSources[0] = { ...source, checkedAt: "2099-01-01" };

    const result = calculateMarketSizing(input, "en");

    expect(result[0].status).toBe("insufficient_evidence");
    expect(result[0].evidenceGaps.join(" ")).toContain("A, B, and C");
    expect(result[0].evidenceGaps.join(" ")).toContain("future");
  });

  it("rejects missing ICP stages and impossible calendar dates", () => {
    const input = evidence();
    input.scenarioAnalysis.scenarios[0].filters[4].kind = "behavior";
    input.scenarioAnalysis.scenarios[0].startingPopulationSources[0] = { ...source, checkedAt: "2026-99-99" };

    const result = calculateMarketSizing(input, "en");

    expect(result[0].status).toBe("insufficient_evidence");
    expect(result[0].evidenceGaps.join(" ")).toContain("demographic, employment, income, behavior, and channel");
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
