import { describe, expect, it } from "vitest";
import { pageMetadata } from "@/lib/seo";

describe("link preview metadata", () => {
  it("always ships the 1200×630 OG image and a real description so Kakao/Slack cards are not cropped", () => {
    // 카카오는 og:image가 없으면 페이지 첫 이미지(정사각 마스코트)를 가로 카드에 맞춰 잘랐다.
    const meta = pageMetadata({ title: "심층 시장 조사", description: "설명", locale: "ko", path: "/services/ai-market-intelligence" });
    const og = meta.openGraph as { images: Array<{ url: string; width: number; height: number }>; title: string; description: string; locale: string };
    expect(og.images[0]).toMatchObject({ url: "/og-image.png", width: 1200, height: 630 });
    expect(og.title).toBe("심층 시장 조사 | Borderless");
    expect(og.description).toBe("설명");
    expect(og.locale).toBe("ko_KR");
    expect((meta.twitter as { card: string }).card).toBe("summary_large_image");
    expect(String(meta.metadataBase)).toMatch(/^https?:\/\//);
  });
});
