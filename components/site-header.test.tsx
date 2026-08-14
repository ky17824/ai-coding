import { describe, expect, it, vi } from "vitest";
import * as React from "react";

vi.stubGlobal("React", React);

vi.mock("@/app/signin/actions", () => ({ signOut: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  getCurrentProfile: vi.fn()
}));

import { SiteHeader } from "@/components/site-header";

describe("site header shell", () => {
  it("returns the navigation shell without waiting for account data", () => {
    expect(SiteHeader({ locale: "ko" })).not.toBeInstanceOf(Promise);
  });
});
