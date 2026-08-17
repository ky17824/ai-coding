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

/**
 * toModelSchema가 뱉는 JSON Schema 서브셋(type object/array/string/number/boolean,
 * properties, items, required, additionalProperties, enum)만 이해하는 손수 짠 검증기.
 * JSON-Schema 검증 라이브러리를 새로 추가하지 않으려고 이 정도만 손으로 걷는다 — 이
 * 테스트가 필요로 하는 것은 딱 required·type·enum·additionalProperties뿐이다.
 */
function violationsAgainstSchema(schema: Record<string, unknown>, value: unknown, path = "$"): string[] {
  switch (schema.type) {
    case "object": {
      if (!value || typeof value !== "object" || Array.isArray(value)) return [`${path}: object이어야 합니다`];
      const obj = value as Record<string, unknown>;
      const properties = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
      const required = (schema.required ?? []) as string[];
      const violations = required.filter((key) => !(key in obj)).map((key) => `${path}.${key}: required인데 없습니다`);
      if (schema.additionalProperties === false) {
        violations.push(...Object.keys(obj).filter((key) => !(key in properties)).map((key) => `${path}.${key}: additionalProperties:false인데 있습니다`));
      }
      for (const [key, propSchema] of Object.entries(properties)) {
        if (key in obj) violations.push(...violationsAgainstSchema(propSchema, obj[key], `${path}.${key}`));
      }
      return violations;
    }
    case "array": {
      if (!Array.isArray(value)) return [`${path}: array여야 합니다`];
      const items = schema.items as Record<string, unknown> | undefined;
      return items ? value.flatMap((item, i) => violationsAgainstSchema(items, item, `${path}[${i}]`)) : [];
    }
    case "string": {
      if (typeof value !== "string") return [`${path}: string이어야 합니다`];
      const enumValues = schema.enum as string[] | undefined;
      return enumValues && !enumValues.includes(value) ? [`${path}: "${value}"이(가) enum ${JSON.stringify(enumValues)}에 없습니다`] : [];
    }
    case "number":
    case "integer":
      return typeof value === "number" ? [] : [`${path}: number이어야 합니다`];
    case "boolean":
      return typeof value === "boolean" ? [] : [`${path}: boolean이어야 합니다`];
    default:
      return [];
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

  it("같은 유효 객체가 변환 전후 스키마를 모두 통과한다", () => {
    // 변환은 제약을 느슨하게만 한다. 유효했던 값이 무효가 되면 안 된다 — 원래 Zod 스키마와
    // Anthropic에 실제로 보내는 변환 후 JSON Schema 양쪽 다에서.
    const sample = {
      summary: "s", findings: [{ title: "t", summary: "s", counterEvidence: [], sourceUrls: ["https://a.com/x"] }],
      sources: [{ title: "t", url: "https://a.com/x", publisher: "p", kind: "official", publishedAt: "2026-01-01", checkedAt: "2026-01-01" }]
    };
    expect(aiPublicResearchSchema.safeParse(sample).success).toBe(true);
    expect(violationsAgainstSchema(toModelSchema(aiPublicResearchSchema), sample)).toEqual([]);
  });

  it("required 필드가 없거나 enum 밖 값이면 변환 후 스키마도 잡아낸다 (검증기 자체의 회귀 방지)", () => {
    const missingRequired = { summary: "s", findings: [] };
    expect(violationsAgainstSchema(toModelSchema(aiPublicResearchSchema), missingRequired)).toContain("$.sources: required인데 없습니다");
    const badEnum = {
      summary: "s", findings: [],
      sources: [{ title: "t", url: "https://a.com/x", publisher: "p", kind: "not_a_real_kind", publishedAt: "2026-01-01", checkedAt: "2026-01-01" }]
    };
    expect(violationsAgainstSchema(toModelSchema(aiPublicResearchSchema), badEnum).some((v) => v.includes("enum"))).toBe(true);
  });
});
