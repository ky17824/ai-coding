import { describe, expect, it, vi } from "vitest";
import * as React from "react";

vi.stubGlobal("React", React);

vi.mock("@/app/signin/actions", () => ({ signOut: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  getCurrentProfile: vi.fn()
}));

import { SiteHeader } from "@/components/site-header";

function findByClass(node: React.ReactNode, className: string): React.ReactElement<{ children?: React.ReactNode }> | undefined {
  if (React.isValidElement<{ className?: string; children?: React.ReactNode }>(node)) {
    if (node.props.className === className) return node;
    for (const child of React.Children.toArray(node.props.children)) {
      const match = findByClass(child, className);
      if (match) return match;
    }
  }
}

function directLinks(node: React.ReactElement<{ children?: React.ReactNode }> | undefined) {
  if (!node) throw new Error("Missing navigation container");
  return React.Children.toArray(node.props.children)
    .filter((child): child is React.ReactElement<{ href: string; children: React.ReactNode }> =>
      React.isValidElement(child) && typeof child.props === "object" && child.props !== null && "href" in child.props
    )
    .map((link) => ({ href: link.props.href, label: link.props.children }));
}

describe("site header shell", () => {
  it("returns the navigation shell without waiting for account data", () => {
    expect(SiteHeader({ locale: "ko" })).not.toBeInstanceOf(Promise);
  });

  it("mounts the active-service slot in the app navigation but not on the landing header", () => {
    // 랜딩은 로그인 전 화면이라 알약 슬롯 자체를 두지 않는다. directLinks는 href 없는 자식을 무시하므로 자식 수로 잠근다.
    const count = (header: React.ReactElement, className: string) => React.Children.toArray(findByClass(header, className)?.props.children).filter(Boolean).length;
    expect(count(SiteHeader({ locale: "ko" }) as React.ReactElement, "main-nav")).toBe(5); // 4 links + slot
    expect(count(SiteHeader({ locale: "ko", landing: true }) as React.ReactElement, "main-nav")).toBe(2); // 2 links, no slot
  });

  it("shows the assessment assistant only in the dashboard desktop navigation", () => {
    const header = SiteHeader({ locale: "ko", assistantHref: "/assistant/assessment-1" });

    expect(directLinks(findByClass(header, "main-nav"))).toEqual([
      { href: "/dashboard", label: "대시보드" },
      { href: "/assessment", label: "준비도 진단" },
      { href: "/assistant/assessment-1", label: "AI GTM 어시스턴트" },
      { href: "/journey", label: "GTM 여정" },
      { href: "/services", label: "AI 전문가 서비스" }
    ]);
    expect(directLinks(findByClass(header, "mobile-nav__menu"))).not.toContainEqual(
      expect.objectContaining({ href: "/assistant/assessment-1" })
    );
  });

  it("localizes the desktop assistant link without adding it by default", () => {
    const dashboardHeader = SiteHeader({ locale: "en", assistantHref: "/assistant/assessment-1" });
    const otherHeader = SiteHeader({ locale: "ko" });

    expect(directLinks(findByClass(dashboardHeader, "main-nav"))).toContainEqual({
      href: "/en/assistant/assessment-1",
      label: "AI GTM Assistant"
    });
    expect(directLinks(findByClass(otherHeader, "main-nav"))).not.toContainEqual(
      expect.objectContaining({ label: "AI GTM 어시스턴트" })
    );
  });

  it("limits landing desktop and mobile navigation to assessment and AI expert services", () => {
    const koHeader = SiteHeader({ locale: "ko", landing: true });
    const enHeader = SiteHeader({ locale: "en", landing: true });
    const koLinks = [
      { href: "/assessment", label: "준비도 진단" },
      { href: "/services", label: "AI 전문가 서비스" }
    ];
    const enLinks = [
      { href: "/en/assessment", label: "Assessment" },
      { href: "/en/services", label: "AI Expert Services" }
    ];

    expect(directLinks(findByClass(koHeader, "main-nav"))).toEqual(koLinks);
    expect(directLinks(findByClass(koHeader, "mobile-nav__menu"))).toEqual(koLinks);
    expect(directLinks(findByClass(enHeader, "main-nav"))).toEqual(enLinks);
    expect(directLinks(findByClass(enHeader, "mobile-nav__menu"))).toEqual(enLinks);
  });
});
