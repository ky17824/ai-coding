import { describe, expect, it } from "vitest";
import { findAllowedInviteCode } from "./invites";

describe("findAllowedInviteCode", () => {
  it("accepts a per-user invite without relying on a browser cookie", () => {
    expect(
      findAllowedInviteCode(["GTM-BETA-2026", undefined], ["GTM-BETA-2026"])
    ).toBe("GTM-BETA-2026");
    expect(findAllowedInviteCode(["wrong"], ["GTM-BETA-2026"])).toBeUndefined();
  });
});
