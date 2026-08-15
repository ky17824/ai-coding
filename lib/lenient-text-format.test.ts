import { describe, expect, it } from "vitest";
import { z } from "zod";
import { lenientZodTextFormat, parseTruncatingStrings } from "./lenient-text-format";

const schema = z.object({
  result: z.object({
    items: z.array(z.object({ relevance: z.string().min(1).max(5), score: z.number().min(0).max(1) })),
    note: z.string().max(3).nullable()
  })
});

describe("parseTruncatingStrings", () => {
  it("truncates over-long strings anywhere in the tree instead of failing", () => {
    const parsed = parseTruncatingStrings(schema, {
      result: { items: [{ relevance: "1234567890", score: 0.5 }, { relevance: "ok", score: 1 }], note: "abcdef" }
    });
    expect(parsed.result.items[0].relevance).toBe("12345");
    expect(parsed.result.items[1].relevance).toBe("ok");
    expect(parsed.result.note).toBe("abc");
  });

  it("still rejects everything that is not a string-length overflow", () => {
    expect(() => parseTruncatingStrings(schema, { result: { items: [{ relevance: "ok", score: 2 }], note: null } })).toThrow();
    expect(() => parseTruncatingStrings(schema, { result: { items: [{ relevance: "", score: 0 }], note: null } })).toThrow();
  });

  it("keeps the OpenAI text format shape and parses through the lenient path", () => {
    const format = lenientZodTextFormat(schema, "x") as unknown as { type: string; name: string; strict: boolean; $parseRaw: (content: string) => z.infer<typeof schema> };
    expect(format.type).toBe("json_schema");
    expect(format.name).toBe("x");
    expect(format.strict).toBe(true);
    expect(format.$parseRaw(JSON.stringify({ result: { items: [{ relevance: "toolong", score: 0 }], note: null } })).result.items[0].relevance).toBe("toolo");
  });
});
