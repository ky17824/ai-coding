import { describe, expect, it } from "vitest";
import { countAtTime } from "@/components/count-up";

describe("countAtTime", () => {
  it("counts up once, then follows the chart's 3.6-second sway", () => {
    expect(countAtTime(68, 0, 1500)).toBe(0);
    expect(countAtTime(68, 1500, 1500)).toBe(68);
    expect(countAtTime(68, 3300, 1500)).toBe(63);
    expect(countAtTime(68, 5100, 1500)).toBe(68);
  });
});
