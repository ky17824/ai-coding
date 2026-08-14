import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./landing.tsx", import.meta.url), "utf8");

describe("landing header", () => {
  it("enables the landing-only navigation", () => {
    expect(source).toContain("<SiteHeader locale={locale} landing />");
  });
});
