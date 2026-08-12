# Sign-in design QA

- Source visual truth: `/private/var/folders/1_/p9pmlbcj5mxg2k5fpf61nd040000gn/T/codex-clipboard-e15d501a-9227-4aa2-9812-0e3ba5a78bb6.png` (988 × 1452) and `/private/var/folders/1_/p9pmlbcj5mxg2k5fpf61nd040000gn/T/codex-clipboard-aab99ec4-8409-479a-b821-475ec0d1a6fb.png` (694 × 160)
- Implementation screenshots: `/private/tmp/global-gtm-signin-desktop.png` (944 × 1464) and `/private/tmp/global-gtm-signin-mobile.png` (320 × 900)
- Combined comparison: `/private/tmp/global-gtm-signin-comparison.png` (1888 × 1564)
- CSS viewports: 944 × 1464 desktop and 320 × 900 mobile; browser density 1×
- State: Korean sign-in page with Google authentication enabled

## Full-view comparison evidence

- The card is centered at both viewports with 0px center deviation.
- Desktop card width is 420px. At 320px, the card is 288px wide with 16px safe space on both sides and no horizontal overflow.
- The requested heading is present at 24px, exactly two-thirds of the former 36px size.
- The Google and password sign-in buttons both retain the standardized 52px height and shared typography.

## Focused comparison evidence

- The Google button uses a white surface, light gray boundary, dark label, and the official multicolor Google G asset.
- The logo loads successfully at 18 × 18px. Input fields accept text, both sign-in buttons remain enabled, and the browser reports no console errors.

## Required fidelity surfaces

- Fonts and typography: existing Pretendard system and standardized button weight preserved; heading reduced to 24px without clipping.
- Spacing and layout rhythm: narrower centered card, responsive page padding, and responsive card padding prevent small-screen clipping.
- Colors and visual tokens: existing green primary login button retained; Google button follows the supplied white/gray reference.
- Image quality and asset fidelity: official Google-hosted multicolor G source is stored locally as a sharp SVG asset.
- Copy and content: heading reads `글로벌 진출 여정을 시작하세요`; existing authentication copy and behavior are unchanged.

## Findings

- No actionable P0, P1, or P2 differences remain.
- P3: the Google button keeps the product's standardized subtle depth instead of becoming a completely flat Google control; this is intentional to honor the existing button rule.

## Comparison history

- Initial implementation used an external Google image URL; browser verification showed the logo did not load.
- Replaced it with the official Google color G stored locally. Post-fix capture confirms successful loading and matching placement.
- Added responsive width and padding after the small-form-factor requirement. Post-fix 320px capture confirms 16px symmetric margins and no overflow.

## Implementation checklist

- [x] Requested Korean heading and 24px size
- [x] White Google button with official logo
- [x] Existing primary login button standard preserved
- [x] Narrower centered card
- [x] 320px no-clipping verification
- [x] Input and console checks

final result: passed
