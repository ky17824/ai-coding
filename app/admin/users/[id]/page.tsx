import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { AdminRoleForm } from "@/components/admin-role-form";
import { SiteHeader } from "@/components/site-header";
import { normalizeAuthProviders, type AdminAccountPurpose, type AdminUserRole } from "@/lib/admin-users";
import { localizedPath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import { createSupabaseAdminClient, getCurrentProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getRequestLocale()) === "en" ? "User Details" : "사용자 상세" };
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

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ user: actor, profile: actorProfile }, locale, { id }] = await Promise.all([getCurrentProfile(), getRequestLocale(), params]);
  const en = locale === "en";
  if (!actor || actorProfile?.role !== "admin" || actorProfile.deleted_at) redirect(localizedPath("/dashboard", locale));
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("Supabase admin client is not configured");

  const [profileResult, authResult, auditResult, adminCountResult] = await Promise.all([
    admin.from("profiles").select("id,email,display_name,role,admin_account_purpose,created_at,deleted_at,organizations(name)").eq("id", id).maybeSingle(),
    admin.auth.admin.getUserById(id),
    admin.from("admin_role_audit_log").select("id,actor_id,previous_role,new_role,previous_admin_purpose,new_admin_purpose,reason,created_at").eq("subject_id", id).order("created_at", { ascending: false }),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin").is("deleted_at", null)
  ]);
  if (profileResult.error || auditResult.error || adminCountResult.error) throw new Error("Unable to load admin user details");
  if (!profileResult.data) notFound();
  const subject = profileResult.data as ProfileRecord;
  if (authResult.error && !subject.deleted_at) throw new Error("Unable to load authentication details");
  const auditRows = auditResult.data ?? [];
  const actorIds = [...new Set(auditRows.map((entry) => entry.actor_id))];
  const actorProfiles = actorIds.length ? await admin.from("profiles").select("id,display_name,email").in("id", actorIds) : { data: [] };
  const actors = new Map((actorProfiles.data ?? []).map((entry) => [entry.id, entry]));
  const authUser = authResult.data.user ?? null;
  const organization = Array.isArray(subject.organizations) ? subject.organizations[0]?.name : subject.organizations?.name;
  const providers = normalizeAuthProviders(authUser?.identities);
  const dateLocale = en ? "en-US" : "ko-KR";
  const roleText = (role: string) => en ? ({ startup: "Founder", provider: "Expert", admin: "Administrator" }[role] ?? role) : ({ startup: "창업자", provider: "전문가", admin: "관리자" }[role] ?? role);
  const purposeText = (purpose: string | null) => purpose === "primary" ? (en ? "Primary administrator" : "주 관리자") : purpose === "recovery" ? (en ? "Recovery administrator" : "복구 관리자") : (en ? "Unspecified" : "용도 미지정");
  const self = actor.id === subject.id;
  const disabledReason = self ? (en ? "Another administrator must change the current account." : "현재 로그인한 계정의 권한은 다른 관리자가 변경해야 합니다.") : subject.deleted_at ? (en ? "Closed accounts are read-only." : "탈퇴한 계정은 조회만 할 수 있습니다.") : undefined;

  return (
    <main className="app-page">
      <SiteHeader compact locale={locale} />
      <div className="app-container admin-user-detail-page">
        <span className="page-kicker">USER OPERATIONS</span>
        <h1 className="page-title">{subject.display_name}</h1>
        <p className="page-description">{subject.email}</p>
        <AdminNav locale={locale} />

        <section className="company-summary panel admin-user-summary">
          <div><span>{en ? "Role" : "역할"}</span><strong>{roleText(subject.role)}</strong><small>{subject.role === "admin" ? purposeText(subject.admin_account_purpose) : "-"}</small></div>
          <div><span>{en ? "Organization" : "조직"}</span><strong>{organization ?? "-"}</strong><small>{subject.deleted_at ? (en ? "Closed" : "탈퇴") : (en ? "Active" : "활성")}</small></div>
          <div><span>{en ? "Authentication" : "인증"}</span><strong>{providers.join(" · ") || "-"}</strong><small>{authUser?.email_confirmed_at ? (en ? "Email confirmed" : "이메일 확인") : (en ? "Email unconfirmed" : "이메일 미확인")}</small></div>
          <div><span>{en ? "Joined" : "가입일"}</span><strong>{new Date(subject.created_at).toLocaleDateString(dateLocale)}</strong><small>{en ? "Last sign-in" : "최근 로그인"}: {authUser?.last_sign_in_at ? new Date(authUser.last_sign_in_at).toLocaleDateString(dateLocale) : "-"}</small></div>
        </section>

        <section className="admin-section panel admin-access-panel">
          <span className="page-kicker">ACCESS CONTROL</span>
          <h2>{en ? "Role and administrator purpose" : "역할 및 관리자 계정 용도"}</h2>
          <p>{en ? "Access changes are atomic and retained in an immutable audit history." : "권한 변경은 원자적으로 처리되며 수정할 수 없는 감사 이력에 남습니다."}</p>
          <AdminRoleForm locale={locale} targetUserId={subject.id} currentRole={subject.role} currentPurpose={subject.admin_account_purpose} canDemote={(adminCountResult.count ?? 0) > 1} disabledReason={disabledReason} />
        </section>

        <section className="admin-section">
          <h2>{en ? "Access audit history" : "권한 변경 이력"}</h2>
          {!auditRows.length ? <div className="empty-state panel"><strong>{en ? "No access changes have been recorded." : "기록된 권한 변경이 없습니다."}</strong></div> : <div className="admin-audit-list">{auditRows.map((entry) => { const auditActor = actors.get(entry.actor_id); return <article className="panel" key={entry.id}><div><strong>{roleText(entry.previous_role)} → {roleText(entry.new_role)}</strong><time>{new Date(entry.created_at).toLocaleString(dateLocale)}</time></div><p>{entry.reason}</p><small>{en ? "Administrator" : "실행 관리자"}: {auditActor?.display_name ?? auditActor?.email ?? entry.actor_id}</small>{(entry.previous_admin_purpose || entry.new_admin_purpose) && <small>{en ? "Purpose" : "관리자 용도"}: {purposeText(entry.previous_admin_purpose)} → {purposeText(entry.new_admin_purpose)}</small>}</article>; })}</div>}
        </section>
      </div>
    </main>
  );
}
