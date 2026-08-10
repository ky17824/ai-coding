import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  user: null as { id: string } | null
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: mocks.user } })
    }
  })
}));

import { middleware } from "@/middleware";

describe("protected experience routes", () => {
  beforeEach(() => {
    mocks.user = null;
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
    mocks.user = { id: "founder-1" };

    const response = await middleware(
      new NextRequest("https://global-gtm.vercel.app/assessment")
    );

    expect(response.headers.get("location")).toBeNull();
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
    mocks.user = { id: "founder-1" };

    const response = await middleware(
      new NextRequest("https://global-gtm.vercel.app/en/dashboard")
    );

    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://global-gtm.vercel.app/dashboard"
    );
  });
});
