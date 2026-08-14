# Landing AI Expert CTA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the landing page's legacy human-expert card with a localized AI expert CTA that links to the service catalog.

**Architecture:** Reuse the existing `step-card` component styling and localized path helper. Only the fourth step becomes a link; the other three remain informational articles.

**Tech Stack:** Next.js, React, TypeScript, Vitest

## Global Constraints

- Reuse the existing `step-card` CSS without adding new styles.
- Apply equivalent Korean and English copy.
- Link through `localizedPath("/services", locale)`.

---

### Task 1: Localized AI expert CTA

**Files:**
- Modify: `lib/i18n.ts`
- Modify: `components/landing.tsx`
- Test: `components/landing.test.tsx`

**Interfaces:**
- Consumes: `localizedPath(path, locale)` and `m.steps.items`.
- Produces: a localized fourth step linking to the AI expert catalog.

- [ ] **Step 1: Write the failing test**

Assert the landing source contains `localizedPath("/services", locale)` and the translation source contains the new Korean and English titles.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- --run components/landing.test.tsx`

- [ ] **Step 3: Implement the minimal change**

Update the fourth localized item and render it as `<Link className="step-card">`; keep the first three items as `<article className="step-card">`.

- [ ] **Step 4: Verify**

Run the focused test, full test suite, typecheck, build, and `git diff --check`.

- [ ] **Step 5: Commit and deploy**

Commit the implementation, push `main`, deploy with Vercel, and smoke-test Korean and English landing pages.
