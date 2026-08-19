import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const actions = readFileSync(new URL("../actions.ts", import.meta.url), "utf8");
const nav = readFileSync(new URL("../../../components/admin-nav.tsx", import.meta.url), "utf8");
const form = readFileSync(new URL("../../../components/beta-tester-admin.tsx", import.meta.url), "utf8");

describe("admin beta tester management", () => {
  it("is reachable from the admin nav and only by administrators", () => {
    expect(nav).toContain('localizedPath("/admin/beta-testers", locale)');
    expect(page).toContain('profile?.role !== "admin" || profile.deleted_at) redirect(');
    expect(page).toContain('.from("beta_testers")');
    expect(page).toContain("베타 테스터 관리");
  });

  it("shows sign-up state and used/free runs per tester so the admin can see who actually tested", () => {
    expect(page).toContain('.eq("billing_mode", "beta_tester").neq("status", "cancelled")');
    expect(page).toContain("{used} / {tester.max_runs}");
    expect(page).toContain("BetaTesterRevokeButton");
  });

  it("server actions re-check the admin role and only touch the beta_testers table", () => {
    for (const name of ["addBetaTesters", "setBetaTesterRevoked"]) expect(actions).toContain(`export async function ${name}(`);
    expect(actions).toContain('actor?.role !== "admin" || actor.deleted_at');
    expect(actions).toContain('.from("beta_testers").upsert(');
    expect(actions).toContain('.from("beta_testers").update({ revoked_at:');
    expect(actions).toContain('revalidatePath("/admin/beta-testers")');
    // 이메일은 DB 키 형태(lower/trim)로 저장한다. 줄·쉼표 구분 붙여넣기 허용.
    expect(actions).toContain("split(/[\\n,;]+/).map(normalizeBetaEmail)");
    // 초대 메일은 자동 발송하지 않는다 — 안내 문구로 관리자에게 알린다.
    expect(actions).toContain("가입 안내는 직접 보내 주세요");
    expect(form).toContain("useActionState(addBetaTesters");
  });
});
