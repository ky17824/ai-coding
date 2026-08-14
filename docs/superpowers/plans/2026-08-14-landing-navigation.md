# Landing Navigation Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Limit the landing-page desktop and mobile menus to readiness assessment and AI expert services without changing account controls or navigation on other pages.

**Architecture:** Reuse `SiteHeader` with one optional `landing` boolean. The header selects a two-item navigation array only when that prop is true; `Landing` is the only caller that supplies it. Existing default and dashboard-assistant variants remain unchanged.

**Tech Stack:** Next.js App Router, React server components, TypeScript, Vitest.

## Global Constraints

- Landing desktop and mobile menus contain only `준비도 진단 → AI 전문가 서비스`.
- English landing copy is `Assessment → AI Expert Services`.
- Keep language and account controls unchanged.
- Keep navigation on non-landing pages unchanged.
- Add no route, dependency, or client state.

---

### Task 1: Lock landing-only navigation with tests

**Files:**
- Modify: `components/site-header.test.tsx`
- Create: `components/landing.test.tsx`

**Interfaces:**
- Consumes: `SiteHeader({ compact?, locale, assistantHref?, landing? })` and `Landing({ locale })`.
- Produces: regression coverage for landing desktop/mobile menus and the landing caller contract.

- [ ] **Step 1: Write failing header tests**

Call `SiteHeader({ locale: "ko", landing: true })` and its English equivalent. Assert direct links in both `.main-nav` and `.mobile-nav__menu` are only `/assessment` and `/services` with the approved labels.

- [ ] **Step 2: Write a failing landing caller test**

Read `components/landing.tsx` and assert it renders `<SiteHeader locale={locale} landing />`.

- [ ] **Step 3: Run targeted tests and verify failure**

Run: `npm test -- components/site-header.test.tsx components/landing.test.tsx`

Expected: FAIL because `landing` and `AI Expert Services` copy do not exist.

### Task 2: Implement the landing header variant

**Files:**
- Modify: `components/site-header.tsx`
- Modify: `components/landing.tsx`
- Modify: `lib/i18n.ts`
- Test: `components/site-header.test.tsx`
- Test: `components/landing.test.tsx`

**Interfaces:**
- Consumes: existing localized `/assessment` and `/services` routes.
- Produces: `SiteHeader({ compact?, locale, assistantHref?, landing? })` with a two-item landing menu.

- [ ] **Step 1: Add landing-only localized copy**

Add `aiServices: "AI 전문가 서비스"` to Korean header copy and `aiServices: "AI Expert Services"` to English header copy while preserving `services`.

- [ ] **Step 2: Select the landing navigation array**

Add `landing?: boolean` to `SiteHeader`. When true, use `[["/assessment", m.header.assessment], ["/services", m.header.aiServices]]` for both desktop and mobile; otherwise retain the existing arrays and optional assistant insertion.

- [ ] **Step 3: Enable the variant only from Landing**

Change the landing header call to `<SiteHeader locale={locale} landing />`.

- [ ] **Step 4: Run targeted tests**

Run: `npm test -- components/site-header.test.tsx components/landing.test.tsx`

Expected: PASS.

- [ ] **Step 5: Run full verification**

Run: `npm test`

Run: `npm run typecheck`

Run: `npm run build`

Run: `git diff --check`

Expected: all commands pass.

- [ ] **Step 6: Commit and deploy**

Commit the five code/test files, push the feature branch and `main`, deploy with `npx vercel --prod --yes`, and smoke-test the production landing menu in Korean and English.
