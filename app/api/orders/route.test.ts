import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./route.ts", import.meta.url), "utf8");
const checkout = readFileSync(new URL("../../../components/checkout-button.tsx", import.meta.url), "utf8");
const refund = readFileSync(new URL("./[id]/refund/route.ts", import.meta.url), "utf8");
const webhook = readFileSync(new URL("../portone/webhook/route.ts", import.meta.url), "utf8");

/** 설계: docs/plans/2026-08-17-관리자-AI-베타접근-통합계획.md */
describe("admin beta order creation", () => {
  it("opens the role gate only for AI catalog products", () => {
    // 이 게이트는 AI 분기와 사람 분기를 모두 덮는다. 넓게 열면 베타 관리자가
    // 정가 사람 주문을 만들고 정산 의무까지 생긴다.
    expect(source).toContain("isAiProduct: Boolean(aiCatalogService)");
    expect(source).toContain('profile.role !== "startup" && !betaAccess.eligible');
  });

  it("decides eligibility on the server and never from the request body", () => {
    expect(source).toContain("checkAdminBetaAccess");
    expect(source).not.toMatch(/body\.billingMode|parsed\.data\.billingMode|formData\.get\("billingMode"\)/);
    // 탈퇴 여부까지 봐야 하므로 프로필에서 함께 읽는다.
    expect(source).toContain("job_title,phone_enc,deleted_at");
    expect(source).toContain("deletedAt: profile.deleted_at");
  });

  it("creates the beta order and its run atomically through the RPC", () => {
    expect(source).toContain('admin.rpc("create_admin_beta_ai_order"');
    // 스냅샷은 유료 주문과 같은 코드로 만들어 넘긴다. SQL에서 다시 만들지 않는다.
    expect(source).toContain("p_service_snapshot: serviceSnapshot");
    expect(source).toContain("p_terms_snapshot: termsSnapshot");
  });

  it("answers a beta order without a payment id and tells the client not to pay", () => {
    expect(source).toContain("{ orderId, amount: 0, requiresPayment: false }");
    expect(source).toContain("requiresPayment: true");
    expect(checkout).toContain("order.requiresPayment === false");
    // 결제창을 열기 전에 빠져나가야 한다.
    const beforePayment = checkout.slice(0, checkout.indexOf("PortOne.requestPayment"));
    expect(beforePayment).toContain("order.requiresPayment === false");
  });

  it("maps a duplicate beta order to 409 rather than a generic failure", () => {
    expect(source).toContain('betaError.code === "23505"');
    expect(source).toContain("status: duplicate ? 409 : 500");
  });

  it("records the refusal reason for the operator without leaking the allowlist", () => {
    expect(source).toContain("[admin-beta] denied");
    expect(source).toContain("denial: betaAccess.denial");
    expect(source).not.toMatch(/ADMIN_AI_BETA_USER_IDS/);
  });
});

describe("beta order boundaries", () => {
  it("cancels a beta order instead of calling the payment gateway", () => {
    expect(refund).toContain('order.billing_mode === "admin_beta"');
    // 어떤 상태 변경보다 먼저여야 한다. disputed가 되면 013:56 때문에 실행 불가가 된다.
    const betaGuard = refund.indexOf('order.billing_mode === "admin_beta"');
    expect(betaGuard).toBeLessThan(refund.indexOf('status: "disputed"'));
    expect(betaGuard).toBeLessThan(refund.indexOf("refund_requested_at"));
    expect(betaGuard).toBeLessThan(refund.indexOf("api.portone.io"));
    expect(refund).toContain("billing_mode");
  });

  it("never reconciles a beta order from the webhook", () => {
    expect(webhook).toContain('order.billing_mode === "admin_beta"');
    const betaGuard = webhook.indexOf('order.billing_mode === "admin_beta"');
    expect(betaGuard).toBeLessThan(webhook.indexOf('reconcile_ai_payment'));
    expect(webhook).toContain("order_kind,billing_mode");
  });
});
