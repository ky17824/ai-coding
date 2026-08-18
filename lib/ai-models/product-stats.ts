/**
 * 관리자 AI 모델 페이지의 "최근 30일" 상품별 실측. 실행 행(ai_agent_runs × orders.product_key)을
 * 상품별로 모아 실행 수·성공률·평균 완주 시간·평균 모델 비용을 낸다.
 *
 * - 성공 = status completed. 실패 = status failed. 진행 중은 세지 않는다.
 * - 시간 = 마지막 시도의 시작(generation_stage_log의 마지막 context 항목) → completed_at. 실패는 시간이 없다.
 * - 비용 = 마지막 시도의 model_attempts costUsd 합. 행의 estimated_model_cost_usd는 시도가 누적되어
 *   못 쓴다(알려진 문제).
 */

export type ProductRunRow = {
  status: string;
  completed_at: string | null;
  generation_stage_log: unknown;
  model_attempts: unknown;
  orders: { product_key: string | null } | { product_key: string | null }[] | null;
};

export type ProductStat = { runs: number; successRate: number | null; avgSeconds: number | null; avgCostUsd: number | null };

function lastContextAt(log: unknown): number | null {
  if (!Array.isArray(log)) return null;
  for (let i = log.length - 1; i >= 0; i--) {
    const entry = log[i] as { stage?: unknown; at?: unknown } | null;
    if (entry && entry.stage === "context" && typeof entry.at === "string") {
      const t = Date.parse(entry.at);
      return Number.isFinite(t) ? t : null;
    }
  }
  return null;
}

function attemptsCost(attempts: unknown): number | null {
  if (!Array.isArray(attempts) || attempts.length === 0) return null;
  let total = 0;
  for (const attempt of attempts) {
    const cost = (attempt as { costUsd?: unknown } | null)?.costUsd;
    if (typeof cost === "number" && Number.isFinite(cost)) total += cost;
  }
  return total;
}

export function aggregateProductStats(rows: ProductRunRow[]): Record<string, ProductStat> {
  const buckets = new Map<string, { runs: number; ok: number; seconds: number[]; costs: number[] }>();
  for (const row of rows) {
    const order = Array.isArray(row.orders) ? row.orders[0] : row.orders;
    const key = order?.product_key;
    if (!key || (row.status !== "completed" && row.status !== "failed")) continue;
    const bucket = buckets.get(key) ?? { runs: 0, ok: 0, seconds: [], costs: [] };
    bucket.runs += 1;
    if (row.status === "completed") {
      bucket.ok += 1;
      const began = lastContextAt(row.generation_stage_log);
      const ended = row.completed_at ? Date.parse(row.completed_at) : NaN;
      if (began !== null && Number.isFinite(ended) && ended >= began) bucket.seconds.push((ended - began) / 1000);
    }
    const cost = attemptsCost(row.model_attempts);
    if (cost !== null) bucket.costs.push(cost);
    buckets.set(key, bucket);
  }
  const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);
  return Object.fromEntries([...buckets.entries()].map(([key, b]) => [key, {
    runs: b.runs,
    successRate: b.runs ? b.ok / b.runs : null,
    avgSeconds: avg(b.seconds),
    avgCostUsd: avg(b.costs)
  }]));
}
