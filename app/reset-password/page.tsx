import type { Metadata } from "next";
import Link from "next/link";
import { ResetRequestForm } from "@/components/reset-password-forms";

export const metadata: Metadata = { title: "비밀번호 재설정" };

export default function ResetPasswordPage() {
  return (
    <main className="signin-page">
      <Link href="/" className="brand"><span className="brand-mark">B</span><span>Borderless</span></Link>
      <section className="signin-panel panel">
        <span className="page-kicker">RESET PASSWORD</span>
        <h1>비밀번호를 다시 설정하세요.</h1>
        <p>가입한 이메일로 안전한 재설정 링크를 보냅니다.</p>
        <ResetRequestForm />
      </section>
    </main>
  );
}
