import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PasswordUpdateForm } from "@/components/reset-password-forms";
import { requireUser } from "@/lib/supabase/server";
import { getRequestLocale } from "@/lib/i18n-server";
import { localizedPath } from "@/lib/i18n";

export const metadata: Metadata = { title: "새 비밀번호" };

export default async function UpdatePasswordPage() {
  const locale = await getRequestLocale();
  if (!(await requireUser())) redirect(localizedPath("/reset-password", locale));
  const c = locale === "en"
    ? { title: "New password", heading: "Choose a new password." }
    : { title: "새 비밀번호", heading: "새 비밀번호를 입력하세요." };
  return (
    <main className="signin-page">
      <title>{c.title}</title>
      <Link href={localizedPath("/", locale)} className="brand"><span className="brand-mark">B</span><span>Borderless</span></Link>
      <section className="signin-panel panel">
        <span className="page-kicker">NEW PASSWORD</span>
        <h1>{c.heading}</h1>
        <PasswordUpdateForm locale={locale} />
      </section>
    </main>
  );
}
