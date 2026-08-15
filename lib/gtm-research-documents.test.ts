import { describe, expect, it } from "vitest";
import {
  inspectResearchFile,
  researchDocumentDigests,
  sanitizeDocumentEvidence
} from "./gtm-research-documents";

describe("gtm research documents", () => {
  it("removes contact data, long identifiers, urls, and obvious person labels", () => {
    const clean = sanitizeDocumentEvidence({
      facts: [{
        statement: "김대표 test@example.com 010-1234-5678 계약번호 123456789012 https://private.example/doc",
        locator: "p.2",
        confidence: "high"
      }],
      numericFacts: [],
      assumptions: [],
      contradictions: [],
      gaps: []
    });

    expect(JSON.stringify(clean)).not.toMatch(/김대표|test@example|010-1234|123456789012|private\.example/);
  });

  it("accepts supported file signatures and rejects renamed files", async () => {
    const pdf = new File([new TextEncoder().encode("%PDF-1.7\n")], "brief.pdf", { type: "application/pdf" });
    const renamed = new File([new TextEncoder().encode("not a pdf")], "brief.pdf", { type: "application/pdf" });

    await expect(inspectResearchFile(pdf)).resolves.toMatchObject({ extension: "pdf", mimeType: "application/pdf" });
    await expect(inspectResearchFile(renamed)).rejects.toThrow(/format/i);
  });

  it("returns sorted digests for every attached document", () => {
    expect(researchDocumentDigests([
      { id: "1", displayName: "b.pdf", mimeType: "application/pdf", size: 1, sha256: "sha-b", storagePath: null, status: "processed", evidence: null, errorMessage: null, createdAt: "2026-08-15T00:00:00.000Z" },
      { id: "2", displayName: "a.pdf", mimeType: "application/pdf", size: 1, sha256: "sha-a", storagePath: "private/a.pdf", status: "uploaded", evidence: null, errorMessage: null, createdAt: "2026-08-15T00:00:00.000Z" },
      { id: "3", displayName: "c.pdf", mimeType: "application/pdf", size: 1, sha256: "sha-c", storagePath: null, status: "processed", evidence: null, errorMessage: null, createdAt: "2026-08-15T00:00:00.000Z" }
    ])).toEqual(["sha-a", "sha-b", "sha-c"]);
  });
});
