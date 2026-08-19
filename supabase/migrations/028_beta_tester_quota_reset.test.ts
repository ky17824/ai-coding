import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(join(process.cwd(), "supabase/migrations/028_beta_tester_quota_reset.sql"), "utf8");
const code = sql.split("\n").filter((line) => !line.trimStart().startsWith("--")).join("\n");
const rpc = code.slice(code.indexOf("function public.create_free_ai_order"), code.indexOf("$$;"));

describe("028 beta tester quota reset", () => {
  it("counts only orders after quota_started_at, still under the row lock and before insert", () => {
    expect(code).toContain("add column if not exists quota_started_at timestamptz not null default now()");
    expect(rpc).toContain("created_at >= tester.quota_started_at");
    expect(rpc.indexOf("for update")).toBeLessThan(rpc.indexOf("beta_tester_quota_exhausted"));
    expect(rpc.indexOf("beta_tester_quota_exhausted")).toBeLessThan(rpc.indexOf("insert into public.orders"));
    expect(code).toContain("to service_role");
  });
});
