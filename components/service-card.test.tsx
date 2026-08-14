import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
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
});
