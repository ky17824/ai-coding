# 준비도 진단 v5.0 최종 설계

상태: 코딩 전 최종 정본  
작성일: 2026-08-15  
대상: 신규 진단은 46개 질문은행을 사용하고, 과거 55문항 진단은 v4.0으로 보존한다.

## 1. 결정

신규 진단은 **고정 46문항 질문은행 + 조건부 노출**로 운영한다. 사용자는 회사 상황에 따라 보통 35~40문항에 직접 답한다. 조건 때문에 접힌 문항은 한 장의 보류 안내로 대체해 반복적인 최저점 응답을 없앤다.

다음 세 원칙은 서로 구분한다.

1. **작성 진행률**은 지금 화면에 표시된 필수 문항만 분모로 삼는다.
2. **준비도 점수**는 아직 선행 조건을 갖추지 못한 `deferred_unmet` 문항을 0점으로 포함한다.
3. 사업 방식상 해당하지 않는 `structural_not_applicable` 문항만 점수·Gate·액션에서 제외한다.

따라서 화면에 보이는 문항을 모두 답하면 작성 진행률은 100%가 될 수 있지만, 보류 문항이나 Critical 미충족이 있으면 준비 단계는 통과하지 못한다.

### 검토한 대안

| 대안 | 장점 | 한계 | 결정 |
|---|---|---|---|
| 46문항을 모두 항상 표시 | 구현이 가장 단순하고 응답 비교가 쉬움 | 지루함·무관 질문·반복 최저점 문제가 그대로 남음 | 기각 |
| 46문항 + 세 상태 조건부 노출 | 비교 가능한 고정 질문은행을 유지하면서 실제 응답량과 모호성을 줄임 | 버전·분기·점수 해석을 함께 구현해야 함 | 채택 |
| 응답마다 AI가 다음 질문을 생성 | 겉보기 문항 수가 가장 적음 | 동일 응답의 재현성·채점 공정성·감사 가능성이 떨어짐 | 기각 |

채택안은 새 프레임워크나 AI 질문 생성기를 추가하지 않고 기존 질문 카탈로그·폼·점수 로직을 버전과 적용성으로 확장하는 최소 변경이다.

## 2. 문체 규칙

- 질문 종결은 `-했나요?`, `-되어 있나요?`, `-알고 있나요?`로 통일한다.
- `-하셨는지요?`, `-계신가요?`, `대표님`처럼 거리감이 크거나 응답자 역할을 한정하는 표현은 쓰지 않는다.
- 질문 하나는 하나의 판단 축을 측정한다. 함께 확인해야 하는 두 요소는 `책임자와 주당 투입 시간`처럼 한 운영 기준으로 묶일 때만 허용한다.
- 한국어 질문 본문에서는 `Target Market`, `Localization`, `Demo` 같은 영문 병기를 제거한다. 영문 용어는 도움말·보고서 용어집에서 제공한다.
- `그 나라`, `그 시장`, `현지`처럼 단독 카드에서 기준 대상을 알 수 없는 지시어는 `초기 목표국가`, `초기 목표시장`으로 바꾼다.
- 경험이 실제로 발생해야만 최고 수준을 고를 수 있는 문항은 쓰지 않는다. 반복 점검, 외부 확인, 실행 가능한 대응 절차로 4단계를 정의한다.

## 3. 최종 46문항

번호는 v5.0 내부에서 고정한다. 조건부 문항을 접어도 번호를 다시 매기지 않는다.

### 준비 1단계 — 13문항

| 번호 | Critical | 기존 | 최종 질문 |
|---|---:|---:|---|
| Q01 |  | Q1 | 대표와 경영진은 글로벌 진출 목적에 합의했나요? |
| Q02 |  | Q3 | 국내 사업과 글로벌 사업에 인력·예산을 배정할 때 적용할 우선순위 기준이 정해져 있나요? |
| Q03 |  | Q4 | 제품·서비스의 가치가 글로벌 고객에게도 통하는지 검증할 초기 목표시장을 정했나요? |
| Q04 | ★ | Q5 | 인증·현지화·인력·법률·물류 비용을 포함한 총 진입 비용을 계산했나요? |
| Q05 |  | Q6 | 현지 매출이 예상보다 늦어질 때 자체 자금으로 몇 개월 동안 버틸 수 있는지 계산했나요? |
| Q06 |  | Q7 | 정부 지원금 없이 자체 자금으로 실행할 최소 진출 범위를 정했나요? |
| Q07 | ★ | Q8 | 글로벌 진출 책임자와 그 사람이 매주 투입할 시간을 정했나요? |
| Q08 | ★ | Q10 | 현재 고객이 실제로 비용을 지불했다는 가장 강한 증거는 무엇인가요? |
| Q09 |  | Q11 | 관심을 보이다 이탈한 잠재 고객에게 그 이유를 직접 확인했나요? |
| Q10 |  | Q12 | 실제 사용자, 비용을 내는 사람, 구매를 결정하는 사람과 승인하는 사람을 구분해 확인했나요? |
| Q11 |  | Q13 | 제품·서비스를 선택하거나 거절한 사람에게 그 이유를 직접 확인했나요? |
| Q12 |  | Q14 | 초기 목표시장에서 실제로 접근 가능한 잠재 고객 또는 고객사 수를 명단과 출처를 바탕으로 산출했나요? |
| Q13 |  | Q17 | 후보 국가를 시장성·진입비용·규제·고객 접근성이라는 동일 기준으로 비교해 우선순위를 정했나요? |

### 준비 2단계 — 18문항

| 번호 | Critical | 기존 | 최종 질문 |
|---|---:|---:|---|
| Q14 | ★ | Q19 | 초기 목표국가에서 제품·서비스의 법적 분류를 공식 자료로 확인했나요? |
| Q15 |  | Q20 | 초기 목표국가에서 판매 전에 필요한 인허가·인증 요건을 확인했나요? |
| Q16 |  | Q21 | 각 규제 항목의 적용 여부와 판단 근거를 확인했나요? |
| Q17 |  | Q22 | 초기 목표국가의 가격 표시·계약·결제·정산 관행이 국내와 어떻게 다른지 확인했나요? |
| Q18 |  | Q25 | 세금·수수료·환전 비용·파트너 수수료를 제외한 순매출과 마진을 계산했나요? |
| Q19 |  | Q26 | 초기 목표국가에서 이용할 물류·결제·클라우드 공급업체 후보를 정했나요? |
| Q20 |  | Q27 | 현지 상황과 제품·서비스를 이해하고 본사와 현지를 연결할 담당자가 있나요? |
| Q21 |  | Q28 | 현지 고객 여정(발견·비교·구매·결제·사용·지원)에서 중단되거나 막히는 지점을 직접 관찰했나요? |
| Q22 | ★ | Q29 | 초기 목표국가의 실제 환경에서 제품·서비스가 정상 작동하는지 시험했나요? |
| Q23 |  | Q30 | 현지 시험에서 발견한 제품·서비스 문제와 고객 여정의 마찰을 기록하고 해결 상태를 관리하나요? |
| Q24 |  | Q31 | 어떤 현지 홍보 메시지나 제품 시연이 실제 문의로 이어졌는지 확인했나요? |
| Q25 |  | Q32 | 할인이나 무료 제공 없이 목표 마진을 확보할 수 있는 가격으로 실제 결제한 고객이 있나요? |
| Q26 |  | Q33 | 거절·중단·미전환·사용 장애 등 시장 가설을 반박하는 증거를 확인해 계획에 반영했나요? |
| Q27 |  | Q34 | 현지 파트너가 맡은 역할을 실제로 수행하고 있나요? |
| Q28 |  | Q35 | 파트너 판매와 직접 판매의 수익성을 숫자로 비교했나요? |
| Q29 |  | Q36 | 사용자, 구매 담당자, 유통·조달 관계자, 규제 기관 등 서로 다른 현지 이해관계자의 의견이나 요구사항을 직접 확인했나요? |
| Q30 |  | Q37 | 파트너의 약속 물량·일정 이행 여부를 정기적으로 점검하고, 미달 시 조치 기준을 정했나요? |
| Q31 |  | Q38 | 기존 인맥 밖의 잠재 고객과 구매하지 않은 잠재 고객에게도 직접 의견을 들었나요? |

### 준비 3단계 — 15문항

| 번호 | Critical | 기존 | 최종 질문 |
|---|---:|---:|---|
| Q32 |  | Q39 | 초기 목표시장에서 검증할 가설과 이를 판단할 지표를 정했나요? |
| Q33 |  | Q40 | 성과 미달 시 추가 투자를 중단할 수치 기준을 정했나요? |
| Q34 |  | Q41 | 글로벌 진출의 목표·실적·담당자를 한곳에서 관리하나요? |
| Q35 |  | Q42 | 현지화 변경의 승인자와 문제 발생 시 복구 책임자를 정했나요? |
| Q36 | ★ | Q43 | 초기 목표시장의 매출과 손익을 최종 책임지는 담당자를 한 명으로 정했나요? |
| Q37 |  | Q44 | 핵심 인력이 자리를 비워도 글로벌 진출 업무를 계속할 수 있나요? |
| Q38 |  | Q46 | 현지 책임자가 본사 승인 없이 결정할 수 있는 업무와 금액 한도를 정했나요? |
| Q39 | ★ | Q47 | 현지에서 긴급 문제가 발생하면 누구에게 몇 시간 이내에 보고할지 정했나요? |
| Q40 |  | Q48 | 파트너 계약의 독점 범위·데이터·가격·계약 종료·고객 이전 조건을 확인하고, 사업 보호 조항에 반영했나요? |
| Q41 |  | Q49 | 파트너 계약 종료 후에도 확보한 고객을 우리 회사가 유지할 수 있나요? |
| Q42 |  | Q50 | 파트너 교체에 필요한 예상 시간·비용과 대체 후보를 파악했나요? |
| Q43 |  | Q51 | 판매·고객 데이터·운영을 한 파트너에게 어느 정도까지 의존할지 한도와 대체 조치를 정했나요? |
| Q44 |  | Q52 | 다음 단계 예산을 집행하기 위한 달성 조건을 정했나요? |
| Q45 |  | Q53 | 초기 출시나 파일럿 수요가 늘 때 생산·시스템·인력·공급 중 어디가 먼저 한계에 도달하는지 파악했나요? |
| Q46 |  | Q55 | 현재 매출이 있다면 특정 고객·채널에 매출이 과도하게 집중돼 있는지 측정하고 완화 기준을 정했나요? |

## 4. 제거하는 기존 9문항

| 기존 문항 | 처리 | 이유 |
|---|---|---|
| Q2 | Q33에 흡수 | 성과 미달 시 중단 기준이 중복됨 |
| Q9 | Q37에 흡수 | 핵심 인력 부재 시 지속 가능성과 같은 개념 |
| Q15 | Q12에 흡수 | 고객 수 산출의 출처는 독립 문항이 아니라 산출 근거임 |
| Q16 | 제거 | 자발적 해외 문의는 준비 활동보다 인지도·시장 상황·운의 영향을 크게 받음 |
| Q18 | Q13에 흡수 | 동일 기준 국가 비교가 편향 제거를 포함함 |
| Q23 | Q26에 흡수 | 예상과 다른 반응은 시장 가설의 반증 증거임 |
| Q24 | Q17·Q18에 흡수 | 가격 표시·결제 수단은 거래 관행과 순매출 계산에서 더 명확히 측정함 |
| Q45 | Q35·Q38에 흡수 | 변경 승인·현지 권한과 중복되고 사례 발생 여부에 좌우됨 |
| Q54 | Q44에 흡수 | 조건부 예산 한도는 단계별 예산 집행 조건의 일부임 |

기존 Q28은 고객 여정 마찰을 묻는 Q21로 재작성해 유지한다. 기존 Q51은 실제 매출 집중을 묻는 Q46과 달리 계약 전·운영 초기의 단일 파트너 의존을 측정하므로 Q43으로 유지한다. 구현 전 카탈로그 매핑 테스트가 위 9개 목록과 정확히 일치해야 한다.

## 5. 조건부 노출 정본

문항 적용성 타입은 응답 상태와 분리한다.

```ts
type QuestionApplicability =
  | "required"
  | "deferred_unmet"
  | "structural_not_applicable";
```

### 5.1 분기 우선순위

같은 문항에 여러 조건이 겹치면 아래 순서로 판정한다.

1. `structural_not_applicable`
2. `deferred_unmet`
3. `required`

한 문항에 여러 보류 원인이 겹치면 `target_country_missing` → `sales_motion_unknown` → `local_test_not_started` → `paid_evidence_missing` 순으로 한 원인에만 배정한다. 따라서 같은 문항과 안내가 두 보류 그룹에 중복되지 않는다.

### 5.2 정확한 규칙

| 조건 | 대상 | 상태 | 사용자 안내 |
|---|---|---|---|
| 진출 방식 `direct` | Q27·Q28·Q30·Q40·Q41·Q42·Q43 | `structural_not_applicable` | 직접 진출이므로 파트너 전용 7문항 제외 |
| 진출 방식 `unknown` | 같은 7문항 | `deferred_unmet` | 진출 방식을 정하면 파트너 문항을 확인할 수 있음 |
| 목표국가가 빈 값 | Q14~Q31 | `deferred_unmet` | Q14~Q31은 초기 목표국가를 입력한 뒤 진행 |
| Q22 응답이 1·2단계 | Q23 | `deferred_unmet` | 현지 시험을 수행한 뒤 문제 기록·해결 상태 확인 |
| Q08 응답이 1·2단계 | Q25 | `deferred_unmet` | 유료 고객 증거를 확보한 뒤 가격 지속 가능성 확인 |
| Q08 응답이 1·2단계 | Q46 | `structural_not_applicable` | 현재 매출이 없어 집중 위험을 계산하지 않음 |
| 그 외 | 해당 문항 | `required` | 질문 표시 및 답변 필수 |

목표국가 문자열이 입력돼 있으면 Q14~Q31은 표시한다. `target_market_confirmed_at`과 목표 고객군은 단계 Gate에서 별도로 검증하며, 질문 노출 조건과 섞지 않는다.

### 5.3 응답 보존

- 분기를 바꿔 문항이 접히면 브라우저 세션에서는 답변을 휴면 보존한다.
- 제출 payload에는 현재 `required` 문항의 답변만 넣는다.
- 분기를 되돌리면 휴면 답변을 복원한다.
- 서버는 은퇴 ID, 중복 ID, 알 수 없는 ID, 현재 분기 밖 ID를 거부한다.
- 과거 assessment의 답변·증거·액션은 삭제하지 않는다.

### 5.4 재진단·로그인 복귀

- 같은 버전으로 재진단하면 기존 답변과 근거를 미리 채울 수 있다.
- v4.0에서 v5.0으로 재진단하면 문구·선택지가 그대로인 29문항만 복원한다. 재작성 17문항과 제거 9문항의 답변·근거는 새 진단에 복사하지 않는다.
- 기존 브라우저의 배열형 pending payload는 v4.0으로 해석한다. v5 rollout 이후에는 위 29문항만 복원하고 자동 제출하지 않으며, 변경된 문항을 다시 확인하라는 안내를 표시한다.
- versioned pending payload와 현재 서버 rollout version이 같을 때만 로그인 직후 자동 제출한다. 버전이 다르면 자동 제출하지 않는다.
- v5.0에서 v4.0으로 역변환하지 않는다. rollback 중 발견한 v5 pending payload는 저장된 응답을 삭제하지 않고 새 진단 시작 안내를 표시한다.

## 6. 점수·Gate·진행률

### 작성 진행률

```text
required 문항 중 답변한 수 / required 문항 수 × 100
```

`deferred_unmet`과 `structural_not_applicable`은 작성 진행률 분모에서 제외한다. 화면에는 진행률과 함께 `보류 N개 · 해당 없음 N개`를 표시한다.

### 준비도 점수

- v5.0은 v4.0의 임계형 채점을 유지한다. 1·2단계는 해당 문항 가중치 0점, 3·4단계는 해당 문항의 전체 가중치를 얻는다. 막대 높이로 보이는 1~4단계 응답과 준비도 가중 점수는 별도 개념이며, v5에서 부분 점수 체계로 바꾸지 않는다.
- `required`: 저장 답변 점수를 사용한다.
- `deferred_unmet`: 적용 가능 가중치 분모에 포함하고 분자는 0이다.
- `structural_not_applicable`: 분자·분모에서 제외한다.
- 단계별 적용 가능 가중치를 각 단계 30/40/30으로 정규화한다.
- 12개 진단 묶음은 각 단계 점수에 기여하는 계산 단위로 유지하되, 기존 DB의 `domain_scores` 의미는 바꾸지 않는다. 이 필드는 이름과 달리 `early`·`preparing`·`ready` 세 단계의 백분율을 저장한다.
- v5에서도 `domain_scores`에는 같은 세 키만 저장한다. 진단 묶음별 상세 비율이 필요하면 저장 필드를 재사용하지 않고 버전별 답변에서 화면용으로 계산한다.
- 모든 적용 가능 문항이 4단계이면 종합 100점, 단계 기여도 30/40/30, `domain_scores`의 세 단계 백분율은 모두 100%가 되어야 한다.

### Gate

- 7개 Critical은 `structural_not_applicable`이 될 수 없다.
- Critical이 `deferred_unmet`이면 단계는 통과하지 못한다.
- Critical은 3·4단계 응답과 비어 있지 않은 확인 근거가 함께 있어야 충족된다. 1·2단계에서는 근거 입력을 강제하지 않는다.
- `required` 문항 미응답은 제출할 수 없다.
- 판매 가능성 예비검증은 `준비 3단계 도달 + deferred_unmet 0 + Critical 충족 + 현재 required 문항 완료`일 때만 허용한다.

### 보류 안내와 액션 중복 제거

- 같은 원인으로 접힌 문항은 `target_country_missing`, `sales_motion_unknown`, `local_test_not_started`, `paid_evidence_missing` 네 보류 그룹 중 하나로 묶는다.
- 한 그룹은 화면·단계 총평·Gate에 이유와 다음 조건을 한 번만 표시한다.
- `deferred_unmet` 문항은 숨긴 문항별 액션을 만들지 않는다. 현재 `required` 문항에서 나온 액션과 보류 그룹 안내만 사용한다.
- `structural_not_applicable` 문항은 안내 요약 외에 Gate·점수·액션을 만들지 않는다.
- 이 규칙은 목표국가 미입력 시 Q14~Q31이 18개의 반복 액션으로 변하는 것을 방지한다.

### 가중치

- v4.0은 현재 가중치를 그대로 사용한다.
- v5.0에서 기존 Q22에 대응하는 Q17만 유효 가중치를 1.0에서 2.0으로 바꾼다.
- 이 변경은 버전별 override로 적용해 v4 총점과 영역 점수를 바꾸지 않는다.
- 제거 문항의 가중치는 다른 문항에 임의로 재분배하지 않는다.

## 7. 재작성 선택지 최종 보정

`2026-08-15-readiness-v5-options-final.md`의 17개 문항·68개 KO/EN 선택지·후속 질문이 구현 정본이다. 나머지 29문항은 v4.0 선택지·후속 질문·액션을 그대로 사용한다. 아래 항목은 특히 회귀 위험이 큰 보정 사항을 요약한 것이며 선택지 정본과 동일해야 한다.

### Q10 — 사용자·지불자·결정자·승인자

| 단계 | 한국어 선택지 |
|---:|---|
| 1 | 아직 역할을 나눠서 확인해보지 못했습니다 |
| 2 | 대략 짐작은 하지만 실제 거래에서 확인하지는 않았습니다 |
| 3 | 최근 거래에서 사용자·지불자·결정자·승인자를 구분해 확인했습니다 |
| 4 | 여러 거래에서 네 역할을 반복 확인하고 역할별 접근 방식에 반영하고 있습니다 |

English level 4: `We confirm the four roles across multiple deals and use them to tailor our approach.`

### Q16 — 규제 적용 여부

질문은 `각 규제 항목의 적용 여부와 판단 근거를 확인했나요?`로 확정한다. 비적용 항목이 0개여도 3·4단계를 선택할 수 있어야 한다.

English question: `Have you determined whether each regulatory requirement applies and recorded the basis for that decision?`

### Q25 — 목표 마진을 확보하는 유료 거래

| 단계 | 한국어 선택지 |
|---:|---|
| 1 | 아직 유료 거래 사례가 없습니다 |
| 2 | 거래는 있었지만 할인·무료 제공에 의존했거나 목표 마진을 확보하지 못했습니다 |
| 3 | 할인·무료 제공 없이 목표 마진을 확보한 유료 거래가 있습니다 |
| 4 | 같은 가격 조건의 유료 거래가 여러 고객에게서 반복되고 있습니다 |

English options:

1. `We do not yet have a paid transaction.`
2. `We have transactions, but they rely on discounts or free offers or do not preserve our target margin.`
3. `A customer has paid without discounts or free offers at a price that preserves our target margin.`
4. `Paid transactions under the same pricing conditions recur across multiple customers.`

### Q30 — 파트너 약속 이행 점검

| 단계 | 한국어 선택지 | English option |
|---:|---|---|
| 1 | 아직 실제 파트너가 없어 이행 여부를 점검할 수 없습니다 | We do not yet have an active partner whose delivery can be reviewed |
| 2 | 약속한 물량·일정은 있지만 이행 여부를 정기적으로 점검하지 않습니다 | We have volume or schedule commitments but do not review delivery regularly |
| 3 | 약속한 물량·일정의 이행 여부를 정기적으로 점검합니다 | We regularly review delivery against committed volume and schedules |
| 4 | 미달 기준과 조치 절차를 정해 점검 결과에 따라 적용하고 있습니다 | We have shortfall thresholds and apply defined actions based on review results |

후속 질문: `점검 주기, 미달 기준과 조치 절차를 적어주세요.`  
English: `State the review cadence, shortfall thresholds, and response actions.`

### Q43 — 단일 파트너 의존

4단계는 실제 한도 초과 경험을 요구하지 않는다.

`한도와 대체 조치를 정기적으로 점검하고 대체 경로를 실제로 확인했습니다.`

English level 4: `We review the limits and fallbacks regularly and have verified an alternative route.`

### Q46 — 매출 집중

4단계는 실제 기준 초과 경험을 요구하지 않는다.

`고객·채널별 매출 비중을 정기적으로 갱신하고 기준 초과 전에 실행할 완화 조치를 점검합니다.`

English level 4: `We update revenue concentration by customer and channel regularly and review actions that can be taken before a threshold is breached.`

## 8. 버전·역사 데이터 정책

### 카탈로그

- 현재 55문항 배열은 v4.0 정본으로 동결한다.
- v5.0은 `V5_QUESTION_OVERRIDES`와 제거 ID 집합을 v4.0 정본에 적용해 만든다.
- 전체 46문항을 복사한 두 번째 배열은 만들지 않는다.
- 한국어와 영어는 같은 ID·순서·가중치·Critical·분기 메타를 사용하고 문구만 분리한다.
- `V5_REWRITTEN_IDS` 17개를 별도로 고정해 재진단 호환성 판단에도 같은 집합을 사용한다.
- v5.0 문구·가중치·Critical·적용성 규칙은 배포 뒤 동결한다. 의미를 바꿀 때는 기존 규칙을 수정하지 않고 새 survey version을 만든다.

### Assessment

- `assessments.survey_version`: `4.0 | 5.0`
- `assessments.sales_motion`: `direct | partner | hybrid | unknown`
- 기존 assessment는 전부 v4.0으로 backfill한다.
- 과거 저장 점수·Gate·액션·단계 총평을 읽을 때 재계산하지 않는다.
- 신규 재진단은 기존 assessment를 수정하지 않고 v5.0 assessment를 새로 만든다.
- 신규 진단 버전은 서버 전용 `READINESS_V5_ENABLED` 플래그가 결정한다. 브라우저가 버전을 제출하거나 바꿀 수 없다.

### 하위 객체

- `readiness_answers`, `evidence_files`, `action_items`, `gtm_plan_items`의 과거 question ID를 보존한다.
- 질문 문구를 표시할 때 assessment version의 카탈로그를 사용한다.
- 버전이나 질문을 해석하지 못하면 저장된 action title·completion evidence를 표시한다.
- 결제된 AI 서비스는 주문 시점의 assessment ID·survey version·question IDs를 snapshot으로 고정한다.

## 9. UI/UX 정본

### 진단 화면

- 질문보다 먼저 무배점 `진출 방식`을 선택한다.
- 데스크톱은 단계·진행률·보류·해당 없음 수를 사이드바에 표시한다.
- 900px 이하에서는 단계 설명을 접고 현재 단계와 진행률만 먼저 표시한다.
- 보류 구간은 `Q14~Q31은 초기 목표국가를 입력한 뒤 진행합니다`처럼 고정 번호와 이유를 한 장으로 표시한다.
- 분기 변경으로 질문이 나타나면 `aria-live="polite"`로 알리되 자동 포커스는 이동하지 않는다.
- 제출 오류가 있을 때만 첫 오류 질문으로 포커스를 이동한다.

### 결과·대시보드

- 큰 점수와 단계 판정은 assessment에 저장된 값을 표시한다.
- 질문 막대는 해당 survey version의 고정 번호를 쓴다.
- v5.0은 `응답 N · 보류 N · 해당 없음 N`을 표시한다.
- 구조적으로 제외한 문항 수와 이유를 결과·보고서에 공개한다.
- 관리자 통계는 v4.0과 v5.0을 같은 분모로 합치지 않는다.

### 문구

- 공개 화면의 `55문항`은 `준비도 진단` 또는 `회사 상황에 맞춘 준비도 진단`으로 바꾼다.
- v4.0 역사 기록과 v4.0 문서 제목에서만 `55문항`을 유지한다.
- 한국어 UI의 영문 병기는 용어 설명이 필요한 곳에만 남긴다.

## 10. 데이터베이스 배포 순서

1. v4.0 점수·Gate·액션·문항 번호 회귀 테스트를 먼저 고정한다.
2. Migration A에서 `survey_version` 기본값 `4.0`과 nullable `sales_motion`을 추가하고 기존 행을 v4.0으로 backfill한다.
3. v4/v5 dual-read 코드를 `READINESS_V5_ENABLED=false`로 배포한다. 신규 진단은 계속 v4.0이다.
4. 운영에서 플래그를 `true`로 바꾸고 재배포해 신규 진단만 v5.0으로 전환한다.
5. KO/EN 신규 진단·대시보드·AI 조사 smoke가 끝난 뒤 플래그를 유지한다. DB 기본값은 안전한 v4.0으로 둔다.
6. 문제 발생 시 플래그를 `false`로 되돌려 신규 v5 쓰기만 중단한다. 열·v5 행·과거 결과는 삭제하거나 재작성하지 않는다.

## 11. 수용 기준

- v4.0은 55개, v5.0은 46개이며 ID 중복이 없다.
- v5.0 단계별 문항 수는 13·18·15이고 Critical은 7개다.
- 제거 ID는 기존 Q2·Q9·Q15·Q16·Q18·Q23·Q24·Q45·Q54와 정확히 일치한다.
- Q01~Q46 한국어 질문은 이 문서와 byte-for-byte 일치한다.
- 한국어 질문에 `Target Market`, `Localization`, `Demo`가 남지 않는다.
- `direct`는 파트너 전용 7문항을 구조적 제외하고, `unknown`은 같은 7문항을 보류한다.
- 목표국가가 비어 있으면 Q14~Q31을 보류한다.
- Q22가 1·2단계이면 Q23을 보류하고, Q08이 1·2단계이면 Q25를 보류하고 Q46을 구조적 제외한다.
- 진행률은 현재 required 문항을 모두 답하면 100%다.
- 보류 문항은 준비도 점수에 0점으로 남고 Critical을 우회하지 못한다.
- 구조적 비적용 문항은 점수·Gate·액션에서 제외된다.
- 모든 적용 가능 문항이 4단계이면 종합 100, 단계 기여도 30/40/30, 저장되는 세 단계 백분율이 모두 100%다.
- v4.0 저장 점수·Gate·액션·번호·총평은 배포 전후 동일하다.
- KO/EN ID·순서·선택지 수·가중치·Critical·분기 메타가 일치한다.
- Critical 3·4단계는 근거 없이는 통과하지 못한다.
- 320px에서 수평 스크롤이 없고, 키보드만으로 모든 required 문항과 단계 이동에 접근할 수 있다.
- AI 조사 범위는 raw 답변 수가 아니라 version-aware 완료 판정으로 결정한다.
- 기존 55-ID 유료 AI 주문과 신규 46-ID 주문이 모두 계약 당시 snapshot으로 실행된다.

## 12. 이번 작업에서 제외

- 결제·가격·환불·OAuth 변경
- TAM·SAM·SOM·교두보 시장 계산 방법론 변경
- 새 UI 프레임워크·상태관리 라이브러리·분석 SDK 도입
- 과거 assessment·answer·evidence·action·plan·AI report 삭제 또는 재작성

## 부록 A. 영문 질문 정본

| 번호 | Final English question |
|---|---|
| Q01 | Are the CEO and leadership team aligned on why the company is expanding globally? |
| Q02 | Do you have an agreed rule for allocating people and budget between domestic operations and global expansion? |
| Q03 | Have you selected an initial target market in which to test whether the offering's value resonates with global customers? |
| Q04 | Have you calculated the total cost of entry, including certification, localization, people, legal, and logistics costs? |
| Q05 | Have you calculated how many months the company can operate on its own cash if local revenue is delayed? |
| Q06 | Have you defined the minimum market-entry scope that can be executed without government funding? |
| Q07 | Have you named the person accountable for global expansion and set their weekly time commitment? |
| Q08 | What is the strongest evidence you have today that a customer has paid? |
| Q09 | Have you directly confirmed why interested prospects dropped out? |
| Q10 | Have you distinguished and confirmed the actual user, payer, decision-maker, and approver? |
| Q11 | Have you asked people who selected or rejected the offering why they made that choice? |
| Q12 | Have you counted the prospects or customer accounts you can actually reach in the initial target market, using a named list and sources? |
| Q13 | Have you compared candidate countries on the same criteria—market potential, entry cost, regulation, and customer access—and ranked them? |
| Q14 | Have you verified the offering's legal classification in the initial target country using official sources? |
| Q15 | Have you identified the approvals and certifications required before selling in the initial target country? |
| Q16 | Have you determined whether each regulatory requirement applies and recorded the basis for that decision? |
| Q17 | Have you confirmed how price display, contracting, payment, and settlement practices in the initial target country differ from domestic practice? |
| Q18 | Have you calculated net revenue and margin after taxes, fees, currency-conversion costs, and partner commissions? |
| Q19 | Have you selected candidate logistics, payment, and cloud providers for the initial target country? |
| Q20 | Do you have a person who understands both local conditions and the offering and can connect headquarters with the local market? |
| Q21 | Have you directly observed where local customers stall or drop off across discovery, comparison, purchase, payment, use, and support? |
| Q22 | Have you tested whether the offering works as intended in the real environment of the initial target country? |
| Q23 | Do you record product, service, and customer-journey issues found in local testing and track their resolution? |
| Q24 | Have you confirmed which local marketing messages or product demonstrations led to real inquiries? |
| Q25 | Has a customer paid, without discounts or free offers, at a price that preserves your target margin? |
| Q26 | Have you identified evidence that contradicts the market hypothesis—such as rejection, churn, non-conversion, or usage failure—and reflected it in the plan? |
| Q27 | Is the local partner performing the role it agreed to take on? |
| Q28 | Have you compared the profitability of partner-led and direct sales using numbers? |
| Q29 | Have you directly confirmed the input or requirements of different local stakeholders, including users, buyers, distributors, procurement, and regulators? |
| Q30 | Do you regularly review whether the partner meets committed volumes and schedules, and have you set actions for shortfalls? |
| Q31 | Have you directly sought input from prospects outside your referral network and prospects who chose not to buy? |
| Q32 | Have you defined the hypothesis to test in the initial target market and the metrics used to judge it? |
| Q33 | Have you set numeric criteria for stopping further investment when performance falls short? |
| Q34 | Do you manage global-expansion objectives, performance, and owners in one place? |
| Q35 | Have you named the approver for localization changes and the owner responsible for recovery if a change causes problems? |
| Q36 | Is one person ultimately accountable for revenue and profit in the initial target market? |
| Q37 | Can global-expansion work continue when a key team member is absent? |
| Q38 | Have you defined which decisions and spending limits the local owner can approve without headquarters? |
| Q39 | When an urgent local issue occurs, have you defined who must be notified and within how many hours? |
| Q40 | Does the partner contract cover exclusivity, data, pricing, termination, and customer transfer in a way that protects the business? |
| Q41 | Can the company retain the customers it acquired after the partner contract ends? |
| Q42 | Have you estimated the time and cost required to replace the partner and identified alternatives? |
| Q43 | Have you set limits on how much sales, customer data, and operations may depend on one partner, along with fallback actions? |
| Q44 | Have you defined the achievement criteria required before the next budget is released? |
| Q45 | Have you identified which of production, systems, people, or supply will reach its limit first as launch or pilot demand grows? |
| Q46 | If you have revenue, have you measured whether it is overly concentrated in specific customers or channels and set mitigation thresholds? |
