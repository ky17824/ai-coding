# AI GTM Assistant market-sizing integration plan

## Requirements summary

- Replace LAM with **Beachhead Market** everywhere in new research results.
- Produce defensible TAM, SAM, SOM, and Beachhead estimates from founder context plus current public sources.
- Keep Readiness Stages 1–2 as preliminary research: sizing is allowed, but sellability must remain unassessed.
- Show ranges, formulas, source URLs/dates, assumptions, confidence, and missing inputs instead of unsupported point estimates.
- Apply the attached `market-sizing.skill` methodology: overseas two-path top-down, bottom-up counting, triangulation, sensitivity, and validation gates.
- Preserve existing stored JSONB research and exports without silently overwriting confirmed reports.

## Evidence from the current implementation

- `lib/gtm-assistant.ts:68-74` accepts four free-text sizing cards and does not require numeric values, formulas, dated sources, distinct labels, or calculation relationships.
- `lib/gtm-assistant.ts:417-426` validates URLs only for trends and competitors; market-sizing sources are titles without URLs.
- `app/api/gtm-assistant/research/route.ts:108-146` performs trends, competition, and four market sizes in one model call with a three-search instruction.
- `app/api/gtm-assistant/research/route.ts:17-32` receives a revenue-model description but no structured price, annual frequency/ACV, reachable-customer count, channel scope, or capacity inputs required for bottom-up sizing.
- `components/gtm-assistant.tsx:281` renders only estimate and method; assumptions and source titles are not visible.
- `supabase/migrations/006_target_market_and_research.sql:6-10` stores research as JSONB, so the payload can evolve without a table migration if a compatibility normalizer is added.

## Decision

Use the skill as a **methodology contract**, not as a prompt attachment alone. Split source acquisition from deterministic calculation and validation.

The deployed Next.js API cannot execute a Codex `.skill` package. Loading it into file search would make it reference material only. Its rules therefore need to be encoded in a versioned market-sizing prompt, structured schema, calculation module, and tests.

## Proposed data contract

Each result uses an internal key (`tam`, `sam`, `som`, `beachhead`) and contains:

- status: `estimated | insufficient_evidence`
- annual range: low/base/high, currency, price basis, and reference year
- method: `top_down | bottom_up | triangulated`
- formula and numeric inputs
- each input's kind: `fact | founder_input | proxy_assumption`
- source title, URL, publisher, publication date, and checked date
- confidence and evidence gaps
- sensitivity drivers
- top-down and bottom-up cross-check values plus variance percentage
- methodology version, initially `market-sizing-v1`

Legacy `LAM` records are normalized to the `beachhead` key when read. New UI labels are `Beachhead Market` in English and `교두보 시장(Beachhead Market)` in Korean.

## Sizing method

1. Define market boundary: offering/category, target country, buyer/end user, included/excluded products, annual revenue unit, and reference year.
2. Collect current facts in a dedicated research pass:
   - overseas top-down A: target-country category revenue;
   - overseas top-down B: local parent market × category/product/customer filters;
   - bottom-up: countable customers/end users × annual revenue per customer;
   - regulation, reachable channels, competitor revenue, CAGR, and currency basis.
3. Collect only the missing founder inputs before spending a research run: expected price/ACV, annual purchase frequency or contract term, initial channel/account scope, and 3-year delivery capacity. Unknown values may use sourced benchmark ranges and must be marked as proxy assumptions.
4. Calculate in application code rather than accepting arithmetic strings from the model:
   - TAM = customer/end-user count × annual revenue per customer;
   - SAM = TAM filtered by geography, ICP/product fit, reachable channels, and regulatory eligibility;
   - SOM = the lower of demand-share range and operational sales capacity over a stated 3–5 year horizon;
   - Beachhead = directly counted first segment × annual revenue per end user, never a percentage of SOM.
5. Triangulate top-down and bottom-up. Variance within 20% is converged; above 20% is low-confidence and above 100% requires category-definition review before publishing a base estimate.
6. Apply gates: TAM ≥ SAM ≥ SOM, recent sources, no customer-revenue-as-own-TAM, SOM share normally 0.5–5%, Beachhead direct count and Aulet three-condition check, plus sensitivity ranges.

## Implementation steps

1. Add a pure `lib/market-sizing.ts` calculation/validation module and focused tests. No new dependency.
2. Replace the free-text sizing schema in `lib/gtm-assistant.ts` and `lib/types.ts`; remove LAM and add a legacy payload normalizer.
3. Split `app/api/gtm-assistant/research/route.ts` into evidence collection and calculation. Keep competitor/trend research separate so market sizing gets enough source coverage.
4. Add four structured sizing inputs to the founder workflow or ask them only when missing before the research call. A `needs_inputs` response must not consume the three-research limit.
5. Expand `components/gtm-assistant.tsx` cards to show range/year/currency, formula, confidence, assumptions, and clickable sources; update the report export route similarly.
6. Add integration fixtures for B2C, B2B SaaS, and insufficient-evidence cases, then run a shadow comparison against existing generated reports before enabling the new contract.

## Acceptance criteria

- Every successful result contains exactly TAM, SAM, SOM, and Beachhead keys once.
- Every numeric input is traceable to a founder input, source URL/date, or explicitly labeled proxy assumption.
- Overseas results contain two independent top-down paths and one bottom-up path, or return `insufficient_evidence` with named gaps.
- Arithmetic is recomputed server-side and rejects non-finite/negative values and TAM/SAM/SOM hierarchy violations.
- Beachhead is directly counted and includes the three market-cohesion checks and an adjacent-market expansion path.
- Triangulation variance and confidence are displayed; results do not present a false base estimate when validation gates fail.
- Existing LAM JSON renders as Beachhead through the compatibility adapter; confirmed historic research is not overwritten.
- Korean/English UI and exported reports show the same values, formulas, and sources.
- Unit, route integration, export, and signed-in browser tests pass; logs capture methodology version, source count, confidence, and failure reason without founder PII.

## Risks and mitigations

- Paywalled or thin country/category data: use ranges and `insufficient_evidence`; never replace a required source with an unlabeled proxy.
- Latency and search cost: run focused queries in parallel where supported, cache verified source facts by country/category/date, and separate retries from the three-report cap.
- Model arithmetic or source hallucination: model supplies evidence candidates only; server parses, recomputes, validates URLs/dates, and applies gates.
- Legacy JSON shape: normalize on read and regenerate only at the user's request.
- Category mismatch: record inclusion/exclusion definitions and block triangulation until definitions are reconciled.

## Verification

- Unit: formulas, ranges, currency/year normalization, hierarchy, source recency, triangulation thresholds, Beachhead direct-count rule, and LAM legacy mapping.
- Integration: mocked OpenAI evidence response → validated sizing result → JSONB save without consuming a run on `needs_inputs`.
- E2E: founder inputs → AI research → four auditable cards → confirmation → export in Korean and English.
- Observability: monitor insufficient-evidence rate, median source count, convergence rate, p95 latency, model/search cost, and sizing-validation failures.
