import type { Metadata } from "next";
import { appOrigin } from "@/lib/auth";
import type { Locale } from "@/lib/i18n";

/**
 * 링크 미리보기(카카오·슬랙·트위터)용 메타. Next는 하위 페이지가 openGraph를 정의하면 객체를
 * 통째로 바꾸므로 이미지가 사라진다 — 페이지마다 이 헬퍼로 전체를 만든다.
 * 카카오는 og:image가 없으면 페이지의 첫 이미지를 가로 카드에 맞춰 잘라 쓴다(마스코트가 잘리던 원인).
 */
export const OG_IMAGE = { url: "/og-image.png", width: 1200, height: 630, alt: "Borderless" };

export function pageMetadata(input: { title: string; description: string; locale: Locale; path?: string; titleTemplate?: boolean }): Metadata {
  const { title, description, locale } = input;
  return {
    metadataBase: new URL(appOrigin()),
    title: input.titleTemplate ? { default: title, template: "%s | Borderless" } : title,
    description,
    openGraph: {
      type: "website",
      siteName: "Borderless",
      locale: locale === "en" ? "en_US" : "ko_KR",
      title: input.titleTemplate ? title : `${title} | Borderless`,
      description,
      url: input.path ?? "/",
      images: [OG_IMAGE]
    },
    twitter: { card: "summary_large_image", title: input.titleTemplate ? title : `${title} | Borderless`, description, images: [OG_IMAGE.url] }
  };
}
