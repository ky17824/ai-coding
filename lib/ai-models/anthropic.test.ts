import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({ default: class { messages = { create: createMock }; constructor(public opts: unknown) {} } }));

import { PAUSE_TURN_LIMIT, anthropicAdapter } from "@/lib/ai-models/anthropic";

const textJson = (obj: unknown) => ({ type: "text", text: JSON.stringify(obj) });
const usage = { input_tokens: 100, cache_read_input_tokens: 10, cache_creation_input_tokens: 5, output_tokens: 20 };

beforeEach(() => createMock.mockReset());

describe("anthropicAdapter", () => {
  it("classify: effort를 항상 output_config 안에 보내고 output_config.format에 변환 스키마를 넣는다", async () => {
    createMock.mockResolvedValue({ stop_reason: "end_turn", content: [textJson({ offeringCategory: "beauty_personal_care", customerSegment: "consumer", targetCountryCode: "US" })], usage });
    const result = await anthropicAdapter("claude-opus-5").classify({ locale: "ko", effort: "low", userHash: "h", intake: { offering: "립밤" } });
    const args = createMock.mock.calls[0][0];
    expect(args.model).toBe("claude-opus-5");
    // effort는 SDK 최상위 요청 파라미터에 없다 — output_config 안에 있어야 실제로 반영된다.
    expect(args.output_config.effort).toBe("low");
    expect(args.metadata).toEqual({ user_id: "h" });
    expect(args.output_config.format.type).toBe("json_schema");
    expect(JSON.stringify(args.output_config.format.schema)).not.toContain("maxLength");
    expect(args.tools).toBeUndefined();
    expect(result.parsed.targetCountryCode).toBe("US");
    // input_tokens(100) + cache_read(10) + cache_creation(5) = 115 — 캐시 토큰은 input_tokens에서 제외되어 온다.
    expect(result.usage).toEqual({ input: 115, cachedInput: 10, cacheWriteInput: 5, output: 20, webSearchCalls: 0 });
  });

  it("research: 검색 호출(구조화 없음) → 정리 호출(구조화, 도구 없음), pause_turn을 이어 간다", async () => {
    const searchTurn1 = { stop_reason: "pause_turn", role: "assistant", content: [
      { type: "server_tool_use", id: "s1", name: "web_search", input: { query: "q" } },
      { type: "web_search_tool_result", tool_use_id: "s1", content: [{ type: "web_search_result", url: "https://a.com/x", title: "A", encrypted_content: "e" }] }
    ], usage: { ...usage, server_tool_use: { web_search_requests: 1 } } };
    const searchTurn2 = { stop_reason: "end_turn", role: "assistant", content: [
      { type: "text", text: "found", citations: [{ type: "web_search_result_location", url: "https://b.org/y", title: "B", encrypted_index: "i", cited_text: "c" }] }
    ], usage: { ...usage, server_tool_use: { web_search_requests: 1 } } };
    const structureTurn = { stop_reason: "end_turn", content: [textJson({ summary: "s", findings: [{ title: "t", summary: "s", counterEvidence: [], sourceUrls: ["https://a.com/x"] }], sources: [{ title: "t", url: "https://a.com/x", publisher: "p", kind: "official", publishedAt: "2026-01-01", checkedAt: "2026-01-01" }] })], usage };
    createMock.mockResolvedValueOnce(searchTurn1).mockResolvedValueOnce(searchTurn2).mockResolvedValueOnce(structureTurn);

    const result = await anthropicAdapter("claude-opus-5").research({ locale: "ko", effort: "medium", userHash: "h", serviceTitle: "T", deliverables: ["d"], completionInstructions: [], publicBrief: {}, reportDate: "2026-08-17", deadlineAt: Date.now() + 120_000 });

    expect(createMock).toHaveBeenCalledTimes(3);
    const first = createMock.mock.calls[0][0];
    expect(first.tools).toEqual([{ type: "web_search_20250305", name: "web_search", max_uses: 8, allowed_callers: ["direct"] }]);
    // 검색 호출은 구조화 출력을 쓰지 않지만, effort는 output_config에 여전히 실려 간다.
    expect(first.output_config).toEqual({ effort: "medium" });
    // 두 번째 호출은 첫 응답의 assistant 메시지를 그대로 되돌려 보낸다
    const second = createMock.mock.calls[1][0];
    expect(second.messages.at(-1)).toEqual({ role: "assistant", content: searchTurn1.content });
    // 세 번째(정리)는 도구 없음 + 구조화, effort도 함께
    const third = createMock.mock.calls[2][0];
    expect(third.tools).toBeUndefined();
    expect(third.output_config.effort).toBe("medium");
    expect(third.output_config.format.type).toBe("json_schema");
    expect(result.usage.webSearchCalls).toBe(2);
    // input_tokens(100) + cache_read(10) + cache_creation(5) = 115/호출 × 3회 호출 = 345
    expect(result.usage.input).toBe(345);
    expect(result.allowedUrls?.has("https://a.com/x")).toBe(true);
    expect(result.allowedUrls?.has("https://b.org/y")).toBe(true);
  });

  it("pause_turn이 상한을 넘으면 던진다", async () => {
    createMock.mockResolvedValue({ stop_reason: "pause_turn", role: "assistant", content: [], usage });
    await expect(anthropicAdapter("claude-opus-5").research({ locale: "ko", effort: "medium", userHash: "h", serviceTitle: "T", deliverables: [], completionInstructions: [], publicBrief: {}, reportDate: "2026-08-17", deadlineAt: Date.now() + 120_000 }))
      .rejects.toThrow("web_search_pause_limit");
    expect(createMock).toHaveBeenCalledTimes(PAUSE_TURN_LIMIT + 1);
  });

  it("예산이 부족하면 pause_turn을 이어 가지 않고 던진다", async () => {
    createMock.mockResolvedValue({ stop_reason: "pause_turn", role: "assistant", content: [], usage });
    await expect(anthropicAdapter("claude-opus-5").research({ locale: "ko", effort: "medium", userHash: "h", serviceTitle: "T", deliverables: [], completionInstructions: [], publicBrief: {}, reportDate: "2026-08-17", deadlineAt: Date.now() + 1_000 }))
      .rejects.toThrow("budget_exhausted");
  });

  it("writeReport: 파일을 document/image 블록으로 넘긴다", async () => {
    createMock.mockResolvedValue({ stop_reason: "end_turn", content: [textJson(minimalReport())], usage });
    await anthropicAdapter("claude-opus-5").writeReport({ locale: "ko", effort: "high", userHash: "h", instructions: "i", payload: { a: 1 },
      files: [{ signedUrl: "https://s/x.pdf", fileName: "x.pdf", mimeType: "application/pdf" }, { signedUrl: "https://s/y.png", fileName: "y.png", mimeType: "image/png" }], deadlineAt: Date.now() + 120_000 });
    const content = createMock.mock.calls[0][0].messages[0].content;
    expect(content[1]).toEqual({ type: "document", source: { type: "url", url: "https://s/x.pdf" }, title: "x.pdf" });
    expect(content[2]).toEqual({ type: "image", source: { type: "url", url: "https://s/y.png" } });
    expect(createMock.mock.calls[0][0].max_tokens).toBe(32_000);
    expect(createMock.mock.calls[0][0].output_config.effort).toBe("high");
  });
});

function minimalReport() {
  return {
    title: "t", executiveSummary: "e", methodology: "m",
    findings: [{ title: "f", status: "fact", confidence: "high", summary: "s", evidence: [], counterEvidence: [], questionIds: ["q1"], sourceUrls: [], actions: [] }],
    actionPlan: [{ title: "a", why: "w", owner: "o", timing: "t", successMetric: "s", stopCondition: "c" }],
    assumptions: [], questionCoverage: [{ questionId: "q1", disposition: "used", priority: "critical", reason: "r" }],
    contradictions: [], marketSizing: null,
    sources: [{ title: "t", url: "https://a.com/x", publisher: "p", kind: "official", publishedAt: "2026-01-01", checkedAt: "2026-01-01" }],
    evidenceGaps: [], humanVerification: [], limitations: ["l"]
  };
}
