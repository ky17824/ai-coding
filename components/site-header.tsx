import Link from "next/link";
import { signOut } from "@/app/signin/actions";
import { LanguageSwitcher } from "@/components/language-switcher";
import { DEFAULT_LOCALE, t, type Locale } from "@/lib/i18n";
import { createSupabaseServerClient, requireUser } from "@/lib/supabase/server";

export async function SiteHeader({
  compact = false,
  locale = DEFAULT_LOCALE
}: {
  compact?: boolean;
  locale?: Locale;
}) {
  const m = t(locale);
  const user = await requireUser();
  const supabase = user ? await createSupabaseServerClient() : null;
  const { data: profile } = user && supabase
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  return (
    <header className={`site-header ${compact ? "site-header--compact" : ""}`}>
      <Link href="/" className="brand" aria-label={m.header.brandHome}>
        <span className="brand-mark">B</span>
        <span>Borderless</span>
      </Link>
      <nav className="main-nav" aria-label={m.header.mainNav}>
        <Link href="/dashboard">{m.header.dashboard}</Link>
        <Link href="/assessment">{m.header.assessment}</Link>
        <Link href="/journey">{m.header.journey}</Link>
        <Link href="/services">{m.header.services}</Link>
        {profile?.role === "admin" && <Link href="/admin">{m.header.admin}</Link>}
      </nav>
      <span className="header-account">
        {/* 랜딩만 이중 언어다. compact 헤더를 쓰는 페이지들은 아직 한국어 전용이라
            선택기를 띄우면 없는 영어 페이지를 약속하게 된다. */}
        {!compact && <LanguageSwitcher locale={locale} />}
        {user ? (
          <>
            <Link href="/account" className="button button--small button--ghost">{m.header.account}</Link>
            <form action={signOut}><button className="button button--small button--dark">{m.header.signOut}</button></form>
          </>
        ) : (
          <Link href="/signin" className="button button--small button--dark">{m.header.signIn}</Link>
        )}
      </span>
    </header>
  );
}
