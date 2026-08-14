import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { localizedPath, type Locale } from "@/lib/i18n";

export function LegalPage({
  kicker,
  title,
  children,
  locale
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
  locale: Locale;
}) {
  const en = locale === "en";
  return (
    <main className="app-page">
      <SiteHeader compact locale={locale} />
      <article className="app-container legal-page">
        <span className="page-kicker">{kicker}</span>
        <h1 className="page-title">{title}</h1>
        <div className="legal-warning">
          {en
            ? "Draft for the private beta. Before payments go live, this document must be reviewed by qualified counsel and updated with the operator's legal information."
            : "비공개 베타용 초안입니다. 실제 결제 개시 전 국내 전문가 검토와 사업자 정보를 반영해야 합니다."}
        </div>
        {children}
        <nav className="legal-links">
          <Link href={localizedPath("/legal/terms", locale)}>{en ? "Terms of Service" : "이용약관"}</Link>
          <Link href={localizedPath("/legal/privacy", locale)}>{en ? "Privacy Policy" : "개인정보처리방침"}</Link>
          <Link href={localizedPath("/legal/refunds", locale)}>{en ? "Cancellation & Refund Policy" : "취소·환불정책"}</Link>
        </nav>
      </article>
    </main>
  );
}
