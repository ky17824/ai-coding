import type { MarketSizing, SizingRange } from "@/lib/ai-agent-report";

/**
 * 시장규모 추정 섹션 렌더러. 화면(ai-agent-workspace)과 HTML 내보내기가 같은 문자열을 쓴다.
 *
 * 세 층으로 그린다 — 지표 카드(기준값·저–고·상위 대비 비율) → 저–고 범위 막대(로그 눈금)
 * → 단계별 산식·가정 불렛. 모두 모델이 낸 숫자·문장을 그대로 배치할 뿐 새 값을 만들지 않는다.
 * 비율과 눈금 위치만 여기서 계산하며, 그것도 기준값의 나눗셈과 log10뿐이다.
 *
 * 로그 눈금인 이유: TAM과 SOM이 1만 배 차이 나는 것이 보통이라 선형 눈금에서는 SOM이 점이 된다.
 * 눈금이 로그임을 화면에 적는다.
 *
 * 이전 형식(단계별 formula 없이 전체 formula 하나) 보고서는 카드·차트만 그리고 근거는 문단으로 남긴다.
 */

type Locale = "ko" | "en";
type Tier = "tam" | "sam" | "beachhead" | "som";
const TIERS: Tier[] = ["tam", "sam", "beachhead", "som"];

const copy = {
  ko: {
    heading: "시장 규모 추정",
    basis: (year: number, currency: string) => `${currency} · ${year}년 기준 · 모든 값은 산식이 공개된 추정치입니다`,
    tier: { tam: "TAM", sam: "SAM", beachhead: "교두보 시장", som: "SOM" },
    tierHint: { tam: "전체 시장", sam: "도달 가능 시장", beachhead: "최초 공략 고객군", som: "3~5년 내 획득 가능" },
    method: { top_down: "하향식", bottom_up: "상향식", cross_check: "하향식×상향식 교차" },
    ratio: { sam: "TAM의", beachhead: "SAM의", som: "SAM의" } as Partial<Record<Tier, string>>,
    range: (low: string, high: string) => `최소 ${low} – 최대 ${high}`,
    chartTitle: "최소–최대 범위와 기준값",
    chartScale: "로그 눈금(값이 수천 배 차이 나므로)",
    chartNote: "막대 = 최소~최대 범위, 세로 표식 = 기준값. 막대가 길수록 가정의 불확실성이 큽니다.",
    consistency: "정합성"
  },
  en: {
    heading: "Market sizing",
    basis: (year: number, currency: string) => `${currency} · ${year} · every figure is an estimate with a stated formula`,
    tier: { tam: "TAM", sam: "SAM", beachhead: "Beachhead", som: "SOM" },
    tierHint: { tam: "Total market", sam: "Serviceable market", beachhead: "First segment", som: "Obtainable in 3–5 yrs" },
    method: { top_down: "Top-down", bottom_up: "Bottom-up", cross_check: "Top-down × bottom-up" },
    ratio: { sam: "of TAM", beachhead: "of SAM", som: "of SAM" } as Partial<Record<Tier, string>>,
    range: (low: string, high: string) => `low ${low} – high ${high}`,
    chartTitle: "Low–high range and base value",
    chartScale: "Log scale · values differ by orders of magnitude",
    chartNote: "Bar = low–high range, tick = base value. A longer bar means more uncertain assumptions.",
    consistency: "Consistency"
  }
};

/** 자릿수 단위 축약. ko는 만/억/조, en은 K/M/B/T. 소수 한 자리, 뒤의 .0은 뗀다. */
export function formatCompact(value: number, locale: Locale): string {
  if (!Number.isFinite(value)) return "–";
  const units: [number, string][] = locale === "en"
    ? [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]]
    : [[1e12, "조"], [1e8, "억"], [1e4, "만"]];
  for (const [size, suffix] of units) {
    if (Math.abs(value) >= size) {
      const scaled = value / size;
      const digits = scaled >= 100 ? 0 : 1;
      return `${scaled.toLocaleString(locale === "en" ? "en-US" : "ko-KR", { maximumFractionDigits: digits })}${suffix}`;
    }
  }
  return value.toLocaleString(locale === "en" ? "en-US" : "ko-KR", { maximumFractionDigits: 0 });
}

/** ISO 코드의 통화 기호(US$, ₩, JP¥, €). 코드가 통화가 아니면 코드 그대로. */
export function currencySymbol(code: string, locale: Locale): string {
  try {
    const parts = new Intl.NumberFormat(locale === "en" ? "en-US" : "ko-KR", { style: "currency", currency: code }).formatToParts(1);
    return parts.find((part) => part.type === "currency")?.value ?? code;
  } catch {
    return code;
  }
}

export function formatMoney(value: number, currency: string, locale: Locale): string {
  return `${currencySymbol(currency, locale)}${formatCompact(value, locale)}`;
}

function ratioLabel(numerator: number, denominator: number): string | null {
  if (!(denominator > 0) || !Number.isFinite(numerator)) return null;
  const pct = (numerator / denominator) * 100;
  return `${pct >= 10 ? pct.toFixed(0) : pct.toFixed(1)}%`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

const CSS = `.ms{font-family:inherit;color:#10221b}.ms-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap;margin:0 0 12px}.ms-head strong{font-size:18px}.ms-head span{color:#60726a;font-size:13px}.ms-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:0 0 14px}.ms-card{border:1px solid #d9dfdb;border-radius:12px;padding:12px 14px;background:#fff}.ms-card small{display:block;color:#60726a;font-size:12px}.ms-card b{display:block;font-size:24px;font-weight:700;letter-spacing:-.02em;margin:2px 0}.ms-card i{display:inline-block;margin-top:6px;padding:2px 8px;border-radius:999px;background:#e7f2ec;color:#0e3b2b;font-size:11px;font-style:normal}.ms-card i.warn{background:#fff6eb;color:#8a4b00}.ms-chart{border:1px solid #d9dfdb;border-radius:12px;padding:12px 14px;background:#fff;margin:0 0 14px}.ms-chart header{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;color:#60726a;font-size:12px;margin-bottom:6px}.ms-chart svg{display:block;width:100%;height:auto}.ms-chart footer{color:#60726a;font-size:11px;margin-top:4px}.ms-basis{display:grid;gap:10px;font-size:13px}.ms-tier{border-left:3px solid #1d7b4c;padding:2px 0 2px 12px}.ms-tier.warn{border-left-color:#e0a25a}.ms-tier strong{display:block;margin-bottom:2px}.ms-tier strong span{font-weight:400;color:#60726a}.ms-tier ul{margin:0;padding-left:18px;color:#3d4d46}.ms-tier li{margin:2px 0}.ms-note{color:#60726a;font-size:12px;padding-left:15px}.ms-legacy{margin:0;color:#3d4d46;font-size:14px;line-height:1.65}@media(max-width:600px){.ms-cards{grid-template-columns:1fr 1fr}}`;

function isRange(value: unknown): value is SizingRange {
  return Boolean(value) && typeof (value as SizingRange).low === "number" && typeof (value as SizingRange).base === "number" && typeof (value as SizingRange).high === "number";
}

/** 로그 눈금 범위 막대. 숫자와 고정 라벨만 들어가므로 모델 텍스트 이스케이프 문제가 없다. */
export function sizingChartSvg(sizing: MarketSizing, locale: Locale): string {
  const c = copy[locale];
  const rows = TIERS.map((tier) => ({ tier, range: sizing[tier] })).filter((row) => isRange(row.range));
  const positives = rows.flatMap((row) => [row.range.low, row.range.base, row.range.high]).filter((v) => v > 0);
  if (!positives.length) return "";
  // 눈금 범위: 최솟값 아래 10의 거듭제곱 ~ 최댓값 위 10의 거듭제곱. 0은 축의 왼쪽 끝에 붙인다.
  const minExp = Math.floor(Math.log10(Math.min(...positives)));
  const maxExp = Math.ceil(Math.log10(Math.max(...positives)));
  const span = Math.max(1, maxExp - minExp);
  // 오른쪽 여백: 마지막 눈금 라벨과 막대 뒤 기준값 라벨이 잘리지 않게 한다.
  const width = 640, left = 112, right = 580, rowH = 34, top = 14;
  const height = top + rows.length * rowH + 30;
  const x = (v: number) => (v <= 0 ? left : left + ((Math.log10(v) - minExp) / span) * (right - left));
  const axisY = top + rows.length * rowH - 6;
  const ticks: string[] = [];
  const grid: string[] = [];
  for (let exp = minExp; exp <= maxExp; exp++) {
    const px = x(10 ** exp).toFixed(1);
    ticks.push(`<text x="${px}" y="${axisY + 16}" text-anchor="middle">${escapeHtml(formatMoney(10 ** exp, sizing.currency, locale))}</text>`);
    if (exp > minExp) grid.push(`<line x1="${px}" y1="${top - 6}" x2="${px}" y2="${axisY}"/>`);
  }
  const bars = rows.map((row, index) => {
    const y = top + index * rowH;
    const x1 = x(row.range.low), x2 = Math.max(x(row.range.high), x1 + 6), xb = x(row.range.base);
    const warn = row.tier === "som";
    const fill = warn ? "#fbe9d2" : "#d4e9e2";
    const tick = warn ? "#c77d1e" : "#1d7b4c";
    return `<text x="${left - 12}" y="${y + 12}" text-anchor="end" font-weight="600">${escapeHtml(c.tier[row.tier])}</text>` +
      `<rect x="${x1.toFixed(1)}" y="${y + 2}" width="${(x2 - x1).toFixed(1)}" height="14" rx="7" fill="${fill}"/>` +
      `<rect x="${(xb - 2).toFixed(1)}" y="${y - 1}" width="4" height="20" rx="2" fill="${tick}"/>` +
      `<text x="${(x2 + 8).toFixed(1)}" y="${y + 12}" fill="#3d4d46">${escapeHtml(formatCompact(row.range.base, locale))}</text>`;
  });
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(c.chartTitle)}" font-size="12" font-family="inherit" fill="#10221b">` +
    `<g stroke="#e4e9e6" stroke-dasharray="2 3">${grid.join("")}</g>` +
    `<line x1="${left}" y1="${axisY}" x2="${right}" y2="${axisY}" stroke="#c9d3ce"/>` +
    `<g fill="#60726a" font-size="11">${ticks.join("")}</g>${bars.join("")}</svg>`;
}

/** 시장규모 섹션 전체(<style> 포함). 모델 텍스트는 전부 이스케이프한다. */
export function marketSizingHtml(sizing: MarketSizing, locale: Locale): string {
  const c = copy[locale];
  const money = (v: number) => formatMoney(v, sizing.currency, locale);
  const structured = TIERS.every((tier) => isRange(sizing[tier]) && typeof sizing[tier].formula === "string");
  const parent: Partial<Record<Tier, Tier>> = { sam: "tam", beachhead: "sam", som: "sam" };

  const cards = TIERS.filter((tier) => isRange(sizing[tier])).map((tier) => {
    const range = sizing[tier];
    const parentTier = parent[tier];
    const ratio = parentTier && isRange(sizing[parentTier]) ? ratioLabel(range.base, sizing[parentTier].base) : null;
    const ratioText = ratio && c.ratio[tier] ? ` · ${c.ratio[tier]} ${ratio}` : "";
    const badge = structured ? `<i class="${tier === "som" ? "warn" : ""}">${escapeHtml(c.method[range.method])}</i>` : "";
    return `<div class="ms-card"><small>${escapeHtml(c.tier[tier])} · ${escapeHtml(c.tierHint[tier])}</small><b>${escapeHtml(money(range.base))}</b><small>${escapeHtml(c.range(formatCompact(range.low, locale), formatCompact(range.high, locale)))}${escapeHtml(ratioText)}</small>${badge}</div>`;
  }).join("");

  const chart = sizingChartSvg(sizing, locale);
  const chartBlock = chart ? `<div class="ms-chart"><header><span>${escapeHtml(c.chartTitle)}</span><span>${escapeHtml(c.chartScale)}</span></header>${chart}<footer>${escapeHtml(c.chartNote)}</footer></div>` : "";

  let basis: string;
  if (structured) {
    const tiers = TIERS.map((tier) => {
      const range = sizing[tier];
      const items = (range.assumptions ?? []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
      return `<div class="ms-tier${tier === "som" ? " warn" : ""}"><strong>${escapeHtml(c.tier[tier])} — ${escapeHtml(c.method[range.method])} <span>${escapeHtml(range.formula)}</span></strong>${items ? `<ul>${items}</ul>` : ""}</div>`;
    }).join("");
    const note = sizing.consistencyNote ? `<div class="ms-note">${escapeHtml(c.consistency)}: ${escapeHtml(sizing.consistencyNote)}</div>` : "";
    basis = `<div class="ms-basis">${tiers}${note}</div>`;
  } else {
    // 이전 형식: 자유 텍스트 formula 하나. 그대로 문단으로.
    const legacy = (sizing as unknown as { formula?: string }).formula ?? sizing.consistencyNote ?? "";
    basis = legacy ? `<p class="ms-legacy">${escapeHtml(legacy)}</p>` : "";
  }

  return `<style>${CSS}</style><section class="ms"><div class="ms-head"><strong>${escapeHtml(c.heading)}</strong><span>${escapeHtml(c.basis(sizing.referenceYear, sizing.currency))}</span></div><div class="ms-cards">${cards}</div>${chartBlock}${basis}</section>`;
}
