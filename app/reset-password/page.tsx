import type { Metadata } from "next";
import Link from "next/link";
import { ResetRequestForm } from "@/components/reset-password-forms";
import { getRequestLocale } from "@/lib/i18n-server";
import { localizedPath } from "@/lib/i18n";

export default async function ResetPasswordPage() {
  const locale = await getRequestLocale();
  const c = locale === "en"
    ? { title: "Reset password", heading: "Reset your password.", body: "We'll send a secure reset link to the email address on your account." }
    : { title: "비밀번호 재설정", heading: "비밀번호를 다시 설정하세요.", body: "가입한 이메일로 안전한 재설정 링크를 보냅니다." };
  return (
    <main className="signin-page">
      <title>{c.title}</title>
      <Link href={localizedPath("/", locale)} className="brand"><span className="brand-mark">B</span><span>Borderless</span></Link>
      <section className="signin-panel panel">
        <span className="page-kicker">RESET PASSWORD</span>
        <h1>{c.heading}</h1>
        <p>{c.body}</p>
        <ResetRequestForm locale={locale} />
      </section>
    </main>
  );
}
