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
    expect(source).toContain('admin.rpc("create_free_ai_order"');
    expect(source).toContain('p_billing_mode: freeMode');
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
    expect(source).toContain("status: duplicate || exhausted ? 409 : 500");
  });

  it("records the refusal reason for the operator without leaking the allowlist", () => {
    expect(source).toContain("[admin-beta] denied");
    expect(source).toContain("denial: betaAccess.denial");
    expect(source).not.toMatch(/ADMIN_AI_BETA_USER_IDS/);
  });
});

describe("beta order boundaries", () => {
  it("cancels a beta order instead of calling the payment gateway", () => {
    expect(refund).toContain('isFreeBilling(order.billing_mode)');
    // 어떤 상태 변경보다 먼저여야 한다. disputed가 되면 013:56 때문에 실행 불가가 된다.
    const betaGuard = refund.indexOf('isFreeBilling(order.billing_mode)');
    expect(betaGuard).toBeLessThan(refund.indexOf('status: "disputed"'));
    expect(betaGuard).toBeLessThan(refund.indexOf("refund_requested_at"));
    expect(betaGuard).toBeLessThan(refund.indexOf("api.portone.io"));
    expect(refund).toContain("billing_mode");
  });

  it("never reconciles a beta order from the webhook", () => {
    expect(webhook).toContain('isFreeBilling(order.billing_mode)');
    const betaGuard = webhook.indexOf('isFreeBilling(order.billing_mode)');
    expect(betaGuard).toBeLessThan(webhook.indexOf('reconcile_ai_payment'));
    expect(webhook).toContain("order_kind,billing_mode");
  });
});

describe("beta tester free orders", () => {
  it("opens the free path to registered testers after the admin check and unifies the free-billing checks", () => {
    // 테스터 자격은 관리자 베타가 아닐 때만 조회하고, 둘 중 하나면 같은 RPC로 0원 주문을 만든다.
    expect(source).toContain("checkBetaTesterAccess(admin, { userId: user.id, email: user.email, productId: aiService.id })");
    expect(source).toContain('betaAccess.eligible ? "admin_beta" : testerAccess.eligible ? "beta_tester" : null');
    expect(source).toContain("beta_tester_quota_exhausted");
    expect(source).not.toContain("create_admin_beta_ai_order");
    for (const file of ["[id]/refund/route.ts", "../portone/webhook/route.ts", "../../orders/[id]/page.tsx", "../../../lib/admin-metrics.ts"]) {
      const text = readFileSync(new URL(file, import.meta.url), "utf8");
      expect(text, file).toContain("isFreeBilling(");
      expect(text, file).not.toContain('=== "admin_beta"');
    }
  });
});

describe("coming-soon products", () => {
  it("refuses paid orders for unlaunched products but lets admin beta tests through", () => {
    // 카드·상세는 회색 표시일 뿐이고 직접 호출을 막는 것은 서버다. 베타는 출시 전 검증을 위해 계속 열어 둔다.
    const guard = source.indexOf('aiService.comingSoon && freeMode !== "admin_beta"');
    expect(guard).toBeGreaterThan(0);
    expect(guard).toBeLessThan(source.indexOf("create_free_ai_order"));
    expect(source).toContain("아직 출시 전인 서비스입니다");
  });

  it("swaps the checkout button for the launch notice unless the viewer is a beta admin", () => {
    const detail = readFileSync(new URL("../../services/[id]/page.tsx", import.meta.url), "utf8");
    expect(detail).toContain("service.comingSoon && !isFree");
    expect(detail).toContain("COMING_SOON.notice[locale]");
  });
});

describe("service detail beta affordance", () => {
  const detail = readFileSync(new URL("../../services/[id]/page.tsx", import.meta.url), "utf8");

  it("decides eligibility on the server and passes only a boolean to the client", () => {
    expect(detail).toContain("checkAdminBetaAccess");
    expect(detail).toContain("betaMode={isFree}");
    // 베타 테스터도 같은 0원 패널을 쓰되, 자격은 서버에서 읽는다.
    expect(detail).toContain("checkBetaTesterAccess(adminClient");
    expect(detail).toContain("무료 이용 ${tester.remaining}/${tester.maxRuns}회 남음");
    // 허용 목록이나 UUID가 클라이언트로 나가면 안 된다.
    expect(detail).not.toContain("ADMIN_AI_BETA_USER_IDS");
  });

  it("shows a zero charge and says no checkout window opens", () => {
    // 플래그가 켜졌는데 화면이 55,000원 결제 버튼이면 관리자가 실수로 결제를 시도한다.
    expect(detail).toContain("관리자 테스트 청구액");
    expect(detail).toContain("결제 창은 열리지 않습니다");
    expect(detail).toContain("관리자 베타 테스트");
  });

  it("labels the CTA as a test rather than a payment", () => {
    expect(checkout).toContain("베타 테스트 시작");
    expect(checkout).toContain("Start beta test");
    expect(checkout).toContain("결제·환불 대상이 아닙니다");
  });
});
