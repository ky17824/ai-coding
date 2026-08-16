import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const DIR = join(process.cwd(), "supabase/migrations");
const sqlFiles = readdirSync(DIR).filter((name) => name.endsWith(".sql")).sort();
const read = (name: string) => readFileSync(join(DIR, name), "utf8");

/**
 * orders.status는 order_status enum이다. case 식의 분기가 전부 따옴표 리터럴이면
 * 식 전체가 text로 해석되어 대입이 런타임에 거부된다. 리터럴 하나만 쓰는 대입은
 * unknown이 enum으로 해석되므로 문제가 없다.
 *
 * 이 실수는 실행 전까지 조용하다. 010의 fail_ai_agent_generation이 이 형태였고,
 * 실패 처리 경로 전체가 프로덕션에서 처음부터 죽어 있었다.
 */
describe("orders.status에 대입하는 case 식은 enum으로 캐스트한다", () => {
  const offenders: string[] = [];
  for (const name of sqlFiles) {
    const sql = read(name);
    // `update public.orders ... set status = case ... end` 에서 end 뒤에 캐스트가 없는 것
    const pattern = /update\s+public\.orders\b[\s\S]{0,200}?set\s+status\s*=\s*\(?\s*case\b[\s\S]*?\bend\s*\)?(\s*::\s*[\w.]+)?/gi;
    for (const match of sql.matchAll(pattern)) {
      if (!match[1]) offenders.push(`${name}: ${match[0].slice(0, 60).replace(/\s+/g, " ")}…`);
    }
  }

  it("020 이후 캐스트 없는 대입이 남아 있지 않다", () => {
    // 010은 버그가 있는 원본이라 예외로 남긴다. 020이 같은 함수를 덮어쓴다.
    const unexpected = offenders.filter((line) => !line.startsWith("010_"));
    expect(unexpected).toEqual([]);
  });

  it("020이 010의 fail_ai_agent_generation을 실제로 교체한다", () => {
    const sql = read("020_fix_fail_generation_status_cast.sql");
    expect(sql).toContain("create or replace function public.fail_ai_agent_generation");
    expect(sql).toContain("::public.order_status");
    // 010과 같은 시그니처여야 덮어쓴다. 인자가 하나라도 다르면 오버로드가 새로 생기고
    // 라우트는 계속 깨진 쪽을 부른다.
    const signature = /p_order_id uuid,\s*p_attempt_id uuid,\s*p_error_message text,\s*p_input_tokens integer,\s*p_cached_input_tokens integer,\s*p_output_tokens integer,\s*p_web_search_calls integer,\s*p_model_cost_usd numeric,\s*p_tool_cost_usd numeric,\s*p_payment_fee_krw integer,\s*p_support_storage_krw integer,\s*p_total_variable_cost_krw integer/;
    expect(sql).toMatch(signature);
    expect(read("010_paid_ai_expert_services.sql")).toMatch(signature);
  });

  it("실행 레코드를 generating에서 풀어 주는 조건은 그대로 유지한다", () => {
    const sql = read("020_fix_fail_generation_status_cast.sql");
    expect(sql).toContain("where order_id = p_order_id and status = 'generating' and generation_attempt_id = p_attempt_id");
    expect(sql).toContain("lease_expires_at = null");
    expect(sql).toContain("if not found then return false; end if;");
  });
});
