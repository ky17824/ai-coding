import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 베타 테스터 자격. 관리자가 /admin/beta-testers에 등록한 이메일의 계정이 결제 없이
 * 심층 시장 조사를 max_runs(기본 3)회 실행한다.
 *
 * - 판정은 서버에서만 한다. 클라이언트 값은 어떤 것도 무료 여부를 정하지 못한다(fail closed).
 * - DB RPC create_free_ai_order(027)가 같은 규칙을 잠금 아래에서 다시 검사한다.
 * - 관리자 베타(lib/admin-ai-beta.ts, admin_beta)와 별개 계층이다.
 */
export const BETA_TESTER_PRODUCT_ID = "ai-market-intelligence";
/** 관리자 화면의 슬롯 수 = 동시에 초대할 수 있는 테스터 수. 다른 사람을 넣으려면 하나를 삭제한다. */
export const MAX_BETA_TESTERS = 10;
/** 1인 무료 실행 횟수. 리셋하면 quota_started_at 이후부터 다시 이 횟수. */
export const BETA_FREE_RUNS = 3;

/** 0원·매출 지표 제외·환불 대신 취소로 다루는 결제 모드. */
export function isFreeBilling(mode: string | null | undefined) {
  return mode === "admin_beta" || mode === "beta_tester";
}

/** 베타 설문(구글 폼) 링크. 비어 있으면 초대장·보고서 화면의 설문 안내를 숨긴다. */
export function betaFeedbackFormUrl() {
  const url = (process.env.NEXT_PUBLIC_BETA_FEEDBACK_FORM_URL ?? "").trim();
  return /^https:\/\//.test(url) ? url : null;
}

/**
 * 관리자가 메일·메신저에 붙여 넣는 초대장. 발송은 자동화하지 않는다.
 * 감사 인사 → 이용 방법(같은 이메일·3회) → 피드백 부탁과 이유 → 설문 링크 → 기간·문의.
 */
export function buildBetaInvitation(input: { serviceUrl: string; formUrl: string | null; locale: "ko" | "en"; runs?: number }) {
  const runs = input.runs ?? BETA_FREE_RUNS;
  if (input.locale === "en") {
    return [
      "Thank you for joining the Borderless beta.",
      "",
      "We are checking whether AI expert research is genuinely useful to founders preparing to go abroad, so your first-hand experience is the most important data we can get.",
      "",
      `• How to use: sign up (or sign in) with this exact email at ${input.serviceUrl}, complete the readiness check, then run "In-depth Market Research" up to ${runs} times without payment.`,
      input.formUrl ? `• One request: after you receive a report, please answer a 5-minute survey — what was useful, what was off, and whether it is worth paying for. The more candid, the better the next version. Survey: ${input.formUrl}` : "• One request: after you receive a report, please tell us what was useful, what was off, and whether it is worth paying for.",
      "• Period: until the end of August. Reply to this email with any questions."
    ].join("\n");
  }
  return [
    "Borderless 베타 테스트에 함께해 주셔서 감사합니다.",
    "",
    "해외 진출을 준비하는 창업자에게 AI 전문가 조사가 실제로 쓸모 있는지 확인하는 단계라, 대표님의 첫 사용 경험이 가장 중요한 데이터입니다.",
    "",
    `• 이용 방법: ${input.serviceUrl} 에서 이 이메일 그대로 가입(또는 로그인) → 준비도 진단 → 「심층 시장 조사」를 결제 없이 ${runs}회 실행할 수 있습니다.`,
    input.formUrl ? `• 부탁: 보고서를 받은 뒤 5분 설문에 답해 주세요. 무엇이 유용했고 무엇이 아쉬웠는지, 돈을 내고 쓸 만한지 — 솔직할수록 다음 버전이 좋아집니다. 설문: ${input.formUrl}` : "• 부탁: 보고서를 받은 뒤 무엇이 유용했고 무엇이 아쉬웠는지, 돈을 내고 쓸 만한지 알려 주세요.",
    "• 기간: 8월 말까지. 문의는 이 메일로 회신해 주세요."
  ].join("\n");
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
  const { data: tester } = await admin.from("beta_testers").select("max_runs,revoked_at,quota_started_at").eq("email", email).maybeSingle();
  if (!tester) return { eligible: false, denial: "not_registered" };
  // 리셋(028) 이후의 주문만 센다. RPC·관리자 화면과 같은 규칙.
  const { count } = await admin.from("orders").select("id", { count: "exact", head: true })
    .eq("buyer_id", input.userId).eq("billing_mode", "beta_tester").neq("status", "cancelled")
    .gte("created_at", tester.quota_started_at ?? "1970-01-01");
  return resolveBetaTesterAccess({
    registered: true,
    revoked: Boolean(tester.revoked_at),
    maxRuns: Number(tester.max_runs ?? 0),
    usedRuns: count ?? 0,
    productId: input.productId
  });
}
