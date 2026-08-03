import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PasswordUpdateForm } from "@/components/reset-password-forms";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "새 비밀번호" };

export default async function UpdatePasswordPage() {
  if (!(await requireUser())) redirect("/reset-password");
  return (
    <main className="signin-page">
      <Link href="/" className="brand"><span className="brand-mark">B</span><span>Borderless</span></Link>
      <section className="signin-panel panel">
        <span className="page-kicker">NEW PASSWORD</span>
        <h1>새 비밀번호를 입력하세요.</h1>
        <PasswordUpdateForm />
      </section>
    </main>
  );
}
