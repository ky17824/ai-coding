import { describe, expect, it, vi } from "vitest";
import { getAiAgentServices } from "@/lib/ai-agent-services";
import { getPublishedServices } from "@/lib/services";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient
}));

describe("published services source", () => {
  it("publishes the AI expert catalog without depending on human providers", async () => {
    mocks.createSupabaseServerClient.mockResolvedValue(null);
    await expect(getPublishedServices()).resolves.toEqual(getAiAgentServices("ko"));
  });

  it("localizes the AI expert catalog in English", async () => {
    await expect(getPublishedServices("en")).resolves.toEqual(getAiAgentServices("en"));
  });
});
