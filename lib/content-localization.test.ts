import { afterEach, describe, expect, it, vi } from "vitest";
import { contentHash, contentLocalizationInternals } from "@/lib/content-localization";

const mocks = vi.hoisted(() => ({ parse: vi.fn() }));

vi.mock("openai", () => ({
  default: class {
    responses = { parse: mocks.parse };
  }
}));

import { localizeStoredGtmPlan } from "@/lib/content-localization";

afterEach(() => {
  mocks.parse.mockReset();
  delete process.env.OPENAI_API_KEY;
});

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

  it("never waits for a remote translation while rendering a stored plan", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    mocks.parse.mockResolvedValue({
      output_parsed: { translations: [{ key: "summary", text: "한국어 요약" }] }
    });
    const admin = {
      from: () => ({
        upsert: async () => ({ error: null }),
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                in: async () => ({ data: [], error: null })
              })
            })
          })
        })
      })
    };

    const localized = await localizeStoredGtmPlan(admin as never, "org-1", {
      id: "plan-1",
      assessmentId: "assessment-1",
      status: "draft",
      summary: "English market summary for founders.",
      assumptions: [],
      founderContext: {},
      marketResearch: null,
      marketResearchConfirmedAt: null,
      recentMessages: [],
      turnCount: 0,
      generationCount: 0,
      generatedBy: "gpt-5.6-sol",
      contentLocale: "en",
      items: []
    }, "ko");

    expect(localized.summary).toBe("English market summary for founders.");
    expect(localized.translationFallback).toBe(true);
    expect(mocks.parse).not.toHaveBeenCalled();
  });

  it("waits for missing translations when generating a durable report", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    mocks.parse.mockResolvedValue({
      output_parsed: { translations: [{ key: "summary", text: "한국어 요약" }] }
    });
    const admin = {
      from: () => ({
        upsert: async () => ({ error: null }),
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                in: async () => ({ data: [], error: null })
              })
            })
          })
        })
      })
    };
    const plan = {
      id: "plan-report",
      assessmentId: "assessment-1",
      status: "active" as const,
      summary: "English report summary for founders.",
      assumptions: [],
      founderContext: {},
      marketResearch: null,
      marketResearchConfirmedAt: null,
      recentMessages: [],
      turnCount: 0,
      generationCount: 0,
      generatedBy: "gpt-5.6-sol",
      contentLocale: "en" as const,
      items: []
    };

    const localized = await localizeStoredGtmPlan(
      admin as never,
      "org-1",
      plan,
      "ko",
      { waitForMissing: true }
    );

    expect(localized.summary).toBe("한국어 요약");
    expect(localized.translationFallback).toBe(false);
    expect(mocks.parse).toHaveBeenCalledOnce();
  });

  it("does not publish a partially translated durable report", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    mocks.parse.mockResolvedValue({
      output_parsed: { translations: [{ key: "summary", text: "한국어 요약" }] }
    });
    const admin = {
      from: () => ({
        upsert: async () => ({ error: null }),
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                in: async () => ({ data: [], error: null })
              })
            })
          })
        })
      })
    };

    const localized = await localizeStoredGtmPlan(admin as never, "org-1", {
      id: "plan-partial",
      assessmentId: "assessment-1",
      status: "active",
      summary: "English report summary.",
      assumptions: ["English report assumption."],
      founderContext: {},
      marketResearch: null,
      marketResearchConfirmedAt: null,
      recentMessages: [],
      turnCount: 0,
      generationCount: 0,
      generatedBy: "gpt-5.6-sol",
      contentLocale: "en",
      items: []
    }, "ko", { waitForMissing: true });

    expect(localized.summary).toBe("English report summary.");
    expect(localized.assumptions).toEqual(["English report assumption."]);
    expect(localized.translationFallback).toBe(true);
  });
});
