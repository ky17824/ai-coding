// 디자인 토큰이 다시 흩어지지 않게 지키는 검사 — 색·모서리·자간·글자 크기는 :root 토큰과 정해진 척도만 쓴다
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const raw = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
const rootStart = raw.indexOf(":root");
const rootEnd = raw.indexOf("}", rootStart);
// :root 밖 + 주석 제거 + 브랜드 버튼(kakao/google은 각사 규격) 제외
const body = raw
  .slice(rootEnd)
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\.button--(?:kakao|google)[^{]*\{[^}]*\}/g, "");

// DESIGN.md Typography: 5단계(48/36/24/16/13~14) + 보조(30 압축 제목, 20 소제목, 12 배지). 그 밖의 px는 쓰지 않는다.
const FONT_SCALE = new Set([12, 13, 14, 16, 20, 24, 30, 36, 48]);

describe("디자인 토큰", () => {
  it(":root 밖에는 리터럴 hex 색이 없다", () => {
    expect(body.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).toEqual([]);
  });

  it("border-radius는 토큰(card/band/field/pill/small)·50%·inherit·차트 전용 값만 쓴다", () => {
    const literal = [...body.matchAll(/border-radius:\s*([^;]+);/g)].map((m) => m[1].trim()).filter((v) => !/^var\(--radius-/.test(v) && !["50%", "inherit"].includes(v) && !/^\d+px \d+px \d+px \d+px$/.test(v) && v !== "3px");
    expect(literal).toEqual([]);
  });

  it("letter-spacing은 tracking 토큰(display/title/label/kicker)·0·normal·inherit만 쓴다", () => {
    const literal = [...body.matchAll(/letter-spacing:\s*([^;]+);/g)].map((m) => m[1].trim()).filter((v) => !/^var\(--tracking-/.test(v) && !["0", "normal", "inherit"].includes(v));
    expect(literal).toEqual([]);
  });

  it("font-size의 px 값은 9단계 척도 안에 있다", () => {
    const offenders = [...body.matchAll(/font-size:\s*(\d+)px/g)].map((m) => Number(m[1])).filter((n) => !FONT_SCALE.has(n));
    expect([...new Set(offenders)]).toEqual([]);
  });

  it("box-shadow는 토큰 또는 포커스/인셋 링만 쓴다", () => {
    const literal = [...body.matchAll(/box-shadow:\s*([^;]+);/g)].map((m) => m[1].trim()).filter((v) => !/^var\(--/.test(v) && v !== "none" && !/^(inset|0 0 0 \d+px var\()/.test(v));
    expect(literal).toEqual([]);
  });
});
