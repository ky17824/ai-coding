import Link from "next/link";
import { localizedPath, type Locale } from "@/lib/i18n";

export function AdminNav({ locale }: { locale: Locale }) {
  const en = locale === "en";
  return (
    <>
    <p className="admin-mode-note" role="note">{en ? "Operations mode — visible to administrators only." : "운영 모드 — 관리자에게만 보이는 화면입니다."}</p>
    <nav className="admin-subnav" aria-label={en ? "Operations sections" : "운영 관리 메뉴"}>
      <Link href={localizedPath("/admin", locale)}>{en ? "Overview" : "운영 개요"}</Link>
      <Link href={localizedPath("/admin/users", locale)}>{en ? "Users" : "사용자 관리"}</Link>
      <Link href={localizedPath("/admin/ai-models", locale)}>{en ? "AI models" : "AI 모델"}</Link>
    </nav>
    </>
  );
}
