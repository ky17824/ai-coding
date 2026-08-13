import { z } from "zod";
import type { Locale } from "@/lib/i18n";
import type {
  GtmFounderContext,
  GtmMarketCompetitor,
  GtmMarketResearch,
  GtmMarketSizingEntry,
  GtmMarketSizingSource,
  GtmMarketTrend,
  GtmResearchCoverage,
  GtmResearchLane,
  GtmResearchSource
} from "@/lib/types";
import { canonicalResearchUrl } from "@/lib/research-sources";

const rangeSchema = z.object({
  low: z.number().finite().nonnegative(),
  base: z.number().finite().nonnegative(),
  high: z.number().finite().nonnegative()
});

const factorRangeSchema = z.object({
  low: z.number().finite().min(0).max(1),
  base: z.number().finite().min(0).max(1),
  high: z.number().finite().min(0).max(1)
});

const cagrRangeSchema = z.object({
  low: z.number().finite().min(0).max(100),
  base: z.number().finite().min(0).max(100),
  high: z.number().finite().min(0).max(100)
});

const somShareRangeSchema = z.object({
  low: z.number().finite().min(1).max(5),
  base: z.number().finite().min(1).max(5),
  high: z.number().finite().min(1).max(5)
});

export const marketSizingSourceSchema = z.object({
  title: z.string().min(1).max(180),
  url: z.string().max(2048).nullable(),
  publisher: z.string().min(1).max(180),
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  checkedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind: z.enum(["fact", "founder_input", "proxy_assumption"])
});

const evidenceMeta = {
  assumptions: z.array(z.string().max(300)).max(8),
  evidenceGaps: z.array(z.string().max(300)).max(8),
  sensitivityDrivers: z.array(z.string().max(180)).max(6)
};

export const marketSizingEvidenceSchema = z.object({
  methodologyVersion: z.literal("market-sizing-v2"),
  currency: z.string().regex(/^[A-Z]{3}$/),
  referenceYear: z.number().int().min(2000).max(2100),
  marketDefinition: z.object({
    included: z.string().min(1).max(500),
    excluded: z.string().min(1).max(500),
    annualRevenueUnit: z.string().min(1).max(180)
  }),
  scenarioAnalysis: z.object({
    decisionVariable: z.string().min(1).max(180),
    selectedScenario: z.enum(["A", "B"]),
    scenarios: z.array(z.object({
      key: z.enum(["A", "B", "C"]),
      country: z.string().min(1).max(100),
      definition: z.string().min(1).max(300),
      startingPopulation: rangeSchema,
      startingPopulationSources: z.array(marketSizingSourceSchema).min(1).max(6),
      filters: z.array(z.object({
        kind: z.enum(["demographic", "employment", "income", "behavior", "channel"]),
        name: z.string().min(1).max(180),
        active: z.boolean(),
        factor: factorRangeSchema,
        sources: z.array(marketSizingSourceSchema).min(1).max(4)
      })).length(5),
      annualRevenuePerCustomer: rangeSchema,
      annualRevenuePerCustomerSources: z.array(marketSizingSourceSchema).min(1).max(6),
      recommendation: z.enum(["selected", "review", "rejected"]),
      rationale: z.string().min(1).max(400)
    })).length(3)
  }),
  tam: z.object({
    status: z.enum(["estimated", "insufficient_evidence"]),
    bottomUp: z.object({
      customerCount: rangeSchema.nullable(),
      annualRevenuePerCustomer: rangeSchema.nullable(),
      formula: z.string().min(1).max(300),
      customerCountSources: z.array(marketSizingSourceSchema).max(8),
      annualRevenuePerCustomerSources: z.array(marketSizingSourceSchema).max(8)
    }),
    topDownPaths: z.array(z.object({
      name: z.string().min(1).max(180),
      range: rangeSchema,
      formula: z.string().min(1).max(300),
      sources: z.array(marketSizingSourceSchema).max(6)
    })).max(2),
    cagrPercent: cagrRangeSchema.nullable(),
    ...evidenceMeta
  }),
  sam: z.object({
    status: z.enum(["estimated", "insufficient_evidence"]),
    filters: z.array(z.object({
      kind: z.enum(["geography", "customer_fit", "channel", "regulatory"]),
      name: z.string().min(1).max(180),
      factor: factorRangeSchema,
      sources: z.array(marketSizingSourceSchema).max(6)
    })).max(8),
    regulationPrerequisite: z.string().max(400),
    ...evidenceMeta
  }),
  som: z.object({
    status: z.enum(["estimated", "insufficient_evidence"]),
    horizonYears: z.number().int().min(3).max(5),
    sharePercent: somShareRangeSchema.nullable(),
    capacityRevenue: rangeSchema.nullable(),
    shareSources: z.array(marketSizingSourceSchema).max(8),
    capacitySources: z.array(marketSizingSourceSchema).max(8),
    ...evidenceMeta
  }),
  beachhead: z.object({
    status: z.enum(["estimated", "insufficient_evidence"]),
    segment: z.string().min(1).max(300),
    customerCount: rangeSchema.nullable(),
    annualRevenuePerCustomer: rangeSchema.nullable(),
    customerCountSources: z.array(marketSizingSourceSchema).max(8),
    annualRevenuePerCustomerSources: z.array(marketSizingSourceSchema).max(8),
    cohesion: z.object({
      buysSimilarProducts: z.boolean(),
      similarSalesCycle: z.boolean(),
      wordOfMouthPotential: z.boolean(),
      notes: z.string().max(500)
    }),
    expansionPath: z.array(z.string().max(240)).max(5),
    ...evidenceMeta
  })
});

export type MarketSizingEvidence = z.infer<typeof marketSizingEvidenceSchema>;
type Range = z.infer<typeof rangeSchema>;

export const founderSizingOverridesSchema = z.object({
  tamCustomerCount: rangeSchema.nullable(),
  tamAnnualRevenuePerCustomer: rangeSchema.nullable(),
  somCapacityRevenue: rangeSchema.nullable(),
  beachheadCustomerCount: rangeSchema.nullable(),
  beachheadAnnualRevenuePerCustomer: rangeSchema.nullable()
});

export function mergeFounderSizingOverrides(
  evidence: MarketSizingEvidence,
  overrides: z.infer<typeof founderSizingOverridesSchema>,
  checkedAt: string,
  locale: Locale
) {
  const result = structuredClone(evidence);
  const source = {
    title: locale === "en" ? "Founder input" : "창업자 입력",
    url: null,
    publisher: locale === "en" ? "Founder" : "창업자",
    publishedAt: null,
    checkedAt,
    kind: "founder_input" as const
  };
  if (overrides.tamCustomerCount) {
    result.tam.bottomUp.customerCount = overrides.tamCustomerCount;
    result.tam.bottomUp.customerCountSources = [source];
  }
  if (overrides.tamAnnualRevenuePerCustomer) {
    result.tam.bottomUp.annualRevenuePerCustomer = overrides.tamAnnualRevenuePerCustomer;
    result.tam.bottomUp.annualRevenuePerCustomerSources = [source];
  }
  if (overrides.somCapacityRevenue) {
    result.som.capacityRevenue = overrides.somCapacityRevenue;
    result.som.capacitySources = [source];
  }
  if (overrides.beachheadCustomerCount) {
    result.beachhead.customerCount = overrides.beachheadCustomerCount;
    result.beachhead.customerCountSources = [source];
  }
  if (overrides.beachheadAnnualRevenuePerCustomer) {
    result.beachhead.annualRevenuePerCustomer = overrides.beachheadAnnualRevenuePerCustomer;
    result.beachhead.annualRevenuePerCustomerSources = [source];
  }
  return result;
}

export function validateMarketSizingEvidence(evidence: MarketSizingEvidence) {
  const issues = { tam: [] as string[], sam: [] as string[], som: [] as string[], beachhead: [] as string[] };
  const requireSources = (sources: GtmMarketSizingSource[], label: string, key: keyof typeof issues) => {
    if (sources.length === 0) issues[key].push(`${label} requires a traceable source.`);
    sources.forEach((source) => {
      if (source.kind !== "founder_input" && (!source.url || !source.publishedAt)) {
        issues[key].push(`${label} facts and proxy assumptions require a source URL and publication date.`);
      }
      if (source.kind !== "founder_input" && !isRecent(source, evidence.referenceYear)) {
        issues[key].push(`${label} requires fact and proxy sources from the last three years.`);
      }
      if (!source.publisher.trim()) issues[key].push(`${label} requires a publisher.`);
      if (!isValidIsoDate(source.checkedAt) || (source.publishedAt && !isValidIsoDate(source.publishedAt))) {
        issues[key].push(`${label} source dates must be valid ISO calendar dates.`);
      } else if (Date.parse(source.checkedAt) > Date.now() + 24 * 60 * 60 * 1000 ||
          (source.publishedAt && Date.parse(source.publishedAt) > Date.now() + 24 * 60 * 60 * 1000)) {
        issues[key].push(`${label} source dates cannot be in the future.`);
      }
    });
  };
  const scenarioKeys = evidence.scenarioAnalysis.scenarios.map((scenario) => scenario.key);
  if (new Set(scenarioKeys).size !== 3 || !["A", "B", "C"].every((key) => scenarioKeys.includes(key as "A" | "B" | "C"))) {
    issues.tam.push("ICP scenario analysis requires unique A, B, and C scenarios.");
  }
  const selectedScenario = evidence.scenarioAnalysis.scenarios.find((scenario) => scenario.key === evidence.scenarioAnalysis.selectedScenario);
  if (!selectedScenario || selectedScenario.recommendation !== "selected" || evidence.scenarioAnalysis.scenarios.filter((scenario) => scenario.recommendation === "selected").length !== 1) {
    issues.tam.push("ICP scenario analysis requires exactly one selected A or B scenario.");
  }
  const scenarioA = evidence.scenarioAnalysis.scenarios.find((scenario) => scenario.key === "A");
  const scenarioB = evidence.scenarioAnalysis.scenarios.find((scenario) => scenario.key === "B");
  const scenarioC = evidence.scenarioAnalysis.scenarios.find((scenario) => scenario.key === "C");
  if (scenarioA && scenarioB && scenarioA.country.normalize("NFKC").trim().toLowerCase() !== scenarioB.country.normalize("NFKC").trim().toLowerCase()) {
    issues.tam.push("Scenario A and B must use the same country.");
  }
  if (scenarioA && scenarioC && scenarioA.country.normalize("NFKC").trim().toLowerCase() === scenarioC.country.normalize("NFKC").trim().toLowerCase()) {
    issues.tam.push("Scenario C must use an alternate country.");
  }
  for (const scenario of evidence.scenarioAnalysis.scenarios) {
    const kinds = scenario.filters.map((filter) => filter.kind);
    if (new Set(kinds).size !== 5) issues.tam.push(`Scenario ${scenario.key} requires one demographic, employment, income, behavior, and channel stage.`);
    const inactiveCount = scenario.filters.filter((filter) => !filter.active).length;
    if ((scenario.key === "B" && inactiveCount !== 1) || (scenario.key !== "B" && inactiveCount !== 0)) {
      issues.tam.push(`Scenario ${scenario.key} has an invalid active-filter pattern.`);
    }
    if (scenario.key === "B" && scenarioA) {
      const removed = scenario.filters.find((filter) => !filter.active);
      const original = scenarioA.filters.find((filter) => filter.kind === removed?.kind);
      if (!removed || !original || original.factor.base >= 1) issues.tam.push("Scenario B must remove a restrictive Scenario A filter.");
    }
    requireSources(scenario.startingPopulationSources, `Scenario ${scenario.key} starting population`, "tam");
    scenario.filters.forEach((filter) => requireSources(filter.sources, `Scenario ${scenario.key} filter ${filter.name}`, "tam"));
    requireSources(scenario.annualRevenuePerCustomerSources, `Scenario ${scenario.key} annual revenue per customer`, "tam");
  }
  if (evidence.tam.bottomUp.customerCount || evidence.tam.bottomUp.annualRevenuePerCustomer || evidence.tam.topDownPaths.length > 0) {
    if (evidence.tam.bottomUp.customerCount) {
      requireSources(evidence.tam.bottomUp.customerCountSources, "TAM customer count", "tam");
    }
    if (evidence.tam.bottomUp.annualRevenuePerCustomer) {
      requireSources(evidence.tam.bottomUp.annualRevenuePerCustomerSources, "TAM annual revenue per customer", "tam");
    }
    evidence.tam.topDownPaths.forEach((path) => requireSources(path.sources, `TAM top-down path ${path.name}`, "tam"));
    const factUrls = evidence.tam.topDownPaths.map((path) =>
      path.sources.find((source) => source.kind === "fact" && source.url)?.url
    );
    const factPublishers = evidence.tam.topDownPaths.map((path) =>
      path.sources.find((source) => source.kind === "fact" && source.url)?.publisher.trim().toLowerCase()
    );
    const factDomains = factUrls.map((url) => {
      try { return url ? new URL(url).hostname.replace(/^www\./, "") : ""; } catch { return ""; }
    });
    if (factUrls.some((url) => !url) || new Set(factUrls).size !== evidence.tam.topDownPaths.length ||
        new Set(factPublishers).size !== evidence.tam.topDownPaths.length ||
        new Set(factDomains).size !== evidence.tam.topDownPaths.length) {
      issues.tam.push("Each TAM top-down path requires an independent public fact URL.");
    }
  }
  if (evidence.sam.filters.length > 0) {
    evidence.sam.filters.forEach((filter) => requireSources(filter.sources, `SAM filter ${filter.name}`, "sam"));
    const kinds = new Set(evidence.sam.filters.map((filter) => filter.kind));
    for (const kind of ["geography", "customer_fit", "channel", "regulatory"] as const) {
      if (!kinds.has(kind)) issues.sam.push(`SAM requires a ${kind} filter.`);
    }
  }
  if (evidence.som.sharePercent) {
    requireSources(evidence.som.shareSources, "SOM obtainable share", "som");
  }
  if (evidence.som.capacityRevenue) {
    requireSources(evidence.som.capacitySources, "SOM sales capacity", "som");
  }
  if (evidence.beachhead.customerCount) {
    requireSources(evidence.beachhead.customerCountSources, "Beachhead customer count", "beachhead");
  }
  if (evidence.beachhead.annualRevenuePerCustomer) {
    requireSources(evidence.beachhead.annualRevenuePerCustomerSources, "Beachhead annual revenue per customer", "beachhead");
  }
  return issues;
}

const RESEARCH_CONTEXT_KEYS: (keyof GtmFounderContext)[] = [
  "offeringType", "offeringName", "offeringSummary", "customerProblem", "coreValue",
  "currentAlternative", "differentiation", "deliveryModel", "revenueModel", "expectedPrice",
  "annualPurchaseFrequency", "initialReachableCustomers", "threeYearSalesCapacity",
  "validationEvidence", "targetCountry", "targetCustomer"
];

export const MARKET_SIZING_INPUT_KEYS = [
  "expectedPrice", "annualPurchaseFrequency", "initialReachableCustomers", "threeYearSalesCapacity"
] as const;

export function getMissingMarketSizingInputs(context: Partial<GtmFounderContext>) {
  return MARKET_SIZING_INPUT_KEYS.filter((key) => !String(context[key] ?? "").trim());
}

export function marketResearchContextSignature(context: Partial<GtmFounderContext>) {
  const serialized = JSON.stringify(Object.fromEntries(
    RESEARCH_CONTEXT_KEYS.map((key) => [key, String(context[key] ?? "").trim()
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[이메일]")
      .replace(/(?:\+?82[-\s]?)?0?1[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/g, "[전화번호]")])
  ));
  let left = 0x811c9dc5;
  let right = 0x9e3779b9;
  for (let index = 0; index < serialized.length; index += 1) {
    const code = serialized.charCodeAt(index);
    left = Math.imul(left ^ code, 0x01000193);
    right = Math.imul(right ^ code, 0x85ebca6b);
  }
  return `${(left >>> 0).toString(16).padStart(8, "0")}${(right >>> 0).toString(16).padStart(8, "0")}`;
}

function multiply(left: Range, right: Range): Range {
  return {
    low: left.low * right.low,
    base: left.base * right.base,
    high: left.high * right.high
  };
}

function average(ranges: Range[]): Range {
  const count = ranges.length;
  return {
    low: ranges.reduce((sum, range) => sum + range.low, 0) / count,
    base: ranges.reduce((sum, range) => sum + range.base, 0) / count,
    high: ranges.reduce((sum, range) => sum + range.high, 0) / count
  };
}

function multiplyFactors(filters: { factor: Range; active?: boolean }[]): Range {
  return filters.filter((filter) => filter.active !== false).reduce((result, filter) => multiply(result, filter.factor), {
    low: 1,
    base: 1,
    high: 1
  });
}

function scenarioCustomerCount(scenario: MarketSizingEvidence["scenarioAnalysis"]["scenarios"][number]): Range {
  return multiply(scenario.startingPopulation, multiplyFactors(scenario.filters));
}

export function marketSizingScenarioMatchesCountry(evidence: MarketSizingEvidence, targetCountry: string) {
  const selected = evidence.scenarioAnalysis.scenarios.find((scenario) => scenario.key === evidence.scenarioAnalysis.selectedScenario);
  return Boolean(selected && selected.country.normalize("NFKC").trim().toLowerCase() === targetCountry.normalize("NFKC").trim().toLowerCase());
}

function minRange(left: Range, right: Range): Range {
  return {
    low: Math.min(left.low, right.low),
    base: Math.min(left.base, right.base),
    high: Math.min(left.high, right.high)
  };
}

function assertOrderedRange(range: Range) {
  if (range.low > range.base || range.base > range.high) {
    throw new Error("Market-sizing ranges must be ordered low ≤ base ≤ high.");
  }
}

function uniqueSources(sources: GtmMarketSizingSource[]) {
  return [...new Map(sources.map((source) => [
    `${source.url ?? ""}|${source.title}|${source.kind}`,
    source
  ])).values()];
}

function isRecent(source: GtmMarketSizingSource, referenceYear: number) {
  if (source.kind === "founder_input") return true;
  if (!source.publishedAt || !isValidIsoDate(source.publishedAt)) return false;
  const year = Number(source.publishedAt?.slice(0, 4));
  return Number.isFinite(year) && year <= referenceYear && referenceYear - year <= 3;
}

function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function formatCurrency(value: number, currency: string, locale: Locale) {
  try {
    return new Intl.NumberFormat(locale === "en" ? "en-US" : "ko-KR", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1
    }).format(value);
  } catch {
    return `${currency} ${new Intl.NumberFormat(locale === "en" ? "en-US" : "ko-KR", {
      notation: "compact",
      maximumFractionDigits: 1
    }).format(value)}`;
  }
}

function estimate(range: Range | null, currency: string, locale: Locale) {
  if (!range) return locale === "en" ? "Insufficient evidence" : "추정 불가";
  return `${formatCurrency(range.low, currency, locale)}–${formatCurrency(range.high, currency, locale)} (${locale === "en" ? "base" : "기준"} ${formatCurrency(range.base, currency, locale)})`;
}

function entry(
  input: Omit<GtmMarketSizingEntry, "estimate" | "range"> & { range: Range | null },
  evidence: MarketSizingEvidence,
  locale: Locale
): GtmMarketSizingEntry {
  const range = input.status === "estimated" ? input.range : null;
  return {
    ...input,
    range: range ? { ...range, currency: evidence.currency, referenceYear: evidence.referenceYear } : null,
    estimate: estimate(range, evidence.currency, locale)
  };
}

export function calculateMarketSizing(
  evidence: MarketSizingEvidence,
  locale: Locale = "ko"
): GtmMarketSizingEntry[] {
  const sourceIssues = validateMarketSizingEvidence(evidence);
  [
    ...evidence.scenarioAnalysis.scenarios.flatMap((scenario) => [
      scenario.startingPopulation,
      ...scenario.filters.map((filter) => filter.factor),
      scenario.annualRevenuePerCustomer
    ]),
    evidence.tam.bottomUp.customerCount,
    evidence.tam.bottomUp.annualRevenuePerCustomer,
    ...evidence.tam.topDownPaths.map((path) => path.range),
    ...evidence.sam.filters.map((filter) => filter.factor),
    evidence.som.sharePercent,
    evidence.som.capacityRevenue,
    evidence.beachhead.customerCount,
    evidence.beachhead.annualRevenuePerCustomer
  ].filter((range): range is Range => Boolean(range)).forEach(assertOrderedRange);
  const selectedScenario = evidence.scenarioAnalysis.scenarios.find((scenario) => scenario.key === evidence.scenarioAnalysis.selectedScenario);
  const founderCustomerCount = evidence.tam.bottomUp.customerCountSources.some((source) => source.kind === "founder_input")
    ? evidence.tam.bottomUp.customerCount : null;
  const founderAnnualRevenue = evidence.tam.bottomUp.annualRevenuePerCustomerSources.some((source) => source.kind === "founder_input")
    ? evidence.tam.bottomUp.annualRevenuePerCustomer : null;
  const derivedCustomerCount = selectedScenario ? scenarioCustomerCount(selectedScenario) : null;
  const bottomUpCustomerCount = founderCustomerCount ?? derivedCustomerCount;
  const bottomUpAnnualRevenue = founderAnnualRevenue ?? selectedScenario?.annualRevenuePerCustomer ?? null;
  const bottomUp = bottomUpCustomerCount && bottomUpAnnualRevenue
    ? multiply(bottomUpCustomerCount, bottomUpAnnualRevenue)
    : null;
  const topDown = evidence.tam.topDownPaths.length > 0
    ? average(evidence.tam.topDownPaths.map((path) => path.range))
    : null;
  const varianceDenominator = bottomUp && topDown ? (bottomUp.base + topDown.base) / 2 : 0;
  const variance = bottomUp && topDown && varianceDenominator > 0
    ? Math.abs(bottomUp.base - topDown.base) / varianceDenominator * 100
    : null;
  const topDownFactUrls = evidence.tam.topDownPaths.map((path) => path.sources.find((source) =>
    source.kind === "fact" && source.url && isRecent(source, evidence.referenceYear)
  )?.url);
  const topDownIsCurrent = topDownFactUrls.length === 2 && topDownFactUrls.every(Boolean) && new Set(topDownFactUrls).size === 2;
  const tamBlocked = sourceIssues.tam.length > 0 || (bottomUp !== null && bottomUp.base <= 0) ||
    !topDown || topDown.base <= 0 || !topDownIsCurrent ||
    (variance !== null && variance > 100);
  const tamRange = tamBlocked ? null : bottomUp ? average([bottomUp, topDown]) : topDown;
  const samRange = !tamRange || sourceIssues.sam.length > 0 || evidence.sam.filters.length === 0
    ? null
    : multiply(tamRange, multiplyFactors(evidence.sam.filters));
  const demandSom = samRange && evidence.som.sharePercent
    ? multiply(samRange, {
        low: evidence.som.sharePercent.low / 100,
        base: evidence.som.sharePercent.base / 100,
        high: evidence.som.sharePercent.high / 100
      })
    : null;
  const somRange = sourceIssues.som.length > 0 || !demandSom || !evidence.som.capacityRevenue
    ? null
    : minRange(demandSom, evidence.som.capacityRevenue);
  const beachheadCohesive = evidence.beachhead.cohesion.buysSimilarProducts &&
    evidence.beachhead.cohesion.similarSalesCycle && evidence.beachhead.cohesion.wordOfMouthPotential;
  const beachheadRange = sourceIssues.beachhead.length === 0 && beachheadCohesive &&
      evidence.beachhead.customerCount && evidence.beachhead.annualRevenuePerCustomer && evidence.beachhead.expansionPath.length > 0
    ? multiply(evidence.beachhead.customerCount, evidence.beachhead.annualRevenuePerCustomer)
    : null;
  const tamSources = uniqueSources([
    ...evidence.scenarioAnalysis.scenarios.flatMap((scenario) => [
      ...scenario.startingPopulationSources,
      ...scenario.filters.flatMap((filter) => filter.sources),
      ...scenario.annualRevenuePerCustomerSources
    ]),
    ...evidence.tam.bottomUp.customerCountSources,
    ...evidence.tam.bottomUp.annualRevenuePerCustomerSources,
    ...evidence.tam.topDownPaths.flatMap((path) => path.sources)
  ]);
  const confidence: GtmMarketSizingEntry["confidence"] = !tamRange || variance === null || !topDownIsCurrent
    ? "low"
    : variance <= 20 && evidence.tam.topDownPaths.length === 2 ? "high" : variance <= 20 ? "medium" : "low";
  const varianceMessage = variance === null
    ? []
    : [locale === "en"
        ? `top-down/bottom-up variance ${variance.toFixed(1)}%`
        : `하향식·상향식 편차 ${variance.toFixed(1)}%`];
  const sourceRecencyMessage = [locale === "en"
    ? `recent-source gate ${topDownIsCurrent ? "passed" : "needs review"}`
    : `최근 3년 자료 검증 ${topDownIsCurrent ? "통과" : "재검토 필요"}`];
  const scenarioValidation = selectedScenario
    ? [locale === "en"
        ? `Selected ICP scenario ${selectedScenario.key} · ${evidence.scenarioAnalysis.decisionVariable}`
        : `선택 ICP 시나리오 ${selectedScenario.key} · ${evidence.scenarioAnalysis.decisionVariable}`]
    : [];
  const scenarioAssumptions = evidence.scenarioAnalysis.scenarios
    .filter((scenario) => scenario.key !== evidence.scenarioAnalysis.selectedScenario)
    .map((scenario) => {
      const scenarioTam = multiply(scenarioCustomerCount(scenario), scenario.annualRevenuePerCustomer);
      return `Scenario ${scenario.key} TAM ${estimate(scenarioTam, evidence.currency, locale)}: ${scenario.definition} — ${scenario.rationale}`;
    });
  const bottomUpFormula = selectedScenario
    ? [
        founderCustomerCount ? (locale === "en" ? "founder customer count" : "창업자 입력 고객 수") : (locale === "en" ? `Scenario ${selectedScenario.key} starting population` : `시나리오 ${selectedScenario.key} 시작 인구`),
        ...(!founderCustomerCount ? selectedScenario.filters.filter((filter) => filter.active).map((filter) => filter.name) : []),
        founderAnnualRevenue ? (locale === "en" ? "founder annual revenue per customer" : "창업자 입력 연간 고객당 매출") : (locale === "en" ? "annual category revenue per customer" : "연간 카테고리 고객당 매출")
      ].join(" × ")
    : locale === "en" ? "Public customer count × annual revenue per customer" : "공개 고객 수 × 연간 고객당 매출";
  const tamGaps = [
    ...evidence.tam.evidenceGaps,
    ...(locale === "en" ? sourceIssues.tam : sourceIssues.tam.map(() => "수치 입력의 근거 URL·발행일·최근 3년 자료를 확인해 주세요.")),
    ...(!bottomUp ? [locale === "en" ? "Countable customers and annual revenue per customer" : "직접 산정 가능한 고객 수와 연간 고객당 매출"] : []),
    ...(bottomUp && bottomUp.base <= 0 ? [locale === "en" ? "Positive bottom-up base values" : "0보다 큰 상향식 기준값"] : []),
    ...(!topDownIsCurrent ? [locale === "en" ? "Two independent public top-down sources from the last three years" : "최근 3년 이내의 독립적인 하향식 공개 근거 2개"] : []),
    ...(variance !== null && variance > 100 ? [locale === "en" ? "Reconcile the market definition before publishing" : "시장 정의를 재검토한 뒤 다시 산정"] : [])
  ];
  const beachheadGaps = [
    ...evidence.beachhead.evidenceGaps,
    ...(locale === "en" ? sourceIssues.beachhead : sourceIssues.beachhead.map(() => "교두보 시장 고객 수·고객당 매출의 최신 근거를 확인해 주세요.")),
    ...(!evidence.beachhead.customerCount ? [locale === "en" ? "Directly reachable first-segment customer count" : "직접 접근 가능한 최초 고객군 수"] : []),
    ...(!evidence.beachhead.annualRevenuePerCustomer ? [locale === "en" ? "Annual revenue per Beachhead customer" : "교두보 고객당 연간 매출"] : []),
    ...(!beachheadCohesive ? [locale === "en" ? "Verify all three Beachhead cohesion conditions" : "교두보 시장의 세 가지 응집성 조건 검증"] : []),
    ...(evidence.beachhead.expansionPath.length === 0 ? [locale === "en" ? "Adjacent-market expansion path" : "인접시장 확장 경로"] : [])
  ];

  return [
    entry({
      key: "tam",
      label: "TAM",
      status: tamRange ? "estimated" : "insufficient_evidence",
      range: tamRange,
      method: topDown ? "triangulated" : "bottom_up",
      formula: bottomUp
        ? bottomUpFormula
        : locale === "en"
          ? "Triangulated range from two independent recent public market paths"
          : "최근 공개자료의 독립적인 시장 경로 2개를 교차검증한 범위",
      calculationInputs: [
        ...(selectedScenario && !founderCustomerCount ? [{ name: locale === "en" ? `Scenario ${selectedScenario.key} starting population` : `시나리오 ${selectedScenario.key} 시작 인구`, ...selectedScenario.startingPopulation, unit: locale === "en" ? "count" : "명", sourceTitles: selectedScenario.startingPopulationSources.map((source) => source.title), sources: selectedScenario.startingPopulationSources }] : []),
        ...(selectedScenario && !founderCustomerCount ? selectedScenario.filters.filter((filter) => filter.active).map((filter) => ({ name: filter.name, ...filter.factor, unit: "ratio", sourceTitles: filter.sources.map((source) => source.title), sources: filter.sources })) : []),
        ...(selectedScenario && !founderAnnualRevenue ? [{ name: locale === "en" ? `Scenario ${selectedScenario.key} annual revenue per customer` : `시나리오 ${selectedScenario.key} 연간 고객당 매출`, ...selectedScenario.annualRevenuePerCustomer, unit: `${evidence.currency}/${locale === "en" ? "year" : "년"}`, sourceTitles: selectedScenario.annualRevenuePerCustomerSources.map((source) => source.title), sources: selectedScenario.annualRevenuePerCustomerSources }] : []),
        ...(founderCustomerCount ? [{ name: locale === "en" ? "Founder customer/end-user count" : "창업자 입력 고객·최종사용자 수", ...founderCustomerCount, unit: locale === "en" ? "count" : "개", sourceTitles: evidence.tam.bottomUp.customerCountSources.map((source) => source.title), sources: evidence.tam.bottomUp.customerCountSources }] : []),
        ...(founderAnnualRevenue ? [{ name: locale === "en" ? "Founder annual revenue per customer" : "창업자 입력 연간 고객당 매출", ...founderAnnualRevenue, unit: `${evidence.currency}/${locale === "en" ? "year" : "년"}`, sourceTitles: evidence.tam.bottomUp.annualRevenuePerCustomerSources.map((source) => source.title), sources: evidence.tam.bottomUp.annualRevenuePerCustomerSources }] : []),
        ...evidence.tam.topDownPaths.map((path) => ({ name: path.name, ...path.range, unit: `${evidence.currency}/year`, sourceTitles: path.sources.map((source) => source.title), sources: path.sources }))
      ],
      assumptions: [...evidence.tam.assumptions, ...scenarioAssumptions],
      sources: tamSources,
      confidence,
      evidenceGaps: [...new Set(tamGaps)],
      sensitivityDrivers: evidence.tam.sensitivityDrivers,
      validation: [...varianceMessage, ...sourceRecencyMessage, ...scenarioValidation],
      cohesion: null,
      expansionPath: []
    }, evidence, locale),
    entry({
      key: "sam",
      label: "SAM",
      status: samRange ? "estimated" : "insufficient_evidence",
      range: samRange,
      method: "bottom_up",
      formula: `TAM × ${evidence.sam.filters.map((filter) => filter.name).join(" × ")}`,
      calculationInputs: evidence.sam.filters.map((filter) => ({ name: filter.name, ...filter.factor, unit: "ratio", sourceTitles: filter.sources.map((source) => source.title), sources: filter.sources })),
      assumptions: [evidence.sam.regulationPrerequisite, ...evidence.sam.assumptions].filter(Boolean),
      sources: uniqueSources(evidence.sam.filters.flatMap((filter) => filter.sources)),
      confidence: samRange ? confidence : "low",
      evidenceGaps: [...new Set([...evidence.sam.evidenceGaps, ...(locale === "en" ? sourceIssues.sam : sourceIssues.sam.map(() => "SAM 필터별 최신 근거를 확인해 주세요.")), ...(!tamRange ? [locale === "en" ? "Validated TAM" : "검증된 TAM"] : [])])],
      sensitivityDrivers: evidence.sam.sensitivityDrivers,
      validation: samRange && tamRange && samRange.high <= tamRange.high
        ? [locale === "en" ? "TAM ≥ SAM hierarchy passed" : "TAM ≥ SAM 계층 검증 통과"] : [],
      cohesion: null,
      expansionPath: []
    }, evidence, locale),
    entry({
      key: "som",
      label: "SOM",
      status: somRange ? "estimated" : "insufficient_evidence",
      range: somRange,
      method: "bottom_up",
      formula: locale === "en" ? `min(SAM × obtainable share, ${evidence.som.horizonYears}-year sales capacity)` : `SAM × 획득 가능 점유율과 ${evidence.som.horizonYears}년 판매 역량 중 작은 값`,
      calculationInputs: [
        ...(evidence.som.sharePercent ? [{ name: locale === "en" ? "Obtainable share" : "획득 가능 점유율", ...evidence.som.sharePercent, unit: "%", sourceTitles: evidence.som.shareSources.map((source) => source.title), sources: evidence.som.shareSources }] : []),
        ...(evidence.som.capacityRevenue ? [{ name: locale === "en" ? `${evidence.som.horizonYears}-year sales capacity` : `${evidence.som.horizonYears}년 판매 역량`, ...evidence.som.capacityRevenue, unit: evidence.currency, sourceTitles: evidence.som.capacitySources.map((source) => source.title), sources: evidence.som.capacitySources }] : [])
      ],
      assumptions: evidence.som.assumptions,
      sources: uniqueSources([...evidence.som.shareSources, ...evidence.som.capacitySources]),
      confidence: somRange ? confidence : "low",
      evidenceGaps: [...new Set([...evidence.som.evidenceGaps, ...(locale === "en" ? sourceIssues.som : sourceIssues.som.map(() => "SOM 점유율·판매 역량의 최신 근거를 확인해 주세요.")), ...(!samRange ? [locale === "en" ? "Validated SAM" : "검증된 SAM"] : [])])],
      sensitivityDrivers: evidence.som.sensitivityDrivers,
      validation: somRange && samRange && somRange.high <= samRange.high
        ? [locale === "en" ? "SAM ≥ SOM hierarchy passed" : "SAM ≥ SOM 계층 검증 통과"] : [],
      cohesion: null,
      expansionPath: []
    }, evidence, locale),
    entry({
      key: "beachhead",
      label: "Beachhead Market",
      status: beachheadRange ? "estimated" : "insufficient_evidence",
      range: beachheadRange,
      method: "bottom_up",
      formula: locale === "en" ? "Directly reachable first-segment customers × annual revenue per customer" : "직접 접근 가능한 최초 고객 수 × 연간 고객당 매출",
      calculationInputs: [
        ...(evidence.beachhead.customerCount ? [{ name: evidence.beachhead.segment, ...evidence.beachhead.customerCount, unit: locale === "en" ? "count" : "개", sourceTitles: evidence.beachhead.customerCountSources.map((source) => source.title), sources: evidence.beachhead.customerCountSources }] : []),
        ...(evidence.beachhead.annualRevenuePerCustomer ? [{ name: locale === "en" ? "Annual revenue per customer" : "연간 고객당 매출", ...evidence.beachhead.annualRevenuePerCustomer, unit: `${evidence.currency}/${locale === "en" ? "year" : "년"}`, sourceTitles: evidence.beachhead.annualRevenuePerCustomerSources.map((source) => source.title), sources: evidence.beachhead.annualRevenuePerCustomerSources }] : [])
      ],
      assumptions: evidence.beachhead.assumptions,
      sources: uniqueSources([...evidence.beachhead.customerCountSources, ...evidence.beachhead.annualRevenuePerCustomerSources]),
      confidence: beachheadRange ? "medium" : "low",
      evidenceGaps: [...new Set(beachheadGaps)],
      sensitivityDrivers: evidence.beachhead.sensitivityDrivers,
      validation: beachheadRange && beachheadRange.base < 5_000_000
        ? [locale === "en"
            ? "Beachhead is below the US$5 million planning benchmark; treat this as a warning, not a hard rejection."
            : "교두보 시장이 US$5 million 기획 기준보다 작습니다. 탈락 조건이 아닌 경고로 해석하세요."]
        : [],
      cohesion: evidence.beachhead.cohesion,
      expansionPath: evidence.beachhead.expansionPath
    }, evidence, locale)
  ];
}

function legacyEntry(value: Record<string, unknown>, index: number): GtmMarketSizingEntry {
  const withoutLam = (text: unknown) => String(text ?? "").replace(/\bLAM\b/g, "Beachhead Market");
  const legacyLabel = String(value.label ?? "");
  const key = legacyLabel === "LAM" ? "beachhead" : (["TAM", "SAM", "SOM"].includes(legacyLabel)
    ? legacyLabel.toLowerCase() : ["tam", "sam", "som", "beachhead"][index]) as GtmMarketSizingEntry["key"];
  const label = key === "beachhead" ? "Beachhead Market" : key.toUpperCase() as "TAM" | "SAM" | "SOM";
  const estimateValue = withoutLam(value.estimate);
  const method = withoutLam(value.method ?? "legacy");
  return {
    key,
    label,
    status: /추정 불가|insufficient/i.test(estimateValue) ? "insufficient_evidence" : "estimated",
    estimate: estimateValue,
    range: null,
    method,
    formula: method,
    calculationInputs: [],
    assumptions: Array.isArray(value.assumptions) ? value.assumptions.map(withoutLam) : [],
    sources: Array.isArray(value.sourceTitles) ? value.sourceTitles.map((title) => ({
      title: withoutLam(title),
      url: null,
      publisher: "",
      publishedAt: null,
      checkedAt: "",
      kind: "fact" as const
    })) : [],
    confidence: "low",
    evidenceGaps: [],
    sensitivityDrivers: [],
    validation: [],
    cohesion: null,
    expansionPath: []
  };
}

const RESEARCH_LANES: GtmResearchLane[] = [
  "demand", "customer_behavior", "channel", "regulation", "product_culture",
  "direct_competitors", "adjacent_competitors", "substitutes"
];
const SOURCE_KINDS: GtmResearchSource["kind"][] = ["government", "industry", "retail", "company", "consumer", "media"];

function researchSource(value: unknown, fallbackTitle = "Source", fallbackUrl: string | null = null): GtmResearchSource {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const kind = SOURCE_KINDS.includes(source.kind as GtmResearchSource["kind"])
    ? source.kind as GtmResearchSource["kind"] : "media";
  return {
    title: typeof source.title === "string" && source.title ? source.title : fallbackTitle,
    url: typeof source.url === "string" ? source.url : fallbackUrl,
    publisher: typeof source.publisher === "string" ? source.publisher : "",
    publishedAt: typeof source.publishedAt === "string" ? source.publishedAt : null,
    checkedAt: typeof source.checkedAt === "string" ? source.checkedAt : null,
    kind
  };
}

function normalizeTrend(value: unknown): GtmMarketTrend {
  const trend = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const primaryTitle = typeof trend.sourceTitle === "string" ? trend.sourceTitle : "Source";
  const primaryUrl = typeof trend.url === "string" ? trend.url : null;
  const sources = Array.isArray(trend.sources) && trend.sources.length > 0
    ? trend.sources.map((source) => researchSource(source, primaryTitle, primaryUrl))
    : [researchSource(null, primaryTitle, primaryUrl)];
  const category = ["demand", "customer_behavior", "channel", "regulation", "product_culture"].includes(String(trend.category))
    ? trend.category as GtmMarketTrend["category"] : "demand";
  return {
    category,
    title: String(trend.title ?? ""),
    finding: String(trend.finding ?? ""),
    implication: String(trend.implication ?? ""),
    confidence: ["low", "medium", "high"].includes(String(trend.confidence)) ? trend.confidence as GtmMarketTrend["confidence"] : "low",
    freshness: ["current", "aging", "undated"].includes(String(trend.freshness)) ? trend.freshness as GtmMarketTrend["freshness"] : "undated",
    sources,
    sourceTitle: sources[0].title,
    url: sources[0].url
  };
}

function normalizeCompetitor(value: unknown): GtmMarketCompetitor {
  const competitor = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const primaryTitle = typeof competitor.sourceTitle === "string" ? competitor.sourceTitle : "Source";
  const primaryUrl = typeof competitor.url === "string" ? competitor.url : null;
  const sources = Array.isArray(competitor.sources) && competitor.sources.length > 0
    ? competitor.sources.map((source) => researchSource(source, primaryTitle, primaryUrl))
    : [researchSource(null, primaryTitle, primaryUrl)];
  const type = ["direct", "adjacent", "alternative"].includes(String(competitor.type))
    ? competitor.type as GtmMarketCompetitor["type"] : "alternative";
  const marketPresence = ["local", "regional", "global"].includes(String(competitor.marketPresence))
    ? competitor.marketPresence as GtmMarketCompetitor["marketPresence"] : "global";
  const strings = (input: unknown) => Array.isArray(input) ? input.map(String).filter(Boolean) : [];
  return {
    name: String(competitor.name ?? ""),
    type,
    marketPresence,
    pricePositioning: String(competitor.pricePositioning ?? ""),
    targetCustomer: String(competitor.targetCustomer ?? ""),
    valueProposition: String(competitor.valueProposition ?? ""),
    channels: strings(competitor.channels),
    strengths: strings(competitor.strengths),
    weaknesses: strings(competitor.weaknesses),
    relevance: String(competitor.relevance ?? ""),
    differentiationGap: String(competitor.differentiationGap ?? ""),
    confidence: ["low", "medium", "high"].includes(String(competitor.confidence)) ? competitor.confidence as GtmMarketCompetitor["confidence"] : "low",
    freshness: ["current", "aging", "undated"].includes(String(competitor.freshness)) ? competitor.freshness as GtmMarketCompetitor["freshness"] : "undated",
    sources,
    sourceTitle: sources[0].title,
    url: sources[0].url
  };
}

export function buildMarketResearchCoverage(
  trends: GtmMarketTrend[],
  competitors: GtmMarketCompetitor[],
  contradictions: { sources: GtmResearchSource[] }[] = []
): GtmResearchCoverage {
  const lanes = new Set<GtmResearchLane>(trends.map((trend) => trend.category));
  for (const competitor of competitors) {
    lanes.add(competitor.type === "direct" ? "direct_competitors"
      : competitor.type === "adjacent" ? "adjacent_competitors" : "substitutes");
  }
  const sources = [
    ...trends.flatMap((trend) => trend.sources),
    ...competitors.flatMap((competitor) => competitor.sources),
    ...contradictions.flatMap((contradiction) => contradiction.sources)
  ];
  const uniqueSources = [...new Map(sources.map((source) => [source.url ? canonicalResearchUrl(source.url) : `${source.publisher}:${source.title}`, source.url ? { ...source, url: canonicalResearchUrl(source.url) } : source])).values()];
  const domains = new Set(uniqueSources.flatMap((source) => {
    if (!source.url) return [];
    try { return [new URL(source.url).hostname.replace(/^www\./, "")]; } catch { return []; }
  }));
  const sourceTypes = Object.fromEntries(SOURCE_KINDS.map((kind) => [kind, uniqueSources.filter((source) => source.kind === kind).length])) as GtmResearchCoverage["sourceTypes"];
  const coverageGaps = [
    ...RESEARCH_LANES.filter((lane) => !lanes.has(lane)).map((lane) => `lane:${lane}`),
    ...(uniqueSources.length < 8 ? ["sources:min-8"] : []),
    ...(domains.size < 8 ? ["domains:min-8"] : []),
    ...(competitors.length < 10 ? ["competitors:min-10"] : []),
    ...(competitors.filter((entry) => entry.type === "direct").length < 3 ? ["competitors:direct:min-3"] : []),
    ...(competitors.filter((entry) => entry.type === "adjacent").length < 2 ? ["competitors:adjacent:min-2"] : []),
    ...(competitors.filter((entry) => entry.type === "alternative").length < 2 ? ["competitors:alternative:min-2"] : []),
    ...(competitors.filter((entry) => entry.marketPresence === "local").length < 2 ? ["competitors:local:min-2"] : []),
    ...(competitors.filter((entry) => entry.marketPresence !== "local").length < 2 ? ["competitors:regional-global:min-2"] : []),
    ...(sourceTypes.government < 1 ? ["source-type:government:min-1"] : []),
    ...(sourceTypes.industry < 2 ? ["source-type:industry:min-2"] : []),
    ...(sourceTypes.retail < 2 ? ["source-type:retail:min-2"] : []),
    ...(sourceTypes.company < 3 ? ["source-type:company:min-3"] : []),
    ...(sourceTypes.consumer < 1 ? ["source-type:consumer:min-1"] : [])
  ];
  return {
    lanes: [...lanes],
    sourceCount: uniqueSources.length,
    uniqueDomainCount: domains.size,
    competitorCount: competitors.length,
    sourceTypes,
    coverageGaps
  };
}

export function normalizeMarketResearch(value: unknown): GtmMarketResearch | null {
  if (!value || typeof value !== "object") return null;
  const research = value as Record<string, unknown>;
  if (!Array.isArray(research.marketSizing)) return null;
  const marketSizing = research.marketSizing.map((item, index) => {
    const entry = item as Record<string, unknown>;
    return "key" in entry ? entry as unknown as GtmMarketSizingEntry : legacyEntry(entry, index);
  });
  const trends = Array.isArray(research.trends) ? research.trends.map(normalizeTrend) : [];
  const competitors = Array.isArray(research.competitors) ? research.competitors.map(normalizeCompetitor) : [];
  const contradictions = Array.isArray(research.contradictions) ? research.contradictions.map((value) => {
    const contradiction = value && typeof value === "object" ? value as Record<string, unknown> : {};
    return {
      topic: String(contradiction.topic ?? ""),
      summary: String(contradiction.summary ?? ""),
      sources: Array.isArray(contradiction.sources) ? contradiction.sources.map((source) => researchSource(source)) : []
    };
  }) : [];
  return {
    ...(research as unknown as GtmMarketResearch),
    trends,
    competitors,
    contradictions,
    researchCoverage: buildMarketResearchCoverage(trends, competitors, contradictions),
    researchMethodologyVersion: research.researchMethodologyVersion === "market-research-v2"
      ? "market-research-v2" : "legacy",
    marketSizing,
    marketSizingMethodologyVersion: ["market-sizing-v1", "market-sizing-v2"].includes(String(research.marketSizingMethodologyVersion))
      ? research.marketSizingMethodologyVersion as "market-sizing-v1" | "market-sizing-v2" : "legacy",
    marketDefinition: research.marketDefinition && typeof research.marketDefinition === "object"
      ? research.marketDefinition as GtmMarketResearch["marketDefinition"]
      : { included: "", excluded: "", annualRevenueUnit: "" },
    researchContextSignature: typeof research.researchContextSignature === "string" ? research.researchContextSignature : ""
  };
}
