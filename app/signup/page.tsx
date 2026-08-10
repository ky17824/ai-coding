import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/signup-form";
import { safeNextPath } from "@/lib/auth";

export const metadata: Metadata = { title: "회원가입" };

export default async function SignupPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNextPath((await searchParams).next);
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
  return (
    <main className="signin-page">
      <Link href="/" className="brand"><span className="brand-mark">B</span><span>Borderless</span></Link>
      <section className="signin-panel panel signup-panel">
        <span className="page-kicker">START YOUR JOURNEY</span>
        <h1>계정을 만들고 Borderless를 시작하세요.</h1>
        <p>회사 정보는 맞춤 진단, AI GTM 계획과 전문가 연결에만 사용합니다.</p>
        <SignupForm next={next} googleEnabled={googleEnabled} />
        <p className="auth-switch">이미 계정이 있나요? <Link href={`/signin?returnTo=${encodeURIComponent(next)}`}>로그인</Link></p>
      </section>
    </main>
  );
}
