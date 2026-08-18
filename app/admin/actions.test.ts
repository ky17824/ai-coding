import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STAGES, type Routes } from "@/lib/ai-models/routing";

// 응답 텍스트만으로는 실제로 어떤 순서로 DB를 읽는지, RPC에 어떤 값이 실렸는지 확인할 수 없다.
// Supabase 클라이언트를 모킹해 실제 실행 경로를 돈다. app/api/gtm-plans/[id]/export/route.test.ts와
// app/auth/callback/route.test.ts에서 쓰는 체이닝 빌더 모킹 패턴을 그대로 따른다.
const mocks = vi.hoisted(() => ({
  actorProfile: null as { role: string; deleted_at: string | null } | null,
  // ai_model_routing_configs에 대한 admin.from() 호출마다 순서대로 하나씩 소비된다.
  adminFromResults: [] as Array<{ data: unknown; error?: unknown }>,
  fromCalls: [] as string[],
  rpc: vi.fn()
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  requireUser: async () => ({ id: "admin-1" }),
  createSupabaseServerClient: async () => ({
    from: () => {
      const query: Record<string, unknown> = {};
      query.select = () => query;
      query.eq = () => query;
      query.maybeSingle = async () => ({ data: mocks.actorProfile, error: null });
      return query;
    }
  }),
  createSupabaseAdminClient: () => ({
    from: (table: string) => {
      mocks.fromCalls.push(table);
      const result = table === "ai_model_routing_configs"
        ? (mocks.adminFromResults.shift() ?? { data: null, error: null })
        : { data: null, error: null };
      const query: Record<string, unknown> = {};
      query.select = () => query;
      query.eq = () => query;
      query.maybeSingle = async () => result;
      return query;
    },
    rpc: mocks.rpc
  })
}));

import { changeModelRouting, rollbackModelRouting, type ModelRoutingActionState } from "@/app/admin/actions";

const initial: ModelRoutingActionState = { ok: false, message: "" };

const ROUTES_A: Routes = {
  classification: { model: "openai:gpt-5.6-sol", effort: "medium" },
  public_research: { model: "openai:gpt-5.6-sol", effort: "medium" },
  final_report: { model: "openai:gpt-5.6-sol", effort: "medium" }
};
const ROUTES_B: Routes = {
  classification: { model: "anthropic:claude-opus-5", effort: "low" },
  public_research: { model: "anthropic:claude-opus-5", effort: "medium" },
  final_report: { model: "anthropic:claude-opus-5", effort: "medium" }
};

function changeFormData(routes: Routes, overrides?: unknown) {
  const form = new FormData();
  form.set("locale", "ko");
  form.set("reason", "테스트를 위한 변경 사유입니다");
  for (const stage of STAGES) {
    form.set(`${stage}.model`, routes[stage].model);
    form.set(`${stage}.effort`, routes[stage].effort);
  }
  if (overrides !== undefined) form.set("product_overrides", typeof overrides === "string" ? overrides : JSON.stringify(overrides));
  return form;
}

function rollbackFormData(version: number, forgedRoutes?: Routes) {
  const form = new FormData();
  form.set("locale", "ko");
  form.set("reason", "이전 버전으로 되돌리는 테스트 사유입니다");
  form.set("version", String(version));
  // rollbackModelRouting은 이 필드들을 읽지 않아야 한다 — 저장된 버전의 routes만 써야 한다.
  if (forgedRoutes) {
    for (const stage of STAGES) {
      form.set(`${stage}.model`, forgedRoutes[stage].model);
      form.set(`${stage}.effort`, forgedRoutes[stage].effort);
    }
  }
  return form;
}

describe("admin AI model routing actions", () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
    mocks.actorProfile = null;
    mocks.adminFromResults = [];
    mocks.fromCalls = [];
    mocks.rpc.mockReset();
    mocks.rpc.mockResolvedValue({ data: 2, error: null });
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
  });

  it.each([
    ["잘못된 역할", { role: "provider", deleted_at: null }],
    ["소프트 삭제된 관리자", { role: "admin", deleted_at: "2026-01-01T00:00:00.000Z" }]
  ])("%s는 두 액션 모두 거절되고, DB를 읽거나 RPC를 부르기 전에 막힌다", async (_label, profile) => {
    mocks.actorProfile = profile;

    const changeResult = await changeModelRouting(initial, changeFormData(ROUTES_B));
    expect(changeResult).toEqual({ ok: false, message: "관리자 권한이 필요합니다." });

    const rollbackResult = await rollbackModelRouting(initial, rollbackFormData(1));
    expect(rollbackResult).toEqual({ ok: false, message: "관리자 권한이 필요합니다." });

    // 버전 존재 여부를 흘리는 오라클이 되지 않으려면, 게이트를 통과하지 못한 요청은
    // ai_model_routing_configs를 아예 조회하지 않아야 한다.
    expect(mocks.fromCalls).not.toContain("ai_model_routing_configs");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("rollback은 폼에 실린 모델 필드를 무시하고 저장된 버전의 routes만 적용한다", async () => {
    mocks.actorProfile = { role: "admin", deleted_at: null };
    const storedOverrides = { "pkg-feasibility": { final_report: { model: "anthropic:claude-fable-5", effort: "high" } } };
    mocks.adminFromResults = [
      { data: { routes: ROUTES_B, product_overrides: storedOverrides }, error: null }, // rollbackModelRouting의 버전 조회
      { data: null, error: null } // applyRouting의 활성 설정 조회: 없음 -> unchanged 아님
    ];

    // 폼에는 저장된 버전(ROUTES_B)과 다른 값(ROUTES_A)을 위조해 넣는다.
    const result = await rollbackModelRouting(initial, rollbackFormData(1, ROUTES_A));

    expect(result.ok).toBe(true);
    // 저장된 버전의 routes와 product_overrides 둘 다 그대로 적용한다.
    expect(mocks.rpc).toHaveBeenCalledWith(
      "apply_ai_model_routing",
      expect.objectContaining({ p_routes: ROUTES_B, p_product_overrides: storedOverrides })
    );
  });

  it("change는 폼의 product_overrides(JSON)를 검증해 RPC 4번째 인자로 넘긴다", async () => {
    mocks.actorProfile = { role: "admin", deleted_at: null };
    mocks.adminFromResults = [{ data: null, error: null }];
    const overrides = { "ai-market-intelligence": { final_report: { model: "anthropic:claude-fable-5", effort: "high" } } };
    const result = await changeModelRouting(initial, changeFormData(ROUTES_A, overrides));
    expect(result.ok).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith("apply_ai_model_routing", expect.objectContaining({ p_routes: ROUTES_A, p_product_overrides: overrides }));
  });

  it("오버라이드가 없으면 {}를 넘기고, 모르는 상품·깨진 JSON은 거부하며 RPC를 부르지 않는다", async () => {
    mocks.actorProfile = { role: "admin", deleted_at: null };
    mocks.adminFromResults = [{ data: null, error: null }];
    const plain = await changeModelRouting(initial, changeFormData(ROUTES_A));
    expect(plain.ok).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith("apply_ai_model_routing", expect.objectContaining({ p_product_overrides: {} }));

    mocks.rpc.mockClear();
    mocks.adminFromResults = [{ data: null, error: null }];
    const unknown = await changeModelRouting(initial, changeFormData(ROUTES_A, { "no-such-product": { final_report: { model: "anthropic:claude-fable-5", effort: "high" } } }));
    expect(unknown.ok).toBe(false);
    expect(unknown.message).toContain("상품");
    expect(mocks.rpc).not.toHaveBeenCalled();

    mocks.adminFromResults = [{ data: null, error: null }];
    const broken = await changeModelRouting(initial, changeFormData(ROUTES_A, "{not json"));
    expect(broken.ok).toBe(false);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("공통 기본값이 같아도 오버라이드가 다르면 '변경 없음'이 아니다 — 그리고 둘 다 같으면 변경 없음이다", async () => {
    mocks.actorProfile = { role: "admin", deleted_at: null };
    const overrides = { "ai-market-intelligence": { final_report: { model: "anthropic:claude-fable-5", effort: "high" } } };
    mocks.adminFromResults = [{ data: { routes: ROUTES_A, product_overrides: {} }, error: null }];
    const changed = await changeModelRouting(initial, changeFormData(ROUTES_A, overrides));
    expect(changed.ok).toBe(true);

    mocks.rpc.mockClear();
    mocks.adminFromResults = [{ data: { routes: ROUTES_A, product_overrides: overrides }, error: null }];
    const same = await changeModelRouting(initial, changeFormData(ROUTES_A, overrides));
    expect(same.ok).toBe(false);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("RPC가 유니크 위반(23505)을 돌려주면 '다른 관리자가 방금 적용' 메시지를 준다", async () => {
    mocks.actorProfile = { role: "admin", deleted_at: null };
    mocks.adminFromResults = [{ data: null, error: null }]; // 활성 설정 없음
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: "23505", message: "duplicate key value violates unique constraint" }
    });

    const result = await changeModelRouting(initial, changeFormData(ROUTES_A));

    expect(result).toEqual({
      ok: false,
      message: "다른 관리자가 방금 새 설정을 적용했습니다. 새로고침 후 다시 확인해 주세요."
    });
  });

  it("일반 RPC 오류는 유니크 위반 문구로 위장하지 않는다", async () => {
    mocks.actorProfile = { role: "admin", deleted_at: null };
    mocks.adminFromResults = [{ data: null, error: null }];
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "22023", message: "invalid_routes" } });

    const result = await changeModelRouting(initial, changeFormData(ROUTES_A));

    expect(result.ok).toBe(false);
    expect(result.message).not.toContain("다른 관리자가 방금");
  });
});
