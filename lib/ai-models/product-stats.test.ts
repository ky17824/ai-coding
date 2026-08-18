import { describe, expect, it } from "vitest";
import { aggregateProductStats } from "@/lib/ai-models/product-stats";

const row = (over: Partial<Parameters<typeof aggregateProductStats>[0][number]> = {}) => ({
  status: "completed",
  completed_at: "2026-08-19T00:05:00Z",
  generation_stage_log: [{ stage: "context", at: "2026-08-18T23:00:00Z", attempt: "a1" }, { stage: "context", at: "2026-08-19T00:00:00Z", attempt: "a2" }],
  model_attempts: [{ stage: "classification", costUsd: 0.0001, ok: true }, { stage: "final_report", costUsd: 1.18, ok: true }],
  orders: { product_key: "ai-market-intelligence" },
  ...over
});

describe("aggregateProductStats — 상품별 최근 30일 실측", () => {
  it("상품별로 실행 수·성공률·평균 시간(마지막 시도 기준)·평균 비용(시도 합)을 낸다", () => {
    const stats = aggregateProductStats([
      row(),
      row({ status: "failed", completed_at: null, model_attempts: [{ stage: "public_research", costUsd: 0.02, ok: true }] }),
      row({ orders: [{ product_key: "pkg-feasibility" }], completed_at: "2026-08-19T00:10:00Z", model_attempts: [{ costUsd: 2 }] })
    ]);
    expect(stats["ai-market-intelligence"]).toEqual({ runs: 2, successRate: 0.5, avgSeconds: 300, avgCostUsd: (1.1801 + 0.02) / 2 });
    expect(stats["pkg-feasibility"]).toEqual({ runs: 1, successRate: 1, avgSeconds: 600, avgCostUsd: 2 });
  });

  it("진행 중·상품 없음·로그 없음은 세지 않거나 시간을 비운다", () => {
    const stats = aggregateProductStats([
      row({ status: "generating" }),
      row({ orders: null }),
      row({ generation_stage_log: [], model_attempts: [] })
    ]);
    expect(stats["ai-market-intelligence"]).toEqual({ runs: 1, successRate: 1, avgSeconds: null, avgCostUsd: null });
  });
});
