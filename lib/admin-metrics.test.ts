import { describe, expect, it } from "vitest";
import {
  buildExpertDemand,
  buildFunnel,
  buildOperationalMetrics,
  buildWorklist,
  lastActivityAt,
  type CompanyRow
} from "@/lib/admin-metrics";

const company = (overrides: Partial<CompanyRow> = {}): CompanyRow => ({
  organizationId: "org-1",
  companyName: "Acme",
  contactId: "user-1",
  contactName: "Kim",
  jobTitle: "CEO",
  firstAssessmentAt: "2026-07-20T00:00:00.000Z",
  latestAssessment: {
    id: "assessment-v4",
    completedAt: "2026-07-20T00:00:00.000Z",
    surveyVersion: "4.0",
    statusLabel: "준비 2단계",
    overallScore: 40,
    gateMessages: []
  },
  actions: [],
  orders: [],
  ...overrides
});

describe("admin metrics", () => {
  it("flags an assessment without an order after seven full days", () => {
    expect(buildWorklist([company()], new Date("2026-07-26T23:59:59Z"))).toHaveLength(0);
    expect(buildWorklist([company()], new Date("2026-07-28T00:00:00Z"))[0].kind).toBe("no-order");
  });

  it("includes gate blocks and paid orders that have not started", () => {
    const rows = [company({
      latestAssessment: { ...company().latestAssessment!, gateMessages: ["blocked"] },
      orders: [{ status: "paid", providerName: "Expert", createdAt: "2026-08-01" }]
    })];
    expect(buildWorklist(rows, new Date("2026-08-04"))).toHaveLength(2);
  });

  it("builds a non-increasing funnel", () => {
    const funnel = buildFunnel([
      company(),
      company({ organizationId: "org-2", latestAssessment: { ...company().latestAssessment!, statusLabel: "진출 실행 가능" } }),
      company({ organizationId: "org-3", latestAssessment: null })
    ]);
    expect(funnel.map((step) => step.count)).toEqual([2, 2, 1, 1]);
  });

  it("keeps v4 and v5 funnels separate and normalizes English statuses", () => {
    const row = company({
      assessmentHistory: [
        { id: "assessment-v4", surveyVersion: "4.0", completedAt: "2026-07-01", statusLabel: "Readiness Stage 2" },
        { id: "assessment-v5", surveyVersion: "5.0", completedAt: "2026-08-01", statusLabel: "Ready to Enter" }
      ],
      latestAssessment: { ...company().latestAssessment!, surveyVersion: "5.0", statusLabel: "Ready to Enter" }
    });
    expect(buildFunnel([row], "en", "4.0").map((step) => step.count)).toEqual([1, 1, 0, 0]);
    expect(buildFunnel([row], "en", "5.0").map((step) => step.count)).toEqual([1, 1, 1, 1]);
  });

  it("compares unfinished action demand with approved supply", () => {
    const demand = buildExpertDemand([
      company({ actions: [{ serviceTag: "gtm", completedAt: null }, { serviceTag: "gtm", completedAt: "2026-08-01" }] })
    ], { gtm: 2 });
    expect(demand).toEqual([{ tag: "gtm", demand: 1, supply: 2 }]);
  });

  it("calculates operational conversion, lead time, and review rating", () => {
    const metrics = buildOperationalMetrics([
      company({
        firstAssessmentAt: "2026-07-20T00:00:00.000Z",
        orders: [{ status: "completed", providerName: "Expert", createdAt: "2026-07-23T00:00:00.000Z" }]
      }),
      company({ organizationId: "org-2", latestAssessment: null, firstAssessmentAt: null })
    ], [5, 4]);

    expect(metrics).toEqual({
      assessmentByVersion: [
        { surveyVersion: "4.0", assessed: 1, assessmentToOrderRate: 100 },
        { surveyVersion: "5.0", assessed: 0, assessmentToOrderRate: 0 }
      ],
      averageDaysToFirstOrder: 3,
      averageReviewRating: 4.5
    });
  });

  it("keeps v4 and v5 completion metrics separate", () => {
    const metrics = buildOperationalMetrics([
      company(),
      company({
        organizationId: "org-2",
        latestAssessment: { ...company().latestAssessment!, surveyVersion: "5.0" }
      }),
      company({ organizationId: "org-3", latestAssessment: null })
    ], []);

    expect(metrics.assessmentByVersion).toEqual([
      { surveyVersion: "4.0", assessed: 1, assessmentToOrderRate: 0 },
      { surveyVersion: "5.0", assessed: 1, assessmentToOrderRate: 0 }
    ]);
  });

  it("attributes an order only to the closest preceding assessment version", () => {
    const metrics = buildOperationalMetrics([company({
      latestAssessment: {
        ...company().latestAssessment!,
        id: "assessment-v5",
        surveyVersion: "5.0",
        completedAt: "2026-08-01T00:00:00.000Z"
      },
      assessmentHistory: [
        { id: "assessment-v5", surveyVersion: "5.0", completedAt: "2026-08-01T00:00:00.000Z", statusLabel: "준비 1단계" },
        { id: "assessment-v4", surveyVersion: "4.0", completedAt: "2026-07-01T00:00:00.000Z", statusLabel: "준비 2단계" }
      ],
      orders: [{ status: "completed", providerName: "Expert", createdAt: "2026-07-15T00:00:00.000Z" }]
    })], []);

    expect(metrics.assessmentByVersion).toEqual([
      { surveyVersion: "4.0", assessed: 1, assessmentToOrderRate: 100 },
      { surveyVersion: "5.0", assessed: 1, assessmentToOrderRate: 0 }
    ]);
  });

  it("finds the latest company activity across assessments, actions, and orders", () => {
    expect(lastActivityAt(company({
      actions: [{ serviceTag: "gtm", completedAt: "2026-08-02T00:00:00.000Z" }],
      orders: [{ status: "paid", providerName: "Expert", createdAt: "2026-08-01T00:00:00.000Z" }]
    }))).toBe("2026-08-02T00:00:00.000Z");
  });
});
