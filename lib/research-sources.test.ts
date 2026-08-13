import { describe, expect, it } from "vitest";
import { collectAllowedResearchUrls, collectCitedUrls, researchQuotaDecision } from "./research-sources";

describe("market research source verification", () => {
  it("reserves normal slots and consumes a legacy v2 upgrade only once", () => {
    expect(researchQuotaDecision(2, "legacy", null, "legacy", null)).toBe("reserve");
    expect(researchQuotaDecision(3, "legacy", null, "legacy", null)).toBe("legacy_upgrade");
    expect(researchQuotaDecision(3, "legacy", "2026-08-13T00:00:00Z", "legacy", null)).toBe("limit");
    expect(researchQuotaDecision(3, "market-research-v2", null, "market-sizing-v1", null)).toBe("sizing_upgrade");
    expect(researchQuotaDecision(2, "market-research-v2", null, "market-sizing-v1", "2026-08-14T00:00:00Z")).toBe("reserve");
    expect(researchQuotaDecision(3, "market-research-v2", null, "market-sizing-v1", "2026-08-14T00:00:00Z")).toBe("limit");
    expect(researchQuotaDecision(3, "market-research-v2", null, "market-sizing-v2", null)).toBe("limit");
  });

  it("allows only web-search and approved-source URLs, not parsed model citations", () => {
    const output = [{
      type: "message",
      content: [{ parsed: { sources: [{ url: "https://forged.example/report" }] } }]
    }, {
      type: "web_search_call",
      action: { sources: [{ type: "url", url: "https://verified.example/report?utm_source=test" }] }
    }];
    const allowed = collectAllowedResearchUrls([output], [{ source_url: "https://approved.example/report" }]);
    const cited = collectCitedUrls({ sources: [
      { url: "https://forged.example/report" },
      { url: "https://verified.example/report" },
      { url: "https://approved.example/report" }
    ] });

    expect([...cited].filter((url) => !allowed.has(url))).toEqual(["https://forged.example/report"]);
  });
});
