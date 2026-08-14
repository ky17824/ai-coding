"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALE_COOKIE, LOCALES, localizedPath, t, type Locale } from "@/lib/i18n";

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const m = t(locale);
  const pathname = usePathname();
  return (
    <nav className="lang-switch" aria-label={m.language.label}>
      {LOCALES.map((code) => {
        const current = code === locale;
        return (
          <Link
            key={code}
            href={localizedPath(pathname, code)}
            hrefLang={code}
            onClick={() => {
              document.cookie = `${LOCALE_COOKIE}=${code}; Path=/; Max-Age=31536000; SameSite=Lax`;
            }}
            className={current ? "lang-switch__item is-active" : "lang-switch__item"}
            aria-current={current ? "true" : undefined}
          >
            {m.language[code]}
          </Link>
        );
      })}
    </nav>
  );
}
