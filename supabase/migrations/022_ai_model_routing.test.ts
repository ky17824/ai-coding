import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SEED_ROUTES } from "@/lib/ai-models/routing";

const sql = readFileSync(join(process.cwd(), "supabase/migrations/022_ai_model_routing.sql"), "utf8");
const code = sql.split("\n").filter((line) => !line.trimStart().startsWith("--")).join("\n");

describe("022 ai model routing", () => {
  it("설정 테이블과 활성 1개 부분 유일 인덱스를 만든다", () => {
    expect(code).toContain("create table if not exists public.ai_model_routing_configs");
    expect(code).toMatch(/create unique index[^;]*ai_model_routing_configs_one_active[^;]*where status = 'active'/);
    expect(code).toContain("check (status in ('active', 'superseded'))");
  });

  it("실행 레코드에 스냅샷·시도 컬럼을 추가한다", () => {
    expect(code).toContain("add column if not exists model_route_snapshot jsonb not null default '{}'");
    expect(code).toContain("add column if not exists model_attempts jsonb not null default '[]'");
  });

  it("완료·실패 RPC는 옛 시그니처를 먼저 drop한다 (오버로드 방지)", () => {
    expect(code).toContain("drop function if exists public.complete_ai_agent_generation(uuid,uuid,jsonb,integer,integer,integer,integer,numeric,numeric,integer,integer,integer)");
    expect(code).toContain("drop function if exists public.fail_ai_agent_generation(uuid,uuid,text,integer,integer,integer,integer,numeric,numeric,integer,integer,integer)");
    expect(code).toContain("p_model_attempts jsonb");
    expect(code).toContain("p_model text");
  });

  it("실패 RPC의 orders.status 대입은 enum으로 캐스트한다 (020 회귀)", () => {
    const failBody = code.slice(code.indexOf("function public.fail_ai_agent_generation"));
    expect(failBody).toContain("::public.order_status");
  });

  it("reserve가 활성 설정을 스냅샷에 고정하고, 없으면 null을 돌려준다", () => {
    const reserveBody = code.slice(code.indexOf("function public.reserve_ai_agent_generation"), code.indexOf("$$;", code.indexOf("function public.reserve_ai_agent_generation")));
    expect(reserveBody).toContain("from public.ai_model_routing_configs where status = 'active'");
    expect(reserveBody).toContain("if active_routes is null then return null; end if;");
    expect(reserveBody).toContain("model_route_snapshot = active_routes");
  });

  it("apply RPC는 새 버전을 만들고 이전 활성을 superseded로 바꾼다", () => {
    expect(code).toContain("create or replace function public.apply_ai_model_routing(p_routes jsonb, p_reason text, p_actor uuid)");
    expect(code).toContain("set status = 'superseded', superseded_at = now() where status = 'active'");
    expect(code).toContain("coalesce(max(version), 0) + 1");
  });

  it("시드 v1은 세 단계 sol이다", () => {
    expect(code).toMatch(/insert into public\.ai_model_routing_configs[\s\S]*openai:gpt-5\.6-sol[\s\S]*openai:gpt-5\.6-sol[\s\S]*openai:gpt-5\.6-sol/);
    expect(code).toContain("where not exists (select 1 from public.ai_model_routing_configs)");
  });

  it("시드의 routes JSON은 lib/ai-models/routing.ts의 SEED_ROUTES와 같다", () => {
    // 같은 값이 SQL과 TS 두 언어에 따로 적혀 있다. 문자열 비교가 아니라 파싱한 값으로
    // 비교해야, 공백이나 키 순서가 달라도 실제로 드리프트했을 때만 잡아낸다.
    const match = sql.match(/insert into public\.ai_model_routing_configs[\s\S]*?select 1, 'active',\s*\n\s*'(\{.*\})'::jsonb/);
    expect(match).not.toBeNull();
    const seedRoutes = JSON.parse(match![1]);
    expect(seedRoutes).toEqual(SEED_ROUTES);
  });

  it("함수 권한을 잠근다", () => {
    for (const fn of ["reserve_ai_agent_generation(uuid)", "apply_ai_model_routing(jsonb, text, uuid)"]) {
      expect(code).toContain(`revoke all on function public.${fn} from public, anon, authenticated`);
      expect(code).toContain(`grant execute on function public.${fn} to service_role`);
    }
    expect(code).toContain("alter table public.ai_model_routing_configs enable row level security");
  });
});
