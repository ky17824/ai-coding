import type { AiAgentReport, AiPublicResearch, PublicClassification } from "@/lib/ai-agent-report";
import type { Effort, ModelUsage } from "@/lib/ai-models/catalog";

export type StageResult<T> = { parsed: T; usage: ModelUsage; allowedUrls?: Set<string> };
export type ClassifyInput = { locale: "ko" | "en"; effort: Effort; userHash: string; intake: { offering?: unknown; targetCountry?: unknown; targetCustomer?: unknown } };
export type ResearchInput = { locale: "ko" | "en"; effort: Effort; userHash: string; serviceTitle: string; deliverables: string[]; completionInstructions: string[]; publicBrief: unknown; reportDate: string; deadlineAt: number };
export type ReportInput = { locale: "ko" | "en"; effort: Effort; userHash: string; instructions: string; payload: unknown; files: Array<{ signedUrl: string; fileName: string; mimeType: string }>; deadlineAt: number };
export type Adapter = {
  classify(input: ClassifyInput): Promise<StageResult<PublicClassification>>;
  research(input: ResearchInput): Promise<StageResult<AiPublicResearch>>;
  writeReport(input: ReportInput): Promise<StageResult<AiAgentReport>>;
};
export const EMPTY_USAGE: ModelUsage = { input: 0, cachedInput: 0, cacheWriteInput: 0, output: 0, webSearchCalls: 0 };

/**
 * A stage failed after already accruing billable usage (e.g. a pause_turn loop hitting its round
 * cap, or a deadline running out partway through research()). Failed runs still cost money, so
 * callers that persist usage on failure read `.usage` off the caught error instead of losing it.
 */
export class StageError extends Error {
  constructor(message: string, readonly usage: ModelUsage) {
    super(message);
    this.name = "StageError";
  }
}
