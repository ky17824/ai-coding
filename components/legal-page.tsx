import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export function LegalPage({
  kicker,
  title,
  children
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="app-page">
      <SiteHeader compact />
      <article className="app-container legal-page">
        <span className="page-kicker">{kicker}</span>
        <h1 className="page-title">{title}</h1>
        <div className="legal-warning">
          비공개 베타용 초안입니다. 실제 결제 개시 전 국내 전문가 검토와
          사업자 정보를 반영해야 합니다.
        </div>
        {children}
        <nav className="legal-links">
          <Link href="/legal/terms">이용약관</Link>
          <Link href="/legal/privacy">개인정보처리방침</Link>
          <Link href="/legal/refunds">취소·환불정책</Link>
        </nav>
      </article>
    </main>
  );
}
