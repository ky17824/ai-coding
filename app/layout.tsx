import type { Metadata } from "next";
import { getRequestLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const m = t(locale);
  return pageMetadata({ title: m.meta.title, description: m.meta.description, locale, titleTemplate: true });
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
