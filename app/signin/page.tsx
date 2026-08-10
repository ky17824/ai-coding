import type { Metadata } from "next";
import Link from "next/link";
import { SignInForm } from "@/components/signin-form";
import { authErrorMessage, safeNextPath } from "@/lib/auth";
import { getRequestLocale } from "@/lib/i18n-server";
import { localizedPath } from "@/lib/i18n";

export default async function SignInPage({
  searchParams
}: {
  searchParams: Promise<{ returnTo?: string; next?: string; error?: string }>;
}) {
  const query = await searchParams;
  const locale = await getRequestLocale();
  const copy = locale === "en"
    ? {
        title: "Sign in",
        heading: "Pick up your global expansion journey.",
        body: "Sign in with a password, a social account, or a secure email link."
      }
    : {
        title: "로그인",
        heading: "글로벌 진출 여정을 이어가세요.",
        body: "비밀번호, 소셜 계정 또는 안전한 이메일 링크로 로그인할 수 있습니다."
      };
  const next = safeNextPath(query.returnTo ?? query.next, localizedPath("/dashboard", locale));
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
  const kakaoEnabled = process.env.NEXT_PUBLIC_KAKAO_AUTH_ENABLED === "true";
  const error = authErrorMessage(query.error, locale);
  return (
    <main className="signin-page">
      <title>{copy.title}</title>
      <Link href={localizedPath("/", locale)} className="brand">
        <span className="brand-mark">B</span>
        <span>Borderless</span>
      </Link>
      <section className="signin-panel panel">
        <span className="page-kicker">WELCOME BACK</span>
        <h1>{copy.heading}</h1>
        <p>{copy.body}</p>
        {error && <p className="notice-banner notice-banner--error" role="alert">{error}</p>}
        <SignInForm next={next} googleEnabled={googleEnabled} kakaoEnabled={kakaoEnabled} locale={locale} />
      </section>
    </main>
  );
}
