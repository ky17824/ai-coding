import { describe, expect, it } from "vitest";
import { dashboardPathForRole, safeNextPath } from "@/lib/auth";

describe("post-login destination", () => {
  it("sends only administrators to the admin dashboard", () => {
    expect(dashboardPathForRole("admin")).toBe("/admin");
    expect(dashboardPathForRole("startup")).toBe("/dashboard");
    expect(dashboardPathForRole("provider")).toBe("/dashboard");
    expect(dashboardPathForRole()).toBe("/dashboard");
  });
});

describe("safe post-auth destination", () => {
  it("keeps internal paths and rejects external redirects", () => {
    expect(safeNextPath("/assessment?resume=1")).toBe(
      "/assessment?resume=1"
    );
    expect(safeNextPath("https://evil.example")).toBe("/dashboard");
    expect(safeNextPath("//evil.example")).toBe("/dashboard");
    expect(safeNextPath("/\\evil.example")).toBe("/dashboard");
  });
});
