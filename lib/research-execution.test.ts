import { describe, expect, it } from "vitest";
import { ResearchDeadlineError, stageTimeoutMs } from "./research-execution";

describe("market research execution deadline", () => {
  it("caps a stage while preserving time for persistence", () => {
    expect(stageTimeoutMs({ deadlineAt: 300_000, now: 100_000, stageCapMs: 160_000, reserveMs: 25_000 })).toBe(160_000);
    expect(stageTimeoutMs({ deadlineAt: 300_000, now: 150_000, stageCapMs: 160_000, reserveMs: 25_000 })).toBe(125_000);
  });

  it("fails before the platform deadline when no stage budget remains", () => {
    expect(() => stageTimeoutMs({ deadlineAt: 300_000, now: 280_000, stageCapMs: 55_000, reserveMs: 25_000 }))
      .toThrow(ResearchDeadlineError);
  });
});
