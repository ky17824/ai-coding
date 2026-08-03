import type { OrderStatus } from "@/lib/types";

export interface CompanyRow {
  organizationId: string;
  companyName: string;
  contactId: string | null;
  contactName: string | null;
  jobTitle: string | null;
  firstAssessmentAt: string | null;
  latestAssessment: {
    completedAt: string;
    statusLabel: string;
    overallScore: number;
    gateMessages: string[];
  } | null;
  actions: { serviceTag: string; completedAt: string | null }[];
  orders: { status: OrderStatus; providerName: string; createdAt: string }[];
}

export interface WorklistItem {
  organizationId: string;
  companyName: string;
  kind: "no-order" | "gate-blocked" | "paid-not-started";
  label: string;
}

export function buildWorklist(rows: CompanyRow[], now: Date): WorklistItem[] {
  const items: WorklistItem[] = [];
  for (const row of rows) {
    const base = { organizationId: row.organizationId, companyName: row.companyName };
    if (
      row.latestAssessment &&
      now.getTime() - new Date(row.latestAssessment.completedAt).getTime() > 7 * 86400000 &&
      row.orders.length === 0
    ) {
      items.push({ ...base, kind: "no-order", label: "진단 후 7일 넘게 주문 없음" });
    }
    if (row.latestAssessment?.gateMessages.length) {
      items.push({ ...base, kind: "gate-blocked", label: "Critical Gate 차단" });
    }
    if (row.orders.some((order) => order.status === "paid")) {
      items.push({ ...base, kind: "paid-not-started", label: "결제 후 서비스 미시작" });
    }
  }
  return items;
}

export function buildFunnel(rows: CompanyRow[]) {
  const assessed = rows.filter((row) => row.latestAssessment);
  const status = (row: CompanyRow) => row.latestAssessment?.statusLabel;
  return [
    { label: "가입", count: rows.length },
    { label: "진단 완료", count: assessed.length },
    { label: "극초기 통과", count: assessed.filter((row) => status(row) !== "극초기").length },
    { label: "준비중 통과", count: assessed.filter((row) => ["준비완료", "진출 실행 가능"].includes(status(row) ?? "")).length },
    { label: "준비완료 통과", count: assessed.filter((row) => status(row) === "진출 실행 가능").length }
  ];
}

export function buildExpertDemand(
  rows: CompanyRow[],
  approvedByTag: Record<string, number>
) {
  const demand = new Map<string, number>();
  for (const row of rows) {
    for (const action of row.actions) {
      if (!action.completedAt) demand.set(action.serviceTag, (demand.get(action.serviceTag) ?? 0) + 1);
    }
  }
  return [...new Set([...demand.keys(), ...Object.keys(approvedByTag)])]
    .sort()
    .map((tag) => ({ tag, demand: demand.get(tag) ?? 0, supply: approvedByTag[tag] ?? 0 }));
}

export function lastActivityAt(row: CompanyRow): string | null {
  return [
    row.latestAssessment?.completedAt,
    ...row.actions.map((action) => action.completedAt),
    ...row.orders.map((order) => order.createdAt)
  ].filter((value): value is string => Boolean(value)).sort().at(-1) ?? null;
}

export function buildOperationalMetrics(rows: CompanyRow[], reviewRatings: number[]) {
  const assessed = rows.filter((row) => row.latestAssessment);
  const ordered = assessed.filter((row) => row.orders.length > 0);
  const leadTimes = ordered.flatMap((row) => {
    if (!row.firstAssessmentAt) return [];
    const firstOrder = row.orders
      .map((order) => new Date(order.createdAt).getTime())
      .filter((time) => time >= new Date(row.firstAssessmentAt!).getTime())
      .sort((a, b) => a - b)[0];
    return firstOrder === undefined
      ? []
      : [(firstOrder - new Date(row.firstAssessmentAt).getTime()) / 86400000];
  });
  const percent = (value: number, total: number) => total ? Math.round((value / total) * 100) : 0;
  const average = (values: number[]) => values.length
    ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
    : null;

  return {
    assessmentCompletionRate: percent(assessed.length, rows.length),
    assessmentToOrderRate: percent(ordered.length, assessed.length),
    averageDaysToFirstOrder: average(leadTimes),
    averageReviewRating: average(reviewRatings)
  };
}
