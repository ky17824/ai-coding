import { describe, expect, it } from "vitest";
import {
  LOCALES,
  localeFromPath,
  localizedPath,
  messages,
  stripLocalePath,
  t
} from "@/lib/i18n";

const HANGUL = /[가-힣]/;

/** 중첩 객체·배열을 "hero.headline.0.em" 같은 평평한 경로 맵으로 편다. */
function flatten(value: unknown, prefix = ""): Record<string, string> {
  if (typeof value === "string") return { [prefix]: value };
  if (Array.isArray(value)) {
    return Object.assign({}, ...value.map((v, i) => flatten(v, `${prefix}.${i}`)));
  }
  if (value && typeof value === "object") {
    return Object.assign(
      {},
      ...Object.entries(value).map(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k))
    );
  }
  return {};
}

describe("i18n dictionaries", () => {
  const flat = Object.fromEntries(
    LOCALES.map((locale) => [locale, flatten(messages[locale])])
  );

  it("ko와 en의 키 집합이 정확히 일치한다", () => {
    expect(Object.keys(flat.en).sort()).toEqual(Object.keys(flat.ko).sort());
  });

  it("빈 문자열 값이 없다", () => {
    // hero.headline의 마지막 줄 after는 의도적으로 비어 있다.
    const allowedEmpty = new Set(["hero.headline.2.after"]);
    for (const locale of LOCALES) {
      const empty = Object.entries(flat[locale])
        .filter(([key, value]) => value.trim() === "" && !allowedEmpty.has(key))
        .map(([key]) => key);
      expect(empty, `${locale}에 빈 값`).toEqual([]);
    }
  });

  it("영어 사전에 한글이 남아 있지 않다", () => {
    const leftovers = Object.entries(flat.en)
      .filter(([, value]) => HANGUL.test(value))
      .map(([key, value]) => `${key}: ${value}`);
    expect(leftovers).toEqual([]);
  });

  it("t()가 로케일별 사전을 돌려준다", () => {
    expect(t("ko").header.signIn).toBe("로그인");
    expect(t("en").header.signIn).toBe("Sign in");
  });
});

describe("localized routes", () => {
  it("adds and removes only the English route prefix", () => {
    expect(localizedPath("/dashboard", "en")).toBe("/en/dashboard");
    expect(localizedPath("/en/dashboard", "ko")).toBe("/dashboard");
    expect(localizedPath("/", "en")).toBe("/en");
    expect(localizedPath("/en", "ko")).toBe("/");
  });

  it("preserves query strings and record paths", () => {
    expect(localizedPath("/assistant/abc?tab=plan", "en")).toBe(
      "/en/assistant/abc?tab=plan"
    );
    expect(stripLocalePath("/en/assistant/abc?tab=plan")).toBe(
      "/assistant/abc?tab=plan"
    );
  });

  it("detects locale from the pathname", () => {
    expect(localeFromPath("/en/services")).toBe("en");
    expect(localeFromPath("/services")).toBe("ko");
  });
});
