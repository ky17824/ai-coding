import { describe, expect, it } from "vitest";
import { collectAllowedResearchUrls, collectCitedUrls, researchQuotaDecision, stripUnverifiedSources } from "./research-sources";

describe("market research source verification", () => {
  it("reserves normal slots and consumes a legacy v2 upgrade only once", () => {
    expect(researchQuotaDecision(2, "legacy", null, "legacy", null)).toBe("reserve");
    expect(researchQuotaDecision(3, "legacy", null, "legacy", null)).toBe("legacy_upgrade");
    expect(researchQuotaDecision(3, "legacy", "2026-08-13T00:00:00Z", "legacy", null)).toBe("limit");
    expect(researchQuotaDecision(3, "market-research-v2", null, "market-sizing-v2", null)).toBe("top_down_upgrade");
    expect(researchQuotaDecision(2, "market-research-v2", null, "market-sizing-v2", "2026-08-14T00:00:00Z")).toBe("reserve");
    expect(researchQuotaDecision(3, "market-research-v2", null, "market-sizing-v2", "2026-08-14T00:00:00Z")).toBe("limit");
    expect(researchQuotaDecision(3, "market-research-v2", null, "market-sizing-v3-top-down", null)).toBe("limit");
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

  it("also allows opened pages and url_citation annotations, but never parsed model text", () => {
    const output = [
      { type: "web_search_call", action: { type: "open_page", url: "https://opened.example/page/" } },
      { type: "message", content: [{ annotations: [{ type: "url_citation", url: "https://cited.example/a#x" }], parsed: { sources: [{ url: "https://forged.example/b" }] } }] }
    ];
    const allowed = collectAllowedResearchUrls([output], []);
    expect(allowed).toEqual(new Set(["https://opened.example/page", "https://cited.example/a"]));
  });

  it("strips unverified sources in place and reports what was dropped", () => {
    const allowed = new Set(["https://ok.example/1"]);
    const dropped: string[] = [];
    const result = stripUnverifiedSources({
      trends: [
        { title: "keep", sources: [{ url: "https://ok.example/1" }, { url: "https://bad.example/x" }] },
        { title: "empty", sources: [{ url: "https://bad.example/y" }] }
      ],
      scenario: { filters: [{ name: "f", sources: [{ url: null }, { url: "https://bad.example/z" }] }] }
    }, allowed, dropped);
    expect(result.trends[0].sources).toEqual([{ url: "https://ok.example/1" }]);
    expect(result.trends[1].sources).toEqual([]);
    expect(result.scenario.filters[0].sources).toEqual([{ url: null }]);
    expect(dropped).toEqual(["https://bad.example/x", "https://bad.example/y", "https://bad.example/z"]);
  });

  it("collects and strips URL strings inside sourceUrls, not only {url} objects", () => {
    // AI 전문가 스키마의 findings[].sourceUrls는 문자열 배열이다. 예전 구현은 이 자리를
    // 통째로 놓쳐서, 발견 항목에 붙은 출처는 검증도 제거도 되지 않았다(주문 6d76942a).
    const evidence = {
      summary: "s",
      findings: [
        { title: "a", sourceUrls: ["https://ok.example/1", "https://bad.example/f"] },
        { title: "b", sourceUrls: ["https://bad.example/g"] }
      ],
      sources: [{ title: "t", url: "https://ok.example/1" }, { title: "u", url: "https://bad.example/s" }]
    };
    expect([...collectCitedUrls(evidence)].sort()).toEqual([
      "https://bad.example/f", "https://bad.example/g", "https://bad.example/s", "https://ok.example/1"
    ]);

    const dropped: string[] = [];
    stripUnverifiedSources(evidence, new Set(["https://ok.example/1"]), dropped);
    expect(evidence.findings[0].sourceUrls).toEqual(["https://ok.example/1"]);
    expect(evidence.findings[1].sourceUrls).toEqual([]);
    expect(evidence.sources).toEqual([{ title: "t", url: "https://ok.example/1" }]);
    expect(dropped.sort()).toEqual(["https://bad.example/f", "https://bad.example/g", "https://bad.example/s"]);
  });

  it("does not treat arbitrary string arrays as citations", () => {
    // deliverables 같은 일반 문자열 배열에 URL이 섞여 있어도 출처로 세지 않는다.
    expect([...collectCitedUrls({ deliverables: ["https://not-a-citation.example"] })]).toEqual([]);
  });
});

describe("collectAllowedResearchUrls — Anthropic 응답 모양", () => {
  it("web_search_tool_result의 결과 URL과 텍스트 citations URL을 모두 모은다", () => {
    const content = [
      { type: "server_tool_use", id: "srv_1", name: "web_search", input: { query: "q" } },
      { type: "web_search_tool_result", tool_use_id: "srv_1", content: [
        { type: "web_search_result", url: "https://a.com/page?utm_source=x", title: "A", encrypted_content: "..." },
        { type: "web_search_result", url: "https://b.org/doc", title: "B", encrypted_content: "..." }
      ] },
      { type: "text", text: "…", citations: [
        { type: "web_search_result_location", url: "https://c.net/read", title: "C", encrypted_index: "…", cited_text: "…" }
      ] }
    ];
    const allowed = collectAllowedResearchUrls([content], []);
    expect(allowed.has("https://a.com/page")).toBe(true);   // utm 제거
    expect(allowed.has("https://b.org/doc")).toBe(true);
    expect(allowed.has("https://c.net/read")).toBe(true);
    expect(allowed.size).toBe(3);
  });

  it("검색 오류 결과(content가 객체)는 조용히 건너뛴다", () => {
    const content = [{ type: "web_search_tool_result", tool_use_id: "srv_1", content: { type: "web_search_tool_result_error", error_code: "max_uses_exceeded" } }];
    expect(collectAllowedResearchUrls([content], []).size).toBe(0);
  });
});

// ---- 조사 출력 정리 (2026-08-19, 주문 2f8aaf21) ---------------------------------
import { sanitizeResearchOutput } from "@/lib/research-sources";

describe("sanitizeResearchOutput — 모델이 URL 자리에 제목·법령 번호를 적어도 살릴 수 있는 만큼 살린다", () => {
  const sources = [
    { title: "FDA Cosmetics Labeling Guide", url: "https://www.fda.gov/cosmetics/labeling", publisher: "FDA", kind: "official", publishedAt: "2026-01-01", checkedAt: "2026-08-19" },
    { title: "eCFR 21 CFR 701", url: "https://www.ecfr.gov/current/title-21/part-701", publisher: "eCFR", kind: "official", publishedAt: "2026-01-01", checkedAt: "2026-08-19" }
  ];

  it("출처 제목과 정확히 같은 문자열은 그 출처 URL로 바꾸고, 그 밖의 비URL은 버리며, URL이 하나도 안 남는 발견은 뺀다", () => {
    const raw = {
      summary: "s",
      findings: [
        { title: "라벨링", summary: "s", counterEvidence: [], sourceUrls: ["FDA Cosmetics Labeling Guide"] },
        { title: "성분", summary: "s", counterEvidence: [], sourceUrls: ["21 CFR 701.3", "https://www.ecfr.gov/current/title-21/part-701"] },
        { title: "근거 없음", summary: "s", counterEvidence: [], sourceUrls: ["FDA 사이트 참고"] }
      ],
      sources
    };
    const { cleaned, dropped } = sanitizeResearchOutput(raw);
    const c = cleaned as typeof raw;
    expect(c.findings.map((f) => f.sourceUrls)).toEqual([["https://www.fda.gov/cosmetics/labeling"], ["https://www.ecfr.gov/current/title-21/part-701"]]);
    expect(dropped.findings).toBe(1);
    expect(dropped.values).toEqual(["21 CFR 701.3", "FDA 사이트 참고"]);
  });

  it("URL이 아닌 sources 항목도 버린다 — 나머지는 그대로 통과", () => {
    const raw = { summary: "s", findings: [{ title: "t", summary: "s", counterEvidence: [], sourceUrls: ["https://a.com/x"] }], sources: [{ ...sources[0], url: "FDA" }, sources[1]] };
    const { cleaned, dropped } = sanitizeResearchOutput(raw);
    expect((cleaned as typeof raw).sources.map((s) => s.url)).toEqual(["https://www.ecfr.gov/current/title-21/part-701"]);
    expect(dropped.values).toEqual(["FDA"]);
  });

  it("모양이 아예 다르면 손대지 않고 그대로 돌려준다 (zod가 원래 오류를 낸다)", () => {
    expect(sanitizeResearchOutput(null).cleaned).toBeNull();
    expect(sanitizeResearchOutput({ findings: "x" }).cleaned).toEqual({ findings: "x" });
  });
});
