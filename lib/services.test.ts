import { afterEach, describe, expect, it, vi } from "vitest";
import { getSampleServices } from "@/lib/service-data";
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

/** 빈 카탈로그를 돌려주는 Supabase 대역. */
function emptyCatalog() {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          limit: async () => ({ data: [], error: null })
        })
      })
    })
  };
}

describe("published services source", () => {
  it("uses samples only when Supabase is absent in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mocks.createSupabaseServerClient.mockResolvedValue(null);

    await expect(getPublishedServices()).resolves.toEqual(getSampleServices("ko"));
  });

  it("does not expose samples when Supabase is absent in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mocks.createSupabaseServerClient.mockResolvedValue(null);

    await expect(getPublishedServices()).resolves.toEqual([]);
  });

  it("does not replace an empty operational catalog with samples", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mocks.createSupabaseServerClient.mockResolvedValue(emptyCatalog());

    await expect(getPublishedServices()).resolves.toEqual([]);
  });

  // 영어 화면도 같은 가드를 받아야 한다. locale 별로 갈라지면 한쪽만 새는 일이 생긴다.
  it("keeps the production guard on the English locale", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mocks.createSupabaseServerClient.mockResolvedValue(null);

    await expect(getPublishedServices("en")).resolves.toEqual([]);

    mocks.createSupabaseServerClient.mockResolvedValue(emptyCatalog());
    await expect(getPublishedServices("en")).resolves.toEqual([]);
  });

  it("still serves localized samples in development for the English locale", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mocks.createSupabaseServerClient.mockResolvedValue(null);

    await expect(getPublishedServices("en")).resolves.toEqual(getSampleServices("en"));
  });
});
