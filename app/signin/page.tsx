import type { Metadata } from "next";
import Link from "next/link";
import { SignInForm } from "@/components/signin-form";

export const metadata: Metadata = { title: "비공개 베타 로그인" };

export default function SignInPage() {
  return (
    <main className="signin-page">
      <Link href="/" className="brand">
        <span className="brand-mark">B</span>
        <span>Borderless</span>
      </Link>
      <section className="signin-panel panel">
        <span className="page-kicker">PRIVATE BETA</span>
        <h1>글로벌 진출 여정을 이어가세요.</h1>
        <p>
          초대받은 스타트업과 승인된 전문가만 참여할 수 있습니다. 비밀번호
          없이 안전한 이메일 링크로 로그인합니다.
        </p>
        <SignInForm />
      </section>
    </main>
  );
}
