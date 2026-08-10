import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  profile: null as Record<string, unknown> | null,
  profileUpdate: vi.fn(),
  profileInsert: vi.fn(),
  organizationInsert: vi.fn(),
  signOut: vi.fn(),
  user: {
    id: "user-1",
    email: "founder@example.com" as string | null,
    user_metadata: {} as Record<string, unknown>
  }
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      exchangeCodeForSession: async () => ({ data: { user: mocks.user }, error: null }),
      getUser: async () => ({
        data: { user: mocks.user },
        error: null
      }),
      signOut: mocks.signOut
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
        insert(payload: unknown) {
          mocks.profileInsert(payload);
          return Promise.resolve({ error: null });
        }
      };
    }
  })
}));

import { GET } from "@/app/auth/callback/route";

describe("auth callback account repair", () => {
  beforeEach(() => {
    mocks.profileUpdate.mockClear();
    mocks.profileInsert.mockClear();
    mocks.organizationInsert.mockClear();
    mocks.signOut.mockClear();
    mocks.user.email = "founder@example.com";
    mocks.user.user_metadata = {};
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

  it("handles OAuth cancellation before an existing session can be treated as success", async () => {
    const response = await GET(
      new Request("https://global-gtm.vercel.app/auth/callback?error=access_denied&next=/dashboard")
    );

    expect(mocks.organizationInsert).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "https://global-gtm.vercel.app/signin?error=oauth_cancelled"
    );
  });

  it("rejects OAuth users without an email before creating an organization", async () => {
    mocks.user.email = null;

    const response = await GET(
      new Request("https://global-gtm.vercel.app/auth/callback?code=oauth-code&next=/dashboard")
    );

    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(mocks.organizationInsert).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "https://global-gtm.vercel.app/signin?error=email_required"
    );
  });

  it("uses the Kakao nickname when creating a new OAuth profile", async () => {
    mocks.profile = null;
    mocks.user.user_metadata = { nickname: "카카오 창업자" };

    await GET(
      new Request("https://global-gtm.vercel.app/auth/callback?code=oauth-code&next=/dashboard")
    );

    expect(mocks.profileInsert).toHaveBeenCalledWith(expect.objectContaining({
      display_name: "카카오 창업자"
    }));
  });
});
