import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { SiteHeader } from "@/components/site-header";
import {
  filterAdminUsers,
  normalizeAuthProviders,
  type AdminAccountPurpose,
  type AdminUserRole,
  type AdminUserRow
} from "@/lib/admin-users";
import { localizedPath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import { createSupabaseAdminClient, getCurrentProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getRequestLocale()) === "en" ? "User Operations" : "사용자 관리" };
}

type ProfileRecord = {
  id: string;
  email: string;
  display_name: string;
  role: AdminUserRole;
  admin_account_purpose: AdminAccountPurpose;
  created_at: string;
  deleted_at: string | null;
  organizations: { name: string } | { name: string }[] | null;
};

function organizationName(value: ProfileRecord["organizations"]) {
  return Array.isArray(value) ? value[0]?.name ?? null : value?.name ?? null;
}

export default async function AdminUsersPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string; purpose?: string; sort?: string }>;
}) {
  const [{ user: actor, profile }, locale, query] = await Promise.all([getCurrentProfile(), getRequestLocale(), searchParams]);
  const en = locale === "en";
  if (!actor || profile?.role !== "admin" || profile.deleted_at) redirect(localizedPath("/dashboard", locale));
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("Supabase admin client is not configured");

  const [profilesResult, authResult] = await Promise.all([
    admin.from("profiles").select("id,email,display_name,role,admin_account_purpose,created_at,deleted_at,organizations(name)").order("created_at", { ascending: false }),
    // ponytail: beta-scale single page; paginate when the account count approaches the provider limit.
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  ]);
  if (profilesResult.error || authResult.error) throw new Error("Unable to load admin users");
  const authById = new Map(authResult.data.users.map((entry) => [entry.id, entry]));
  const users: AdminUserRow[] = ((profilesResult.data ?? []) as ProfileRecord[]).map((entry) => {
    const authUser = authById.get(entry.id);
    return {
      id: entry.id,
      email: entry.email,
      displayName: entry.display_name,
      organizationName: organizationName(entry.organizations),
      role: entry.role,
      adminPurpose: entry.admin_account_purpose,
      providers: normalizeAuthProviders(authUser?.identities),
      status: entry.deleted_at ? "deleted" : authUser?.email_confirmed_at ? "active" : "email_unconfirmed",
      createdAt: entry.created_at,
      lastSignInAt: authUser?.last_sign_in_at ?? null
    };
  });
  const shown = filterAdminUsers(users, query);
  const activeUsers = users.filter((entry) => entry.status !== "deleted");
  const activeAdmins = activeUsers.filter((entry) => entry.role === "admin");
  const dateLocale = en ? "en-US" : "ko-KR";
  const roleText = (role: AdminUserRole) => en ? ({ startup: "Founder", provider: "Expert", admin: "Administrator" }[role]) : ({ startup: "창업자", provider: "전문가", admin: "관리자" }[role]);
  const purposeText = (purpose: AdminAccountPurpose) => purpose === "primary" ? (en ? "Primary" : "주 관리자") : purpose === "recovery" ? (en ? "Recovery" : "복구 관리자") : "-";
  const statusText = (status: AdminUserRow["status"]) => en ? ({ active: "Active", email_unconfirmed: "Email unconfirmed", deleted: "Closed" }[status]) : ({ active: "활성", email_unconfirmed: "이메일 미확인", deleted: "탈퇴" }[status]);

  return (
    <main className="app-page">
      <SiteHeader compact locale={locale} />
      <div className="app-container admin-users-page">
        <span className="page-kicker">USER OPERATIONS</span>
        <h1 className="page-title">{en ? "User management" : "사용자 관리"}</h1>
        <p className="page-description">{en ? "Review account status and roles, and manage administrator access with an audit trail." : "가입 상태와 역할을 확인하고 플랫폼 관리자 권한 변경 이력을 관리합니다."}</p>
        <AdminNav locale={locale} />

        <div className="admin-metrics">
          {[
            [en ? "Active users" : "활성 사용자", activeUsers.length],
            [en ? "Administrators" : "플랫폼 관리자", activeAdmins.length],
            [en ? "Recovery administrators" : "복구 관리자", activeAdmins.filter((entry) => entry.adminPurpose === "recovery").length],
            [en ? "Closed accounts" : "탈퇴·비활성", users.filter((entry) => entry.status === "deleted").length]
          ].map(([label, value]) => <div className="panel" key={label}><span>{label}</span><strong>{value}</strong></div>)}
        </div>
        {activeAdmins.length < 2 && <p className="notice-banner notice-banner--error" role="alert">{en ? "There is no recovery administrator. Losing access to the primary account would block operations access." : "복구 관리자 계정이 없습니다. 주 관리자 접근을 잃으면 플랫폼 운영 화면에 접근할 수 없습니다."}</p>}

        <section className="admin-section">
          <div className="section-heading section-heading--row"><span><h2>{en ? "Users" : "사용자 목록"}</h2></span><span>{shown.length}</span></div>
          <form className="admin-filters admin-user-filters">
            <input aria-label={en ? "Search users" : "사용자 검색"} name="q" defaultValue={query.q} maxLength={120} placeholder={en ? "Search email, name, or organization" : "이메일·이름·조직 검색"} />
            <select aria-label={en ? "Filter by role" : "역할 필터"} name="role" defaultValue={query.role ?? ""}><option value="">{en ? "All roles" : "전체 역할"}</option><option value="startup">{en ? "Founder" : "창업자"}</option><option value="provider">{en ? "Expert" : "전문가"}</option><option value="admin">{en ? "Administrator" : "관리자"}</option></select>
            <select aria-label={en ? "Filter by status" : "상태 필터"} name="status" defaultValue={query.status ?? ""}><option value="">{en ? "All statuses" : "전체 상태"}</option><option value="active">{en ? "Active" : "활성"}</option><option value="email_unconfirmed">{en ? "Email unconfirmed" : "이메일 미확인"}</option><option value="deleted">{en ? "Closed" : "탈퇴"}</option></select>
            <select aria-label={en ? "Filter by administrator purpose" : "관리자 용도 필터"} name="purpose" defaultValue={query.purpose ?? ""}><option value="">{en ? "All admin purposes" : "관리자 용도 전체"}</option><option value="primary">{en ? "Primary" : "주 관리자"}</option><option value="recovery">{en ? "Recovery" : "복구 관리자"}</option><option value="unspecified">{en ? "Unspecified" : "용도 미지정"}</option></select>
            <select aria-label={en ? "Sort users" : "사용자 정렬"} name="sort" defaultValue={query.sort ?? "last_sign_in"}><option value="last_sign_in">{en ? "Recent sign-in" : "최근 로그인순"}</option><option value="created">{en ? "Recent signup" : "최근 가입순"}</option><option value="name">{en ? "Name" : "이름순"}</option></select>
            <button className="button button--dark">{en ? "Apply" : "조회"}</button>
          </form>
          {!shown.length ? <div className="empty-state panel"><strong>{en ? "No users match these filters." : "조건에 맞는 사용자가 없습니다."}</strong><p><Link className="text-link" href={localizedPath("/admin/users", locale)}>{en ? "Clear filters" : "필터 초기화"}</Link></p></div> : <>
            <div className="table-scroll panel admin-user-table"><table className="admin-table"><thead><tr><th>{en ? "User" : "사용자"}</th><th>{en ? "Organization" : "조직"}</th><th>{en ? "Role" : "역할"}</th><th>{en ? "Admin purpose" : "관리자 용도"}</th><th>{en ? "Authentication" : "인증"}</th><th>{en ? "Status" : "상태"}</th><th>{en ? "Last sign-in" : "최근 로그인"}</th><th>{en ? "Action" : "작업"}</th></tr></thead><tbody>{shown.map((entry) => <tr key={entry.id}><td><strong>{entry.displayName}</strong><small>{entry.email}</small></td><td>{entry.organizationName ?? "-"}</td><td><span className={`admin-chip admin-chip--${entry.role}`}>{roleText(entry.role)}</span></td><td>{entry.role === "admin" && !entry.adminPurpose ? <span className="admin-chip admin-chip--warning">{en ? "Unspecified" : "용도 미지정"}</span> : purposeText(entry.adminPurpose)}</td><td>{entry.providers.join(" · ") || "-"}</td><td>{statusText(entry.status)}</td><td>{entry.lastSignInAt ? new Date(entry.lastSignInAt).toLocaleDateString(dateLocale) : "-"}</td><td><Link href={localizedPath(`/admin/users/${entry.id}`, locale)}>{en ? "Details" : "상세 보기"}</Link></td></tr>)}</tbody></table></div>
            <div className="admin-user-cards">{shown.map((entry) => <article className="panel" key={entry.id}><div><strong>{entry.displayName}</strong><span className={`admin-chip admin-chip--${entry.role}`}>{roleText(entry.role)}</span></div><p>{entry.email}</p><small>{entry.organizationName ?? "-"} · {statusText(entry.status)}</small><small>{en ? "Last sign-in" : "최근 로그인"}: {entry.lastSignInAt ? new Date(entry.lastSignInAt).toLocaleDateString(dateLocale) : "-"}</small><Link className="button button--ghost" href={localizedPath(`/admin/users/${entry.id}`, locale)}>{en ? "Details" : "상세 보기"}</Link></article>)}</div>
          </>}
        </section>
      </div>
    </main>
  );
}
