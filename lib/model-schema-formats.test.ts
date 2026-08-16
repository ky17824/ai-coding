import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";
import { describe, expect, it } from "vitest";
import { aiAgentReportSchema, aiPublicResearchSchema } from "@/lib/ai-agent-report";
import {
  assistantResponseSchema,
  marketCompetitorResearchResponseSchema,
  marketResearchDocumentExtractionResponseSchema,
  marketResearchSynthesisResponseSchema,
  marketSizingEvidenceResponseSchema,
  marketTrendResearchResponseSchema
} from "@/lib/gtm-assistant";
import { stageSummarySchema } from "@/lib/stage-summary";

/**
 * OpenAI 구조화 출력이 문자열에 허용하는 format은 아래가 전부다.
 * 그 밖의 값이 들어가면 모델 호출이 400으로 거절된다.
 *
 * z.string().url()은 "uri"를 내보내는데 이 목록에 없다. 실제로 규제요건 조사
 * 주문에서 공개 조사 단계가 통째로 400을 맞았다:
 *   Invalid schema for response_format 'ai_public_research':
 *   In context=(... 'sourceUrls', 'items'), 'uri' is not a valid format.
 *
 * 이 실수는 타입 검사도 테스트도 잡지 못한다. 스키마는 완벽히 유효한 Zod이고,
 * 거절은 모델을 실제로 부를 때만 일어난다. 그래서 여기서 막는다.
 */
const SUPPORTED = new Set(["date-time", "time", "date", "duration", "email", "hostname", "ipv4", "ipv6", "uuid"]);

const SCHEMAS: Array<[string, z.ZodType]> = [
  ["ai_public_research", aiPublicResearchSchema],
  ["paid_ai_expert_report", aiAgentReportSchema],
  ["gtm_assistant_turn", assistantResponseSchema],
  ["gtm_market_trends", marketTrendResearchResponseSchema],
  ["gtm_market_competitors", marketCompetitorResearchResponseSchema],
  ["gtm_market_research_synthesis", marketResearchSynthesisResponseSchema],
  ["gtm_market_sizing_evidence", marketSizingEvidenceResponseSchema],
  ["gtm_private_document_evidence", marketResearchDocumentExtractionResponseSchema],
  ["stage_readiness_summary", stageSummarySchema]
];

/** 생성된 JSON Schema를 걸어 다니며 format이 붙은 자리를 전부 모은다. */
function collectFormats(node: unknown, path: string, found: string[]) {
  if (Array.isArray(node)) {
    node.forEach((item, index) => collectFormats(item, `${path}[${index}]`, found));
    return;
  }
  if (!node || typeof node !== "object") return;
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key === "format" && typeof value === "string") found.push(`${path}.format=${value}`);
    else collectFormats(value, `${path}.${key}`, found);
  }
}

describe("모델에 보내는 스키마는 OpenAI가 아는 format만 쓴다", () => {
  for (const [name, schema] of SCHEMAS) {
    it(`${name}`, () => {
      const found: string[] = [];
      collectFormats(zodTextFormat(schema, name).schema, name, found);
      const unsupported = found.filter((entry) => !SUPPORTED.has(entry.split("=")[1]));
      expect(unsupported).toEqual([]);
    });
  }
});
