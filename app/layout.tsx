import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Borderless | 글로벌 진출 준비부터 실행까지",
    template: "%s | Borderless"
  },
  description:
    "한국 스타트업을 위한 글로벌 진출 준비도 진단, 실행 여정, 검증된 전문가 서비스 플랫폼"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
