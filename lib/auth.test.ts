import { describe, expect, it } from "vitest";
import { appOrigin, dashboardPathForRole, safeNextPath } from "@/lib/auth";

it("uses the current Vercel preview deployment for email callbacks", () => {
  const previousEnv = process.env.VERCEL_ENV;
  const previousUrl = process.env.VERCEL_BRANCH_URL;
  process.env.VERCEL_ENV = "preview";
  process.env.VERCEL_BRANCH_URL = "preview.example.vercel.app";
  expect(appOrigin()).toBe("https://preview.example.vercel.app");
  if (previousEnv === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = previousEnv;
  if (previousUrl === undefined) delete process.env.VERCEL_BRANCH_URL;
  else process.env.VERCEL_BRANCH_URL = previousUrl;
});

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
