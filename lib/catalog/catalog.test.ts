import { describe, expect, it } from "vitest";
import { INTAKE_ITEMS } from "@/lib/intake-questions";
import { TAG_ALIASES } from "@/lib/expert-matching";
import {
  CATALOG_PRODUCTS,
  buildSpecialistRules,
  expertPayout,
  getCatalogService,
  getCatalogServices,
  laborCost,
  listCatalogProducts,
  partsTotal,
  localizeCatalogProduct,
  OFFICIAL_SOURCE_AGENT_ID
} from "@/lib/catalog";
import { PRODUCT_COPY } from "@/lib/catalog/copy";

describe("product catalog", () => {
  it("ships nine phase-1 products and hides phase 2 until expert supply exists", () => {
    expect(listCatalogProducts().map((p) => p.id)).toEqual([
      "ai-market-intelligence", "ai-entry-requirements", "ai-partner-research",
      "ai-customer-validation", "ai-local-bmc", "ai-tce-finance", "ai-gtm-operations",
      "pkg-feasibility", "pkg-entry-design"
    ]);
    expect(listCatalogProducts().every((p) => p.phase === 1)).toBe(true);
    expect(CATALOG_PRODUCTS.filter((p) => p.phase === 2)).toHaveLength(8);
    expect(getCatalogService("hx-classification")).toBeNull();
  });

  it("prices every phase-1 specialist at the intro price", () => {
    const specialists = listCatalogProducts().filter((p) => p.productKind === "specialist");
    expect(specialists).toHaveLength(7);
    expect(specialists.every((p) => p.price === 50000)).toBe(true);
    expect(getCatalogService("pkg-feasibility")?.price).toBe(119000);
    expect(getCatalogService("pkg-entry-design")?.price).toBe(249000);
  });

  it("keeps every package cheaper than its de-duplicated parts", () => {
    for (const product of CATALOG_PRODUCTS.filter((p) => p.productKind === "package")) {
      expect(product.price).toBeLessThan(partsTotal(product));
    }
  });

  it("never pays an expert less than the labour it bought", () => {
    for (const product of CATALOG_PRODUCTS.filter((p) => p.labor?.length)) {
      expect(expertPayout(product)).toBeGreaterThanOrEqual(laborCost(product));
    }
  });

  it("has copy and a unique id for every product", () => {
    expect(new Set(CATALOG_PRODUCTS.map((p) => p.id)).size).toBe(CATALOG_PRODUCTS.length);
    for (const product of CATALOG_PRODUCTS) {
      expect(PRODUCT_COPY[product.id], product.id).toBeTruthy();
      for (const id of product.includedAgentIds) {
        expect(CATALOG_PRODUCTS.some((item) => item.id === id), `${product.id} includes ${id}`).toBe(true);
      }
    }
  });

  it("keeps the regulation questions owned by the regulation product so official sources stay enforced", () => {
    const rules = buildSpecialistRules("5.0");
    expect(rules[OFFICIAL_SOURCE_AGENT_ID].questionIds).toContain("bmlc-classification");
    expect(getCatalogService("ai-entry-requirements")?.officialSourceQuestionIds?.length).toBeGreaterThan(0);
    expect(getCatalogService("ai-market-intelligence")?.officialSourceQuestionIds).toEqual([]);
  });

  it("resolves every readiness service tag and expert-matching alias to a product", () => {
    // 이 두 어휘가 상품 태그와 어긋나면 진단에서 서비스로 넘어오는 경로가 조용히 끊긴다.
    // app/services/page.tsx는 전체 목록으로 폴백하고 여정은 빈 목록을 낸다.
    const tags = new Set([
      ...INTAKE_ITEMS.map((item) => item.serviceTag),
      ...TAG_ALIASES.map(([, tag]) => tag)
    ].filter(Boolean));
    const covered = new Set(CATALOG_PRODUCTS.flatMap((product) => product.tags));
    for (const tag of tags) expect(covered.has(tag as string), `unrouted tag: ${tag}`).toBe(true);
  });

  it("localizes both locales for every visible product", () => {
    for (const locale of ["ko", "en"] as const) {
      for (const service of getCatalogServices(locale)) {
        expect(service.title, `${service.id} ${locale} title`).toBeTruthy();
        expect(service.deliverables.length, `${service.id} ${locale} deliverables`).toBeGreaterThan(0);
        expect(service.completionInstructions?.length, `${service.id} instructions`).toBeGreaterThan(0);
      }
    }
  });
});

describe("scope boundary", () => {
  it("never promises expert review while phase 2 is gated", () => {
    for (const locale of ["ko", "en"] as const) {
      for (const service of getCatalogServices(locale)) {
        const text = (service.humanVerification ?? []).join(" ");
        // "전문가 검증"처럼 포함 서비스로 읽히는 표현이 경계 문구에 들어가면 안 된다.
        expect(text, `${service.id} ${locale}`).not.toMatch(/전문가 검증|Expert verification/);
      }
    }
  });

  it("asks for the inputs each product actually needs", () => {
    // 전 상품 동일 boilerplate 재발 방지. B 계층은 회사 내부 정보가 곧 차별점이다.
    expect(getCatalogService("ai-tce-finance")?.requiredInputs?.join(" ")).toContain("자금");
    expect(getCatalogService("ai-gtm-operations")?.requiredInputs?.join(" ")).toContain("권한");
    expect(getCatalogService("ai-market-intelligence")?.requiredInputs?.join(" ")).not.toContain("자금");
    // 패키지는 포함 상품의 입력을 모두 요구한다.
    expect(getCatalogService("pkg-entry-design")?.requiredInputs?.length).toBe(8);
    // 어느 상품이든 공통 입력 한 줄은 맨 앞에 온다.
    for (const service of getCatalogServices("ko")) {
      expect(service.requiredInputs?.[0]).toContain("목표 국가와 고객");
    }
  });

  it("lists only the boundaries that apply to what the product includes", () => {
    // 자금 계획에 파트너 의향이, 시장조사에 세무가 붙던 boilerplate 재발 방지.
    expect(getCatalogService("ai-tce-finance")?.humanVerification?.join(" ")).not.toContain("파트너");
    expect(getCatalogService("ai-market-intelligence")?.humanVerification?.join(" ")).not.toContain("세무");
    expect(getCatalogService("ai-entry-requirements")?.humanVerification?.join(" ")).toContain("관세사");
    // 패키지는 포함 상품의 경계를 모두 보여준다.
    const pkg = getCatalogService("pkg-feasibility")?.humanVerification ?? [];
    expect(pkg.length).toBe(3);
    expect(pkg.join(" ")).toContain("파트너");
  });
});

describe("phase-2 products are complete before they are ever exposed", () => {
  // 2차 상품은 게이트로 가려져 있어 화면 검증이 불가능하다. 플래그를 켜는 순간
  // 빈 블록이나 자기모순 문구가 그대로 나가지 않도록 여기서 미리 막는다.
  const rules = buildSpecialistRules("5.0");
  const every = (locale: "ko" | "en") =>
    CATALOG_PRODUCTS.map((product) => [product, localizeCatalogProduct(product, locale, rules)] as const);

  for (const locale of ["ko", "en"] as const) {
    it(`fills every ${locale} block for all ${CATALOG_PRODUCTS.length} products, phase 2 included`, () => {
      for (const [product, service] of every(locale)) {
        expect(service.title, `${product.id} title`).toBeTruthy();
        expect(service.deliverables.length, `${product.id} deliverables`).toBeGreaterThan(0);
        expect(service.requiredInputs?.length, `${product.id} requiredInputs`).toBeGreaterThan(1);
        expect(service.humanVerification?.length, `${product.id} boundary`).toBeGreaterThan(0);
        expect(service.boundaryIntro, `${product.id} boundaryIntro`).toBeTruthy();
        expect(service.tierLabel, `${product.id} tierLabel`).toBeTruthy();
      }
    });
  }

  it("never lets an expert product cite the very review it sells as its own boundary", () => {
    for (const [product, service] of every("ko")) {
      if (product.tier === "A" || product.tier === "B") continue;
      const boundary = (service.humanVerification ?? []).join(" ");
      // hx-classification이 "관세사 확인이 필요합니다"를 경계로 내걸면 자기모순이다.
      expect(boundary, `${product.id}`).not.toMatch(/확인이 필요합니다\.$/);
      expect(service.boundaryIntro, `${product.id} intro`).not.toContain("전문가 검토는 포함되어 있지 않습니다");
    }
  });

  it("tells A and B buyers plainly that no expert review is included", () => {
    for (const [product, service] of every("ko")) {
      if (product.tier !== "A" && product.tier !== "B") continue;
      expect(service.boundaryIntro).toContain("전문가 검토는 포함되어 있지 않습니다");
    }
  });
});
