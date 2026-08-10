type KakaoIdentity = {
  id?: string;
  provider?: string;
  identity_data?: Record<string, unknown> | null;
};

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

export type KakaoUnlinkResult =
  | { ok: true }
  | { ok: false; reason: "configuration" | "provider_error" };

export function kakaoServiceUserId(
  identities?: readonly KakaoIdentity[] | null
) {
  const raw = identities?.find((identity) => identity.provider === "kakao")
    ?.identity_data?.sub;
  const value = typeof raw === "number" ? String(raw) : typeof raw === "string" ? raw : "";
  return /^[1-9]\d*$/.test(value) ? value : null;
}

async function kakaoRequest(
  path: string,
  serviceUserId: string,
  adminKey: string,
  request: FetchLike
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    return await request(`https://kapi.kakao.com${path}`, {
      method: "POST",
      headers: {
        Authorization: `KakaoAK ${adminKey}`,
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      body: new URLSearchParams({
        target_id_type: "user_id",
        target_id: serviceUserId
      }),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function responseBody(response: Response) {
  try {
    return await response.json() as { id?: number | string; code?: number };
  } catch {
    return {};
  }
}

async function linkState(
  serviceUserId: string,
  adminKey: string,
  request: FetchLike
) {
  const response = await kakaoRequest("/v2/user/me", serviceUserId, adminKey, request);
  const body = await responseBody(response);
  if (response.ok && String(body.id) === serviceUserId) return "linked" as const;
  if (response.status === 400 && body.code === -101) return "unlinked" as const;
  return "unknown" as const;
}

export async function ensureKakaoUnlinked(
  serviceUserId: string,
  adminKey: string | undefined,
  request: FetchLike = fetch
): Promise<KakaoUnlinkResult> {
  if (!adminKey) return { ok: false, reason: "configuration" };
  try {
    const state = await linkState(serviceUserId, adminKey, request);
    if (state === "unlinked") return { ok: true };
    if (state !== "linked") return { ok: false, reason: "provider_error" };

    const response = await kakaoRequest("/v1/user/unlink", serviceUserId, adminKey, request);
    const body = await responseBody(response);
    if (response.ok && String(body.id) === serviceUserId) return { ok: true };

    if (response.status === 400 && body.code === -101) {
      return await linkState(serviceUserId, adminKey, request) === "unlinked"
        ? { ok: true }
        : { ok: false, reason: "provider_error" };
    }
    return { ok: false, reason: "provider_error" };
  } catch {
    return { ok: false, reason: "provider_error" };
  }
}
