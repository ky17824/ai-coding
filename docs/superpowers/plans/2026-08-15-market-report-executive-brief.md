# Market Report Executive Brief Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 선택된 A안에 맞춰 종합 시장보고서를 결론 우선 구조로 재배치하고, 본문 URL을 번호 인용과 마지막 참고문헌으로 바꾼다.

**Architecture:** 기존 인증·조직 범위·번역·HTML escaping을 유지한다. 보고서 export 라우트 안에 최초 등장 순서로 출처를 중복 제거하는 작은 순수 함수를 두고, 기존 문자열 치환 조립을 직접적인 섹션 조립으로 단순화한다.

**Tech Stack:** Next.js Route Handler, TypeScript, Vitest, 기존 inline HTML/CSS

## Global Constraints

- 새 프레임워크·의존성·DB 마이그레이션을 추가하지 않는다.
- 본문에는 원시 URL을 노출하지 않고 `[n]` 인용번호만 표시한다.
- 유효한 HTTP(S) URL만 참고문헌 제목 링크로 사용한다.
- 기존 조직 권한, locale, HTML escaping, XSS 방어를 유지한다.
- 320px 반응형과 인쇄 스타일을 함께 검증한다.

---

### Task 1: 안전한 출처 번호부

**Files:**
- Modify: `app/api/gtm-plans/[id]/export/route.ts`
- Test: `app/api/gtm-plans/[id]/export/route.test.ts`

**Interfaces:**
- Consumes: 시장규모·시장동향·경쟁사·상충 근거의 `{ title, url, publisher, publishedAt, checkedAt, kind }` 출처
- Produces: `buildReferenceIndex(sources)`의 최초 등장 순서 참고문헌과 `citationNumbers(sources, index)`의 중복 없는 번호 배열

- [ ] **Step 1: 실패 테스트 작성**

```ts
it("deduplicates references in first-appearance order and rejects unsafe links", () => {
  const index = buildReferenceIndex([
    { title: "A", url: "https://a.example/report", publisher: "A" },
    { title: "A duplicate", url: "https://a.example/report", publisher: "A" },
    { title: "Unsafe", url: "javascript:alert(1)", publisher: "B" }
  ]);
  expect(index.references.map((entry) => entry.number)).toEqual([1, 2]);
  expect(index.references[0].href).toBe("https://a.example/report");
  expect(index.references[1].href).toBeNull();
  expect(citationNumbers(index, [index.references[0].source, index.references[0].source])).toEqual([1]);
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test -- 'app/api/gtm-plans/[id]/export/route.test.ts'`
Expected: FAIL because the citation helpers do not exist.

- [ ] **Step 3: 최소 구현**

`safeHref`의 HTTP(S) 규칙을 재사용해 URL 또는 서지정보 키로 중복 제거하고, 최초 등장 순서의 1-based 번호를 반환한다. 인용번호는 동일 출처를 한 번만 반환한다.

- [ ] **Step 4: 집중 테스트 통과 확인**

Run: `npm test -- 'app/api/gtm-plans/[id]/export/route.test.ts'`
Expected: PASS.

### Task 2: A안 HTML과 반응형·인쇄 스타일

**Files:**
- Modify: `app/api/gtm-plans/[id]/export/route.ts`
- Test: `app/api/gtm-plans/[id]/export/route.test.ts`

**Interfaces:**
- Consumes: Task 1의 출처 번호부
- Produces: 표지 → 메타데이터 → 경영진 요약·의사결정 → 시장 근거 → 참고문헌 순서의 self-contained HTML

- [ ] **Step 1: HTML 계약 테스트 작성**

테스트 fixture에 시장규모·동향·경쟁사·상충 근거와 중복·장문 URL을 넣고 다음을 검증한다.

```ts
expect(html).toContain('class="report-cover"');
expect(html).toContain('id="ref-1"');
expect(html).toContain('href="#ref-1"');
expect(html.indexOf("경영진 요약")).toBeLessThan(html.indexOf("시장 범위와 규모"));
expect(html.indexOf("참고문헌")).toBeGreaterThan(html.indexOf("가정과 한계"));
expect(html).not.toContain("https://example.com/a/very/long/path?inside=body");
expect(html).toContain("@media(max-width:700px)");
expect(html).toContain("@media print");
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test -- 'app/api/gtm-plans/[id]/export/route.test.ts'`
Expected: FAIL on the new structure and bibliography assertions.

- [ ] **Step 3: 직접 섹션 조립으로 단순화**

기존 `html.replace(...)` 기반 후처리를 제거한다. 시장규모 카드, 시장동향, 경쟁사, 상충 근거에는 인용번호만 넣고, 마지막에 모든 출처의 번호·제목·발행기관·날짜·유형을 출력한다. 참고문헌 제목만 안전한 외부 링크로 만든다.

- [ ] **Step 4: A안 시각 규칙 적용**

기존 cream·white·deep-green 토큰, Pretendard, 12·16px radius를 사용한다. 표지는 deep-green, 메타데이터는 4열/2열/1열, 모바일 표는 카드형 행, 인쇄에서는 toolbar·shadow를 제거한다.

- [ ] **Step 5: 집중 테스트 통과 확인**

Run: `npm test -- 'app/api/gtm-plans/[id]/export/route.test.ts'`
Expected: PASS.

### Task 3: 전체 검증과 운영 배포

**Files:**
- Verify: `app/api/gtm-plans/[id]/export/route.ts`
- Verify: `app/api/gtm-plans/[id]/export/route.test.ts`

**Interfaces:**
- Consumes: Task 1·2의 완성된 보고서
- Produces: 검증된 commit과 Vercel 운영 배포

- [ ] **Step 1: 정적·회귀 검증**

Run: `npm test -- 'app/api/gtm-plans/[id]/export/route.test.ts' && npm run typecheck && npm test && npm run build && git diff --check`
Expected: all commands exit 0.

- [ ] **Step 2: 로컬 시각 검증**

로그인된 실제 보고서 또는 동일 fixture HTML을 1440px와 320px에서 확인한다. 본문 카드에 원시 URL이 없고, 번호 인용과 마지막 참고문헌이 연결되며 가로 overflow가 없어야 한다.

- [ ] **Step 3: 커밋과 운영 배포**

```bash
git add DESIGN.md docs/superpowers app/api/gtm-plans/[id]/export/route.ts app/api/gtm-plans/[id]/export/route.test.ts
git commit -m "feat: redesign comprehensive market report"
git push origin HEAD:main
vercel --prod --yes
```

- [ ] **Step 4: 운영 URL 확인**

운영 보고서 URL에서 HTTP 200, A안 표지, `[n]` 인용, 마지막 참고문헌, 인쇄 버튼을 확인한다.
