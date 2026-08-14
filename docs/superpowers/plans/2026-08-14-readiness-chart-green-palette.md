# Readiness Chart Green Palette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dashboard readiness chart's yellow family with the existing Borderless green visual system without changing chart behavior.

**Architecture:** Keep the React component and status model unchanged. Add five semantic chart tokens to `:root`, then reuse them across bars, legends, detail borders, and status chips.

**Tech Stack:** Next.js, React, CSS, Vitest

## Global Constraints

- Add no dependency or framework.
- Preserve status patterns and text so color is not the only differentiator.
- Preserve scoring, bar heights, selection, keyboard behavior, and responsive layout.

---

### Task 1: Recolor readiness status surfaces

**Files:**
- Modify: `app/globals.css`
- Test: `app/readiness-chart-colors.test.ts`

**Interfaces:**
- Consumes: existing `.answer-question-bar--*`, `.answer-question-legend--*`, and `.answer-question-detail--*` classes.
- Produces: `--chart-*` semantic color tokens used by all readiness chart status surfaces.

- [ ] **Step 1: Write a failing CSS contract test**

Assert that the stylesheet defines the five chart tokens, uses them in chart selectors, and no longer contains the legacy yellow chart colors.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- app/readiness-chart-colors.test.ts`

- [ ] **Step 3: Implement the minimum CSS change**

Add semantic chart tokens and replace only the chart, legend, detail-border, and status-chip colors.

- [ ] **Step 4: Verify the focused and broad checks**

Run: `npm test -- app/readiness-chart-colors.test.ts components/answer-question-chart.test.tsx`, `npm test`, `npm run typecheck`, and `npm run build`.

- [ ] **Step 5: Commit and deploy**

Commit the design, test, and CSS change; push the current branch and `main`; deploy to the linked Vercel production project and smoke-check the dashboard.
