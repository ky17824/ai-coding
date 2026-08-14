import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("journey AI expert recommendations", () => {
  it("places matched AI expert services after the journey board", () => {
    expect(source).toContain("ServiceCard");
    expect(source).toContain("getPublishedServices");
    expect(source).toContain("추천 AI 전문가");
    expect(source).toContain("journey-recommendations");
    expect(source.indexOf("journey-recommendations")).toBeGreaterThan(source.lastIndexOf("journey-board"));
  });
});
