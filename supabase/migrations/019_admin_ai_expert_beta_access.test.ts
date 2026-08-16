import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./019_admin_ai_expert_beta_access.sql", import.meta.url), "utf8");

describe("admin beta access migration", () => {
  it("drops both zero-amount blockers by name and refuses to continue if either survives", () => {
    // orders에는 amount_krw를 포함하는 check가 셋이라 016의 pg_constraint + limit 1 패턴을
    // 쓰면 엉뚱한 것(예: platform_fee + provider_amount = amount)을 조용히 지울 수 있다.
    expect(source).toContain("drop constraint if exists orders_amount_krw_check");
    expect(source).toContain("drop constraint if exists orders_amount_tax_check");
    expect(source).not.toMatch(/select con\.conname into constraint_name/);
    expect(source.match(/raise exception '[^']*019를 중단합니다'/g)).toHaveLength(2);
  });

  it("keeps the paid invariants intact while allowing a zero-amount beta order", () => {
    expect(source).toContain("orders_amount_by_billing_mode_check");
    expect(source).toContain("billing_mode = 'paid'\n     and amount_krw > 0");
    expect(source).toContain("billing_mode = 'admin_beta'\n     and amount_krw = 0");
    // 001:156은 0+0=0으로 통과하므로 건드리지 않는다.
    expect(source).not.toContain("platform_fee_krw + provider_amount_krw = amount_krw");
  });

  it("names every constraint it adds", () => {
    // 무명 제약은 서버 생성 이름을 받아 나중에 지우기 어려워진다. 001:146이 그래서 문제였다.
    const added = source.match(/add constraint (\w+)/g) ?? [];
    expect(added).toEqual([
      "add constraint orders_billing_mode_check",
      "add constraint orders_amount_by_billing_mode_check",
      "add constraint orders_beta_is_ai_only_check"
    ]);
  });

  it("caps concurrent beta orders per admin per product", () => {
    expect(source).toContain("create unique index orders_admin_beta_open_run");
    expect(source).toContain("where billing_mode = 'admin_beta' and status in ('paid', 'service_started')");
  });

  it("creates the order and run atomically without rebuilding the contract in SQL", () => {
    expect(source).toContain("create or replace function public.create_admin_beta_ai_order");
    // 스냅샷은 route.ts가 유료 주문과 똑같이 만들어 넘긴다.
    expect(source).toContain("p_service_snapshot jsonb");
    expect(source).toContain("p_terms_snapshot jsonb");
    expect(source).not.toContain("questionCatalogVersion");
    // 실행 레코드의 상태는 intake다. awaiting_intake는 010:22-24에 없는 값이다.
    expect(source).toContain("'intake', p_locale");
    expect(source).not.toContain("awaiting_intake");
  });

  it("identifies the caller by argument, since auth.uid() is null under the service role", () => {
    expect(source).toContain("p_buyer_id uuid");
    expect(source).toContain("buyer.role <> 'admin'");
    // 주석에는 설명이 있을 수 있으므로 실행되는 SQL만 본다.
    const executable = source.split("\n").filter((line) => !line.trim().startsWith("--")).join("\n");
    expect(executable).not.toContain("auth.uid()");
  });

  it("never lets the gtm payment namespace collide with a beta order", () => {
    expect(source).toContain("'beta-' || gen_random_uuid()");
    expect(source).not.toContain("'gtm-'");
  });

  it("keeps the function service-role only", () => {
    expect(source).toMatch(/revoke all on function public\.create_admin_beta_ai_order[^;]+from public, anon, authenticated/);
    expect(source).toMatch(/grant execute on function public\.create_admin_beta_ai_order[^;]+to service_role/);
  });
});
