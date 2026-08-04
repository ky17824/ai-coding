import Link from "next/link";
import { signOut } from "@/app/signin/actions";
import { createSupabaseServerClient, requireUser } from "@/lib/supabase/server";

export async function SiteHeader({ compact = false }: { compact?: boolean }) {
  const user = await requireUser();
  const supabase = user ? await createSupabaseServerClient() : null;
  const { data: profile } = user && supabase
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  return (
    <header className={`site-header ${compact ? "site-header--compact" : ""}`}>
      <Link href="/" className="brand" aria-label="Borderless 홈">
        <span className="brand-mark">B</span>
        <span>Borderless</span>
      </Link>
      <nav className="main-nav" aria-label="주요 메뉴">
        <Link href="/dashboard">대시보드</Link>
        <Link href="/assessment">준비도 진단</Link>
        <Link href="/journey">GTM 여정</Link>
        <Link href="/services">전문가 서비스</Link>
        {profile?.role === "admin" && <Link href="/admin">운영</Link>}
      </nav>
      {user ? (
        <span className="header-account">
          <Link href="/account" className="button button--small button--ghost">마이페이지</Link>
          <form action={signOut}><button className="button button--small button--dark">로그아웃</button></form>
        </span>
      ) : (
        <Link href="/signin" className="button button--small button--dark">로그인</Link>
      )}
    </header>
  );
}
