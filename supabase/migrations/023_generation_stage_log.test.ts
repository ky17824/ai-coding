import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(join(process.cwd(), "supabase/migrations/023_generation_stage_log.sql"), "utf8");
const code = sql.split("\n").filter((line) => !line.trimStart().startsWith("--")).join("\n");

describe("023 generation stage log", () => {
  it("실행 레코드에 로그 컬럼을 추가한다", () => {
    expect(code).toContain("add column if not exists generation_stage_log jsonb not null default '[]'::jsonb");
  });

  it("단계 RPC는 같은 UPDATE 안에서 stage/at/attempt를 append한다", () => {
    const body = code.slice(code.indexOf("function public.set_ai_agent_generation_stage"), code.indexOf("$$;", code.indexOf("function public.set_ai_agent_generation_stage")));
    expect(body).toContain("generation_stage_log = generation_stage_log");
    expect(body).toContain("|| jsonb_build_object('stage', p_stage, 'at', now(), 'attempt', p_attempt_id)");
  });

  it("단계 RPC의 가드가 살아있다 (021 회귀)", () => {
    const body = code.slice(code.indexOf("function public.set_ai_agent_generation_stage"), code.indexOf("$$;", code.indexOf("function public.set_ai_agent_generation_stage")));
    expect(body).toContain("where order_id = p_order_id");
    expect(body).toContain("and status = 'generating'");
    expect(body).toContain("and generation_attempt_id = p_attempt_id");
  });

  it("단계 RPC 권한이 잠겨 있다", () => {
    expect(code).toContain("revoke all on function public.set_ai_agent_generation_stage(uuid, uuid, text) from public, anon, authenticated");
    expect(code).toContain("grant execute on function public.set_ai_agent_generation_stage(uuid, uuid, text) to service_role");
  });

  it("reserve는 예약 시점에 로그를 초기화한다", () => {
    const body = code.slice(code.indexOf("function public.reserve_ai_agent_generation"), code.indexOf("$$;", code.indexOf("function public.reserve_ai_agent_generation")));
    expect(body).toContain("generation_stage_log = '[]'::jsonb");
  });

  it("reserve의 나머지 로직은 022와 그대로다 (회귀 가드)", () => {
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
  });

  it("reserve 권한이 잠겨 있다", () => {
    expect(code).toContain("revoke all on function public.reserve_ai_agent_generation(uuid) from public, anon, authenticated");
    expect(code).toContain("grant execute on function public.reserve_ai_agent_generation(uuid) to service_role");
  });
});
