import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

describe("AI GTM plan research guard", () => {
  it("rejects plan drafting when constraints changed after research", () => {
    expect(source).toContain("const constraintsMatch =");
    expect(source).toContain("!constraintsMatch ||");
  });
});
