import type { GtmMarketCompetitor, GtmMarketTrend, GtmResearchSource } from "./types";

export interface ResearchOverview {
  count: number;
  sourceCount: number;
  groups: { label: string; items: string[] }[];
}

function sourceCount(entries: { sources: GtmResearchSource[] }[]) {
  return new Set(entries.flatMap((entry) => entry.sources.map((source) => source.url || `${source.publisher}:${source.title}`))).size;
}

export function buildTrendOverview(entries: GtmMarketTrend[], en: boolean): ResearchOverview {
  const labels: Record<GtmMarketTrend["category"], [string, string]> = {
    demand: ["수요·성장", "Demand & growth"],
    customer_behavior: ["고객 행동", "Customer behavior"],
    channel: ["유통·채널", "Distribution & channels"],
    regulation: ["규제", "Regulation"],
    product_culture: ["제품·문화", "Product & culture"]
  };
  return {
    count: entries.length,
    sourceCount: sourceCount(entries),
    groups: Object.entries(labels).flatMap(([category, label]) => {
      const items = entries.filter((entry) => entry.category === category).map((entry) => entry.title);
      return items.length ? [{ label: label[en ? 1 : 0], items }] : [];
    })
  };
}

export function buildCompetitorOverview(entries: GtmMarketCompetitor[], en: boolean): ResearchOverview {
  const labels: Record<GtmMarketCompetitor["type"], [string, string]> = {
    direct: ["직접 경쟁", "Direct"],
    adjacent: ["인접 경쟁", "Adjacent"],
    alternative: ["대체재", "Alternatives"]
  };
  return {
    count: entries.length,
    sourceCount: sourceCount(entries),
    groups: Object.entries(labels).flatMap(([type, label]) => {
      const items = entries.filter((entry) => entry.type === type).map((entry) => entry.name);
      return items.length ? [{ label: label[en ? 1 : 0], items }] : [];
    })
  };
}
