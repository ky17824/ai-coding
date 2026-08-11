import { describe, expect, it } from "vitest";
import { matchExpertSupport } from "./expert-matching";

describe("expert matching", () => {
  it("recommends support for a paid pilot and maps it to GTM services", () => {
    expect(matchExpertSupport({
      title: "유료 PoC나 첫 주문을 만들고 고객이 투입한 비용·시간을 기록한다",
      serviceTag: "gtm"
    })).toEqual({ recommended: true, reason: "field_execution", tag: "gtm" });
  });

  it("maps regulated work to compliance services", () => {
    expect(matchExpertSupport({ title: "현지 인증 요건을 검토한다", serviceTag: "legal" }))
      .toEqual({ recommended: true, reason: "regulated", tag: "compliance" });
  });

  it("does not recommend an expert for an ordinary internal action", () => {
    expect(matchExpertSupport({ title: "주간 회의 일정을 정한다", serviceTag: "leadership" }).recommended)
      .toBe(false);
  });
});
