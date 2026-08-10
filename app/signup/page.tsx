import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/signup-form";
import { safeNextPath } from "@/lib/auth";
import { getRequestLocale } from "@/lib/i18n-server";
import { localizedPath } from "@/lib/i18n";

export default async function SignupPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const locale = await getRequestLocale();
  const c = locale === "en"
    ? {
        title: "Create an account",
        heading: "Create your account and start with Borderless.",
        body: "We use your company information only to tailor your assessment, AI-GTM plan, and expert matches.",
        existing: "Already have an account?",
        signIn: "Sign in"
      }
    : {
        title: "회원가입",
        heading: "계정을 만들고 Borderless를 시작하세요.",
        body: "회사 정보는 맞춤 진단, AI GTM 계획과 전문가 연결에만 사용합니다.",
        existing: "이미 계정이 있나요?",
        signIn: "로그인"
      };
  const next = safeNextPath((await searchParams).next);
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
  const kakaoEnabled = process.env.NEXT_PUBLIC_KAKAO_AUTH_ENABLED === "true";
  return (
    <main className="signin-page">
      <title>{c.title}</title>
      <Link href={localizedPath("/", locale)} className="brand"><span className="brand-mark">B</span><span>Borderless</span></Link>
      <section className="signin-panel panel signup-panel">
        <span className="page-kicker">START YOUR JOURNEY</span>
        <h1>{c.heading}</h1>
        <p>{c.body}</p>
        <SignupForm next={next} googleEnabled={googleEnabled} kakaoEnabled={kakaoEnabled} locale={locale} />
        <p className="auth-switch">{c.existing} <Link href={`${localizedPath("/signin", locale)}?returnTo=${encodeURIComponent(next)}`}>{c.signIn}</Link></p>
      </section>
    </main>
  );
}
