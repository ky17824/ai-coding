import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import Loading from "@/app/loading";

vi.stubGlobal("React", React);

describe("route loading shell", () => {
  it("announces navigation progress while a dynamic page is loading", () => {
    const html = renderToStaticMarkup(<Loading />);

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  });
});
