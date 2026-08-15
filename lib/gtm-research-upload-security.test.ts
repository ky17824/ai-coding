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
});
