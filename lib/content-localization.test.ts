import { describe, expect, it } from "vitest";
import { contentHash, contentLocalizationInternals } from "@/lib/content-localization";

describe("content localization", () => {
  it("translates narrative text but preserves identifiers and proper-name fields", () => {
    const values = contentLocalizationInternals.collectStrings({
      summary: "한국 고객 검증이 필요합니다.",
      founderContext: { offeringName: "서울랩", targetCountry: "미국", targetCustomer: "중소 제조사" },
      marketResearch: { competitors: [{ name: "Acme", relevance: "주요 대안입니다." }] },
      researchContextSignature: "{\"targetCountry\":\"미국\"}",
      url: "https://example.com"
    }, "ko");
    expect(values.map((entry) => entry.path.join("."))).toEqual([
      "summary",
      "founderContext.targetCountry",
      "founderContext.targetCustomer",
      "marketResearch.competitors.0.relevance"
    ]);
  });

  it("changes the cache key when source text changes", () => {
    expect(contentHash("first")).not.toBe(contentHash("second"));
  });

  it("translates text by its actual script when stored locale metadata is wrong", () => {
    const englishOnKoreanPlan = contentLocalizationInternals.collectStrings({
      founderContext: {
        targetCountry: "Singapore",
        targetCustomer: "Working women in their 20s and 30s",
        currentAlternative: "No information",
        deliveryModel: "Local partner"
      },
      marketResearch: { executiveSummary: "Singapore presents a potential market entry opportunity." }
    }, "ko", "ko");
    const koreanOnEnglishPlan = contentLocalizationInternals.collectStrings({
      founderContext: { targetCustomer: "싱가포르 20~30대 직장 여성" }
    }, "en", "en");

    expect(englishOnKoreanPlan.map((entry) => entry.path.join("."))).toEqual([
      "founderContext.targetCountry",
      "founderContext.targetCustomer",
      "founderContext.currentAlternative",
      "founderContext.deliveryModel",
      "marketResearch.executiveSummary"
    ]);
    expect(koreanOnEnglishPlan.map((entry) => entry.path.join("."))).toEqual([
      "founderContext.targetCustomer"
    ]);
  });

  it("translates mixed prose while preserving short technical terms", () => {
    const values = contentLocalizationInternals.collectStrings({
      summary: "싱가포르 시장 but the available information is insufficient for a reliable estimate.",
      acronym: "TAM · SAM · SOM"
    }, "ko", "ko");

    expect(values.map((entry) => entry.path.join("."))).toEqual(["summary"]);
  });
});
