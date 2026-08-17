import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(join(process.cwd(), "supabase/migrations/024_ai_agent_research_summary.sql"), "utf8");
const code = sql.split("\n").filter((line) => !line.trimStart().startsWith("--")).join("\n");

describe("024 ai agent research summary", () => {
  it("실행 레코드에 조사 요약 컬럼을 추가한다", () => {
    expect(code).toContain("add column if not exists research_summary jsonb");
  });

  it("reserve는 예약 시점에 조사 요약을 초기화한다", () => {
    const body = code.slice(code.indexOf("function public.reserve_ai_agent_generation"), code.indexOf("$$;", code.indexOf("function public.reserve_ai_agent_generation")));
    expect(body).toContain("research_summary = null");
  });

  it("reserve의 나머지 로직은 023과 그대로다 (회귀 가드)", () => {
    const body = code.slice(code.indexOf("function public.reserve_ai_agent_generation"), code.indexOf("$$;", code.indexOf("function public.reserve_ai_agent_generation")));
    // stale-retry 파생
    expect(body).toContain("is_stale_retry := locked_run.status = 'generating' and locked_run.lease_expires_at < now();");
    // 시도 횟수 상한 거절 (stale-retry가 아닐 때만)
    expect(body).toContain("locked_run.generation_count >= 2");
    // 두 개의 for update 잠금
    expect(body).toContain("from public.orders where id = p_order_id and order_kind = 'ai_agent' for update");
    expect(body).toContain("from public.ai_agent_runs where order_id = p_order_id for update");
    // 라우팅 스냅샷 고정
    expect(body).toContain("model_route_snapshot = active_routes");
    // 023의 단계 로그 초기화도 그대로 남아 있다
    expect(body).toContain("generation_stage_log = '[]'::jsonb");
  });

  it("reserve 권한이 잠겨 있다", () => {
    expect(code).toContain("revoke all on function public.reserve_ai_agent_generation(uuid) from public, anon, authenticated");
    expect(code).toContain("grant execute on function public.reserve_ai_agent_generation(uuid) to service_role");
  });
});
