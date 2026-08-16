import { describe, expect, it } from "vitest";
import { parseAdminBetaUserIds, resolveAdminBetaAccess, type AdminBetaDenial } from "@/lib/admin-ai-beta";

const A = "eb62f83c-5ee1-4a3b-932c-ba4a8dd5876d";
const B = "5fc1ab2f-64ad-43c1-a20b-19b697be73d1";
const C = "11111111-2222-3333-4444-555555555555";

describe("parseAdminBetaUserIds", () => {
  it("accepts exactly two distinct uuids", () => {
    expect(parseAdminBetaUserIds(`${A},${B}`)).toEqual([A, B]);
    expect(parseAdminBetaUserIds(` ${A} , ${B} `)).toEqual([A, B]);
    expect(parseAdminBetaUserIds(`${A.toUpperCase()},${B}`)).toEqual([A, B]);
  });

  it("fails closed on anything else", () => {
    // 하나라도 어긋나면 목록 전체를 버린다. 부분 허용은 없다.
    for (const value of [
      undefined, "", "   ", A, `${A},${B},${C}`, `${A},${A}`, `${A},not-a-uuid`, `${A},`, ",", `${A};${B}`
    ]) {
      expect(parseAdminBetaUserIds(value), String(value)).toEqual([]);
    }
  });
});

describe("resolveAdminBetaAccess", () => {
  const allowed = { flag: "true", ids: `${A},${B}` };
  const activeAdmin = { role: "admin" as const, deletedAt: null };

  it("grants access only when every condition holds", () => {
    expect(resolveAdminBetaAccess({ ...allowed, userId: A, profile: activeAdmin, isAiProduct: true }))
      .toEqual({ eligible: true });
    expect(resolveAdminBetaAccess({ ...allowed, userId: B, profile: activeAdmin, isAiProduct: true }))
      .toEqual({ eligible: true });
  });

  it("names the reason it refused, so an operator can tell the causes apart", () => {
    const cases: Array<[string, Parameters<typeof resolveAdminBetaAccess>[0], AdminBetaDenial]> = [
      ["flag off", { ...allowed, flag: "false", userId: A, profile: activeAdmin, isAiProduct: true }, "flag_off"],
      ["flag absent", { ...allowed, flag: undefined, userId: A, profile: activeAdmin, isAiProduct: true }, "flag_off"],
      ["flag not exactly true", { ...allowed, flag: "TRUE", userId: A, profile: activeAdmin, isAiProduct: true }, "flag_off"],
      ["list unusable", { ...allowed, ids: `${A},${A}`, userId: A, profile: activeAdmin, isAiProduct: true }, "allowlist_unusable"],
      ["third admin", { ...allowed, userId: C, profile: activeAdmin, isAiProduct: true }, "not_in_allowlist"],
      ["founder", { ...allowed, userId: A, profile: { role: "startup", deletedAt: null }, isAiProduct: true }, "not_admin"],
      ["provider", { ...allowed, userId: A, profile: { role: "provider", deletedAt: null }, isAiProduct: true }, "not_admin"],
      ["closed admin", { ...allowed, userId: A, profile: { role: "admin", deletedAt: "2026-08-01" }, isAiProduct: true }, "not_admin"],
      ["missing profile", { ...allowed, userId: A, profile: null, isAiProduct: true }, "not_admin"],
      ["human product", { ...allowed, userId: A, profile: activeAdmin, isAiProduct: false }, "not_ai_product"]
    ];
    for (const [label, input, denial] of cases) {
      expect(resolveAdminBetaAccess(input), label).toEqual({ eligible: false, denial });
    }
  });

  it("refuses a human product even for a listed admin", () => {
    // route.ts:65의 역할 게이트는 AI 분기와 사람 분기를 모두 덮는다. 여기서 좁히지 않으면
    // 베타 관리자가 정가 사람 주문을 만들고 정산 의무까지 생긴다.
    const result = resolveAdminBetaAccess({ ...allowed, userId: A, profile: activeAdmin, isAiProduct: false });
    expect(result).toEqual({ eligible: false, denial: "not_ai_product" });
  });
});
