# Kakao Login Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the green Kakao social-auth control with official responsive Kakao login artwork and keep the Supabase-managed Kakao OAuth scope contract.

**Architecture:** Keep `SocialLoginButton` as the semantic and behavioral boundary. Add official locale-specific 300×45 and 600×90 wide images under `public/`, render them with width descriptors and the larger file as the fallback, and limit CSS changes to the Kakao button variant.

**Tech Stack:** Next.js App Router, React 19, global CSS, static PNG assets, Vitest, TypeScript.

## Global Constraints

- Preserve the official 20:3 image ratio; never stretch, crop, or re-typeset the Kakao label.
- Preserve the existing OAuth callback, keyboard focus, disabled state, localized accessible name, and Supabase-managed Kakao scopes.
- Apply the shared component change to both `/signin` and `/signup`.
- Add no dependency or new component abstraction.

---

### Task 1: Official responsive assets

**Files:**
- Create: `public/auth/kakao-login-ko-300.png`
- Create: `public/auth/kakao-login-ko-600.png`
- Create: `public/auth/kakao-login-en-300.png`
- Create: `public/auth/kakao-login-en-600.png`

**Interfaces:**
- Consumes: official Kakao Developers wide button PNGs.
- Produces: locale-specific 300w/600w `srcSet` paths for `SocialLoginButton`.

- [ ] **Step 1: Copy the supplied Korean wide assets**

Copy `kakao_login_medium_wide.png` to `public/auth/kakao-login-ko-300.png` and `kakao_login_large_wide.png` to `public/auth/kakao-login-ko-600.png` without re-encoding.

- [ ] **Step 2: Download the official English wide assets**

Use Kakao Developers resource download and store the matching 300×45 and 600×90 PNG files as the English 1x/2x paths.

- [ ] **Step 3: Verify dimensions**

Run:

```bash
sips -g pixelWidth -g pixelHeight public/auth/kakao-login-*.png
```

Expected: `*-300.png` files are 300×45 and `*-600.png` files are 600×90.

### Task 2: Shared Kakao control

**Files:**
- Modify: `components/social-login-button.tsx`
- Modify: `app/globals.css`
- Modify: `DESIGN.md`

**Interfaces:**
- Consumes: `locale: "ko" | "en"`, existing `signIn()` behavior, Task 1 asset paths.
- Produces: a semantic full-width button containing an official responsive image.

- [ ] **Step 1: Render official image sources**

In the Kakao branch, render an empty-alt image with locale-specific `src` and `srcSet`; keep a localized `aria-label` on the parent button. During `pending`, render the existing localized status text instead of the static image. Let Supabase request its documented Kakao defaults and configure those consent items in Kakao Developers.

- [ ] **Step 2: Apply official surface geometry**

Remove Kakao-only padding, green background, and shadow. Set `overflow: hidden`, `aspect-ratio: 20 / 3`, and make the image `width: 100%; height: 100%; object-fit: contain`. Preserve the shared focus outline, active scale, and disabled opacity.

- [ ] **Step 3: Update the design source of truth**

Replace the outdated statement that Kakao uses the shared green surface with the official Kakao-provided image rule and the 1x/2x responsive behavior.

### Task 3: Verification and production delivery

**Files:**
- Verify all changed files.

**Interfaces:**
- Consumes: completed shared button and static assets.
- Produces: verified production deployment.

- [ ] **Step 1: Run repository checks**

Run:

```bash
npm test
npm run typecheck
npm run build
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 2: Verify locally in the browser**

Check `/signin`, `/signup`, `/en/signin`, and `/en/signup` at desktop and narrow width. Confirm the image ratio, unbroken text, focus outline, and OAuth navigation.

- [ ] **Step 3: Commit and push**

Stage only the design, implementation, and four asset files. Commit with `feat: use official Kakao login button` and push the current branch.

- [ ] **Step 4: Deploy and smoke-test production**

Deploy the verified revision to Vercel Production. Confirm `/signin` and `/en/signin` render the official buttons and Kakao OAuth begins successfully.
