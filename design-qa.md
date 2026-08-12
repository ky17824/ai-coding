# Landing footer design QA

- Source visual truth: `/var/folders/1_/p9pmlbcj5mxg2k5fpf61nd040000gn/T/codex-clipboard-95fb77fd-e468-429d-9f48-7a61abac15d8.png` (972 × 422) and `/var/folders/1_/p9pmlbcj5mxg2k5fpf61nd040000gn/T/codex-clipboard-6eecfc30-54f3-4c4c-92f1-6bc4df80abcb.png` (2484 × 428)
- Implementation screenshots: `landing-footer-ko.png` (1265 × 1463) and `landing-footer-en.png` (1265 × 1512)
- Viewport: 1280 × 720 CSS px, device scale 1; full-page captures preserve the rendered page width excluding the scrollbar
- State: signed out, Korean and English landing pages

## Findings

- No actionable P0, P1, or P2 differences remain.
- Typography: the steps heading renders at 17.06px on desktop, one third of the previous 51.2px computed size; the CTA heading renders at 30px, two pixels below the previous 32px.
- Spacing and layout: the desktop CTA band renders at exactly 80px, half the previous 160px minimum height, without clipping or horizontal overflow.
- Colors and tokens: the existing paper, green, mint, border, radius, and button treatments are unchanged.
- Image quality and assets: no image or icon assets were changed or approximated.
- Copy: Korean CTA is `글로벌 진출 준비도를 확인해 보세요.` and English CTA is `Check Your Global Expansion Readiness.`

## Comparison evidence

- Full-view comparison: both source images and both implementation captures were opened together. The requested size reductions preserve alignment, hierarchy, colors, rounded corners, and CTA placement.
- Focused evidence: computed styles verified the exact font and box values. A 390 × 844 responsive pass showed no horizontal overflow; the existing mobile column layout remains intact.
- Primary interaction: CTA links remain `/assessment` and `/en/assessment`; the signed-out Korean flow redirected to `/signin` as expected.
- Console: no browser console errors.

## Comparison history

- Pass 1: the CTA measured 84.5px because its content stack exceeded the new minimum height.
- Fix: reduced the CTA heading top margin from 10px to 4px.
- Pass 2: the CTA measured exactly 80px; no P0/P1/P2 findings remained.

## Implementation checklist

- [x] Korean and English steps heading reduced to one third
- [x] Korean and English CTA heading reduced by 2px
- [x] Korean and English CTA copy updated
- [x] Desktop CTA band reduced to half height
- [x] Desktop and mobile layout checked
- [x] CTA destinations and console errors checked

final result: passed
