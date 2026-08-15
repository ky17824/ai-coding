import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./route.ts", import.meta.url), "utf8");
const migration = readFileSync(new URL("../../../../supabase/migrations/013_ai_agent_readiness_snapshot.sql", import.meta.url), "utf8");

describe("paid AI readiness snapshot", () => {
  it("binds readiness once before generation and loads only the bound assessment", () => {
    expect(source).toContain('rpc("bind_ai_agent_readiness_snapshot"');
    expect(source).toContain("completed_at",);
    expect(source).toContain("order.created_at");
    expect(source).toContain("readiness.assessmentId");
    expect(source).not.toContain("latestAssessment");
  });

  it("binds legacy correction runs once without breaking old application instances", () => {
    expect(migration).toContain("for update");
    expect(migration).toContain("not (scope_snapshot ? 'readiness')");
    expect(migration).not.toContain("and generation_count = 0");
    expect(migration).not.toContain("not (locked_run.scope_snapshot ? 'readiness')");
  });
});
