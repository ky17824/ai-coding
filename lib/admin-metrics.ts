import type { OrderStatus } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import type { SurveyVersion } from "@/lib/intake-questions";
import { isFreeBilling } from "@/lib/beta-testers";

export interface CompanyRow {
  organizationId: string;
  companyName: string;
  contactId: string | null;
  contactName: string | null;
  jobTitle: string | null;
  firstAssessmentAt: string | null;
  latestAssessment: {
    id: string;
    surveyVersion: SurveyVersion;
    completedAt: string;
    statusLabel: string;
    overallScore: number;
    gateMessages: string[];
  } | null;
  assessmentHistory?: {
    id: string;
    surveyVersion: SurveyVersion;
    completedAt: string;
    statusLabel: string;
  }[];
  actions: { serviceTag: string; completedAt: string | null }[];
  orders: { status: OrderStatus; providerName: string; createdAt: string; assessmentId?: string | null; billingMode?: string }[];
}

export interface WorklistItem {
  organizationId: string;
  companyName: string;
  kind: "no-order" | "gate-blocked" | "paid-not-started";
  label: string;
}

export function buildWorklist(rows: CompanyRow[], now: Date, locale: Locale = "ko"): WorklistItem[] {
  const en = locale === "en";
  const items: WorklistItem[] = [];
  for (const row of rows) {
    const base = { organizationId: row.organizationId, companyName: row.companyName };
    if (
      row.latestAssessment &&
      now.getTime() - new Date(row.latestAssessment.completedAt).getTime() > 7 * 86400000 &&
      row.orders.length === 0
    ) {
      items.push({ ...base, kind: "no-order", label: en ? "No order more than 7 days after assessment" : "진단 후 7일 넘게 주문 없음" });
    }
    if (row.latestAssessment?.gateMessages.length) {
      items.push({ ...base, kind: "gate-blocked", label: en ? "Required stage gate blocked" : "필수 단계 통과 기준(Stage Gate) 차단" });
    }
    // 관리자 베타는 결제가 없으므로 "결제 후 미시작"이 성립하지 않는다.
    if (row.orders.some((order) => order.status === "paid" && !isFreeBilling(order.billingMode))) {
      items.push({ ...base, kind: "paid-not-started", label: en ? "Service not started after payment" : "결제 후 서비스 미시작" });
    }
  }
  return items;
}

function assessmentForVersion(row: CompanyRow, surveyVersion: SurveyVersion) {
  return row.assessmentHistory?.find((assessment) => assessment.surveyVersion === surveyVersion) ??
    (row.latestAssessment?.surveyVersion === surveyVersion ? row.latestAssessment : null);
}

function orderSurveyVersion(row: CompanyRow, order: CompanyRow["orders"][number]): SurveyVersion | null {
  const assessments = row.assessmentHistory ?? (row.latestAssessment ? [row.latestAssessment] : []);
  const explicit = order.assessmentId ? assessments.find((assessment) => assessment.id === order.assessmentId) : null;
  if (explicit) return explicit.surveyVersion;
  return assessments
    .filter((assessment) => new Date(assessment.completedAt).getTime() <= new Date(order.createdAt).getTime())
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0]?.surveyVersion ?? null;
}

function stageRank(status: string) {
  return ({
    "준비 1단계": 0,
    "Readiness Stage 1": 0,
    "준비 2단계": 1,
    "Readiness Stage 2": 1,
    "준비 3단계": 2,
    "Readiness Stage 3": 2,
    "진출 실행 가능": 3,
    "Ready to Enter": 3
  } as Record<string, number>)[status] ?? 0;
}

export function buildFunnel(rows: CompanyRow[], locale: Locale = "ko", surveyVersion: SurveyVersion = "4.0") {
  const en = locale === "en";
  const assessed = rows.flatMap((row) => {
    const assessment = assessmentForVersion(row, surveyVersion);
    return assessment ? [assessment] : [];
  });
  return [
    { label: en ? `v${surveyVersion} assessments` : `v${surveyVersion} 진단`, count: assessed.length },
    { label: en ? "Stage 1 passed" : "준비 1단계 통과", count: assessed.filter((assessment) => stageRank(assessment.statusLabel) >= 1).length },
    { label: en ? "Stage 2 passed" : "준비 2단계 통과", count: assessed.filter((assessment) => stageRank(assessment.statusLabel) >= 2).length },
    { label: en ? "Stage 3 passed" : "준비 3단계 통과", count: assessed.filter((assessment) => stageRank(assessment.statusLabel) >= 3).length }
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
    assessmentByVersion: (["4.0", "5.0"] as SurveyVersion[]).map((surveyVersion) => {
      const cohort = rows.filter((row) => assessmentForVersion(row, surveyVersion));
      return {
        surveyVersion,
        assessed: cohort.length,
        assessmentToOrderRate: percent(
          cohort.filter((row) => row.orders.some((order) => orderSurveyVersion(row, order) === surveyVersion)).length,
          cohort.length
        )
      };
    }),
    averageDaysToFirstOrder: average(leadTimes),
    averageReviewRating: average(reviewRatings)
  };
}
