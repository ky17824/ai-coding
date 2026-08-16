import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./018_admin_user_management.sql", import.meta.url), "utf8");
const providerAction = readFileSync(new URL("../../app/provider/actions.ts", import.meta.url), "utf8");
const accountAction = readFileSync(new URL("../../app/account/actions.ts", import.meta.url), "utf8");

describe("admin user management migration", () => {
  it("keeps role changes atomic and auditable", () => {
    expect(source).toContain("admin_account_purpose");
    expect(source).toContain("admin_role_audit_log");
    expect(source).toContain("manage_user_role");
    expect(source).toContain("pg_advisory_xact_lock");
    expect(source).toContain("self_change_forbidden");
    expect(source).toContain("last_admin");
    expect(source).toContain("insert into public.admin_role_audit_log");
  });

  it("allows only authenticated callers through the guarded RPC", () => {
    expect(source).toContain("auth.uid()");
    expect(source).toContain("actor.role <> 'admin'");
    expect(source).toContain("revoke all on function public.manage_user_role");
    expect(source).toContain("grant execute on function public.manage_user_role");
    expect(source).toContain("revoke all on public.admin_role_audit_log");
  });

  it("requires active administrators and makes provider application atomic", () => {
    expect(source).toContain("role = 'admin' and deleted_at is null");
    expect(source).toContain("apply_for_provider");
    expect(source).toContain("for update");
    expect(source).toContain("admin_provider_forbidden");
    expect(source).toContain("invalid_provider_application");
    expect(source).toContain("normalized_headline := trim(p_headline)");
    expect(source).toContain("where item is null or nullif(trim(item), '') is null");
    expect(source).toContain("insert into public.provider_profiles");
    expect(source).toContain("set role = 'provider'");
    expect(source).toContain('drop policy if exists "users apply as providers" on public.provider_profiles');
    expect(source).toContain("revoke insert on public.provider_profiles from authenticated");
    expect(source).toContain("grant execute on function public.apply_for_provider");
    expect(providerAction).toContain('supabase.rpc("apply_for_provider"');
    expect(providerAction).not.toContain('from("profiles").update({ role: "provider" })');
  });

  it("requires administrator demotion before account closure", () => {
    expect(source).toContain("is_org_member(target uuid)");
    expect(source).toContain("create or replace function public.begin_profile_closure(p_user_id uuid)");
    expect(source).toContain("create or replace function public.cancel_profile_closure(p_user_id uuid)");
    expect(source).toContain("create or replace function public.close_profile");
    expect(source).toContain("pg_advisory_xact_lock(hashtext('manage_user_role'))");
    expect(source).toContain("admin_closure_forbidden");
    expect(source).toContain("interval '10 minutes'");
    expect(source).toContain("grant execute on function public.close_profile(uuid, text, text) to service_role");
    expect(source).toContain("revoke all on function public.begin_profile_closure(uuid) from public, anon, authenticated");
    expect(accountAction).toContain('admin.rpc("close_profile"');
    expect(accountAction).toContain('admin.rpc("begin_profile_closure"');
    expect(accountAction).toContain("if (closingProfile.deleted_at) return finishAuthDeletion()");
  });
});
