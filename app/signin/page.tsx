import type { Metadata } from "next";
import Link from "next/link";
import { SignInForm } from "@/components/signin-form";
import { safeNextPath } from "@/lib/auth";

export const metadata: Metadata = { title: "로그인" };

export default async function SignInPage({
  searchParams
}: {
  searchParams: Promise<{ returnTo?: string; next?: string }>;
}) {
  const query = await searchParams;
  const next = safeNextPath(query.returnTo ?? query.next);
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
  return (
    <main className="signin-page">
      <Link href="/" className="brand">
        <span className="brand-mark">B</span>
        <span>Borderless</span>
      </Link>
      <section className="signin-panel panel">
        <span className="page-kicker">WELCOME BACK</span>
        <h1>글로벌 진출 여정을 이어가세요.</h1>
        <p>{googleEnabled
          ? "비밀번호, Google 또는 안전한 이메일 링크로 로그인할 수 있습니다."
          : "비밀번호 또는 안전한 이메일 링크로 로그인할 수 있습니다."}
        </p>
        <SignInForm next={next} googleEnabled={googleEnabled} />
      </section>
    </main>
  );
}
