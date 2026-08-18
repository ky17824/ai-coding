import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.stubGlobal("React", React);

const state = vi.hoisted(() => ({ user: null as null | { id: string }, rows: [] as unknown[], error: null as null | { message: string; code?: string }, calls: [] as [string, unknown[]][] }));

// 체인의 모든 호출을 기록하는 자기 반환 빌더. 테넌시 필터(buyer_id)와 임베드 조건이 실제로 붙는지 확인하기 위해서다.
vi.mock("@/lib/supabase/server", () => {
  const builder: Record<string, unknown> = {};
  for (const method of ["from", "select", "eq", "in", "or", "order"]) {
    builder[method] = (...args: unknown[]) => { state.calls.push([method, args]); return builder; };
  }
  builder.limit = async (...args: unknown[]) => { state.calls.push(["limit", args]); return { data: state.error ? null : state.rows, error: state.error }; };
  return {
    getCurrentProfile: vi.fn(async () => ({ user: state.user, profile: null })),
    createSupabaseAdminClient: vi.fn(() => builder)
  };
});

import { HeaderActiveService } from "@/components/header-active-service";

const run = (status: string, over: Record<string, unknown> = {}) => ({
  status, pending_questions: [], started_at: "2026-08-18T10:00:00Z", completed_at: null, updated_at: "2026-08-18T10:00:00Z", generation_stage_log: [], ...over
});
const order = (id: string, title: string, runRow: Record<string, unknown>) => ({ id, service_snapshot: { title }, ai_agent_runs: [runRow] });

async function render(locale: "ko" | "en" = "ko", mobile = false) {
  const element = await HeaderActiveService({ locale, mobile });
  return element === null ? "" : renderToStaticMarkup(element);
}

describe("헤더 진행 중 서비스 알약", () => {
  beforeEach(() => { state.user = { id: "u1" }; state.rows = []; state.error = null; state.calls = []; });

  it("서비스 롤로 조회하므로 buyer_id 필터와 임베드 생존 조건이 반드시 붙는다", async () => {
    state.rows = [order("o1", "심층 시장조사", run("intake"))];
    await render();
    expect(state.calls).toContainEqual(["eq", ["buyer_id", "u1"]]);
    expect(state.calls).toContainEqual(["eq", ["order_kind", "ai_agent"]]);
    const select = state.calls.find(([m]) => m === "select")?.[1][0] as string;
    expect(select).toContain("ai_agent_runs!inner(");
    const or = state.calls.find(([m]) => m === "or");
    expect(or?.[1][0]).toMatch(/^status\.neq\.completed,completed_at\.gte\.\d{4}-/);
    expect(or?.[1][1]).toEqual({ referencedTable: "ai_agent_runs" });
  });

  it("비로그인이나 주문이 없으면 아무것도 그리지 않는다", async () => {
    state.user = null;
    expect(await render()).toBe("");
    state.user = { id: "u1" };
    expect(await render()).toBe("");
  });

  it("조회가 실패해도 헤더는 살아 있다 — 비우고 경고만 남긴다", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    state.error = { message: "boom", code: "PGRST000" };
    expect(await render()).toBe("");
    expect(warn).toHaveBeenCalledOnce();
    // 사용자 식별자나 드라이버 메시지는 로그에 남기지 않는다.
    expect(JSON.stringify(warn.mock.calls[0])).not.toContain("u1");
    expect(JSON.stringify(warn.mock.calls[0])).not.toContain("boom");
    warn.mockRestore();
  });

  it("한 건이면 작업공간으로 가는 링크 알약이다", async () => {
    state.rows = [order("o1", "심층 시장조사", run("generating", { generation_stage_log: [{ stage: "context", at: new Date(Date.now() - 4 * 60000).toISOString() }] }))];
    const html = await render();
    expect(html).toContain('href="/orders/o1"');
    expect(html).toContain("active-service--live");
    expect(html).toContain("심층 시장조사");
    expect(html).toContain("보고서 작성 중 4분");
    expect(html).not.toContain("<details");
  });

  it("둘 이상이면 최근 것을 요약으로 한 드롭다운이다", async () => {
    state.rows = [
      order("older", "규제·진입요건 조사", run("ready", { updated_at: "2026-08-16T10:00:00Z" })),
      order("newer", "심층 시장조사", run("clarifying", { pending_questions: [{ id: "q1" }, { id: "q2" }], updated_at: "2026-08-18T10:00:00Z" }))
    ];
    const html = await render();
    expect(html).toContain("<details");
    expect(html.indexOf("newer")).toBeLessThan(html.indexOf("older"));
    expect(html).toContain("답변 필요 2건");
    expect(html).toContain("가정 확인 필요");
    expect(html).toContain("+1");
    expect(html).toContain('title="AI 전문가 서비스 2건"');
  });

  it("모바일 메뉴에서는 드롭다운 대신 알약을 나열한다", async () => {
    state.rows = [order("a", "A", run("intake")), order("b", "B", run("failed"))];
    const html = await render("ko", true);
    expect(html).not.toContain("<details");
    expect(html).toContain('href="/orders/a"');
    expect(html).toContain('href="/orders/b"');
    expect(html).toContain("다시 시도 필요");
  });

  it("14일이 지난 완료 건은 클라이언트 선택에서도 내린다 (DB 조건은 위 쿼리 테스트가 문자열로 확인)", async () => {
    state.rows = [order("old", "옛 보고서", run("completed", { completed_at: "2026-07-01T00:00:00Z" }))];
    expect(await render()).toBe("");
  });

  it("영어 경로와 문구를 쓴다", async () => {
    state.rows = [order("o1", "In-depth market research", run("completed", { completed_at: new Date().toISOString() }))];
    const html = await render("en");
    expect(html).toContain('href="/en/orders/o1"');
    expect(html).toContain("Report ready");
  });
});
