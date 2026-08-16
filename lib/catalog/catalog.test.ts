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
