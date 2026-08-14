import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  profile: null as Record<string, unknown> | null,
  provisionProfile: vi.fn(),
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
      getUser: async () => ({ data: { user: mocks.user }, error: null }),
      signOut: mocks.signOut
    }
  }),
  createSupabaseAdminClient: () => ({ rpc: mocks.provisionProfile })
}));

import { GET } from "@/app/auth/callback/route";

describe("auth callback account provisioning", () => {
  beforeEach(() => {
    mocks.profile = {
      id: "user-1",
      organization_id: "org-1",
      role: "startup",
      job_title: "CEO",
      phone_enc: "encrypted",
      terms_agreed_at: "2026-08-14T00:00:00.000Z",
      privacy_agreed_at: "2026-08-14T00:00:00.000Z",
      deleted_at: null
    };
    mocks.provisionProfile.mockReset();
    mocks.provisionProfile.mockImplementation(async () => ({ data: mocks.profile, error: null }));
    mocks.signOut.mockClear();
    mocks.user.email = "founder@example.com";
    mocks.user.user_metadata = {};
  });

  it("provisions the OAuth profile in one transactional database call", async () => {
    const response = await GET(
      new Request("https://global-gtm.vercel.app/auth/callback?code=oauth-code&next=/dashboard")
    );

    expect(mocks.provisionProfile).toHaveBeenCalledOnce();
    expect(response.headers.get("location")).toBe("https://global-gtm.vercel.app/dashboard");
  });

  it("sends an incomplete repaired profile to onboarding", async () => {
    mocks.profile = {
      ...mocks.profile,
      job_title: null,
      phone_enc: null,
      terms_agreed_at: null,
      privacy_agreed_at: null
    };

    const response = await GET(
      new Request("https://global-gtm.vercel.app/auth/callback?next=/dashboard")
    );

    expect(response.headers.get("location")).toBe(
      "https://global-gtm.vercel.app/account/onboarding?next=%2Fdashboard"
    );
  });

  it("handles OAuth cancellation before an existing session can be treated as success", async () => {
    const response = await GET(
      new Request("https://global-gtm.vercel.app/auth/callback?error=access_denied&next=/dashboard")
    );

    expect(mocks.provisionProfile).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "https://global-gtm.vercel.app/signin?error=oauth_cancelled"
    );
  });

  it("rejects OAuth users without an email before provisioning an account", async () => {
    mocks.user.email = null;

    const response = await GET(
      new Request("https://global-gtm.vercel.app/auth/callback?code=oauth-code&next=/dashboard")
    );

    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(mocks.provisionProfile).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "https://global-gtm.vercel.app/signin?error=email_required"
    );
  });

  it("signs out a deleted profile returned by the provisioning boundary", async () => {
    mocks.profile = { ...mocks.profile, deleted_at: "2026-08-14T00:00:00.000Z" };

    const response = await GET(
      new Request("https://global-gtm.vercel.app/auth/callback?code=oauth-code")
    );

    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(response.headers.get("location")).toBe(
      "https://global-gtm.vercel.app/signin?error=deleted"
    );
  });

  it("uses the Kakao nickname when provisioning a new OAuth profile", async () => {
    mocks.user.user_metadata = { nickname: "카카오 창업자" };

    await GET(
      new Request("https://global-gtm.vercel.app/auth/callback?code=oauth-code&next=/dashboard")
    );

    expect(mocks.provisionProfile).toHaveBeenCalledWith(
      "ensure_oauth_profile",
      expect.objectContaining({ p_display_name: "카카오 창업자" })
    );
  });
});
