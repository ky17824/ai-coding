import { describe, expect, it } from "vitest";
import { BETA_FREE_RUNS, BETA_TESTER_PRODUCT_ID, MAX_BETA_TESTERS, buildBetaInvitation, isFreeBilling, normalizeBetaEmail, resolveBetaTesterAccess } from "@/lib/beta-testers";

describe("beta tester access", () => {
  const base = { registered: true, revoked: false, maxRuns: 3, usedRuns: 1, productId: BETA_TESTER_PRODUCT_ID };
  it("opens only registered, unrevoked emails for the market research product with runs left", () => {
    expect(resolveBetaTesterAccess(base)).toEqual({ eligible: true, remaining: 2, maxRuns: 3, usedRuns: 1 });
    expect(resolveBetaTesterAccess({ ...base, registered: false })).toEqual({ eligible: false, denial: "not_registered" });
    expect(resolveBetaTesterAccess({ ...base, revoked: true })).toEqual({ eligible: false, denial: "revoked" });
    expect(resolveBetaTesterAccess({ ...base, productId: "ai-entry-requirements" })).toEqual({ eligible: false, denial: "not_beta_product" });
    expect(resolveBetaTesterAccess({ ...base, usedRuns: 3 })).toEqual({ eligible: false, denial: "quota_exhausted" });
    // max_runs 0 = 등록만 하고 아직 열지 않음.
    expect(resolveBetaTesterAccess({ ...base, maxRuns: 0, usedRuns: 0 })).toEqual({ eligible: false, denial: "quota_exhausted" });
  });

  it("treats both free billing modes alike and normalizes emails to the DB key form", () => {
    expect(isFreeBilling("admin_beta")).toBe(true);
    expect(isFreeBilling("beta_tester")).toBe(true);
    expect(isFreeBilling("paid")).toBe(false);
    expect(isFreeBilling(null)).toBe(false);
    expect(normalizeBetaEmail("  Foo@Bar.COM ")).toBe("foo@bar.com");
    expect(MAX_BETA_TESTERS).toBe(10);
    expect(BETA_FREE_RUNS).toBe(3);
  });

  it("writes an invitation that thanks, explains the free runs, asks for feedback, and links the survey", () => {
    const text = buildBetaInvitation({ serviceUrl: "https://global-gtm.vercel.app/services/ai-market-intelligence", formUrl: "https://forms.gle/x", locale: "ko" });
    expect(text).toContain("감사합니다");
    expect(text).toContain("3회");
    expect(text).toContain("이 이메일 그대로");
    expect(text).toContain("https://forms.gle/x");
    expect(text).toContain("솔직할수록");
    // 링크가 없으면 설문 문장을 링크 없이 부드럽게 바꾼다(깨진 URL 없음).
    expect(buildBetaInvitation({ serviceUrl: "https://x", formUrl: null, locale: "ko" })).not.toContain("설문:");
  });
});
