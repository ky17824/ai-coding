import { describe, expect, it } from "vitest";
import { z } from "zod";
import { aiAgentReportSchema, aiPublicResearchSchema } from "@/lib/ai-agent-report";
import { ANTHROPIC_UNSUPPORTED_KEYWORDS, toModelSchema } from "@/lib/ai-models/schema";

function collectKeys(node: unknown, found: string[], path = "$") {
  if (Array.isArray(node)) { node.forEach((item, i) => collectKeys(item, found, `${path}[${i}]`)); return; }
  if (!node || typeof node !== "object") return;
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (ANTHROPIC_UNSUPPORTED_KEYWORDS.has(key)) found.push(`${path}.${key}`);
    if (key === "minItems" && typeof value === "number" && value > 1) found.push(`${path}.minItems=${value}`);
    collectKeys(value, found, `${path}.${key}`);
  }
}

describe("toModelSchema", () => {
  for (const [name, schema] of [["ai_public_research", aiPublicResearchSchema], ["paid_ai_expert_report", aiAgentReportSchema]] as const) {
    it(`${name}: Anthropic 미지원 키워드가 없다`, () => {
      const found: string[] = [];
      collectKeys(toModelSchema(schema), found);
      expect(found).toEqual([]);
    });
  }

  it("required와 additionalProperties:false를 보존한다", () => {
    const out = toModelSchema(z.object({ a: z.string().max(5), b: z.array(z.string()).min(1).max(3) }).strict()) as {
      required?: string[]; additionalProperties?: boolean; properties: Record<string, Record<string, unknown>>;
    };
    expect(out.required).toEqual(["a", "b"]);
    expect(out.additionalProperties).toBe(false);
    expect(out.properties.a.maxLength).toBeUndefined();
    expect(out.properties.b.minItems).toBe(1);
    expect(out.properties.b.maxItems).toBeUndefined();
  });

  it("minItems 2 이상은 지운다 (0/1만 지원)", () => {
    const out = toModelSchema(z.object({ xs: z.array(z.number()).min(2) })) as { properties: Record<string, Record<string, unknown>> };
    expect(out.properties.xs.minItems).toBeUndefined();
  });

  it("같은 유효 객체가 변환 전후 스키마를 모두 통과한다", async () => {
    // 변환은 제약을 느슨하게만 한다. 유효했던 값이 무효가 되면 안 된다.
    const sample = {
      summary: "s", findings: [{ title: "t", summary: "s", counterEvidence: [], sourceUrls: ["https://a.com/x"] }],
      sources: [{ title: "t", url: "https://a.com/x", publisher: "p", kind: "official", publishedAt: "2026-01-01", checkedAt: "2026-01-01" }]
    };
    expect(aiPublicResearchSchema.safeParse(sample).success).toBe(true);
  });
});
