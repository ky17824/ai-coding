import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  claims: null as { sub: string } | null,
  getUser: vi.fn()
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getClaims: async () => ({ data: { claims: mocks.claims }, error: null }),
      getUser: mocks.getUser
    }
  })
}));

import { middleware } from "@/middleware";

describe("landing locale detection", () => {
  it("redirects a first-time English browser from the root to /en", async () => {
    const response = await middleware(new NextRequest("https://global-gtm.vercel.app/", {
      headers: { "accept-language": "en-US,en;q=0.9" }
    }));

    expect(response.headers.get("location")).toBe("https://global-gtm.vercel.app/en");
    expect(response.cookies.get("borderless_locale")?.value).toBe("en");
  });

  it("keeps a saved Korean choice ahead of the browser language", async () => {
    const request = new NextRequest("https://global-gtm.vercel.app/", {
      headers: { "accept-language": "en-US,en;q=0.9" }
    });
    request.cookies.set("borderless_locale", "ko");

    const response = await middleware(request);

    expect(response.headers.get("location")).toBeNull();
  });

  it("does not auto-redirect a deep link", async () => {
    const response = await middleware(new NextRequest("https://global-gtm.vercel.app/services", {
      headers: { "accept-language": "en-US,en;q=0.9" }
    }));

    expect(response.headers.get("location")).toBeNull();
  });
});

describe("protected experience routes", () => {
  beforeEach(() => {
    mocks.claims = null;
    mocks.getUser.mockClear();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  it("requires authentication before starting an assessment and preserves its destination", async () => {
    const response = await middleware(
      new NextRequest("https://global-gtm.vercel.app/assessment?from=hero")
    );

    expect(response.headers.get("location")).toBe(
      "https://global-gtm.vercel.app/signin?returnTo=%2Fassessment%3Ffrom%3Dhero"
    );
  });

  it("lets an authenticated founder open the assessment", async () => {
    mocks.claims = { sub: "founder-1" };

    const response = await middleware(
      new NextRequest("https://global-gtm.vercel.app/assessment")
    );

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("server-timing")).toMatch(/^auth;dur=/);
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it("keeps an English protected destination through sign-in", async () => {
    const response = await middleware(
      new NextRequest("https://global-gtm.vercel.app/en/dashboard?from=hero")
    );

    expect(response.headers.get("location")).toBe(
      "https://global-gtm.vercel.app/en/signin?returnTo=%2Fen%2Fdashboard%3Ffrom%3Dhero"
    );
  });

  it("rewrites an authenticated English route to the shared page", async () => {
    mocks.claims = { sub: "founder-1" };

    const response = await middleware(
      new NextRequest("https://global-gtm.vercel.app/en/dashboard")
    );

    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://global-gtm.vercel.app/dashboard"
    );
  });
});
