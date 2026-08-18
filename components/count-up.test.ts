import { describe, expect, it } from "vitest";
import { countAtTime } from "@/components/count-up";
import { READINESS_STAGES } from "@/components/readiness-preview";

describe("countAtTime", () => {
  it("eases both upward and downward score transitions to their target", () => {
    expect(READINESS_STAGES.map(({ score }) => score)).toEqual([32, 58, 74, 84]);
    expect(countAtTime(0, 62, 0, 1200)).toBe(0);
    expect(countAtTime(0, 62, 600, 1200)).toBe(54);
    expect(countAtTime(0, 62, 1200, 1200)).toBe(62);
    expect(countAtTime(84, 62, 600, 1200)).toBe(65);
    expect(countAtTime(84, 62, 1200, 1200)).toBe(62);
  });
});
