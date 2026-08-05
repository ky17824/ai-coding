import type { Metadata } from "next";
import { Landing } from "@/components/landing";
import { t } from "@/lib/i18n";

const m = t("en");

export const metadata: Metadata = {
  title: {
    absolute: m.meta.title
  },
  description: m.meta.description,
  alternates: {
    canonical: "/en",
    languages: {
      ko: "/",
      en: "/en"
    }
  }
};

export default function EnglishHomePage() {
  return <Landing locale="en" />;
}
