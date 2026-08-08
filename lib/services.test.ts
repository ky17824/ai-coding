import { afterEach, describe, expect, it, vi } from "vitest";
import { SAMPLE_SERVICES } from "@/lib/service-data";
import { getPublishedServices } from "@/lib/services";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("published services source", () => {
  it("uses samples only when Supabase is absent in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mocks.createSupabaseServerClient.mockResolvedValue(null);

    await expect(getPublishedServices()).resolves.toBe(SAMPLE_SERVICES);
  });

  it("does not expose samples when Supabase is absent in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mocks.createSupabaseServerClient.mockResolvedValue(null);

    await expect(getPublishedServices()).resolves.toEqual([]);
  });

  it("does not replace an empty operational catalog with samples", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mocks.createSupabaseServerClient.mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            limit: async () => ({ data: [], error: null })
          })
        })
      })
    });

    await expect(getPublishedServices()).resolves.toEqual([]);
  });
});
