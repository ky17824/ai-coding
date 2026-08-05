import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  profile: null as Record<string, unknown> | null,
  profileUpdate: vi.fn(),
  organizationInsert: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: "user-1",
            email: "founder@example.com",
            user_metadata: {}
          }
        },
        error: null
      })
    }
  }),
  createSupabaseAdminClient: () => ({
    from(table: string) {
      if (table === "organizations") {
        return {
          insert(payload: unknown) {
            mocks.organizationInsert(payload);
            return {
              select: () => ({
                single: async () => ({ data: { id: "org-1" }, error: null })
              })
            };
          },
          delete: () => ({ eq: async () => ({ error: null }) })
        };
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: mocks.profile, error: null })
          })
        }),
        update(payload: unknown) {
          mocks.profileUpdate(payload);
          return { eq: async () => ({ error: null }) };
        },
        insert: async () => ({ error: null })
      };
    }
  })
}));

import { GET } from "@/app/auth/callback/route";

describe("auth callback account repair", () => {
  beforeEach(() => {
    mocks.profileUpdate.mockClear();
    mocks.organizationInsert.mockClear();
  });

  it("repairs an existing profile without an organization instead of redirecting forever", async () => {
    mocks.profile = {
      id: "user-1",
      organization_id: null,
      role: "startup",
      job_title: null,
      phone_enc: null,
      terms_agreed_at: null,
      privacy_agreed_at: null,
      deleted_at: null
    };

    const response = await GET(
      new Request("https://global-gtm.vercel.app/auth/callback?next=/dashboard")
    );

    expect(mocks.organizationInsert).toHaveBeenCalledOnce();
    expect(mocks.profileUpdate).toHaveBeenCalledWith({ organization_id: "org-1" });
    expect(response.headers.get("location")).toBe(
      "https://global-gtm.vercel.app/account/onboarding?next=%2Fdashboard"
    );
  });
});
