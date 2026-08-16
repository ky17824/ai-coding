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
let assessmentData: Record<string, unknown> = { survey_version: "5.0", sales_motion: "direct" };
const admin = {
  from(table: string) {
    const data = table === "profiles"
      ? { organization_id: "org-1" }
      : table === "gtm_plans"
        ? planData
        : table === "gtm_plan_items"
          ? []
          : table === "assessments"
            ? assessmentData
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

const setReportPlan = (research: Record<string, unknown>) => {
  planData = {
    id: "plan-1", organization_id: "org-1", assessment_id: null, status: "active", summary: "", assumptions: [], market_research_documents: [], recent_messages: [], turn_count: 0, generation_count: 0, model: "gpt-5.6-sol", content_locale: "ko", founder_context_locale: "ko", market_research_locale: "ko", updated_at: "2026-01-01",
    founder_context: { offeringName: "Offer", offeringType: "service", targetCountry: "KR", targetCustomer: "buyer", offeringSummary: "summary", customerProblem: "problem", coreValue: "value" },
    market_research: {
      executiveSummary: "summary", scope: "sellability_review", sellability: { summary: "ok" }, marketDefinition: { included: "all", excluded: "", annualRevenueUnit: "KRW" },
      marketSizing: [], trends: [], competitors: [], contradictions: [], researchCoverage: { lanes: [], sourceCount: 0, uniqueDomainCount: 0, competitorCount: 0, sourceTypes: {}, coverageGaps: [] }, limitations: [], nextExperiments: [],
      ...research
    },
    items: []
  };
};

describe("market report readiness coverage", () => {
  beforeEach(() => {
    failureTable = "";
    planData = { id: "plan-1", organization_id: "org-1", assessment_id: "assessment-1" };
    assessmentData = { survey_version: "5.0", sales_motion: "direct" };
  });

  it.each(["assessments", "readiness_answers"])("fails closed when %s cannot be loaded", async (table) => {
    failureTable = table;
    expect((await get()).status).toBe(500);
  });

  it("combines repeated applicability reasons into one readable item", async () => {
    setReportPlan({});
    planData.assessment_id = "assessment-1";
    assessmentData = { survey_version: "5.0", sales_motion: "direct", target_country: "US" };

    const html = await (await get()).text();

    expect(html.match(/유료 고객 증거가 없어 매출 집중도 문항은 해당 없음/g)).toHaveLength(1);
    expect(html).toContain('class="readiness-stats"');
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

  it("numbers market-size citations in their body render order", async () => {
    const inputSource = { title: "Input source", url: "https://input.example/report", publisher: "Input", publishedAt: null, checkedAt: "2026-01-01", kind: "fact" };
    const cardSource = { title: "Card source", url: "https://card.example/report", publisher: "Card", publishedAt: null, checkedAt: "2026-01-01", kind: "fact" };
    planData = {
      id: "plan-1", organization_id: "org-1", assessment_id: null, status: "active", summary: "", assumptions: [], market_research_documents: [], recent_messages: [], turn_count: 0, generation_count: 0, model: "gpt-5.6-sol", content_locale: "ko", founder_context_locale: "ko", market_research_locale: "ko", updated_at: "2026-01-01",
      founder_context: { offeringName: "Offer", offeringType: "service", targetCountry: "KR", targetCustomer: "buyer", offeringSummary: "summary", customerProblem: "problem", coreValue: "value" },
      market_research: {
        executiveSummary: "summary", scope: "sellability_review", sellability: { summary: "ok" }, marketDefinition: { included: "all", excluded: "", annualRevenueUnit: "KRW" },
        marketSizing: [{ key: "tam", label: "TAM", status: "estimated", estimate: "1", range: null, method: "bottom_up", formula: "x", calculationInputs: [{ name: "Customers", low: 1, base: 2, high: 3, unit: "count", sourceTitles: ["Input source"], sources: [inputSource] }], assumptions: [], sources: [cardSource], confidence: "high", evidenceGaps: [], sensitivityDrivers: [], validation: [], cohesion: null, expansionPath: [] }],
        trends: [], competitors: [], contradictions: [], researchCoverage: { lanes: [], sourceCount: 2, uniqueDomainCount: 2, competitorCount: 0, sourceTypes: {}, coverageGaps: [] }, limitations: [], nextExperiments: []
      },
      items: []
    };

    const html = await (await get()).text();
    const marketCard = html.slice(html.indexOf('<article class="market-card">'), html.indexOf("</article>", html.indexOf('<article class="market-card">')));
    const calculationInputs = marketCard.slice(marketCard.indexOf("계산 입력값"), marketCard.indexOf("신뢰도"));
    expect(calculationInputs).toContain('<a class="citation" href="#ref-1">[1]</a>');
    expect(calculationInputs).not.toContain("&lt;a");
    expect(marketCard.match(/href="#ref-\d+"/g)).toEqual(['href="#ref-1"', 'href="#ref-2"']);
    expect(html.indexOf("Input source")).toBeLessThan(html.indexOf("Card source"));
  });

  it("renders localized market-size status and one key limitation in card hierarchy", async () => {
    const marketSize = (label: string, status: "estimated" | "insufficient_evidence", estimate: string, gap: string) => ({
      key: label.toLowerCase(), label, status, estimate, range: null, method: "bottom_up", formula: `${label} formula`, calculationInputs: [], assumptions: [], sources: [], confidence: "low", evidenceGaps: [gap], sensitivityDrivers: [], validation: [], cohesion: null, expansionPath: []
    });
    setReportPlan({ marketSizing: [marketSize("TAM", "estimated", "₩1조", "추정 한계"), marketSize("SAM", "insufficient_evidence", "산정 불가", "근거 한계")] });

    const html = await (await get()).text();
    const cards = html.match(/<article class="market-card">.*?<\/article>/g) ?? [];
    const [estimatedCard = "", insufficientCard = ""] = cards;

    expect(estimatedCard).toContain('<strong>₩1조</strong><p class="market-status"><strong>상태</strong><br>추정치</p><p><strong>산식</strong><br>TAM formula</p><p class="key-limitation"><strong>핵심 한계</strong><br>추정 한계</p>');
    expect(insufficientCard).toContain('<strong>산정 불가</strong><p class="market-status"><strong>상태</strong><br>근거 부족</p><p><strong>산식</strong><br>SAM formula</p><p class="key-limitation"><strong>핵심 한계</strong><br>근거 한계</p>');
    expect(estimatedCard.match(/추정 한계/g)).toHaveLength(1);
    expect(insufficientCard.match(/근거 한계/g)).toHaveLength(1);
  });

  it("labels Top-Down market-size estimates in the report", async () => {
    setReportPlan({ marketSizing: [{
      key: "tam", label: "TAM", status: "estimated", estimate: "₩1조", range: null,
      method: "top_down", formula: "공개 시장자료 경로 2개 평균", calculationInputs: [], assumptions: [],
      sources: [], confidence: "medium", evidenceGaps: [], sensitivityDrivers: [], validation: [], cohesion: null, expansionPath: []
    }] });

    expect(await (await get()).text()).toContain("Top-Down · 공개자료 기반 하향식 추정");
  });

  it("renders compact market details and readable competitor cards without raw body URLs", async () => {
    const source = {
      title: "Source",
      url: "https://example.com/very/long/source?utm_source=openai",
      publisher: "Example",
      publishedAt: "2026-01-01",
      checkedAt: "2026-01-02",
      kind: "industry"
    };
    setReportPlan({
      marketSizing: [{
        key: "tam", label: "TAM", status: "estimated", estimate: "US$1B", range: null,
        method: "top_down", formula: "공개자료 경로 평균", calculationInputs: [], assumptions: ["proxy_assumption"],
        sources: [source], confidence: "medium", evidenceGaps: ["공개 세부자료 부족"], sensitivityDrivers: [], validation: [], cohesion: null, expansionPath: []
      }],
      trends: [{
        title: "시장 변화", category: "demand",
        finding: "수요가 증가한다. ([example.com](https://example.com/very/long/source?utm_source=openai))",
        implication: "진입 시점을 검토한다. https://example.com/very/long/source?utm_source=openai",
        sourceTitle: source.title, sources: [source], confidence: "high", freshness: "current"
      }],
      competitors: [{
        name: "경쟁사", type: "direct", marketPresence: "global",
        relevance: "직접 경쟁 후보 ([example.com](https://example.com/very/long/source?utm_source=openai))",
        targetCustomer: "직장인", valueProposition: "보습", strengths: ["유통"], weaknesses: ["차별화 부족"],
        pricePositioning: "대중 가격", channels: ["온라인"], differentiationGap: "향기",
        sourceTitles: [source.title], sources: [source]
      }],
      researchCoverage: { lanes: ["demand"], sourceCount: 1, uniqueDomainCount: 1, competitorCount: 1, sourceTypes: { industry: 1 }, coverageGaps: [] }
    });
    (planData.founder_context as Record<string, unknown>).offeringType = "product";

    const html = await (await get()).text();
    const body = html.slice(0, html.indexOf("참고문헌"));

    expect(html).toContain('<div class="market-grid">');
    expect(html).toContain('<details class="market-details">');
    expect(html).toContain('class="competitor-grid"');
    expect(html).not.toContain("<table>");
    expect(html).toContain("<dd>제품</dd>");
    expect(body).not.toContain(source.url);
    expect(body).not.toContain("[example.com]");
    expect(body).toContain("example.com");
    expect(html).toContain("grid-template-columns:repeat(2,minmax(0,1fr))");
  });

  it("renders 40 unique references without leaking or duplicating source URLs", async () => {
    const sources = Array.from({ length: 40 }, (_, index) => ({
      title: `Source ${index + 1}`,
      url: `https://sources.example/report/${index + 1}?long=body`,
      publisher: "Source publisher",
      publishedAt: "2026-01-01",
      checkedAt: "2026-01-02",
      kind: "industry"
    }));
    setReportPlan({
      trends: [{ title: "All sources", category: "demand", finding: "finding", implication: "implication", sourceTitle: sources[0].title, sources: [...sources, sources[0]], confidence: "high", freshness: "current" }],
      researchCoverage: { lanes: ["demand"], sourceCount: 40, uniqueDomainCount: 1, competitorCount: 0, sourceTypes: { industry: 40 }, coverageGaps: [] }
    });

    const html = await (await get()).text();
    const bibliographyStart = html.indexOf("참고문헌");
    const bodyBeforeBibliography = html.slice(html.indexOf("<body>"), bibliographyStart);
    const referenceNumbers = [...html.matchAll(/id="ref-(\d+)"/g)].map((match) => Number(match[1]));
    const citationNumbersInBody = [...bodyBeforeBibliography.matchAll(/href="#ref-(\d+)"/g)].map((match) => Number(match[1]));

    expect(referenceNumbers).toEqual(Array.from({ length: 40 }, (_, index) => index + 1));
    expect(citationNumbersInBody).toEqual(referenceNumbers);
    expect(html.match(/id="ref-1"/g)).toHaveLength(1);
    expect(bodyBeforeBibliography.match(/href="#ref-1"/g)).toHaveLength(1);
    for (const source of sources) expect(bodyBeforeBibliography).not.toContain(source.url);
  });

  it("renders the executive report structure with deduplicated body citations", async () => {
    const source = {
      title: "Long source title that belongs only in the bibliography",
      url: "https://example.com/a/very/long/path?inside=body",
      publisher: "Example",
      publishedAt: "2026-01-01",
      checkedAt: "2026-01-02",
      kind: "industry"
    };
    const marketSize = (key: string, label: string) => ({
      key, label, status: "estimated", estimate: "₩1조", range: null, method: "bottom_up", formula: "고객 수 × 객단가",
      calculationInputs: [], assumptions: [], sources: [source], confidence: "medium", evidenceGaps: [], sensitivityDrivers: [], validation: [], cohesion: null, expansionPath: []
    });
    planData = {
      id: "plan-1", organization_id: "org-1", assessment_id: null, status: "active", summary: "", assumptions: ["공개 자료 기준"], market_research_documents: [], recent_messages: [], turn_count: 0, generation_count: 0, model: "gpt-5.6-sol", content_locale: "ko", founder_context_locale: "ko", market_research_locale: "ko", updated_at: "2026-01-01",
      founder_context: { offeringName: "Offer", offeringType: "service", targetCountry: "KR", targetCustomer: "buyer", offeringSummary: "summary", customerProblem: "problem", coreValue: "value" },
      market_research: {
        executiveSummary: "의사결정 요약", scope: "sellability_review", sellability: { summary: "조건부 진출" }, marketDefinition: { included: "국내 시장", excluded: "해외 시장", annualRevenueUnit: "KRW" },
        marketSizing: [marketSize("tam", "TAM"), marketSize("sam", "SAM"), marketSize("som", "SOM"), marketSize("beachhead", "Beachhead")],
        trends: [{ title: "성장 추세", category: "demand", finding: "수요 증가", implication: "진입 검토", sourceTitle: source.title, sources: [source], confidence: "high", freshness: "current" }],
        competitors: [{ name: "경쟁사", type: "direct", marketPresence: "local", relevance: "높음", targetCustomer: "buyer", valueProposition: "value", strengths: [], weaknesses: [], pricePositioning: "premium", channels: [], differentiationGap: "gap", sourceTitles: [source.title], sources: [source] }],
        contradictions: [{ topic: "시장 성장률", summary: "자료별 차이", sourceTitles: [source.title], sources: [source] }],
        researchCoverage: { lanes: ["demand"], sourceCount: 1, uniqueDomainCount: 1, competitorCount: 1, sourceTypes: { industry: 1 }, coverageGaps: [] },
        limitations: ["표본 제한"], nextExperiments: ["고객 인터뷰"]
      },
      items: []
    };

    const html = await (await get()).text();
    const bodyBeforeBibliography = html.slice(0, html.indexOf("참고문헌"));

    expect(html).toContain('class="report-cover"');
    expect(html).toContain('id="ref-1"');
    expect(html).toContain('href="#ref-1"');
    expect(html.indexOf("경영진 요약")).toBeLessThan(html.indexOf("시장 범위와 규모"));
    expect(html.indexOf("참고문헌")).toBeGreaterThan(html.indexOf("가정과 한계"));
    expect(html.match(/id="ref-1"/g)).toHaveLength(1);
    expect(html.match(/href="#ref-1"/g)?.length).toBeGreaterThan(1);
    expect(bodyBeforeBibliography).not.toContain("https://example.com/a/very/long/path?inside=body");
    expect(html).toContain("@media(max-width:700px)");
    expect(html).toContain("@media print");
  });
});
