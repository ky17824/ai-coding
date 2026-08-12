import { describe, expect, it } from "vitest";
import { autoScrollDuration, autoScrollProgress } from "@/components/mobile-autoscroll";

describe("mobile auto-scroll timing", () => {
  it("keeps long pages slow and eases gently at both ends", () => {
    expect(autoScrollDuration(1200)).toBe(24000);
    expect(autoScrollDuration(2800)).toBe(40000);
    expect(autoScrollDuration(6000)).toBe(60000);
    expect(autoScrollProgress(0, 40000)).toBe(0);
    expect(autoScrollProgress(20000, 40000)).toBeCloseTo(0.5);
    expect(autoScrollProgress(40000, 40000)).toBe(1);
  });
});
