import { beforeEach, describe, expect, it, vi } from "vitest";

const createQuery = (result: { data: unknown; error: unknown }) => {
  const query: Record<string, unknown> = {};
  for (const method of ["select", "eq", "order"]) query[method] = () => query;
  query.single = () => Promise.resolve(result);
  query.maybeSingle = () => Promise.resolve(result);
  query.limit = () => Promise.resolve(result);
  query.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return query;
};

let failureTable = "";
let planData: Record<string, unknown> = { id: "plan-1", organization_id: "org-1", assessment_id: "assessment-1" };
const admin = {
  from(table: string) {
    const data = table === "profiles"
      ? { organization_id: "org-1" }
      : table === "gtm_plans"
        ? planData
        : table === "gtm_plan_items"
          ? []
          : table === "assessments"
            ? { survey_version: "5.0", sales_motion: "direct" }
            : [];
    return createQuery({ data, error: table === failureTable ? { message: "database unavailable" } : null });
  }
};

vi.mock("@/lib/i18n-server", () => ({ getRequestLocale: async () => "ko" }));
vi.mock("@/lib/supabase/server", () => ({
  requireUser: async () => ({ id: "user-1" }),
  createSupabaseAdminClient: () => admin
}));
vi.mock("@/lib/content-localization", () => ({
  localizeStoredGtmPlan: async (_admin: unknown, _organizationId: string, plan: Record<string, unknown>) => ({ ...plan, translationFallback: false })
}));

import { GET } from "@/app/api/gtm-plans/[id]/export/route";
import { buildReferenceIndex, citationNumbers, renderBibliography, renderCitationLinks } from "@/app/api/gtm-plans/[id]/export/citations";

const get = () => GET(new Request("https://example.com/api/gtm-plans/plan-1/export"), {
  params: Promise.resolve({ id: "plan-1" })
});

describe("market report readiness coverage", () => {
  beforeEach(() => {
    failureTable = "";
    planData = { id: "plan-1", organization_id: "org-1", assessment_id: "assessment-1" };
  });

  it.each(["assessments", "readiness_answers"])("fails closed when %s cannot be loaded", async (table) => {
    failureTable = table;
    expect((await get()).status).toBe(500);
  });
});

describe("market report citations", () => {
  it("deduplicates references in first-appearance order and rejects unsafe links", () => {
    const source = { title: "A", url: "https://a.example/report", publisher: "A" };
    const index = buildReferenceIndex([
      source,
      { title: "A duplicate", url: "https://a.example/report", publisher: "A" },
      { title: "Unsafe", url: "javascript:alert(1)", publisher: "B" }
    ]);

    expect(index.references.map((entry) => entry.number)).toEqual([1, 2]);
    expect(index.references[0].href).toBe("https://a.example/report");
    expect(index.references[1].href).toBeNull();
    expect(citationNumbers(index, [source, source])).toEqual([1]);
  });

  it("uses numbered links in report content and keeps URLs in the bibliography", () => {
    const source = { title: "A", url: "https://a.example/report", publisher: "A" };
    const unsafe = { title: "Unsafe", url: "javascript:alert(1)", publisher: "B" };
    const index = buildReferenceIndex([source, source, unsafe]);
    const body = renderCitationLinks(index, [source, source]);
    const bibliography = renderBibliography(index);

    expect(body).toBe('<a class="citation" href="#ref-1">[1]</a>');
    expect(body).not.toContain("https://a.example/report");
    expect(bibliography).toContain('id="ref-1"');
    expect(bibliography).toContain('href="https://a.example/report"');
    expect(bibliography).not.toContain('href="javascript:alert(1)"');
  });

  it("renders calculation-input sources as citations and localizes bibliography kinds", () => {
    const source = { title: "Official", url: "https://a.example/report", publisher: "A", kind: "government" };
    const index = buildReferenceIndex([source]);

    expect(renderCitationLinks(index, [source])).toBe('<a class="citation" href="#ref-1">[1]</a>');
    expect(renderBibliography(index, (kind) => kind === "government" ? "정부·규제" : kind)).toContain("정부·규제");
    expect(renderBibliography(index, (kind) => kind === "government" ? "정부·규제" : kind)).not.toContain(" · government");
  });

  it("renders real citation anchors in calculation-input lists", async () => {
    const source = { title: "Input source", url: "https://a.example/report", publisher: "A", publishedAt: null, checkedAt: "2026-01-01", kind: "fact" };
    planData = {
      id: "plan-1", organization_id: "org-1", assessment_id: null, status: "active", summary: "", assumptions: [], market_research_documents: [], recent_messages: [], turn_count: 0, generation_count: 0, model: "gpt-5.6-sol", content_locale: "ko", founder_context_locale: "ko", market_research_locale: "ko", updated_at: "2026-01-01",
      founder_context: { offeringName: "Offer", offeringType: "service", targetCountry: "KR", targetCustomer: "buyer", offeringSummary: "summary", customerProblem: "problem", coreValue: "value" },
      market_research: {
        executiveSummary: "summary", scope: "sellability_review", sellability: { summary: "ok" }, marketDefinition: { included: "all", excluded: "", annualRevenueUnit: "KRW" },
        marketSizing: [{ key: "tam", label: "TAM", status: "estimated", estimate: "1", range: null, method: "bottom_up", formula: "x", calculationInputs: [{ name: "Customers", low: 1, base: 2, high: 3, unit: "count", sourceTitles: ["Input source"], sources: [source] }], assumptions: [], sources: [source], confidence: "high", evidenceGaps: [], sensitivityDrivers: [], validation: [], cohesion: null, expansionPath: [] }],
        trends: [], competitors: [], contradictions: [], researchCoverage: { lanes: [], sourceCount: 1, uniqueDomainCount: 1, competitorCount: 0, sourceTypes: {}, coverageGaps: [] }, limitations: [], nextExperiments: []
      },
      items: []
    };

    const html = await (await get()).text();
    const calculationInputs = html.slice(html.indexOf("계산 입력값"), html.indexOf("신뢰도"));
    expect(calculationInputs).toContain('<a class="citation" href="#ref-1">[1]</a>');
    expect(calculationInputs).not.toContain("&lt;a");
  });
});
