import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const actions = readFileSync(new URL("../actions.ts", import.meta.url), "utf8");
const nav = readFileSync(new URL("../../../components/admin-nav.tsx", import.meta.url), "utf8");
const slots = readFileSync(new URL("../../../components/beta-tester-admin.tsx", import.meta.url), "utf8");

describe("admin beta tester management", () => {
  it("is reachable from the admin nav and only by administrators", () => {
    expect(nav).toContain('localizedPath("/admin/beta-testers", locale)');
    expect(page).toContain('profile?.role !== "admin" || profile.deleted_at) redirect(');
    expect(page).toContain("베타 테스터 관리");
  });

  it("renders MAX_BETA_TESTERS slots — filled ones with used/free runs, empty ones with a single-email invite", () => {
    expect(page).toContain("Array.from({ length: MAX_BETA_TESTERS }");
    expect(page).toContain("BetaTesterFilledSlot");
    expect(page).toContain("BetaTesterEmptySlot");
    // 사용 횟수는 리셋 기준 시각 이후 주문만 센다(라우트·RPC와 동일).
    expect(page).toContain("Date.parse(order.created_at) >= since");
    expect(slots).toContain("useActionState(inviteBetaTester");
    expect(slots).toContain("useActionState(resetBetaTesterRuns");
    expect(slots).toContain("useActionState(deleteBetaTester");
  });

  it("server actions re-check the admin role, cap invites at the slot count, and reset by moving quota_started_at", () => {
    for (const name of ["inviteBetaTester", "deleteBetaTester", "resetBetaTesterRuns"]) expect(actions).toContain(`export async function ${name}(`);
    expect(actions).toContain('actor?.role !== "admin" || actor.deleted_at');
    expect(actions).toContain("(count ?? 0) >= MAX_BETA_TESTERS");
    expect(actions).toContain('.from("beta_testers").insert({ email, max_runs: BETA_FREE_RUNS');
    expect(actions).toContain('.from("beta_testers").delete().eq("email", email)');
    expect(actions).toContain("quota_started_at: new Date().toISOString()");
    expect(actions).toContain('revalidatePath("/admin/beta-testers")');
    expect(actions).toContain("가입 안내는 직접 보내 주세요");
  });
});
