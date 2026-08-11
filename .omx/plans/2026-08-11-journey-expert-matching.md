# GTM 여정 전문가 연결 계획

## Requirements Summary

- `/journey`의 텍스트형 `전문가 연결 →`을 기존 버튼 스타일로 바꿔 실행 항목 안에서 명확한 보조 행동으로 표시한다.
- 법률·세무·규제뿐 아니라 유료 실증시험(PoC), 첫 주문, 현지 고객 검증처럼 외부 실행 역량이 필요한 계획도 전문가 연결 후보로 판정한다.
- 기존 `gtm_plan_items.expert_required`, `service_tag`, `expert_reason`, `handoff_brief`를 재사용한다.
- 버튼은 `service_tag`와 일치하는 관리자 승인·게시 서비스만 우선 노출한다.

## Acceptance Criteria

- `expert_required=true`인 계획 항목에는 `/journey`에서 `전문가 연결` 버튼이 보인다.
- 제목에 `유료 PoC`, `첫 주문`, `paid pilot`, `first order`가 포함된 기존 계획도 버튼이 보인다.
- 버튼의 목적지는 `/services?tag=<정규화된 태그>`이며, 일치하는 게시 서비스가 있으면 그 서비스만 먼저 표시한다.
- 일치하는 게시 서비스가 없으면 빈 화면 대신 전체 승인 서비스를 표시하고 안내한다.
- 일반 내부 실행 항목에는 전문가 버튼이 추가되지 않는다.
- 한국어·영어 문구와 모바일 1열 레이아웃이 유지된다.

## Implementation Steps

1. `lib/expert-matching.ts`에 전문가 판단과 서비스 태그 정규화 규칙을 둔다.
2. `lib/gtm-assistant.ts`의 결정론적 계획과 모델 결과 검증에 같은 규칙을 적용하고, `app/api/gtm-assistant/turn/route.ts` 프롬프트에 외부 실행 역량 판정 기준을 추가한다.
3. `app/journey/page.tsx`에서 기존·신규 계획 모두 공통 규칙으로 버튼을 표시하고 `app/globals.css`의 기존 버튼 토큰으로 시인성을 높인다.
4. `app/services/page.tsx`에서 query의 `tag`로 승인 서비스 목록을 필터링하고 매칭 상태를 안내한다.
5. `lib/expert-matching.test.ts`와 기존 `lib/gtm-assistant.test.ts`로 규칙을 검증한 뒤 typecheck와 build를 실행한다.

## Risks and Mitigations

- 키워드 기반 과잉 추천: CTA를 강제 주문이 아닌 선택형 `전문가 연결`로 표현하고 패턴을 현장 실행·전문 판단에 제한한다.
- 태그 불일치: 기존 진단 태그를 게시 서비스 태그로 정규화하고, 매칭 결과가 없을 때 전체 승인 서비스로 복구한다.
- 기존 계획 미반영: DB 마이그레이션 대신 렌더링 시 동일 규칙을 적용한다.

## Verification Steps

- `npm test -- lib/expert-matching.test.ts lib/gtm-assistant.test.ts`
- `npm run typecheck`
- `npm run build`
- `/journey`의 기존 유료 PoC 항목과 `/services?tag=market-validation` 연결 확인
