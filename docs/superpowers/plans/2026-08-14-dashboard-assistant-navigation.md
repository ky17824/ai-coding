# Dashboard AI GTM Assistant Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a desktop-only AI GTM Assistant link on dashboards with an assessment and rename the no-plan dashboard CTA while keeping both links bound to that assessment.

**Architecture:** Reuse `SiteHeader` with one optional `assistantHref` prop. Build a desktop-only navigation array from that prop, keep the existing mobile array unchanged, and have the dashboard pass its loaded assessment ID. No new route, client state, or dependency is needed.

**Tech Stack:** Next.js App Router, React server components, TypeScript, Vitest.

## Global Constraints

- Display `AI GTM 어시스턴트` only in the user dashboard desktop navigation.
- Display `AI GTM Assistant` in English.
- Do not add the link to mobile menus, other pages, or dashboards without an assessment.
- Keep navigation order `준비도 진단 → AI GTM 어시스턴트 → GTM 여정`.
- The no-plan CTA is `AI로 계획 만들기` / `Create plan with AI` and links to `/assistant/{assessmentId}`.
- Add no dependency, route, or client state.

---

### Task 1: Lock navigation and CTA behavior with tests

**Files:**
- Modify: `components/site-header.test.tsx`
- Modify: `app/dashboard/page.test.ts`

**Interfaces:**
- Consumes: `SiteHeader({ compact?, locale, assistantHref? })`
- Produces: regression coverage for desktop-only placement, localization, and dashboard link/copy.

- [ ] **Step 1: Write failing header tests**

Render `SiteHeader({ locale: "ko", assistantHref: "/assistant/assessment-1" })` and its English equivalent. Assert the desktop navigation contains the assistant label between readiness assessment and GTM journey, and the mobile navigation does not contain the assistant link.

- [ ] **Step 2: Write failing dashboard source test**

Assert `app/dashboard/page.tsx` passes `assistantHref={\`/assistant/${assessment.id}\`}` to `SiteHeader`, contains `AI로 계획 만들기` / `Create plan with AI`, and retains `` `/assistant/${assessment.id}` `` for the no-plan path.

- [ ] **Step 3: Run targeted tests and verify failure**

Run: `npm test -- components/site-header.test.tsx app/dashboard/page.test.ts`

Expected: FAIL because `assistantHref` and the new CTA copy do not exist yet.

### Task 2: Implement the minimum shared-header change

**Files:**
- Modify: `components/site-header.tsx`
- Modify: `lib/i18n.ts`
- Modify: `app/dashboard/page.tsx`
- Test: `components/site-header.test.tsx`
- Test: `app/dashboard/page.test.ts`

**Interfaces:**
- Consumes: dashboard assessment ID and `localizedPath()`.
- Produces: `SiteHeader({ compact?, locale, assistantHref? })` with the assistant link only in `main-nav`.

- [ ] **Step 1: Add localized header copy**

Add `assistant: "AI GTM 어시스턴트"` to Korean header copy and `assistant: "AI GTM Assistant"` to English header copy.

- [ ] **Step 2: Add the optional desktop link**

Add `assistantHref?: string` to `SiteHeader`. Keep the existing `navItems` unchanged for mobile. Create the desktop array by inserting `[assistantHref, m.header.assistant]` after assessment only when the prop exists, then render that array in `main-nav`.

- [ ] **Step 3: Pass the dashboard assessment link and update CTA copy**

Render `<SiteHeader compact locale={locale} assistantHref={\`/assistant/${assessment.id}\`} />`. Change only the no-plan CTA branch to `AI로 계획 만들기` / `Create plan with AI`; preserve active-plan and draft-plan behavior.

- [ ] **Step 4: Run targeted tests**

Run: `npm test -- components/site-header.test.tsx app/dashboard/page.test.ts`

Expected: PASS.

- [ ] **Step 5: Run full verification**

Run: `npm test`

Run: `npm run typecheck`

Run: `npm run build`

Run: `git diff --check`

Expected: all commands pass.

- [ ] **Step 6: Commit and deploy**

Commit the four code/test files, push the feature branch and `main`, deploy with `npx vercel --prod --yes`, then smoke-test the production dashboard desktop and mobile navigation.
