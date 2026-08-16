# Top-Down Market Sizing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AI 시장·경쟁 사전조사의 TAM·SAM·SOM·교두보 시장을 공개자료 기반 Top-Down 방식으로만 계산하고 그 방식을 화면과 보고서에 표시한다.

**Architecture:** 새 조사 출력은 `market-sizing-v3-top-down` 구조를 사용하고 서버가 네 시장규모의 산술과 계층을 재계산한다. 기존 v2 저장 결과는 정규화해 계속 열람하되 캐시에는 사용하지 않고, v3 전환을 위한 1회 재조사 마커를 기존 JSON 상태에 저장한다.

**Tech Stack:** Next.js 15, TypeScript, Zod, Vitest, OpenAI Responses API, Supabase JSONB

## Global Constraints

- 새 외부 의존성과 DB 컬럼을 추가하지 않는다.
- 창업자 가격·고객 수·판매역량·ICP 인구 곱셈을 사전조사 산정에 사용하지 않는다.
- 출처 URL·발행일·최근성·독립성 검증과 TAM ≥ SAM ≥ SOM 검증을 유지한다.
- UI와 HTML 보고서에 `Top-Down` 및 현지화된 보조 설명을 표시한다.
- 기존 `market-sizing-v2` 결과는 읽기 호환을 유지한다.

---

### Task 1: Top-Down v3 스키마와 서버 계산기

**Files:**
- Modify: `lib/market-sizing.ts`
- Modify: `lib/market-sizing.test.ts`
- Modify: `lib/gtm-assistant.ts`
- Modify: `lib/gtm-assistant.test.ts`

**Interfaces:**
- Produces: `marketSizingTopDownEvidenceSchema`, `MarketSizingTopDownEvidence`, `calculateTopDownMarketSizing(evidence, locale)`
- Preserves: `normalizeMarketResearch()`의 기존 v2 카드 읽기 호환

- [ ] **Step 1: Write failing calculator tests**

Add tests that assert:

```ts
expect(result[0]).toMatchObject({ method: "top_down", range: averageTwoPublicTamPaths });
expect(result[1].range).toEqual(multiply(result[0].range, samFilters));
expect(result[2].range).toEqual(multiply(result[1].range, somSharePercent));
expect(result[3].range).toEqual(multiply(result[1].range, beachheadShare));
expect(result.flatMap((entry) => entry.sources).some((source) => source.kind === "founder_input")).toBe(false);
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- lib/market-sizing.test.ts lib/gtm-assistant.test.ts`

Expected: FAIL because the v3 schema, `top_down` method, and Top-Down formulas do not exist.

- [ ] **Step 3: Implement the minimal v3 schema and calculator**

Implement:

```ts
methodologyVersion: z.literal("market-sizing-v3-top-down")
tam.topDownPaths: exactly two independently sourced ranges
sam.filters: geography, customer_fit, channel, regulatory
som.sharePercent: sourced 1–5% range
beachhead.shareOfSam: sourced 0–1 factor range
```

Calculate TAM from the two normalized market-revenue paths, then derive SAM, SOM, and Beachhead from sourced factors. Do not read v2 `bottomUp`, scenario, founder capacity, customer-count, or annual-revenue fields.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- lib/market-sizing.test.ts lib/gtm-assistant.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/market-sizing.ts lib/market-sizing.test.ts lib/gtm-assistant.ts lib/gtm-assistant.test.ts
git commit -m "feat: calculate market sizing top down"
```

### Task 2: 조사 프롬프트·캐시·업그레이드 경로

**Files:**
- Modify: `app/api/gtm-assistant/research/route.ts`
- Modify: `app/api/gtm-assistant/research/route.test.ts`
- Modify: `lib/research-sources.ts`
- Modify: `lib/research-sources.test.ts`

**Interfaces:**
- Consumes: `marketSizingTopDownEvidenceSchema`
- Produces: cache eligibility for `market-sizing-v3-top-down` and `marketSizingV3TopDownUpgradeAttemptedAt`

- [ ] **Step 1: Write failing route and quota tests**

Assert that the sizing prompt explicitly forbids Bottom-up calculation, the route no longer calls or merges private sizing overrides, v2 cache misses, v3 cache hits, and a count-3 v2 plan receives one atomic `top_down_upgrade` reservation only.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- app/api/gtm-assistant/research/route.test.ts lib/research-sources.test.ts`

Expected: FAIL on v3 cache/upgrade and removed override call assertions.

- [ ] **Step 3: Implement the minimal route change**

- Generate v3 evidence with Luna and public web/file-search evidence only.
- Remove the private sizing-parser call and `mergeFounderSizingOverrides` from this route.
- Change cache eligibility to `market-sizing-v3-top-down`.
- Reuse the existing JSON marker CAS pattern with `marketSizingV3TopDownUpgradeAttemptedAt`; do not add a migration.
- Keep the failed-attempt lifecycle and existing confirmed v2 report until v3 persistence succeeds.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- app/api/gtm-assistant/research/route.test.ts lib/research-sources.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/gtm-assistant/research/route.ts app/api/gtm-assistant/research/route.test.ts lib/research-sources.ts lib/research-sources.test.ts
git commit -m "feat: run sizing research top down"
```

### Task 3: 사용자 표시·전체 검증·운영 배포

**Files:**
- Modify: `components/gtm-assistant.tsx`
- Modify: `app/api/gtm-plans/[id]/export/route.ts`
- Modify: `app/api/gtm-plans/[id]/export/route.test.ts`

**Interfaces:**
- Consumes: `GtmMarketSizingEntry.method === "top_down"`
- Produces: `Top-Down · 공개자료 기반 하향식 추정` / `Top-Down · public-evidence estimate`

- [ ] **Step 1: Write failing UI/report assertions**

Assert that cards and exports render `Top-Down` and no longer label v3 results as triangulated or bottom-up.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- components/gtm-assistant.optional-inputs.test.ts app/api/gtm-plans/[id]/export/route.test.ts`

- [ ] **Step 3: Add the shared wording at existing render points**

Map `top_down` to:

```ts
en ? "Top-Down · public-evidence estimate" : "Top-Down · 공개자료 기반 하향식 추정"
```

- [ ] **Step 4: Run focused and full verification**

Run:

```bash
npm test
npm run typecheck
npm run build
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit, push, and verify production**

```bash
git add components/gtm-assistant.tsx app/api/gtm-plans/[id]/export/route.ts app/api/gtm-plans/[id]/export/route.test.ts
git commit -m "feat: label top-down market sizing"
git push origin HEAD:main
```

Confirm the Vercel status for the pushed SHA is `success` and `https://global-gtm.vercel.app/` returns HTTP 200.
