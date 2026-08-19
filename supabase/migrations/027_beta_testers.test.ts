import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(join(process.cwd(), "supabase/migrations/027_beta_testers.sql"), "utf8");
const code = sql.split("\n").filter((line) => !line.trimStart().startsWith("--")).join("\n");
const rpc = code.slice(code.indexOf("function public.create_free_ai_order"), code.indexOf("$$;", code.indexOf("function public.create_free_ai_order")));

describe("027 beta testers", () => {
  it("초대 목록 테이블은 소문자 이메일이 키이고 관리자만 다룬다", () => {
    expect(code).toContain("create table if not exists public.beta_testers");
    expect(code).toContain("email = lower(btrim(email))");
    expect(code).toContain("max_runs int not null default 3");
    expect(code).toContain("using (public.is_admin()) with check (public.is_admin())");
  });

  it("주문 제약·유니크 인덱스가 beta_tester 모드를 admin_beta와 같은 0원 규칙으로 받는다", () => {
    expect(code).toContain("billing_mode in ('paid', 'admin_beta', 'beta_tester')");
    expect(code).toContain("(billing_mode in ('admin_beta', 'beta_tester')\n     and amount_krw = 0");
    expect(code).toContain("where billing_mode in ('admin_beta', 'beta_tester') and status in ('paid', 'service_started')");
  });

  it("무료 주문 RPC는 삽입 전에 자격·상품·횟수를 잠금 아래에서 검사한다", () => {
    expect(code).toContain("drop function if exists public.create_admin_beta_ai_order");
    const lock = rpc.indexOf("for update");
    const quota = rpc.indexOf("beta_tester_quota_exhausted");
    const insert = rpc.indexOf("insert into public.orders");
    expect(lock).toBeGreaterThan(0);
    expect(quota).toBeGreaterThan(lock);
    expect(insert).toBeGreaterThan(quota);
    expect(rpc).toContain("p_product_key <> 'ai-market-intelligence'");
    expect(rpc).toContain("status <> 'cancelled'");
    // 관리자 베타는 여전히 admin만.
    expect(rpc).toContain("'admin_required'");
    // 서비스 롤 전용.
    expect(code).toContain("revoke all on function public.create_free_ai_order");
    expect(code).toContain("to service_role");
  });
});
