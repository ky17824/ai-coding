import type { Metadata } from "next";
import Link from "next/link";
import { SignInForm } from "@/components/signin-form";
import { authErrorMessage, safeNextPath } from "@/lib/auth";

export const metadata: Metadata = { title: "로그인" };

export default async function SignInPage({
  searchParams
}: {
  searchParams: Promise<{ returnTo?: string; next?: string; error?: string }>;
}) {
  const query = await searchParams;
  const next = safeNextPath(query.returnTo ?? query.next);
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
  const kakaoEnabled = process.env.NEXT_PUBLIC_KAKAO_AUTH_ENABLED === "true";
  const error = authErrorMessage(query.error);
  return (
    <main className="signin-page">
      <Link href="/" className="brand">
        <span className="brand-mark">B</span>
        <span>Borderless</span>
      </Link>
      <section className="signin-panel panel">
        <span className="page-kicker">WELCOME BACK</span>
        <h1>글로벌 진출 여정을 이어가세요.</h1>
        <p>비밀번호, 소셜 계정 또는 안전한 이메일 링크로 로그인할 수 있습니다.</p>
        {error && <p className="notice-banner notice-banner--error" role="alert">{error}</p>}
        <SignInForm next={next} googleEnabled={googleEnabled} kakaoEnabled={kakaoEnabled} />
      </section>
    </main>
  );
}
