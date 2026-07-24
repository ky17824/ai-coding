import Link from "next/link";

export function SiteHeader({ compact = false }: { compact?: boolean }) {
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
      </nav>
      <Link href="/signin" className="button button--small button--dark">
        비공개 베타 로그인
      </Link>
    </header>
  );
}
