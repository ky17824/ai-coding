# Landing footer typography design QA

- Source visual truth: `/var/folders/1_/p9pmlbcj5mxg2k5fpf61nd040000gn/T/codex-clipboard-f92341bb-ddc9-4434-9dcf-f74a5747822b.png` (2418 × 1134)
- Implementation screenshots: `landing-footer-ko.png` and `landing-footer-en.png` (1265 × 889 each)
- Viewport: 1280 × 900 CSS px; browser capture normalized to CSS pixels, excluding the scrollbar
- State: signed out, Korean and English landing-page footer sections

## Findings

- No actionable P0, P1, or P2 differences remain.
- Typography: the steps heading, first card heading, and CTA heading all render with Pretendard Variable at 21px, weight 700, normal line height, and normal letter spacing in both locales.
- Spacing and layout: the existing section spacing, four-card grid, 80px CTA band, button alignment, and rounded corners remain intact.
- Colors and tokens: the existing paper, green, mint, border, and button treatments are unchanged.
- Image quality and assets: no image or icon assets were changed or approximated.
- Copy: Korean and English CTA copy remains unchanged from the approved previous revision.

## Comparison evidence

- Full-view comparison: the supplied result and both focused implementation captures were opened in the same comparison input.
- Focused evidence: computed styles for `.section--steps .section-heading h2`, `.step-card h3`, and `.cta-band h2` matched exactly across font family, size, weight, line height, and letter spacing.
- Responsive evidence: Korean and English both retained 21px headings at 390 × 844 without horizontal overflow.
- Primary interaction: CTA links remain `/assessment` and `/en/assessment`.
- Console: no browser console errors.

## Comparison history

- Pass 1: the section heading was 17.06px and the CTA heading was 30px, so neither matched the 21px card heading.
- Fix: applied one shared typography rule to the section heading and CTA heading.
- Pass 2: all three headings matched at 21px/700 with normal line height and letter spacing; no P0/P1/P2 findings remained.

## Implementation checklist

- [x] Korean steps heading bolded and matched to the card heading
- [x] Korean CTA heading matched to the steps heading
- [x] English shared typography matched in the same way
- [x] Existing card sizes and CTA height preserved
- [x] CTA destinations and console errors checked

final result: passed
