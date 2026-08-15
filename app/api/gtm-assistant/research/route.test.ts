import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

describe("market research readiness scope", () => {
  it("does not use a fixed answer count", () => {
    expect(source).toContain("getMarketResearchScope");
    expect(source).not.toContain("length === 55");
    expect(source).toContain("survey_version,sales_motion");
  });
});
