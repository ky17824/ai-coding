import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/en/services" }));
vi.stubGlobal("React", React);

import { LanguageSwitcher } from "@/components/language-switcher";

describe("LanguageSwitcher", () => {
  it("stores a manual language choice before navigating", () => {
    vi.stubGlobal("document", { cookie: "" });
    const switcher = LanguageSwitcher({ locale: "en" });
    const koreanLink = React.Children.toArray(switcher.props.children)
      .find((child): child is React.ReactElement<{ href: string; onClick?: () => void }> =>
        React.isValidElement<{ href: string; onClick?: () => void }>(child)
          && child.props.href === "/services"
      );

    expect(koreanLink?.props.onClick).toBeTypeOf("function");
    koreanLink?.props.onClick?.();
    expect(document.cookie).toContain("borderless_locale=ko");
  });
});
