import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 베타 테스터 자격. 관리자가 /admin/beta-testers에 등록한 이메일의 계정이 결제 없이
 * 심층 시장 조사를 max_runs(기본 3)회 실행한다.
 *
 * - 판정은 서버에서만 한다. 클라이언트 값은 어떤 것도 무료 여부를 정하지 못한다(fail closed).
 * - DB RPC create_free_ai_order(026)가 같은 규칙을 잠금 아래에서 다시 검사한다.
 * - 관리자 베타(lib/admin-ai-beta.ts, admin_beta)와 별개 계층이다.
 */
export const BETA_TESTER_PRODUCT_ID = "ai-market-intelligence";

/** 0원·매출 지표 제외·환불 대신 취소로 다루는 결제 모드. */
export function isFreeBilling(mode: string | null | undefined) {
  return mode === "admin_beta" || mode === "beta_tester";
}

export function normalizeBetaEmail(raw: string) {
  return raw.trim().toLowerCase();
}

export type BetaTesterDenial = "not_registered" | "revoked" | "not_beta_product" | "quota_exhausted";
export type BetaTesterAccess =
  | { eligible: true; remaining: number; maxRuns: number; usedRuns: number }
  | { eligible: false; denial: BetaTesterDenial };

export function resolveBetaTesterAccess(input: {
  registered: boolean;
  revoked: boolean;
  maxRuns: number;
  usedRuns: number;
  productId: string;
}): BetaTesterAccess {
  if (!input.registered) return { eligible: false, denial: "not_registered" };
  if (input.revoked) return { eligible: false, denial: "revoked" };
  if (input.productId !== BETA_TESTER_PRODUCT_ID) return { eligible: false, denial: "not_beta_product" };
  if (input.usedRuns >= input.maxRuns) return { eligible: false, denial: "quota_exhausted" };
  return { eligible: true, remaining: input.maxRuns - input.usedRuns, maxRuns: input.maxRuns, usedRuns: input.usedRuns };
}

/** 서비스 롤 클라이언트로 등록 여부와 사용 횟수를 읽어 판정한다. */
export async function checkBetaTesterAccess(
  admin: SupabaseClient,
  input: { userId: string; email: string | null | undefined; productId: string }
): Promise<BetaTesterAccess> {
  const email = normalizeBetaEmail(input.email ?? "");
  if (!email) return { eligible: false, denial: "not_registered" };
  const { data: tester } = await admin.from("beta_testers").select("max_runs,revoked_at").eq("email", email).maybeSingle();
  if (!tester) return { eligible: false, denial: "not_registered" };
  const { count } = await admin.from("orders").select("id", { count: "exact", head: true })
    .eq("buyer_id", input.userId).eq("billing_mode", "beta_tester").neq("status", "cancelled");
  return resolveBetaTesterAccess({
    registered: true,
    revoked: Boolean(tester.revoked_at),
    maxRuns: Number(tester.max_runs ?? 0),
    usedRuns: count ?? 0,
    productId: input.productId
  });
}
