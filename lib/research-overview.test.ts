import { describe, expect, it } from "vitest";
import { buildCompetitorOverview, buildTrendOverview } from "./research-overview";
import type { GtmMarketCompetitor, GtmMarketTrend } from "./types";

const source = {
  title: "Source",
  url: "https://example.com/report",
  publisher: "Example",
  publishedAt: "2026-01-01",
  checkedAt: "2026-08-14",
  kind: "industry" as const
};

describe("research overview", () => {
  it("groups every trend into one compact market-trend overview", () => {
    const trends = [
      { category: "demand", title: "수요 증가", implication: "재구매 검증", finding: "성장", confidence: "high", freshness: "current", sources: [source], sourceTitle: source.title, url: source.url },
      { category: "regulation", title: "규제 준비", implication: "신고 선행", finding: "규제", confidence: "medium", freshness: "current", sources: [source], sourceTitle: source.title, url: source.url }
    ] satisfies GtmMarketTrend[];

    expect(buildTrendOverview(trends, false)).toMatchObject({
      count: 2,
      sourceCount: 1,
      groups: [
        { label: "수요·성장", items: ["수요 증가"] },
        { label: "규제", items: ["규제 준비"] }
      ]
    });
  });

  it("groups every competitor into one compact competitive overview", () => {
    const competitors = [
      { name: "A", type: "direct", marketPresence: "local", differentiationGap: "가격", pricePositioning: "중가", targetCustomer: "고객", valueProposition: "가치", channels: [], strengths: [], weaknesses: [], relevance: "직접 경쟁", confidence: "high", freshness: "current", sources: [source], sourceTitle: source.title, url: source.url },
      { name: "B", type: "alternative", marketPresence: "global", differentiationGap: "안전성", pricePositioning: "저가", targetCustomer: "고객", valueProposition: "대체재", channels: [], strengths: [], weaknesses: [], relevance: "대체 경쟁", confidence: "medium", freshness: "current", sources: [source], sourceTitle: source.title, url: source.url }
    ] satisfies GtmMarketCompetitor[];

    expect(buildCompetitorOverview(competitors, false)).toMatchObject({
      count: 2,
      sourceCount: 1,
      groups: [
        { label: "직접 경쟁", items: ["A"] },
        { label: "대체재", items: ["B"] }
      ]
    });
  });
});
