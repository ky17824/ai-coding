import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("assistant research upload security contract", () => {
  it("keeps document state transitions atomic and service-role only", () => {
    const migration = readFileSync("supabase/migrations/014_gtm_research_documents.sql", "utf8");

    expect(migration).toContain("market_research_documents jsonb not null default '[]'::jsonb");
    expect(migration).toContain("jsonb_array_length(locked_plan.market_research_documents) >= 3");
    expect(migration).toContain("for update");
    expect(migration).toContain("created_by <> p_user_id");
    expect(migration).toContain("revoke all on function public.append_gtm_research_document");
    expect(migration).toContain("grant execute on function public.append_gtm_research_document");
    expect(migration).toContain("to service_role");
  });

  it("checks the feature flag, ownership, file contents, and cleanup paths", () => {
    const route = readFileSync("app/api/gtm-assistant/research-files/route.ts", "utf8");

    expect(route).toContain('process.env.AI_GTM_RESEARCH_UPLOADS_ENABLED !== "true"');
    expect(route).toContain('.eq("organization_id", profile.organization_id)');
    expect(route).toContain('storage.from("evidence").upload');
    expect(route).toContain('storage.from("evidence").remove');
    expect(route).toContain("inspectResearchFile");
    expect(route).toContain('rpc("append_gtm_research_document"');
  });

  it("extracts and deletes private originals before reserving public research", () => {
    const route = readFileSync("app/api/gtm-assistant/research/route.ts", "utf8");
    const preparation = route.indexOf("prepareResearchDocuments");
    const reservation = route.indexOf("const quotaDecision = researchQuotaDecision");
    const publicRequest = route.slice(route.indexOf("const publicResearchContext"), route.indexOf("const sizingInstructions"));

    expect(preparation).toBeGreaterThan(0);
    expect(reservation).toBeGreaterThan(preparation);
    expect(route).toContain('store: false');
    expect(route).toContain('rpc("update_gtm_research_document"');
    expect(route).toContain('storage.from("evidence").remove');
    expect(publicRequest).toContain("sanitizedDocumentEvidence");
    expect(publicRequest).not.toContain("storagePath");
    expect(publicRequest).not.toContain("signedUrl");
  });

  it("offers a bounded, accessible upload UI only behind the server flag", () => {
    const page = readFileSync("app/assistant/[assessmentId]/page.tsx", "utf8");
    const component = readFileSync("components/gtm-assistant.tsx", "utf8");

    expect(page).toContain('researchUploadsEnabled={process.env.AI_GTM_RESEARCH_UPLOADS_ENABLED === "true"}');
    expect(component).toContain('accept=".pdf,.png,.jpg,.jpeg"');
    expect(component).toContain('fetch("/api/gtm-assistant/research-files"');
    expect(component).toContain("researchDocumentDigests");
    expect(component).toContain("비공개로 정제한 뒤 원본을 삭제");
  });

  it("exports only a safe document summary and discloses the private extraction flow", () => {
    const exportRoute = readFileSync("app/api/gtm-plans/[id]/export/route.ts", "utf8");
    const privacy = readFileSync("app/legal/privacy/page.tsx", "utf8");
    const summary = exportRoute.slice(
      exportRoute.indexOf("const researchDocumentSummaryHtml"),
      exportRoute.indexOf("const marketSizes")
    );

    expect(exportRoute).toContain("market_research_documents");
    expect(summary).toContain("document.displayName");
    expect(summary).toContain("document.evidence?.gaps.length");
    expect(summary).toContain("document.evidence?.contradictions.length");
    expect(summary).not.toContain("storagePath");
    expect(summary).not.toContain("statement");
    expect(privacy).toContain("public web search");
    expect(privacy).toContain("공개 웹 검색");
    expect(privacy).toContain("30 days");
    expect(privacy).toContain("30일");
    expect(privacy).toContain("original file");
    expect(privacy).toContain("원본 파일");
  });
});
