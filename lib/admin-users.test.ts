import { describe, expect, it } from "vitest";
import {
  filterAdminUsers,
  normalizeAuthProviders,
  parseAdminRoleChange,
  roleChangeErrorMessage,
  type AdminUserRow
} from "@/lib/admin-users";

const users: AdminUserRow[] = [
  {
    id: "admin",
    email: "owner@example.com",
    displayName: "Owner",
    organizationName: "Borderless",
    role: "admin",
    adminPurpose: "primary",
    providers: ["email", "google"],
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    lastSignInAt: "2026-08-15T00:00:00.000Z"
  },
  {
    id: "provider",
    email: "expert@example.com",
    displayName: "Expert",
    organizationName: "Tansley Korea",
    role: "provider",
    adminPurpose: null,
    providers: ["kakao"],
    status: "email_unconfirmed",
    createdAt: "2026-02-01T00:00:00.000Z",
    lastSignInAt: null
  }
];

describe("admin user operations", () => {
  it("normalizes authentication providers without exposing identity metadata", () => {
    expect(normalizeAuthProviders([
      { provider: "google" },
      { provider: "email" },
      { provider: "google" },
      { provider: "kakao" }
    ])).toEqual(["email", "google", "kakao"]);
  });

  it("filters by searchable identity and account attributes", () => {
    expect(filterAdminUsers(users, { q: "tansley", role: "provider" }).map((user) => user.id)).toEqual(["provider"]);
    expect(filterAdminUsers(users, { purpose: "primary" }).map((user) => user.id)).toEqual(["admin"]);
    expect(filterAdminUsers(users, { status: "email_unconfirmed" }).map((user) => user.id)).toEqual(["provider"]);
  });

  it("sorts recent sign-ins first while keeping users without a sign-in last", () => {
    expect(filterAdminUsers(users, { sort: "last_sign_in" }).map((user) => user.id)).toEqual(["admin", "provider"]);
  });

  it("maps database role-change failures to actionable safe messages", () => {
    expect(roleChangeErrorMessage("last_admin", "ko")).toContain("다른 관리자");
    expect(roleChangeErrorMessage("internal database details", "en")).toBe("We couldn't change this user's access. Please try again.");
  });

  it("validates the role-change trust boundary before calling the database", () => {
    expect(parseAdminRoleChange({
      targetUserId: "550e8400-e29b-41d4-a716-446655440000",
      role: "admin",
      adminPurpose: "recovery",
      reason: "비상 복구용 관리자 계정으로 지정합니다.",
      confirmed: "on"
    }).success).toBe(true);
    expect(parseAdminRoleChange({
      targetUserId: "550e8400-e29b-41d4-a716-446655440000",
      role: "startup",
      adminPurpose: "primary",
      reason: "일반 사용자 역할로 변경합니다.",
      confirmed: "on"
    }).success).toBe(false);
    expect(parseAdminRoleChange({
      targetUserId: "550e8400-e29b-41d4-a716-446655440000",
      role: "admin",
      adminPurpose: "primary",
      reason: "주 관리자 권한으로 변경합니다.",
      confirmed: ""
    }).success).toBe(false);
    expect(parseAdminRoleChange({
      targetUserId: "550e8400-e29b-41d4-a716-446655440000",
      role: "admin",
      adminPurpose: "",
      reason: "관리자 역할로 변경합니다.",
      confirmed: "on"
    }).success).toBe(false);
  });
});
