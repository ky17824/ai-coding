import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// 로컬 Postgres가 없어 SQL을 실행하지 못하므로, 025가 약속하는 모양을 텍스트로 잠근다.
// 라우트·액션이 그 약속(스냅샷 = 기본값 || 오버라이드, 4인자 apply RPC)에 기대므로 셋을 함께 본다.
const migration = readFileSync(join(process.cwd(), "supabase/migrations/025_product_model_routing.sql"), "utf8");
const route = readFileSync(join(process.cwd(), "app/api/ai-agent-runs/[orderId]/route.ts"), "utf8");

describe("025 상품별 라우팅 마이그레이션", () => {
  it("예약 RPC는 기본값 || 상품 오버라이드를 스냅샷에 넣고 버전을 남긴다", () => {
    expect(migration).toContain("select routes, product_overrides, version into active_routes, active_overrides, active_version");
    expect(migration).toContain("effective := active_routes || coalesce(active_overrides -> locked_order.product_key, '{}'::jsonb)");
    expect(migration).toContain("model_route_snapshot = effective");
    expect(migration).toContain("model_route_version = active_version");
  });

  it("apply RPC는 옛 3인자를 지우고 4인자(p_product_overrides)로 다시 만든다 — 오버로드가 남으면 옛 것이 조용히 불린다", () => {
    expect(migration).toContain("drop function if exists public.apply_ai_model_routing(jsonb, text, uuid);");
    expect(migration).toContain("create or replace function public.apply_ai_model_routing(p_routes jsonb, p_product_overrides jsonb, p_reason text, p_actor uuid)");
    expect(migration).toContain("grant execute on function public.apply_ai_model_routing(jsonb, jsonb, text, uuid) to service_role;");
  });

  it("패키지 2종의 조사·보고서 high를 활성 행 오버라이드로 시드한다 (코드 승격을 대신한다)", () => {
    expect(migration).toContain("'pkg-feasibility'");
    expect(migration).toContain("'pkg-entry-design'");
    expect(migration).toContain(`(routes -> 'public_research') || '{"effort":"high"}'::jsonb`);
    expect(migration).toContain(`(routes -> 'final_report') || '{"effort":"high"}'::jsonb`);
  });

  it("라우트는 더 이상 패키지 노력을 코드로 승격하지 않는다 — 스냅샷을 그대로 쓴다", () => {
    expect(route).not.toContain('service.productKind === "package" ? "high"');
    expect(route).toContain("const effort = route.effort;");
  });
});
