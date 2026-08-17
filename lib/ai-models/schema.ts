import { z } from "zod";

/**
 * Anthropic 구조화 출력이 400으로 거절하는 JSON Schema 키워드.
 * https://platform.claude.com/docs/en/build-with-claude/structured-outputs (2026-08-17)
 *
 * OpenAI는 같은 키워드를 무시하고 format:"uri"를 거절했다. 두 공급자가 서로 다른 것을
 * 거절하므로 "모델에 보내는 스키마"와 "검증에 쓰는 스키마"는 분리한다. 검증은 원래 Zod가
 * 하고, 길이 초과는 lib/lenient-text-format의 parseTruncatingStrings가 자른다.
 */
export const ANTHROPIC_UNSUPPORTED_KEYWORDS = new Set([
  "minLength", "maxLength", "pattern", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf", "maxItems"
]);

function strip(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(strip);
  if (!node || typeof node !== "object") return node;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (ANTHROPIC_UNSUPPORTED_KEYWORDS.has(key)) continue;
    if (key === "minItems") { if (value === 0 || value === 1) out[key] = value; continue; }
    out[key] = strip(value);
  }
  // Anthropic은 additionalProperties:false를 요구하고 다른 값은 거절한다. Zod 4의
  // toJSONSchema는 기본 z.object()에도 이미 false를 내보내지만(2026-08-17 실측),
  // .passthrough() 등 예외가 조용히 새 나가지 않도록 object 노드에서 강제한다.
  if (out.type === "object") out.additionalProperties = false;
  return out;
}

/** Zod → Anthropic이 받는 JSON Schema. additionalProperties:false와 required는 유지된다. */
export function toModelSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { target: "draft-7", unrepresentable: "any" });
  const cleaned = strip(json) as Record<string, unknown>;
  delete cleaned.$schema;
  return cleaned;
}
