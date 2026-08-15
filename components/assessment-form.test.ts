import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./assessment-form.tsx", import.meta.url), "utf8");

describe("pending assessment resume", () => {
  it("submits the restored market and sales motion instead of stale React state", () => {
    expect(source).toContain("restoredContext?.targetMarket ?? targetMarket");
    expect(source).toContain("restoredContext?.salesMotion ?? salesMotion");
    expect(source).toContain("targetMarket: pending.targetMarket");
    expect(source).toContain('salesMotion: pending.salesMotion ?? "unknown"');
  });
});
