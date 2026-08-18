// 버튼 look & feel이 다시 흐트러지지 않게 지키는 검사 — 변형 4개(primary/soft/ghost/light)만 쓰고, 색·크기·그림자·모션은 .button 블록 한 곳에서만 정한다
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const ALLOWED_VARIANTS = new Set(["primary", "soft", "ghost", "light", "small", "full", "kakao", "google"]);
// 페이지·컴포넌트 CSS가 .button에 대해 건드려도 되는 속성 — 배치뿐이다.
const LAYOUT_ONLY = /^(margin(-[a-z]+)?|width|min-width|max-width|grid-column|grid-row|justify-self|align-self|flex(-[a-z]+)?|order|display)$/;

function walk(dir: string, out: string[] = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

const sources = [...walk(join(ROOT, "app")), ...walk(join(ROOT, "components"))];
const rawCss = readFileSync(join(ROOT, "app/globals.css"), "utf8");
/** 주석과 reduced-motion 블록(모션 해제 전용)을 뺀 CSS. 규칙 검사는 이걸로 한다. */
const css = rawCss.replace(/\/\*[\s\S]*?\*\//g, "").replace(/@media \(prefers-reduced-motion[^{]*\{[\s\S]*?\n\}\n/g, "");

describe("버튼 디자인 룰", () => {
  it("변형은 primary·soft·ghost·light(+small·full·kakao·google)만 쓴다", () => {
    const offenders: string[] = [];
    for (const file of sources) {
      for (const match of readFileSync(file, "utf8").matchAll(/button--([a-z-]+)/g)) {
        if (!ALLOWED_VARIANTS.has(match[1])) offenders.push(`${file.replace(ROOT + "/", "")}: button--${match[1]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("변형 없는 .button은 없다 — 모양이 이름에 드러나야 한다", () => {
    const offenders: string[] = [];
    for (const file of sources) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/className=(?:"|\{`|\{")([^"`}]*)/g)) {
        if (match[1].includes("${")) continue; // 변형을 변수로 넣는 곳(social-login-button)은 kakao/google 규격
        const classes = match[1].split(/\s+/).filter(Boolean);
        if (!classes.includes("button")) continue;
        if (!classes.some((cls) => /^button--(primary|soft|ghost|light|kakao|google)$/.test(cls))) offenders.push(`${file.replace(ROOT + "/", "")}: ${match[1]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("globals.css의 4개 변형이 정의돼 있고 dark는 없다", () => {
    for (const variant of ["primary", "soft", "ghost", "light"]) expect(css).toMatch(new RegExp(`^\\.button--${variant} \\{`, "m"));
    expect(css).not.toMatch(/\.button--dark/);
  });

  it("페이지·컴포넌트 CSS는 .button의 배치(여백·폭·grid)만 건드리고 색·크기·그림자·모션은 건드리지 않는다", () => {
    const offenders: string[] = [];
    // 공통 블록(.button, .button--*, .button:pseudo 로 시작하는 선택자)은 제외하고, 다른 선택자 안에 .button이 든 규칙만 본다.
    for (const match of css.matchAll(/([^{}]*\.button[^{}]*)\{([^}]*)\}/g)) {
      const selector = match[1].trim();
      const selectors = selector.split(",").map((part) => part.trim());
      const isCommonBlock = selectors.every((part) => /^\.button(--[a-z-]+)?(:[a-z-]+(\([^)]*\))?)*(\s*>\s*span\[aria-hidden="true"\])?$/.test(part) || /^\.(icon-button|filter-row button|domain-nav button|answer-option|text-link)/.test(part));
      if (isCommonBlock) continue;
      // .button__kakao-logo 같은 하위 요소 스타일은 버튼 자체가 아니다.
      if (selectors.every((part) => /\.button__/.test(part))) continue;
      const declarations = match[2].split(";").map((line) => line.trim()).filter(Boolean).map((line) => line.split(":")[0].trim());
      const bad = declarations.filter((property) => !LAYOUT_ONLY.test(property));
      if (bad.length) offenders.push(`${selector} → ${bad.join(", ")}`);
    }
    expect(offenders).toEqual([]);
  });
});
