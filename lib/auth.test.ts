import { describe, expect, it } from "vitest";
import {
  appOrigin,
  authErrorMessage,
  dashboardPathForRole,
  passwordResetErrorMessage,
  safeNextPath
} from "@/lib/auth";

it("maps OAuth errors to safe Korean messages", () => {
  expect(authErrorMessage("oauth_cancelled")).toContain("완료되지 않았습니다");
  expect(authErrorMessage("email_required")).toContain("이메일 제공");
  expect(authErrorMessage("raw-provider-message")).not.toContain("raw-provider-message");
});

it("reports actionable password reset email failures", () => {
  expect(passwordResetErrorMessage({ status: 429 })).toContain("한도");
  expect(passwordResetErrorMessage({ code: "email_address_not_authorized" })).toContain("설정");
  expect(passwordResetErrorMessage({ code: "unexpected" })).toContain("보내지 못했습니다");
  expect(passwordResetErrorMessage(null)).toBeNull();
});

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
