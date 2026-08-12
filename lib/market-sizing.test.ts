import { describe, expect, it } from "vitest";
import { calculateMarketSizing, getMissingMarketSizingInputs, marketResearchContextSignature, marketSizingEvidenceSchema, normalizeMarketResearch, type MarketSizingEvidence } from "./market-sizing";

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
    methodologyVersion: "market-sizing-v1" as const,
    currency: "USD",
    referenceYear: 2026,
    marketDefinition: {
      included: "Target-country category buyers",
      excluded: "Unrelated categories",
      annualRevenueUnit: "Annual customer spend"
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
    expect(result[0].calculationInputs).toHaveLength(4);
    expect(result[3].calculationInputs[0]).toMatchObject({ unit: "count", sourceTitles: ["Official market data"] });
    expect(result[3].calculationInputs[0].sources[0].url).toBe("https://example.com/market");
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

  it("returns insufficient evidence instead of inventing a base estimate", () => {
    const input = evidence();
    input.tam.bottomUp.customerCount = null;

    const result = calculateMarketSizing(input, "en");

    expect(result[0]).toMatchObject({ status: "insufficient_evidence", range: null });
    expect(result[1]).toMatchObject({ status: "insufficient_evidence", range: null });
    expect(result[2]).toMatchObject({ status: "insufficient_evidence", range: null });
    expect(result[3].status).toBe("estimated");
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

  it("enforces the normal 0.5–5% SOM range at the schema boundary", () => {
    const input = evidence();
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
  });

  it("maps legacy LAM cards to Beachhead Market without rewriting stored data", () => {
    const normalized = normalizeMarketResearch({
      kind: "market_research",
      scope: "market_preresearch",
      targetCountry: "Singapore",
      targetCustomer: "Retailers",
      offeringName: "Lip balm",
      executiveSummary: "Summary",
      trends: [],
      marketSizing: [{
        label: "LAM",
        estimate: "$20K",
        method: "Pilot scope",
        assumptions: [],
        sourceTitles: []
      }],
      competitors: [],
      sellability: { available: false, verdict: "not_assessed", summary: "Not assessed", evidenceGaps: [] },
      nextExperiments: [],
      limitations: [],
      generatedAt: "2026-08-13T00:00:00.000Z",
      generatedBy: "gpt-5.6-luna"
    });

    expect(normalized?.marketSizing[0]).toMatchObject({
      key: "beachhead",
      label: "Beachhead Market",
      estimate: "$20K"
    });
  });
});
