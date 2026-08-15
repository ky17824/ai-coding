import { z } from "zod";
import type { MarketResearchDocument } from "./types";

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const FILE_TYPES = {
  pdf: { mimeType: "application/pdf", magic: [0x25, 0x50, 0x44, 0x46] },
  png: { mimeType: "image/png", magic: [0x89, 0x50, 0x4e, 0x47] },
  jpg: { mimeType: "image/jpeg", magic: [0xff, 0xd8, 0xff] },
  jpeg: { mimeType: "image/jpeg", magic: [0xff, 0xd8, 0xff] }
} as const;

export const sanitizedDocumentEvidenceSchema = z.object({
  facts: z.array(z.object({
    statement: z.string().min(1).max(500),
    locator: z.string().max(80),
    confidence: z.enum(["high", "medium", "low"])
  })).max(20),
  numericFacts: z.array(z.object({
    label: z.string().max(120),
    value: z.string().max(120),
    unit: z.string().max(60),
    period: z.string().max(80),
    locator: z.string().max(80)
  })).max(16),
  assumptions: z.array(z.string().max(300)).max(12),
  contradictions: z.array(z.string().max(400)).max(8),
  gaps: z.array(z.string().max(300)).max(12)
});

export const marketResearchDocumentSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().min(1).max(180),
  mimeType: z.enum(["application/pdf", "image/png", "image/jpeg"]),
  size: z.number().int().positive().max(MAX_FILE_BYTES),
  sha256: z.string().regex(/^[a-f0-9]{64}$/).or(z.string().regex(/^sha-[a-z0-9-]+$/)),
  storagePath: z.string().max(500).nullable(),
  status: z.enum(["uploaded", "processed", "failed", "cleanup_pending"]),
  evidence: sanitizedDocumentEvidenceSchema.nullable(),
  errorMessage: z.string().max(500).nullable(),
  createdAt: z.string().datetime()
});

const scrubText = (value: string) => value
  .replace(/https?:\/\/[^\s)]+/gi, "[URL 제거]")
  .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[이메일 제거]")
  .replace(/(?:\+?82[-\s]?)?0?1[016789][-\.\s]?\d{3,4}[-\.\s]?\d{4}/g, "[전화번호 제거]")
  .replace(/\b\d{10,}\b/g, "[식별번호 제거]")
  .replace(/[가-힣A-Za-z]{1,20}(?:대표|담당자|이사|팀장|매니저)/g, "[인물 제거]");

export function sanitizeDocumentEvidence(evidence: unknown) {
  const parsed = sanitizedDocumentEvidenceSchema.parse(evidence);
  return sanitizedDocumentEvidenceSchema.parse(JSON.parse(JSON.stringify(parsed), (_key, value) =>
    typeof value === "string" ? scrubText(value) : value
  ));
}

export async function inspectResearchFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() as keyof typeof FILE_TYPES | undefined;
  const expected = extension ? FILE_TYPES[extension] : undefined;
  if (!expected || expected.mimeType !== file.type || file.size <= 0 || file.size > MAX_FILE_BYTES) {
    throw new Error("Unsupported research file format or size.");
  }
  const bytes = new Uint8Array(await file.slice(0, expected.magic.length).arrayBuffer());
  if (!expected.magic.every((byte, index) => bytes[index] === byte)) {
    throw new Error("Research file format does not match its contents.");
  }
  return { extension: extension === "jpeg" ? "jpg" : extension, mimeType: expected.mimeType, size: file.size };
}

export function researchDocumentDigests(documents: readonly MarketResearchDocument[]) {
  return documents.filter((document) => document.status === "processed").map((document) => document.sha256).sort();
}
