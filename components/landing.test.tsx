import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./landing.tsx", import.meta.url), "utf8");
const messages = readFileSync(new URL("../lib/i18n.ts", import.meta.url), "utf8");

describe("landing header", () => {
  it("enables the landing-only navigation", () => {
    expect(source).toContain("<SiteHeader locale={locale} landing />");
  });

  it("does not show the demo dashboard CTA", () => {
    expect(source).not.toContain("m.hero.secondaryCta");
    expect(source).not.toContain('localizedPath("/dashboard", locale)');
  });

  it("links the localized AI expert CTA to the service catalog", () => {
    expect(source).toContain('localizedPath("/services", locale)');
    expect(messages).toContain("AI 전문가가 진출 과제를 해결합니다");
    expect(messages).toContain("AI experts solve your market-entry tasks");
  });
});
