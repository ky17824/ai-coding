/**
 * 지정된 두 관리자 계정만 결제 없이 AI 전문가 서비스를 실행할 수 있게 하는 자격 판정.
 *
 * 설계 근거: docs/plans/2026-08-17-관리자-AI-베타접근-통합계획.md
 * - 판정은 전부 서버에서 한다. 클라이언트가 보낸 값은 어떤 것도 무료 여부를 결정하지 못한다.
 * - 하나라도 어긋나면 유료 경로만 남는다(fail closed).
 * - 이메일을 코드에 하드코딩하지 않는다. UUID 목록은 클라이언트로 보내지 않는다.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** 판정이 거절된 이유. 서버 로그에만 남기고 사용자에게는 노출하지 않는다. */
export type AdminBetaDenial =
  | "flag_off"
  | "allowlist_unusable"
  | "not_in_allowlist"
  | "not_admin"
  | "not_ai_product";

export type AdminBetaAccess =
  | { eligible: true }
  | { eligible: false; denial: AdminBetaDenial };

/**
 * 허용 목록을 읽는다. **정확히 두 개의 서로 다른 UUID**만 유효하며,
 * 하나라도 어긋나면 목록 전체를 버린다. 부분 허용은 없다.
 */
export function parseAdminBetaUserIds(raw: string | undefined | null): string[] {
  const ids = (raw ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (ids.length !== 2) return [];
  if (ids[0] === ids[1]) return [];
  if (!ids.every((id) => UUID.test(id))) return [];
  return ids;
}

export function resolveAdminBetaAccess(input: {
  flag: string | undefined | null;
  ids: string | undefined | null;
  userId: string;
  profile: { role: string; deletedAt: string | null } | null;
  /** AI 카탈로그 상품일 때만 연다. 사람 주문 경로는 절대 열지 않는다. */
  isAiProduct: boolean;
}): AdminBetaAccess {
  if (input.flag !== "true") return { eligible: false, denial: "flag_off" };

  const allowed = parseAdminBetaUserIds(input.ids);
  if (allowed.length !== 2) return { eligible: false, denial: "allowlist_unusable" };

  if (!allowed.includes(input.userId.toLowerCase())) return { eligible: false, denial: "not_in_allowlist" };

  if (!input.profile || input.profile.role !== "admin" || input.profile.deletedAt) {
    return { eligible: false, denial: "not_admin" };
  }

  if (!input.isAiProduct) return { eligible: false, denial: "not_ai_product" };

  return { eligible: true };
}

/** 서버 환경에서 현재 설정을 읽어 판정한다. 환경변수 이름은 여기서만 안다. */
export function checkAdminBetaAccess(input: {
  userId: string;
  profile: { role: string; deletedAt: string | null } | null;
  isAiProduct: boolean;
}): AdminBetaAccess {
  return resolveAdminBetaAccess({
    flag: process.env.ADMIN_AI_BETA_ACCESS_ENABLED,
    ids: process.env.ADMIN_AI_BETA_USER_IDS,
    ...input
  });
}
