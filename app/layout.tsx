import type { Metadata } from "next";
import { getRequestLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import "./globals.css";

// The Supabase DB resolves to AWS ap-northeast-2; keep server compute beside it.
export const preferredRegion = "icn1";

export async function generateMetadata(): Promise<Metadata> {
  const m = t(await getRequestLocale());
  return {
    title: { default: m.meta.title, template: "%s | Borderless" },
    description: m.meta.description
  };
}

export default async function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={await getRequestLocale()}>
      <body>{children}</body>
    </html>
  );
}
