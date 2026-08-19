import { describe, expect, it } from "vitest";
import { BETA_TESTER_PRODUCT_ID, isFreeBilling, normalizeBetaEmail, resolveBetaTesterAccess } from "@/lib/beta-testers";

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
  });
});
