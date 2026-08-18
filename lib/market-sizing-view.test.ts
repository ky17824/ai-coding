import { describe, expect, it } from "vitest";
import { currencySymbol, formatCompact, formatMoney, marketSizingHtml, sizingChartSvg } from "@/lib/market-sizing-view";
import type { MarketSizing } from "@/lib/ai-agent-report";

const range = (low: number, base: number, high: number, method: "top_down" | "bottom_up" | "cross_check" = "top_down", formula = "a × b = c", assumptions: string[] = ["가정 1"]) =>
  ({ low, base, high, method, formula, assumptions });

// 실제 보고서(주문 22e8aa96) 숫자.
const sizing: MarketSizing = {
  currency: "USD",
  referenceYear: 2025,
  tam: range(880_000_000, 1_200_000_000, 1_600_000_000, "top_down", "소매 1,300억 × 립케어 0.92% = 12.0억", ["립케어 비중은 공개 관측치가 아님 <검증 필요>"]),
  sam: range(60_000_000, 85_000_000, 110_000_000, "cross_check", "하향식 1.08억과 상향식 6,210만의 중간대", ["남성 구매 비중 20%", "대도시 사무직 45%"]),
  som: range(230_000, 1_620_000, 6_600_000, "top_down", "SAM × 3년 점유율 1.5%", ["점유율 0.5 / 1.5 / 3.0%"]),
  beachhead: range(7_000_000, 17_000_000, 37_000_000, "bottom_up", "350만 × 45% × 11 USD", []),
  consistencyNote: "TAM ≥ SAM ≥ 교두보 ≥ SOM 유지"
};

describe("시장규모 숫자 표기", () => {
  it("한국어는 만·억·조, 영어는 K·M·B로 줄이고 뒤의 .0을 뗀다", () => {
    expect(formatCompact(1_200_000_000, "ko")).toBe("12억");
    expect(formatCompact(85_000_000, "ko")).toBe("8,500만");
    expect(formatCompact(1_620_000, "ko")).toBe("162만");
    expect(formatCompact(880_000_000, "ko")).toBe("8.8억");
    expect(formatCompact(1_200_000_000, "en")).toBe("1.2B");
    expect(formatCompact(85_000_000, "en")).toBe("85M");
    expect(formatCompact(230_000, "en")).toBe("230K");
    expect(formatCompact(950, "ko")).toBe("950");
  });

  it("통화 기호는 조사 대상국 통화 코드에서 나오고, 코드가 통화가 아니면 코드를 그대로 쓴다", () => {
    expect(currencySymbol("USD", "ko")).toBe("US$");
    expect(currencySymbol("KRW", "ko")).toBe("₩");
    expect(currencySymbol("JPY", "en")).toBe("¥");
    expect(currencySymbol("US$", "ko")).toBe("US$");
    expect(formatMoney(1_200_000_000, "USD", "ko")).toBe("US$12억");
    expect(formatMoney(1_200_000_000, "EUR", "en")).toBe("€1.2B");
  });
});

describe("시장규모 섹션 렌더", () => {
  it("카드에 기준값·저–고·상위 대비 비율을 넣는다", () => {
    const html = marketSizingHtml(sizing, "ko");
    expect(html).toContain("US$12억");
    expect(html).toContain("최소 8.8억 – 최대 16억");
    expect(html).toContain("TAM의 7.1%"); // SAM 8,500만 / TAM 12억
    expect(html).toContain("SAM의 1.9%"); // SOM 162만 / SAM 8,500만
    expect(html).toContain("SAM의 20%"); // 교두보 1,700만 / SAM 8,500만
  });

  it("단계별 산식과 가정을 불렛으로 그리고 모델 텍스트는 이스케이프한다", () => {
    const html = marketSizingHtml(sizing, "ko");
    expect(html).toContain("하향식×상향식 교차");
    expect(html).toContain("소매 1,300억 × 립케어 0.92% = 12.0억");
    expect(html).toContain("&lt;검증 필요&gt;");
    expect(html).not.toContain("<검증 필요>");
    expect(html).toContain("정합성: TAM ≥ SAM ≥ 교두보 ≥ SOM 유지");
  });

  it("로그 눈금 막대는 값 순서대로 오른쪽에 놓이고 눈금 라벨은 통화 표기다", () => {
    const svg = sizingChartSvg(sizing, "ko");
    const xs = [...svg.matchAll(/<rect x="([\d.]+)" y="\d+" width="([\d.]+)" height="14"/g)].map((m) => Number(m[1]));
    // TAM, SAM, 교두보, SOM 순서 → x 좌표는 내림차순
    expect(xs).toHaveLength(4);
    expect(xs[0]).toBeGreaterThan(xs[1]);
    expect(xs[1]).toBeGreaterThan(xs[2]);
    expect(xs[2]).toBeGreaterThan(xs[3]);
    expect(svg).toContain("US$100만");
    expect(svg).toContain("US$10억");
  });

  it("이전 형식(단계별 산식 없음)은 카드·차트만 그리고 근거는 문단으로 남긴다", () => {
    const legacy = {
      currency: "USD", referenceYear: 2025,
      tam: { low: 100, base: 120, high: 140 }, sam: { low: 60, base: 80, high: 100 }, som: { low: 5, base: 8, high: 10 }, beachhead: { low: 1, base: 2, high: 3 },
      formula: "공개자료 삼각검증"
    } as unknown as MarketSizing;
    const html = marketSizingHtml(legacy, "en");
    expect(html).toContain('class="ms-legacy"');
    expect(html).toContain("공개자료 삼각검증");
    expect(html).not.toContain('class="ms-tier');
    expect(html).toContain("<svg");
  });

  it("0 값은 축 왼쪽 끝에 붙이고 전부 0이면 차트를 생략한다", () => {
    const zeroLow = { ...sizing, som: range(0, 1_620_000, 6_600_000) };
    expect(sizingChartSvg(zeroLow, "ko")).toContain("<svg");
    const allZero = { ...sizing, tam: range(0, 0, 0), sam: range(0, 0, 0), som: range(0, 0, 0), beachhead: range(0, 0, 0) };
    expect(sizingChartSvg(allZero, "ko")).toBe("");
  });
});
