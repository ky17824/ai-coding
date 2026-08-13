import Link from "next/link";
import { signOut } from "@/app/signin/actions";
import { LanguageSwitcher } from "@/components/language-switcher";
import { localizedPath, t, type Locale } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import { createSupabaseServerClient, requireUser } from "@/lib/supabase/server";

export async function SiteHeader({
  compact = false,
  locale
}: {
  compact?: boolean;
  locale?: Locale;
}) {
  const activeLocale = locale ?? await getRequestLocale();
  const m = t(activeLocale);
  const user = await requireUser();
  const supabase = user ? await createSupabaseServerClient() : null;
  const { data: profile } = user && supabase
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  const navItems = [
    ["/dashboard", m.header.dashboard],
    ["/assessment", m.header.assessment],
    ["/journey", m.header.journey],
    ["/services", m.header.services],
    ...(profile?.role === "admin" ? [["/admin", m.header.admin]] : [])
  ];
  return (
    <header className={`site-header ${compact ? "site-header--compact" : ""}`}>
      <Link href={localizedPath("/", activeLocale)} className="brand" aria-label={m.header.brandHome}>
        <span className="brand-mark">B</span>
        <span>Borderless</span>
      </Link>
      <nav className="main-nav" aria-label={m.header.mainNav}>
        {navItems.map(([href, label]) => <Link href={localizedPath(href, activeLocale)} key={href}>{label}</Link>)}
      </nav>
      <details className="mobile-nav">
        <summary>{activeLocale === "en" ? "Menu" : "메뉴"}</summary>
        <div className="mobile-nav__menu" role="navigation" aria-label={m.header.mainNav}>
          <span className="mobile-nav__language"><LanguageSwitcher locale={activeLocale} /></span>
          {navItems.map(([href, label]) => <Link href={localizedPath(href, activeLocale)} key={href}>{label}</Link>)}
          {user ? (
            <>
              <Link href={localizedPath("/account", activeLocale)}>{m.header.account}</Link>
              <form action={signOut}>
                <input type="hidden" name="locale" value={activeLocale} />
                <button>{m.header.signOut}</button>
              </form>
            </>
          ) : (
            <Link href={localizedPath("/signin", activeLocale)}>{m.header.signIn}</Link>
          )}
        </div>
      </details>
      <span className="header-account">
        <LanguageSwitcher locale={activeLocale} />
        {user ? (
          <>
            <Link href={localizedPath("/account", activeLocale)} className="button button--small button--ghost">{m.header.account}</Link>
            <form action={signOut}>
              <input type="hidden" name="locale" value={activeLocale} />
              <button className="button button--small button--dark">{m.header.signOut}</button>
            </form>
          </>
        ) : (
          <Link href={localizedPath("/signin", activeLocale)} className="button button--small button--dark">{m.header.signIn}</Link>
        )}
      </span>
    </header>
  );
}
