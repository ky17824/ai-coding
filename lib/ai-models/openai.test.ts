import { beforeEach, describe, expect, it, vi } from "vitest";

const parseMock = vi.fn();
const constructorMock = vi.fn();
vi.mock("openai", () => ({ default: class { responses = { parse: parseMock }; constructor(public opts: unknown) { constructorMock(opts); } } }));

import { openaiAdapter } from "@/lib/ai-models/openai";

beforeEach(() => {
  parseMock.mockReset();
  constructorMock.mockReset();
  delete process.env.AI_PROBE;
});

describe("openaiAdapter", () => {
  it("AI_PROBE가 꺼져 있으면(기본) maxRetries는 1이다", () => {
    openaiAdapter("gpt-5.6-sol");
    expect(constructorMock.mock.calls[0][0]).toMatchObject({ maxRetries: 1 });
  });

  it("AI_PROBE=1이면 maxRetries는 0이다", () => {
    process.env.AI_PROBE = "1";
    openaiAdapter("gpt-5.6-sol");
    expect(constructorMock.mock.calls[0][0]).toMatchObject({ maxRetries: 0 });
  });

  it("classify: reasoning.effort와 safety_identifier를 넘기고 usage를 매핑한다", async () => {
    parseMock.mockResolvedValue({
      output_parsed: { offeringCategory: "beauty_personal_care", customerSegment: "consumer", targetCountryCode: "US" },
      usage: { input_tokens: 120, input_tokens_details: { cached_tokens: 20 }, output_tokens: 30 }, output: []
    });
    const result = await openaiAdapter("gpt-5.6-sol").classify({ locale: "ko", effort: "low", userHash: "h", intake: { offering: "립밤" } });
    expect(parseMock).toHaveBeenCalledTimes(1);
    const args = parseMock.mock.calls[0][0];
    expect(args.model).toBe("gpt-5.6-sol");
    expect(args.reasoning).toEqual({ effort: "low", context: "current_turn" });
    expect(args.safety_identifier).toBe("h");
    expect(args.store).toBe(false);
    expect(result.parsed.targetCountryCode).toBe("US");
    expect(result.usage).toEqual({ input: 120, cachedInput: 20, cacheWriteInput: 0, output: 30, webSearchCalls: 0 });
  });

  it("research: web_search 도구와 max_tool_calls 8, 검색 호출 수를 센다", async () => {
    parseMock.mockResolvedValue({
      output_parsed: { summary: "s", findings: [{ title: "t", summary: "s", counterEvidence: [], sourceUrls: ["https://a.com/x"] }],
        sources: [{ title: "t", url: "https://a.com/x", publisher: "p", kind: "official", publishedAt: "2026-01-01", checkedAt: "2026-01-01" }] },
      usage: { input_tokens: 1, output_tokens: 1 },
      output: [{ type: "web_search_call", action: { sources: [{ url: "https://a.com/x" }] } }, { type: "web_search_call", action: { url: "https://b.com" } }]
    });
    const result = await openaiAdapter("gpt-5.6-sol").research({ locale: "ko", effort: "medium", userHash: "h", serviceTitle: "T", deliverables: ["d"], completionInstructions: [], publicBrief: {}, reportDate: "2026-08-17", deadlineAt: Date.now() + 60_000 });
    const args = parseMock.mock.calls[0][0];
    expect(args.tools).toEqual([{ type: "web_search" }]);
    expect(args.max_tool_calls).toBe(8);
    expect(result.usage.webSearchCalls).toBe(2);
    expect(result.allowedUrls?.has("https://a.com/x")).toBe(true);
    expect(result.allowedUrls?.has("https://b.com")).toBe(true);
  });
});
