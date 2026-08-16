import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { ServiceCard } from "@/components/service-card";
import { getAiAgentService } from "@/lib/ai-agent-services";

vi.stubGlobal("React", React);

describe("ServiceCard", () => {
  it("does not expose the internal LLM model on AI service cards", () => {
    const service = getAiAgentService("ai-market-intelligence", "en");

    expect(service).toBeDefined();
    const html = renderToStaticMarkup(<ServiceCard service={service!} locale="en" />);

    expect(html).not.toContain("GPT-5.6 Sol");
    expect(html).toContain("Evidence-led analysis");
  });

  it("uses generic frontier-model copy across the public AI service journey", () => {
    const publicSources = [
      "app/services/page.tsx",
      "app/services/[id]/page.tsx",
      "components/ai-agent-workspace.tsx"
    ].map((file) => readFileSync(resolve(process.cwd(), file), "utf8")).join("\n");

    expect(publicSources).not.toMatch(/GPT-5\.6 Sol/i);
    expect(publicSources).toContain("준비도의 격차를 AI 전문가와 함께 줄여보세요");
    expect(publicSources).toContain("프론티어 모델");
    expect(publicSources).toContain("frontier model");
  });
});
