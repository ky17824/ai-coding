import { headers } from "next/headers";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

export async function getRequestLocale(): Promise<Locale> {
  const locale = (await headers()).get("x-borderless-locale");
  return locale && isLocale(locale) ? locale : DEFAULT_LOCALE;
}
