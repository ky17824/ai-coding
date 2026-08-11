import { beforeEach, describe, expect, it, vi } from "vitest";
import * as React from "react";

vi.stubGlobal("React", React);

const mocks = vi.hoisted(() => ({
  assessment: null as { id: string } | null,
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  })
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

vi.mock("@/lib/supabase/server", () => ({
  requireUser: async () => ({ id: "founder-1" }),
  // 진단 페이지가 공개 서비스 목록을 조회한다. 대역이 없으면 실제 클라이언트를 부른다.
  createSupabaseServerClient: async () => null,
  createSupabaseAdminClient: () => ({
    from(table: string) {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { organization_id: "org-1" }
              })
            })
          })
        };
      }
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: async () => ({ data: mocks.assessment })
              })
            })
          })
        })
      };
    }
  })
}));

import AssessmentPage from "@/app/assessment/page";

describe("returning founder assessment entry", () => {
  beforeEach(() => {
    mocks.assessment = null;
    mocks.redirect.mockClear();
  });

  it("sends an organization member with a previous assessment to the dashboard", async () => {
    mocks.assessment = { id: "assessment-1" };

    await expect(AssessmentPage({ searchParams: Promise.resolve({}) }))
      .rejects.toThrow("NEXT_REDIRECT:/dashboard");
  });

  it("allows an explicit new assessment", async () => {
    mocks.assessment = { id: "assessment-1" };

    await AssessmentPage({ searchParams: Promise.resolve({ new: "1" }) });

    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("keeps the pending-answer resume path", async () => {
    mocks.assessment = { id: "assessment-1" };

    await AssessmentPage({ searchParams: Promise.resolve({ resume: "1" }) });

    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
