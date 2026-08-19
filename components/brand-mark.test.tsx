import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { BrandMark } from "@/components/brand-mark";

vi.stubGlobal("React", React);

describe("BrandMark", () => {
  it("renders the mascot file as a decorative 32px image", () => {
    const html = renderToStaticMarkup(<BrandMark className="brand-mark" />);
    expect(html).toContain('width="32"');
    expect(html).toContain('alt=""');
    expect(html).toContain("brand-mark.png");
  });

  it("replaces every old 'B' tile — header and auth pages", () => {
    for (const file of ["components/site-header.tsx", "app/signup/page.tsx", "app/signin/page.tsx", "app/reset-password/page.tsx", "app/reset-password/update/page.tsx"]) {
      const source = readFileSync(file, "utf8");
      expect(source, file).toContain('<BrandMark className="brand-mark" />');
      expect(source, file).not.toContain('"brand-mark">B<');
    }
  });
});
