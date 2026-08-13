# Global GTM Platform Design Unification

## Goal

Apply the approved Borderless translation of the Starbucks-inspired design principles to every product surface without adding a framework, then verify, commit, and deploy to production.

## Decision

- Keep Next.js, React, Pretendard Variable, `app/globals.css`, existing route structure, and existing shared components.
- Use one role-based palette, one type scale, one spacing scale, one card/field/pill radius system, and one motion contract.
- Preserve every flow, locale, data contract, permission check, accessibility label, and report/export behavior.
- Add only one missing shared interaction: a native `<details>` mobile navigation in `SiteHeader`.
- Treat semantic status colors as exceptions with named tokens, not page-specific decoration.

## Surface coverage

1. Public: Korean/English landing, service catalog/detail, legal pages.
2. Authentication: sign in, sign up, password reset/update, onboarding, account.
3. Product: assessment/question/result, dashboard, AI GTM assistant, journey.
4. Operations: provider center/forms, order detail, admin dashboard/company detail.
5. Deliverables: comprehensive HTML market report and print mode.

## Implementation tasks

### 1. Foundation and source of truth

- Finalize `DESIGN.md` visual language and component ownership.
- Normalize `:root` roles for canvas/surface/text/green/semantic states/spacing/radius/shadow/motion.
- Keep no new dependency and no second token layer.

### 2. Shared chrome and primitives

- Align `body`, `SiteHeader`, mobile navigation, `.button`, `.panel`, fields, links, badges, notices, and table surfaces.
- Keep touch targets at least 42px and visible focus states.
- Keep reduced-motion behavior.

### 3. Page families

- Public and auth pages: warm canvas, white surfaces, deep-green conversion bands.
- App pages: consistent page heading rhythm, white cards, restrained status colors.
- Assessment/dashboard/assistant/journey: consistent section hierarchy and responsive grids.
- Services/provider/orders/admin/legal: reuse the same page, form, table, and panel rules.
- Report: match web palette, typography, geometry, and print behavior.

### 4. Responsive and visual QA

- Public routes at 390px, 768px, and 1440px.
- Auth route at 390px and 1440px.
- Signed-in routes verified through build/tests and any available authenticated browser state.
- Check CSS loading, horizontal overflow, focus/touch visibility, KO/EN route parity, and browser console errors.

### 5. Release

- Run `npm test`, `npm run typecheck`, `npm run build`, and `git diff --check`.
- Review the final diff for behavior changes and unrelated files.
- Commit one cohesive design-system change.
- Deploy the verified commit to Vercel production and smoke-test the production landing/sign-in routes.

## Acceptance criteria

- No new packages or framework layers.
- All buttons share pill geometry, common height, focus, hover, active, and disabled behavior.
- All content panels/cards use the documented card radius and restrained elevation.
- Warm canvas, white surface, and deep-green bands are consistent across page families.
- Page title/section title/body/label hierarchy is consistent in Korean and English.
- Mobile navigation exposes the same primary routes that disappear from the desktop nav.
- No structural gradient, glassmorphism, or decorative blur remains.
- No production route loses behavior, accessibility semantics, or localization.
- Tests, typecheck, build, visual smoke checks, commit, and production deployment succeed.

## Risks and mitigations

- Global CSS regressions: verify representative page families and production build before commit.
- Dev/build `.next` cache collision: stop dev server before production build, restart it only after build verification.
- Auth-only visual coverage: preserve markup and shared classes; use authenticated browser state when available and rely on build/component structure otherwise.
- Report style drift: keep one self-contained report stylesheet with the same design values and print rules.
