import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { ServiceCard } from "@/components/service-card";
import { getAiAgentService } from "@/lib/ai-agent-services";

vi.stubGlobal("React", React);

describe("ServiceCard", () => {
  it("shows AI deliverables and VAT without repeating provider metadata", () => {
    const service = getAiAgentService("ai-market-intelligence", "en");

    expect(service).toBeDefined();
    const html = renderToStaticMarkup(<ServiceCard service={service!} locale="en" />);

    expect(html).not.toContain("GPT-5.6 Sol");
    expect(html).not.toContain("Evidence-led analysis");
    expect(html).toContain("Market and ICP comparison");
    expect(html).toContain("VAT excluded");
  });

  it("uses generic frontier-model copy across the public AI service journey", () => {
    const publicSources = [
      "app/services/page.tsx",
      "app/services/[id]/page.tsx",
      "components/ai-agent-workspace.tsx"
    ].map((file) => readFileSync(resolve(process.cwd(), file), "utf8")).join("\n");

    expect(publicSources).not.toMatch(/GPT-5\.6 Sol/i);
    expect(publicSources).toContain("진단에서 부족했던 부분을 AI 전문가가 채웁니다");
    expect(publicSources).toContain("프론티어 모델");
    expect(publicSources).toContain("frontier model");
  });

  it("separates specialists and packages in a responsive catalog", () => {
    const source = readFileSync(resolve(process.cwd(), "app/services/page.tsx"), "utf8");
    const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

    expect(source).toContain("필요한 항목만 골라 진행하세요");
    expect(source).toContain("여러 항목을 묶어 한 번에 진행하세요");
    expect(css).toContain(".service-catalog-section .service-grid");
    expect(css).toContain("repeat(auto-fit, minmax(min(100%, 320px), 1fr))");
  });
});
