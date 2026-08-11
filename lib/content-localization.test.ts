import { describe, expect, it } from "vitest";
import { contentHash, contentLocalizationInternals } from "@/lib/content-localization";

describe("content localization", () => {
  it("translates narrative text but preserves identifiers and proper-name fields", () => {
    const values = contentLocalizationInternals.collectStrings({
      summary: "한국 고객 검증이 필요합니다.",
      founderContext: { offeringName: "서울랩", targetCountry: "미국", targetCustomer: "중소 제조사" },
      marketResearch: { competitors: [{ name: "Acme", relevance: "주요 대안입니다." }] },
      url: "https://example.com"
    }, "ko");
    expect(values.map((entry) => entry.path.join("."))).toEqual([
      "summary",
      "founderContext.targetCustomer",
      "marketResearch.competitors.0.relevance"
    ]);
  });

  it("changes the cache key when source text changes", () => {
    expect(contentHash("first")).not.toBe(contentHash("second"));
  });
});
