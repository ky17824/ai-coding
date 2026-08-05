import { describe, expect, it } from "vitest";
import { applyOffering } from "./intake-questions";

describe("applyOffering", () => {
  it("모를 때는 그대로 둔다", () => {
    expect(applyOffering("우리 제품/서비스가 통하나요?", "both")).toBe("우리 제품/서비스가 통하나요?");
  });
  it("제품으로 좁히면 조사도 받침에 맞춘다", () => {
    expect(applyOffering("우리 제품/서비스가 통하나요?", "product")).toBe("우리 제품이 통하나요?");
    expect(applyOffering("제품/서비스를 쓰다가", "product")).toBe("제품을 쓰다가");
    expect(applyOffering("제품/서비스는 무엇인가요", "product")).toBe("제품은 무엇인가요");
  });
  it("서비스로 좁히면 조사는 그대로다", () => {
    expect(applyOffering("우리 제품/서비스가 통하나요?", "service")).toBe("우리 서비스가 통하나요?");
    expect(applyOffering("제품/서비스를 쓰다가", "service")).toBe("서비스를 쓰다가");
  });
  it("조사가 없어도 바꾼다", () => {
    expect(applyOffering("국가·고객군·제품/서비스 범위", "service")).toBe("국가·고객군·서비스 범위");
  });
});
