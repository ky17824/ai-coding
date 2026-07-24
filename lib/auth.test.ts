import { describe, expect, it } from "vitest";
import { dashboardPathForRole } from "@/lib/auth";

describe("post-login destination", () => {
  it("sends only administrators to the admin dashboard", () => {
    expect(dashboardPathForRole("admin")).toBe("/admin");
    expect(dashboardPathForRole("startup")).toBe("/dashboard");
    expect(dashboardPathForRole("provider")).toBe("/dashboard");
    expect(dashboardPathForRole()).toBe("/dashboard");
  });
});
