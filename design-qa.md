# Comprehensive market report CTA design QA

- Source visual truth: `/var/folders/1_/p9pmlbcj5mxg2k5fpf61nd040000gn/T/codex-clipboard-7d9fb44c-b44a-414c-b696-0504d03bbede.png` (1618 × 370)
- Implementation screenshot: `/private/tmp/report-cta-white-3d-desktop.png` (794 × 162)
- Combined comparison: `/private/tmp/report-cta-design-qa-comparison.jpg` (1658 × 245)
- Viewport: 1290px desktop and 390 × 844 mobile; desktop browser density 2×, implementation crop normalized to CSS size for comparison
- State: authenticated Korean AI GTM assistant with generated research and both report actions available

## Full-view comparison evidence

- The former dark-green-on-dark-green actions are replaced by high-contrast white buttons with dark-green labels.
- Both actions render at the same 306px desktop width and standardized 52px height; the CTA copy, padding, radius, and green container remain unchanged.
- At 390px both buttons render at the same 249px width with no horizontal overflow (`scrollWidth 375 < innerWidth 390`).

## Focused region comparison evidence

- The CTA-only crop shows the white surface, light gray border, 4px lower edge, and soft green shadow clearly against the dark container.
- Both links retain their expected destinations; the report view keeps `target="_blank"` and the HTML action remains a direct download link.
- Browser console check returned no errors.

## Required fidelity surfaces

- Fonts and typography: existing Pretendard family, weight, size, line height, wrapping, and labels are unchanged.
- Spacing and layout rhythm: existing CTA alignment and 24px desktop spacing are preserved; actions are normalized to one 320px column.
- Colors and visual tokens: buttons use `--white` and `--green-dark` with a neutral light edge; contrast is visibly distinct from the container.
- Image quality and asset fidelity: the component contains no raster, logo, illustration, or custom icon assets; none were introduced.
- Copy and content: `종합 시장보고서 보기 ↗` and `HTML 다운로드` are unchanged.

## Findings

- No actionable P0, P1, or P2 differences remain.
- No P3 follow-up is required for the requested scope.

## Comparison history

- Initial state: both buttons shared the container's dark green surface and were difficult to distinguish.
- Fix: applied a CTA-scoped white 3D surface, dark-green label, equal width, and preserved common button interaction geometry.
- Post-fix evidence: desktop comparison shows clear contrast; 390px verification shows equal sizing and no overflow.

## Implementation checklist

- [x] White contrasting button surfaces
- [x] Existing 3D hover/active behavior preserved
- [x] Common 52px height and 12px radius preserved
- [x] Equal action widths
- [x] Desktop and 390px mobile verification
- [x] Link destinations and console check

final result: passed

---

# Design QA — market research sections

- Source visual truth: `/var/folders/1_/p9pmlbcj5mxg2k5fpf61nd040000gn/T/codex-clipboard-13ea34a8-b360-4fa1-8cb6-b044aca6e4da.png`, `/var/folders/1_/p9pmlbcj5mxg2k5fpf61nd040000gn/T/codex-clipboard-fffb9510-7eee-4710-97a1-059cf7ad6b58.png`, plus the requested structural corrections.
- Implementation screenshot: `/private/tmp/global-gtm-research-qa-implementation.png`
- Focused comparisons: `/private/tmp/global-gtm-research-qa-comparison.png`, `/private/tmp/global-gtm-market-qa-comparison.png`
- Viewport: 1280 × 720 CSS px, device pixel ratio 2; browser capture normalized to 1265 px width.
- State: Korean, market overview collapsed; market-trend evidence expanded and collapsed during interaction testing.

## Findings

- No actionable P0/P1/P2 mismatch remains.
- Typography: existing Pretendard hierarchy and weights are unchanged; section headings remain at the shared section-title level.
- Spacing/layout: `시장 범위` is outside the card surface and directly groups the TAM, SAM, SOM, and 교두보 시장 grid. Each evidence disclosure is now inside its corresponding overview card.
- Colors/tokens: existing green, muted text, border, radius, and white surface tokens are preserved.
- Image quality: no image assets are used in these research sections.
- Copy: the Korean section title is exactly `경쟁구도`.
- Interaction: opening `전체 5개 조사 근거 보기` displayed all five evidence items inside the overview card; closing restored the compact card. A fresh QA tab reported no console warnings or errors.

## Comparison history

1. Initial screenshots showed two structural mismatches: evidence disclosure outside the overview card and `시장 범위` inside an empty card.
2. The DOM was corrected by nesting each disclosure inside `ResearchOverviewCard` and restoring `시장 범위` as the section heading above the market-size grid.
3. Post-fix DOM inspection, focused visual comparison, expansion testing, and console inspection found no remaining P0/P1/P2 issue.

## Follow-up polish

- None required for this correction.

final result: passed
