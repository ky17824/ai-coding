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
    expect(funnel.map((step) => step.count)).toEqual([3, 2, 2, 1, 1]);
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
      assessmentCompletionByVersion: [
        { surveyVersion: "4.0", assessed: 1, rate: 50 },
        { surveyVersion: "5.0", assessed: 0, rate: 0 }
      ],
      assessmentToOrderRate: 100,
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

    expect(metrics.assessmentCompletionByVersion).toEqual([
      { surveyVersion: "4.0", assessed: 1, rate: 33 },
      { surveyVersion: "5.0", assessed: 1, rate: 33 }
    ]);
  });

  it("finds the latest company activity across assessments, actions, and orders", () => {
    expect(lastActivityAt(company({
      actions: [{ serviceTag: "gtm", completedAt: "2026-08-02T00:00:00.000Z" }],
      orders: [{ status: "paid", providerName: "Expert", createdAt: "2026-08-01T00:00:00.000Z" }]
    }))).toBe("2026-08-02T00:00:00.000Z");
  });
});
