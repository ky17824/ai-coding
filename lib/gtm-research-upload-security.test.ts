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
});
