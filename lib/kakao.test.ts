import { describe, expect, it, vi } from "vitest";
import {
  ensureKakaoUnlinked,
  kakaoServiceUserId
} from "@/lib/kakao";

function response(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

describe("kakaoServiceUserId", () => {
  it("uses only the numeric Kakao subject and never the Supabase identity id", () => {
    expect(kakaoServiceUserId([{ provider: "kakao", id: "uuid", identity_data: { sub: "123456789" } }])).toBe("123456789");
    expect(kakaoServiceUserId([{ provider: "kakao", id: "123456789", identity_data: {} }])).toBeNull();
    expect(kakaoServiceUserId([{ provider: "google", identity_data: { sub: "123456789" } }])).toBeNull();
  });
});

describe("ensureKakaoUnlinked", () => {
  it("unlinks a currently connected Kakao user", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(response(200, { id: 123456789 }))
      .mockResolvedValueOnce(response(200, { id: 123456789 }));

    await expect(ensureKakaoUnlinked("123456789", "admin-key", request)).resolves.toEqual({ ok: true });
    expect(request).toHaveBeenNthCalledWith(1, "https://kapi.kakao.com/v2/user/me", expect.objectContaining({ method: "POST" }));
    expect(request).toHaveBeenNthCalledWith(2, "https://kapi.kakao.com/v1/user/unlink", expect.objectContaining({ method: "POST" }));
  });

  it("accepts only Kakao -101 as an already-unlinked user", async () => {
    const request = vi.fn().mockResolvedValue(response(400, { code: -101 }));
    await expect(ensureKakaoUnlinked("123456789", "admin-key", request)).resolves.toEqual({ ok: true });
  });

  it.each([
    [401, { code: -401 }],
    [400, { code: -2 }],
    [503, { code: -9798 }]
  ])("fails closed for status %s", async (status, body) => {
    const request = vi.fn().mockResolvedValue(response(status, body));
    await expect(ensureKakaoUnlinked("123456789", "admin-key", request)).resolves.toEqual({
      ok: false,
      reason: "provider_error"
    });
  });

  it("fails closed on timeout or network errors", async () => {
    const request = vi.fn().mockRejectedValue(new Error("timeout"));
    await expect(ensureKakaoUnlinked("123456789", "admin-key", request)).resolves.toEqual({
      ok: false,
      reason: "provider_error"
    });
  });
});
