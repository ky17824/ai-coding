import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: { id: "user-1" } as { id: string } | null,
  organizationId: "org-1" as string | null,
  ensure: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  requireUser: async () => mocks.user,
  createSupabaseAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: mocks.organizationId ? { organization_id: mocks.organizationId } : null,
            error: null
          })
        })
      })
    })
  })
}));

vi.mock("@/lib/stage-summary-service", () => ({
  ensureStageSummary: mocks.ensure
}));

import { POST } from "@/app/api/assessments/[id]/stage-summary/route";

const context = { params: Promise.resolve({ id: "assessment-1" }) };

describe("stage summary retry route", () => {
  beforeEach(() => {
    mocks.user = { id: "user-1" };
    mocks.organizationId = "org-1";
    mocks.ensure.mockReset();
  });

  it("requires an authenticated user", async () => {
    mocks.user = null;

    const response = await POST(new Request("https://example.com/api/assessments/assessment-1/stage-summary", { method: "POST" }), context);

    expect(response.status).toBe(401);
    expect(mocks.ensure).not.toHaveBeenCalled();
  });

  it("requires an organization", async () => {
    mocks.organizationId = null;

    const response = await POST(new Request("https://example.com/api/assessments/assessment-1/stage-summary", { method: "POST" }), context);

    expect(response.status).toBe(403);
    expect(mocks.ensure).not.toHaveBeenCalled();
  });

  it("generates only within the caller organization", async () => {
    mocks.ensure.mockResolvedValue({ status: "complete", summary: { headline: "stored" } });

    const response = await POST(new Request("https://example.com/api/assessments/assessment-1/stage-summary", { method: "POST" }), context);

    expect(response.status).toBe(200);
    expect(mocks.ensure).toHaveBeenCalledWith(expect.objectContaining({
      assessmentId: "assessment-1",
      organizationId: "org-1",
      locale: "ko"
    }));
  });

  it("reports generation failure without changing the assessment response", async () => {
    mocks.ensure.mockResolvedValue({ status: "failed", summary: null });

    const response = await POST(new Request("https://example.com/api/assessments/assessment-1/stage-summary", { method: "POST" }), context);
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.status).toBe("failed");
  });
});
