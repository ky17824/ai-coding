import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./016_mixed_order_shape.sql", import.meta.url), "utf8");
const runRoute = readFileSync(new URL("../../app/api/ai-agent-runs/[orderId]/route.ts", import.meta.url), "utf8");
const webhook = readFileSync(new URL("../../app/api/portone/webhook/route.ts", import.meta.url), "utf8");

describe("mixed order shape migration", () => {
  it("opens the order shape phase 2 needs without touching existing shapes", () => {
    expect(source).toContain("order_kind in ('human', 'ai_agent', 'mixed')");
    expect(source).toContain("order_kind = 'mixed' and provider_id is not null and product_key is not null");
    // 기존 두 분기는 문구 그대로 유지되어야 한다.
    expect(source).toContain("order_kind = 'human' and provider_id is not null and service_id is not null and product_key is null");
    expect(source).toContain("order_kind = 'ai_agent' and provider_id is null and service_id is null and product_key is not null");
  });

  it("resolves the server-generated order_kind constraint name before dropping it", () => {
    expect(source).toContain("pg_constraint");
    expect(source).toContain("execute format('alter table public.orders drop constraint %I', constraint_name)");
  });

  it("leaves the ai_agent execution path untouched, so phase 1 behaviour is unchanged", () => {
    // mixed 주문은 아직 어느 실행 경로에도 연결되지 않는다. 2차에서 이 두 분기를 함께 열어야 한다.
    expect(runRoute).toContain('order_kind !== "ai_agent"');
    expect(webhook).toContain('"ai_agent"');
  });
});
