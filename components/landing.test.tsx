import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./landing.tsx", import.meta.url), "utf8");

describe("landing header", () => {
  it("enables the landing-only navigation", () => {
    expect(source).toContain("<SiteHeader locale={locale} landing />");
  });

  it("does not show the demo dashboard CTA", () => {
    expect(source).not.toContain("m.hero.secondaryCta");
    expect(source).not.toContain('localizedPath("/dashboard", locale)');
  });
});
