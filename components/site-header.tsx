import { Suspense } from "react";
import Link from "next/link";
import { signOut } from "@/app/signin/actions";
import { LanguageSwitcher } from "@/components/language-switcher";
import { localizedPath, t, type Locale } from "@/lib/i18n";
import { getCurrentProfile } from "@/lib/supabase/server";

async function HeaderAccount({ locale, mobile = false }: { locale: Locale; mobile?: boolean }) {
  const m = t(locale);
  const { user, profile } = await getCurrentProfile();
  if (!user) return <Link href={localizedPath("/signin", locale)} className={mobile ? undefined : "button button--small button--dark"}>{m.header.signIn}</Link>;
  return (
    <>
      {profile?.role === "admin" && <Link href={localizedPath("/admin", locale)} className={mobile ? undefined : "button button--small button--ghost"}>{m.header.admin}</Link>}
      <Link href={localizedPath("/account", locale)} className={mobile ? undefined : "button button--small button--ghost"}>{m.header.account}</Link>
      <form action={signOut}>
        <input type="hidden" name="locale" value={locale} />
        <button className={mobile ? undefined : "button button--small button--dark"}>{m.header.signOut}</button>
      </form>
    </>
  );
}

export function SiteHeader({
  compact = false,
  locale
}: {
  compact?: boolean;
  locale: Locale;
}) {
  const m = t(locale);
  const navItems = [
    ["/dashboard", m.header.dashboard],
    ["/assessment", m.header.assessment],
    ["/journey", m.header.journey],
    ["/services", m.header.services]
  ];
  return (
    <header className={`site-header ${compact ? "site-header--compact" : ""}`}>
      <Link href={localizedPath("/", locale)} className="brand" aria-label={m.header.brandHome}>
        <span className="brand-mark">B</span>
        <span>Borderless</span>
      </Link>
      <nav className="main-nav" aria-label={m.header.mainNav}>
        {navItems.map(([href, label]) => <Link href={localizedPath(href, locale)} key={href}>{label}</Link>)}
      </nav>
      <details className="mobile-nav">
        <summary>{locale === "en" ? "Menu" : "메뉴"}</summary>
        <div className="mobile-nav__menu" role="navigation" aria-label={m.header.mainNav}>
          <span className="mobile-nav__language"><LanguageSwitcher locale={locale} /></span>
          {navItems.map(([href, label]) => <Link href={localizedPath(href, locale)} key={href}>{label}</Link>)}
          <Suspense fallback={null}><HeaderAccount locale={locale} mobile /></Suspense>
        </div>
      </details>
      <span className="header-account">
        <LanguageSwitcher locale={locale} />
        <Suspense fallback={<span className="header-account__loading" aria-hidden="true" />}>
          <HeaderAccount locale={locale} />
        </Suspense>
      </span>
    </header>
  );
}
