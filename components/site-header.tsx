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
  return (
    <header className={`site-header ${compact ? "site-header--compact" : ""}`}>
      <Link href={localizedPath("/", activeLocale)} className="brand" aria-label={m.header.brandHome}>
        <span className="brand-mark">B</span>
        <span>Borderless</span>
      </Link>
      <nav className="main-nav" aria-label={m.header.mainNav}>
        <Link href={localizedPath("/dashboard", activeLocale)}>{m.header.dashboard}</Link>
        <Link href={localizedPath("/assessment", activeLocale)}>{m.header.assessment}</Link>
        <Link href={localizedPath("/journey", activeLocale)}>{m.header.journey}</Link>
        <Link href={localizedPath("/services", activeLocale)}>{m.header.services}</Link>
        {profile?.role === "admin" && <Link href={localizedPath("/admin", activeLocale)}>{m.header.admin}</Link>}
      </nav>
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
