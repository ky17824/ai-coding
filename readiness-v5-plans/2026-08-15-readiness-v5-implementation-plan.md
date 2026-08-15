# Readiness v5.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve every historical v4.0 assessment while launching a versioned 46-question v5.0 readiness assessment with conditional visibility, consistent Korean/English copy, fair scoring, and compatible dashboard, AI, admin, and document flows.

**Architecture:** Keep the current 55-question catalog frozen as the v4.0 base. Build v5.0 by applying explicit copy/option/weight overrides and a retired-ID set, then route every form, scoring, dashboard, assistant, admin, and paid-AI consumer through a shared version-aware catalog and applicability resolver. Persist only `survey_version` and `sales_motion`; derive required, deferred, and structurally inapplicable question sets from those fields, target-country context, and stored answers.

**Tech Stack:** Next.js App Router, TypeScript, React, Vitest, Zod, Supabase PostgreSQL/RLS, existing CSS design tokens.

## Global Constraints

- Final product specification: `readiness-v5-plans/2026-08-15-readiness-v5-final-design.md`.
- Final rewritten options: `readiness-v5-plans/2026-08-15-readiness-v5-options-final.md`.
- v4.0 remains exactly 55 questions; v5.0 is exactly 46 questions split 13/18/15 with seven Critical questions.
- Never recalculate or overwrite historical v4.0 aggregate scores, Gate messages, actions, or completed stage summaries on read.
- `deferred_unmet` counts as zero in readiness scoring but is excluded from completion progress; `structural_not_applicable` is excluded from score, Gate, action, and progress.
- Preserve the v4 threshold scoring contract: levels 1–2 earn zero question weight and levels 3–4 earn the full question weight. Do not introduce partial 1–4 weighted scoring in v5.
- The server is authoritative for survey version, applicability, submission validation, scoring, and AI research eligibility.
- `READINESS_V5_ENABLED` is a server-only rollout switch. Keep it false for the dual-read deploy; the client never selects a survey version.
- No new runtime dependency, UI framework, state-management library, analytics SDK, or question-generation model.
- Do not change payment price, refund, OAuth, TAM/SAM/SOM/Beachhead methodology, or historical data.
- Keep existing paid-service `max(55)`/`limit(55)` compatibility where historical 55-ID snapshots are valid.
- Use current design tokens, panels, buttons, focus rings, and 42px minimum interactive targets.

---

## Gate 0: Start from the correct Git baseline

**Files:** None

**Evidence:** `codex/unify-button-system` is 6 commits behind and 3 commits ahead of `main`; the three ahead changes already have equivalent newer commits on `main`.

- [ ] **Step 1: Verify the relationship before creating a worktree**

```bash
git fetch origin
git rev-list --left-right --count main...codex/unify-button-system
git log --oneline main..codex/unify-button-system
git log --oneline codex/unify-button-system..main
```

Expected: the relationship remains explainable and no uncommitted source edit needs recovery.

- [ ] **Step 2: Create an isolated implementation branch from current main**

Use `superpowers:using-git-worktrees` and create `codex/readiness-v5` from `main`. Copy only the three authoritative readiness v5 documents (`final-design`, `options-final`, `implementation-plan`) into that worktree; do not cherry-pick the three superseded commits.

- [ ] **Step 3: Establish a green baseline**

```bash
npm test
npm run typecheck
npm run build
git diff --check
```

Expected: all commands pass before product code changes.

---

### Task 1: Freeze v4.0 and create the versioned catalog

**Files:**
- Modify: `lib/intake-questions.ts`
- Modify: `lib/intake-questions.en.ts`
- Modify: `lib/intake-questions.en.test.ts`
- Modify: `lib/readiness.test.ts`
- Create: `lib/intake-questions-v5.test.ts`

**Interfaces:**
- Produces: `SurveyVersion`, `LATEST_SURVEY_VERSION`, `getIntakeQuestions(locale, version)`, `getQuestionNumber(questionId, version)`, `getEffectiveQuestionWeight(questionId, version)`.
- Consumes later: every readiness, UI, admin, assistant, and AI service consumer.

- [ ] **Step 1: Write failing catalog-version tests**

```ts
it("keeps v4 frozen and exposes the exact v5 catalog", () => {
  expect(getIntakeQuestions("ko", "4.0")).toHaveLength(55);
  expect(getIntakeQuestions("ko", "5.0")).toHaveLength(46);
  expect(getIntakeQuestions("ko", "5.0").filter((q) => q.critical)).toHaveLength(7);
  expect(getIntakeQuestions("ko", "5.0").map((q) => q.question))
    .toEqual(FINAL_V5_KO_QUESTIONS);
});

it("retires exactly the approved nine v4 questions", () => {
  const retired = new Set([
    "mvc-stop-criteria",
    "res-key-person-risk",
    "mkt-icp-source",
    "mkt-inbound-signal",
    "mkt-bias-check",
    "bmlc-hq-gap",
    "lpa-pricing-payment",
    "org-decision-cases",
    "alloc-conditional-limit"
  ]);
  const v5Ids = new Set(getIntakeQuestions("ko", "5.0").map((q) => q.id));
  expect(new Set(getIntakeQuestions("ko", "4.0").filter((q) => !v5Ids.has(q.id)).map((q) => q.id)))
    .toEqual(retired);
});

it("keeps KO and EN structural metadata identical", () => {
  const shape = (locale: "ko" | "en") => getIntakeQuestions(locale, "5.0")
    .map(({ id, itemId, weight, critical, options }) =>
      ({ id, itemId, weight, critical: Boolean(critical), optionCount: options.length }));
  expect(shape("en")).toEqual(shape("ko"));
});

it("marks exactly the 17 rewritten IDs as unsafe to copy from v4 to v5", () => {
  expect(V5_REWRITTEN_IDS).toEqual(new Set([
    "mvc-resource-priority", "pmf-paid-conversion", "pmf-buying-roles",
    "mkt-icp-count", "mkt-country-compare", "bmlc-na-basis",
    "bmlc-local-practice", "lpa-net-price", "lpa-journey-blocker",
    "test-defects", "test-no-discount", "test-counter-evidence",
    "partner-shortfall", "contract-control", "contract-dependency-limit",
    "alloc-capacity", "alloc-concentration"
  ]));
});
```

- [ ] **Step 2: Run the new tests and confirm they fail**

```bash
npx vitest run lib/intake-questions-v5.test.ts lib/intake-questions.en.test.ts lib/readiness.test.ts
```

Expected: failures because versioned catalog APIs do not exist.

- [ ] **Step 3: Add the minimal versioned catalog types and overrides**

```ts
export type SurveyVersion = "4.0" | "5.0";
export const LATEST_SURVEY_VERSION: SurveyVersion = "5.0";

const V5_RETIRED_IDS = new Set<string>([
  "mvc-stop-criteria",
  "res-key-person-risk",
  "mkt-icp-source",
  "mkt-inbound-signal",
  "mkt-bias-check",
  "bmlc-hq-gap",
  "lpa-pricing-payment",
  "org-decision-cases",
  "alloc-conditional-limit"
]);

export function getIntakeQuestions(locale: Locale, version: SurveyVersion = "4.0") {
  const base = localizeV4Questions(locale);
  if (version === "4.0") return base;
  return base
    .filter((question) => !V5_RETIRED_IDS.has(question.id))
    .map((question) => applyV5Overrides(question, locale));
}
```

Use explicit v5 maps for all 46 exact KO/EN question strings, the exact 17 option/follow-up/action overrides from `2026-08-15-readiness-v5-options-final.md`, and Q17's v5-only effective weight `2.0`. Do not mutate `INTAKE_QUESTIONS`; it remains the frozen v4.0 base.

- [ ] **Step 4: Add stable version-local numbering**

```ts
export function getQuestionNumber(questionId: string, version: SurveyVersion) {
  const index = getIntakeQuestions("ko", version).findIndex((q) => q.id === questionId);
  return index < 0 ? null : index + 1;
}
```

The number derives from the full version catalog, never from the currently visible subset.

Export `isAnswerCompatibleAcrossVersions(questionId, from, to)`. It returns true for the same version and for the 29 retained, non-rewritten IDs from v4.0 to v5.0; every other cross-version direction returns false.

- [ ] **Step 5: Run catalog tests**

```bash
npx vitest run lib/intake-questions-v5.test.ts lib/intake-questions.en.test.ts lib/readiness.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add lib/intake-questions.ts lib/intake-questions.en.ts lib/intake-questions.en.test.ts lib/intake-questions-v5.test.ts lib/readiness.test.ts
git commit -m "feat: add versioned readiness question catalog"
```

---

### Task 2: Implement one applicability resolver and versioned scoring

**Files:**
- Modify: `lib/readiness.ts`
- Modify: `lib/types.ts`
- Modify: `lib/readiness.test.ts`
- Create: `lib/readiness-applicability.test.ts`

**Interfaces:**
- Consumes: catalog APIs from Task 1.
- Produces: `SalesMotion`, `QuestionApplicability`, `resolveAssessmentQuestions`, version-aware validation/completion/scoring/insights.

- [ ] **Step 1: Write failing table-driven branch tests**

```ts
const cases = [
  { salesMotion: "direct", targetCountry: "일본", paid: 4, tested: 4,
    notApplicable: ["partner-actual-work", "partner-economics", "partner-shortfall", "contract-control", "contract-exit", "contract-switch-cost", "contract-dependency-limit"] },
  { salesMotion: "unknown", targetCountry: "일본", paid: 4, tested: 4,
    deferred: ["partner-actual-work", "partner-economics", "partner-shortfall", "contract-control", "contract-exit", "contract-switch-cost", "contract-dependency-limit"] },
  { salesMotion: "partner", targetCountry: "", paid: 4, tested: 4, deferredRange: [14, 31] },
  { salesMotion: "partner", targetCountry: "일본", paid: 4, tested: 2, deferred: ["test-defects"] },
  { salesMotion: "partner", targetCountry: "일본", paid: 2, tested: 4,
    deferred: ["test-no-discount"], notApplicable: ["alloc-concentration"] }
] as const;
```

Also assert structural state wins when a direct-partner question also falls inside the no-country range.

Add Gate tests proving a required Critical answer at level 3 or 4 still fails without evidence, while levels 1 and 2 do not require evidence input and remain blockers.

- [ ] **Step 2: Write scoring/progress tests before implementation**

```ts
expect(result.progress).toEqual({ answered: requiredIds.length, required: requiredIds.length, percent: 100 });
expect(result.deferredIds.length).toBeGreaterThan(0);
expect(result.overallScore).toBeLessThan(100);
expect(allPositiveDirect.overallScore).toBe(100);
expect(allPositiveDirect.stages.map((stage) => stage.positiveScore)).toEqual([30, 40, 30]);
expect(allPositiveDirect.domainScores).toEqual({ early: 100, preparing: 100, ready: 100 });
```

Add a v4 fixture assertion that serialized results are byte-for-byte unchanged.

- [ ] **Step 3: Run the tests and confirm failure**

```bash
npx vitest run lib/readiness-applicability.test.ts lib/readiness.test.ts
```

- [ ] **Step 4: Implement applicability separately from answer state**

```ts
export type SalesMotion = "direct" | "partner" | "hybrid" | "unknown";
export type QuestionApplicability = "required" | "deferred_unmet" | "structural_not_applicable";

export interface AssessmentQuestionContext {
  surveyVersion: SurveyVersion;
  salesMotion: SalesMotion | null;
  targetMarket?: TargetMarketContext | null;
  answers: ReadinessAnswer[];
}

export interface ResolvedAssessmentQuestions {
  requiredIds: string[];
  deferredIds: string[];
  notApplicableIds: string[];
  applicabilityById: ReadonlyMap<string, QuestionApplicability>;
  deferredGroups: Array<{
    reason: "target_country_missing" | "sales_motion_unknown" | "local_test_not_started" | "paid_evidence_missing";
    questionIds: string[];
  }>;
}
```

Implement explicit ID sets for the seven partner-only questions and Q14~Q31. Do not infer behavior from translated question text.

Dispatch applicability by `surveyVersion`: v4.0 returns every catalog question as required; v5.0 applies the final branch table. Treat both rule sets as immutable once shipped—future semantic changes require a new survey version.

Assign each deferred question to one reason using the exact precedence `target_country_missing`, `sales_motion_unknown`, `local_test_not_started`, `paid_evidence_missing`; assert no question ID occurs in two deferred groups.

- [ ] **Step 5: Route every readiness function through the resolver**

```ts
questionsOfStage(stageId, locale, surveyVersion)
isCompleteStageAnswerSet(answers, completedStageId, context)
validateAssessmentAnswers(answers, completedStageId, context, locale)
calculateReadiness(answers, targetMarket, locale, surveyVersion, salesMotion)
buildStageAnswerInsights(answers, stageId, locale, surveyVersion, salesMotion, targetMarket)
```

Required unanswered IDs block submission. Deferred IDs require no answer but contribute zero. Structural N/A IDs contribute neither weight nor action. Normalize the three stage denominators with resolved effective weights. Keep the persisted `domainScores`/`assessments.domain_scores` contract as `{ early, preparing, ready }`; do not overload it with the 12 `INTAKE_ITEMS`. If an item-level breakdown is needed for a view, derive it locally from versioned answers without persisting a second aggregate.

Generate one notice/Gate reason per `deferredGroups` entry and no question-level action for hidden deferred IDs. This is a regression requirement: blank target country must not create 18 repeated actions.

- [ ] **Step 6: Run tests and static checks**

```bash
npx vitest run lib/readiness-applicability.test.ts lib/readiness.test.ts
npm run typecheck
```

- [ ] **Step 7: Commit**

```bash
git add lib/readiness.ts lib/types.ts lib/readiness.test.ts lib/readiness-applicability.test.ts
git commit -m "feat: add adaptive readiness applicability and scoring"
```

---

### Task 3: Add assessment version fields without changing current writes

**Files:**
- Create: `supabase/migrations/012_readiness_v5_dual_read.sql`

**Interfaces:**
- Produces: `assessments.survey_version`, `assessments.sales_motion`.
- Current app continues to create v4.0 rows until Task 5.

- [ ] **Step 1: Write Migration A**

```sql
alter table public.assessments
  add column if not exists survey_version text,
  add column if not exists sales_motion text;

update public.assessments set survey_version = '4.0' where survey_version is null;

alter table public.assessments
  alter column survey_version set default '4.0',
  alter column survey_version set not null;

alter table public.assessments
  add constraint assessments_survey_version_check
    check (survey_version in ('4.0', '5.0')) not valid,
  add constraint assessments_sales_motion_check
    check (sales_motion is null or sales_motion in ('direct', 'partner', 'hybrid', 'unknown')) not valid,
  add constraint assessments_v5_sales_motion_check
    check (survey_version = '4.0' or sales_motion is not null) not valid;

alter table public.assessments validate constraint assessments_survey_version_check;
alter table public.assessments validate constraint assessments_sales_motion_check;
alter table public.assessments validate constraint assessments_v5_sales_motion_check;
```

Supabase applies a numbered migration once. A same-name constraint therefore stops the migration visibly; do not add drop-and-replace logic that could hide an unexpected production definition.

- [ ] **Step 2: Rehearse Migration A on a disposable/local Supabase database**

```sql
select survey_version, count(*) from public.assessments group by survey_version;
select count(*) from public.assessments where survey_version is null;
```

Expected: every historical row is `4.0`, null count is zero, and row/answer counts are unchanged.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/012_readiness_v5_dual_read.sql
git commit -m "feat: add readiness survey version metadata"
```

---

### Task 4: Make the assessment API version- and branch-aware

**Files:**
- Modify: `app/api/assessments/route.ts`
- Create: `app/api/assessments/route.test.ts`
- Create: `lib/readiness-rollout.ts`
- Create: `lib/readiness-rollout.test.ts`
- Modify: `lib/pending-assessment.ts`
- Modify: `lib/pending-assessment.test.ts`

**Interfaces:**
- Consumes: resolver from Task 2 and DB fields from Task 3.
- Produces: authoritative v5 assessment writes and versioned pending payloads.

- [ ] **Step 1: Write API contract tests**

The POST body accepts the existing fields plus v5-only metadata:

```ts
{
  completedStageId?: "early" | "preparing" | "ready";
  answers: ReadinessAnswer[];
  salesMotion?: "direct" | "partner" | "hybrid" | "unknown";
  targetMarket: { targetCountry: string; targetCustomerSegment: string; confirmed: boolean };
  locale: "ko" | "en";
}
```

When the server rollout version is v5.0, require `completedStageId` and `salesMotion`. When it is v4.0, preserve the current stage-completion contract and ignore optional v5 metadata. Test that valid v5 branch-specific payloads may contain fewer than 46 answers; every required question through `completedStageId` is present; deferred, structural, duplicate, retired, unknown, and later-stage IDs are rejected; the server writes the server-selected version; and current answer/action write compensation still cleans up partial failure.

Add rollout tests proving unset/false selects `4.0`, true selects `5.0`, and a request body cannot override the server-selected version.

- [ ] **Step 2: Run route and pending tests to confirm failure**

```bash
npx vitest run app/api/assessments/route.test.ts lib/readiness-rollout.test.ts lib/pending-assessment.test.ts
```

- [ ] **Step 3: Implement authoritative validation**

Remove `answers.max(55)` as a completion contract. A historical capacity guard may remain, but completion must use resolver IDs. Return:

```ts
{
  assessmentId,
  surveyVersion,
  applicability: { requiredIds, deferredIds, notApplicableIds },
  readiness
}
```

Use one server-only helper:

```ts
export function getNewAssessmentSurveyVersion(): SurveyVersion {
  return process.env.READINESS_V5_ENABLED === "true" ? "5.0" : "4.0";
}
```

- [ ] **Step 4: Version the pending assessment payload**

```ts
interface PendingAssessment {
  surveyVersion: SurveyVersion;
  completedStageId: "early" | "preparing" | "ready";
  salesMotion?: SalesMotion;
  targetMarket: TargetMarketContext;
  answers: ReadinessAnswer[];
}
```

Treat every legacy naked-array payload as v4.0, because a partial v4 payload cannot be distinguished safely from v5 by question IDs. New saves always use the versioned object. If the pending and server rollout versions match, revalidate with that catalog before restoration. For v4→v5, restore only `isAnswerCompatibleAcrossVersions(...)` answers and their evidence, leave incompatible values unrestored, and return to the form instead of auto-submitting. Never convert v5→v4.

- [ ] **Step 5: Run tests and commit**

```bash
npx vitest run app/api/assessments/route.test.ts lib/readiness-rollout.test.ts lib/pending-assessment.test.ts
npm run typecheck
git add app/api/assessments/route.ts app/api/assessments/route.test.ts lib/readiness-rollout.ts lib/readiness-rollout.test.ts lib/pending-assessment.ts lib/pending-assessment.test.ts
git commit -m "feat: validate adaptive readiness submissions"
```

---

### Task 5: Update the assessment form and responsive UX

**Files:**
- Modify: `components/assessment-form.tsx`
- Modify: `app/assessment/page.tsx`
- Modify: `app/globals.css`
- Modify: `app/assessment/page.test.tsx`

**Interfaces:**
- Consumes: rollout version, versioned catalog, compatibility helper, and resolver.
- Produces: one consistent desktop/mobile flow and the Task 4 POST payload.

- [ ] **Step 1: Write component behavior tests**

Test the resolver and submission-state behavior without adding a DOM-test dependency:

- `direct` removes seven partner controls and shows one exclusion summary;
- `unknown` shows one deferred summary rather than seven radio groups;
- blank target country replaces Q14~Q31 with one numbered deferred panel;
- Q22 level 3 makes Q23 required;
- Q08 level 3 reveals Q25 and Q46;
- progress uses `answered required / required` and reaches 100 with deferred questions;
- submitted payload contains only current required IDs;
- same-version re-diagnosis restores all active answers;
- v4→v5 re-diagnosis restores only the 29 unchanged questions and resets all 17 rewritten questions;

Keep dormant-answer restoration, focus behavior, and 320px overflow as manual browser checks in Task 9; the repository currently runs Vitest in `node` and has no DOM-testing dependency.

- [ ] **Step 2: Add `salesMotion` before the first scored question**

Reuse existing panel, form control, button, and focus styles.

```ts
const salesMotionOptions = {
  ko: { direct: "직접 진출", partner: "파트너 활용", hybrid: "혼합 방식", unknown: "아직 미정" },
  en: { direct: "Direct", partner: "Partner-led", hybrid: "Hybrid", unknown: "Undecided" }
};
```

For v5 the field is required, unscored, and editable. Do not render it for a v4 pending or rollback flow. `app/assessment/page.tsx` supplies the server-selected rollout version; a versioned pending payload may auto-submit only when it matches that version.

- [ ] **Step 3: Derive rendered questions from applicability**

Keep dormant answers in component state, but build submissions from `requiredIds`. Render one panel per contiguous deferred range/reason and show `Q14~Q31` rather than dynamically renumbering.

For `?new=1`, select the previous assessment's `survey_version,sales_motion`. Restore all active answers when the version matches; for v4→v5 restore only the 29 compatible answers; for v5→v4 restore none. Carry target-country/customer context and its confirmation timestamp, but never use that context to auto-answer changed questions. Show the restore result once in the standard notice panel.

- [ ] **Step 4: Separate progress from readiness feedback**

Display:

```text
작성 진행률 100% · 보류 18개 · 해당 없음 0개
```

Use `aria-live="polite"` for summary changes. Move focus only after submit validation fails.

- [ ] **Step 5: Simplify mobile layout with existing CSS**

At `max-width: 900px`, collapse explanatory stage content and keep the current stage, progress, deferred count, and stage navigation reachable. Do not add JavaScript viewport detection.

- [ ] **Step 6: Run component checks and commit**

```bash
npm test -- assessment
npm run typecheck
git add components/assessment-form.tsx app/assessment/page.tsx app/assessment/page.test.tsx app/globals.css
git commit -m "feat: add adaptive readiness assessment flow"
```

---

### Task 6: Preserve historical dashboard, summaries, and admin views

**Files:**
- Modify: `app/dashboard/page.tsx`
- Modify: `components/answer-question-chart.tsx`
- Modify: `lib/stage-summary-service.ts`
- Modify: `app/admin/page.tsx`
- Modify: `app/admin/companies/[id]/page.tsx`
- Modify: `lib/admin-metrics.ts`
- Modify: `app/dashboard/page.test.ts`
- Modify: `lib/stage-summary-service.test.ts`
- Modify: `lib/admin-metrics.test.ts`

**Interfaces:**
- Consumes: stored assessment aggregates and versioned catalog.
- Produces: version-correct historical and current displays.

- [ ] **Step 1: Write historical and v5 display tests**

Assert that v4 uses 55 numbering and stored aggregates; v5 uses Q01~Q46 numbering and omits structural N/A bars; v5 shows response/deferred/N/A counts; retired v4 questions still resolve; unknown versions fall back to stored action text; and completed stage summaries are reused.

- [ ] **Step 2: Stop read-time aggregate recomputation**

Use `assessments.overall_score`, `domain_scores`, `status_label`, `gate_messages`, and `stage_summary` as source of truth. Use versioned calculations only for question-level view models and new writes.

- [ ] **Step 3: Version all catalog lookups**

Include `survey_version,sales_motion` in assessment selects. Replace array-index numbering with `getQuestionNumber(questionId, surveyVersion)`.

- [ ] **Step 4: Separate admin metrics by version**

Never show one combined completion percentage across v4 and v5. Label details `준비도 진단 응답 · v5.0` / `Readiness assessment responses · v5.0`.

- [ ] **Step 5: Run tests and commit**

```bash
npm test -- dashboard stage-summary admin
npm run typecheck
git add app/dashboard/page.tsx app/dashboard/page.test.ts components/answer-question-chart.tsx lib/stage-summary-service.ts lib/stage-summary-service.test.ts app/admin/page.tsx 'app/admin/companies/[id]/page.tsx' lib/admin-metrics.ts lib/admin-metrics.test.ts
git commit -m "feat: display readiness results by survey version"
```

---

### Task 7: Replace fixed-55 assumptions in assistant and paid AI contracts

**Files:**
- Modify: `app/assistant/[assessmentId]/page.tsx`
- Modify: `app/api/gtm-assistant/research/route.ts`
- Modify: `app/api/gtm-assistant/turn/route.ts`
- Modify: `components/gtm-assistant.tsx`
- Modify: `lib/gtm-assistant.ts`
- Modify: `app/api/gtm-plans/[id]/export/route.ts`
- Modify: `lib/ai-agent-services.ts`
- Modify: `app/api/orders/route.ts`
- Modify: `app/api/ai-agent-runs/[orderId]/route.ts`
- Modify: `lib/ai-agent-report.ts`
- Create: `supabase/migrations/013_ai_agent_readiness_snapshot.sql`
- Modify: `lib/gtm-assistant.test.ts`
- Modify: `lib/ai-agent-services.test.ts`
- Modify: `lib/ai-agent-report.test.ts`
- Create: `app/api/gtm-assistant/research/route.test.ts`
- Create: `app/api/ai-agent-runs/[orderId]/route.test.ts`

**Interfaces:**
- Consumes: version-aware completion predicate and catalog.
- Produces: `getMarketResearchScope`, correct research scope, and immutable paid scope.

- [ ] **Step 1: Write assistant scope tests**

```ts
expect(getMarketResearchScope(completedV5)).toBe("sellability_review");
expect(getMarketResearchScope(v5WithDeferred)).toBe("market_preresearch");
expect(getMarketResearchScope(completedV4)).toBe("sellability_review");
```

No test or implementation may use raw answer count as the eligibility rule.

- [ ] **Step 2: Replace fixed-count scope logic**

```ts
export function getMarketResearchScope(input: {
  reachedReadyStage: boolean;
  deferredQuestionIds: readonly string[];
  criticalSatisfied: boolean;
  requiredQuestionsComplete: boolean;
}): "market_preresearch" | "sellability_review" {
  return input.reachedReadyStage &&
    input.deferredQuestionIds.length === 0 &&
    input.criticalSatisfied &&
    input.requiredQuestionsComplete
      ? "sellability_review"
      : "market_preresearch";
}
```

Keep historical `max(55)`/`limit(55)` only where they are capacity guards.

- [ ] **Step 3: Make AI service mapping explicitly v5 for new checkout**

Validate that each active v5 question belongs to exactly one primary AI specialist. Continue accepting historical snapshots containing retired v4 IDs.

- [ ] **Step 4: Freeze assessment identity at checkout/reservation**

For new orders store:

```ts
{
  assessmentId: string | null;
  surveyVersion: "4.0" | "5.0" | null;
  resolvedQuestionIds: string[];
}
```

Execution reads that assessment only. For older snapshots missing the fields, atomically select at most once the latest assessment with `completed_at <= order.created_at`; if none existed at purchase, execute without readiness evidence. Never attach a later re-diagnosis.

Implement `013_ai_agent_readiness_snapshot.sql` as a small `bind_ai_agent_readiness_snapshot(p_order_id uuid, p_readiness_snapshot jsonb)` security-definer RPC. It locks the order and run, accepts only an AI order in the buyer's organization, and merges the following object into `scope_snapshot.readiness` only when that key is absent and `generation_count = 0`:

```json
{
  "assessmentId": "uuid-or-null",
  "surveyVersion": "4.0-or-5.0-or-null",
  "resolvedQuestionIds": []
}
```

The route must construct this value from the checkout snapshot and call the binding RPC before the existing `reserve_ai_agent_generation` RPC. For legacy orders only, it may query the latest assessment with `completed_at <= order.created_at` before binding. The binding RPC owns the compare-and-set, so two concurrent requests cannot bind different assessments. After binding, answer loading must use `scope_snapshot.readiness.assessmentId`, never a fresh `latest assessment` query. Keep the existing reservation RPC signature unchanged so migration 013 can be applied before the app deploy without breaking the running version.

Add SQL/route regressions for: new order snapshot, legacy order one-time fallback, no assessment at purchase, concurrent reservation, and later re-diagnosis not replacing the frozen assessment.

- [ ] **Step 5: Replace public fixed-number copy**

Use `완료한 준비도 진단` / `completed readiness assessment`. Keep `55문항` only in explicit v4 history or v4 document titles.

- [ ] **Step 6: Run focused tests and commit**

```bash
npm test -- gtm-assistant ai-agent services orders
npm run typecheck
git add app/assistant app/api/gtm-assistant components/gtm-assistant.tsx lib/gtm-assistant.ts lib/gtm-assistant.test.ts app/api/gtm-plans lib/ai-agent-services.ts lib/ai-agent-services.test.ts app/api/orders 'app/api/ai-agent-runs/[orderId]/route.ts' 'app/api/ai-agent-runs/[orderId]/route.test.ts' lib/ai-agent-report.ts lib/ai-agent-report.test.ts supabase/migrations/013_ai_agent_readiness_snapshot.sql
git commit -m "feat: make AI workflows readiness-version aware"
```

---

### Task 8: Update product copy, DESIGN, and versioned questionnaires

**Files:**
- Modify: `lib/i18n.ts`
- Modify: `DESIGN.md`
- Modify: `scripts/build-questionnaire-docx.js`
- Modify: `scripts/render-questionnaire-docx.py`
- Create: `docs/survey/글로벌 진출 준비도 진단 설문 46문항 v5.0.docx`
- Create: `docs/survey/Global Market Entry Readiness Assessment 46 Questions v5.0.docx`
- Modify: `README.md`

**Interfaces:**
- Consumes: versioned catalog.
- Produces: documentation aligned with deployed behavior.

- [ ] **Step 1: Add a version argument to document generation**

```bash
node scripts/build-questionnaire-docx.js --locale ko --version 5.0 output.docx
node scripts/build-questionnaire-docx.js --locale en --version 5.0 output-en.docx
```

Keep v4.0 generation available and unchanged.

- [ ] **Step 2: Remove current-product fixed-55 copy**

Change only current product claims. Preserve historical audit/version documents and v4 document titles.

- [ ] **Step 3: Update DESIGN.md invariants**

Document survey versioning, three applicability states, completion-vs-readiness denominators, sales-motion behavior, target-country deferral, research eligibility, and paid snapshot immutability.

- [ ] **Step 4: Generate and inspect KO/EN v5 documents**

Verify 46 questions, four options per question, seven Critical markers, matching IDs/order, and no Korean platform copy in the EN document.

- [ ] **Step 5: Commit**

```bash
git add lib/i18n.ts DESIGN.md README.md scripts/build-questionnaire-docx.js scripts/render-questionnaire-docx.py 'docs/survey/글로벌 진출 준비도 진단 설문 46문항 v5.0.docx' 'docs/survey/Global Market Entry Readiness Assessment 46 Questions v5.0.docx'
git commit -m "docs: publish readiness v5 questionnaires and rules"
```

---

### Task 9: Full verification, staged migration, and production rollout

**Files:**
- No other feature edits unless a failing check identifies a concrete defect.

**Interfaces:**
- Consumes all prior tasks.
- Produces a verified release and reversible server-side rollout switch.

- [ ] **Step 1: Run full local verification**

```bash
npm test
npm run typecheck
npm run build
git diff --check
```

- [ ] **Step 2: Run the manual branch matrix**

Verify KO and EN for direct/partner/hybrid/unknown; blank/entered/confirmed target country; Q22 at level 2/3; Q08 at level 2/3/4; 320/390/768/1440px; keyboard-only completion and error recovery; legacy v4 and new v5 dashboard; stage-summary reuse; v4/v5 assistant research scope; and historical/new paid AI snapshots.

- [ ] **Step 3: Apply migrations, then deploy dual-read code with v5 disabled**

Verify row counts before and after migrations 012 and 013. Deploy with `READINESS_V5_ENABLED=false`. The app must read both versions while new writes remain v4.0.

- [ ] **Step 4: Enable v5 writes and smoke production**

Set `READINESS_V5_ENABLED=true`, redeploy, then create one KO and one EN v5 assessment. Confirm stored version, sales motion, answer count, score, Gate, dashboard, assistant scope, and admin label.

- [ ] **Step 5: Verify the real rollback path**

Set the flag back to false in a preview environment and confirm a new assessment writes v4.0 while existing v5 results remain readable. Do not change the DB default, drop columns, delete v5 rows, or rewrite historical rows.

- [ ] **Step 6: Final review and release commit**

Run `superpowers:requesting-code-review`, resolve every Critical/High/Medium finding, then rerun the full verification commands before the release commit.

---

## Final Acceptance Checklist

- [ ] v4.0 is 55 questions and v5.0 is 46 questions with 13/18/15 stages and seven Critical questions.
- [ ] The nine retired IDs exactly match the final design.
- [ ] KO questions match the final design exactly and EN structure is identical.
- [ ] Required/deferred/N/A branch behavior matches every final rule.
- [ ] Completion progress, readiness score, Gate, and action semantics are not conflated.
- [ ] All-positive applicable v5 answers produce overall 100, stage contributions 30/40/30, and persisted stage percentages `{ early: 100, preparing: 100, ready: 100 }`.
- [ ] Stored v4 results and paid snapshots remain unchanged and executable.
- [ ] Dashboard, summary, assistant, export, admin, pending-login return, and DOCX paths are version-aware.
- [ ] No fixed answer count decides research eligibility.
- [ ] No current-product `55문항` copy remains outside explicit v4 history.
- [ ] Test, typecheck, build, diff-check, responsive, keyboard, migration, and production smoke gates pass.
