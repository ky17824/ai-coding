import Link from "next/link";
import { LOCALES, LOCALE_HOME, t, type Locale } from "@/lib/i18n";

/**
 * 두 정적 경로 사이 이동일 뿐이라 클라이언트 상태가 필요 없다.
 * 서버 컴포넌트 + <Link> 두 개로 충분하며 JS 없이도 동작한다.
 */
export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const m = t(locale);
  return (
    <nav className="lang-switch" aria-label={m.language.label}>
      {LOCALES.map((code) => {
        const current = code === locale;
        return (
          <Link
            key={code}
            href={LOCALE_HOME[code]}
            hrefLang={code}
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
