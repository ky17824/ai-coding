/**
 * 창업자 자가진단 55문항.
 *
 * 모든 문항은 4단계 선택지로 답한다. 아직 거기까지 생각하지 못했거나 진행하지
 * 못한 창업자도 1단계를 고르면 되므로 «답할 수 없는 문항»이 없다.
 *
 *   1 미인지 — 그 부분까지 생각해보지 못함
 *   2 인지·계획 — 필요성은 알지만 정리하거나 실행하지 못함
 *   3 실행·사례 — 실제로 해봤고 사례가 있음   ← 여기부터 «긍정»
 *   4 반복·확인 — 반복됐거나 외부에서 확인받음
 *
 * 서술형은 3~4단계를 고른 경우에만 followUp으로 이어 묻는다. 1~2단계를 고른
 * 창업자에게 증거를 요구하지 않는다.
 */
export type AnswerLevel = 1 | 2 | 3 | 4;

/** 이 단계 이상이면 «긍정적인 대답»으로 센다. */
export const POSITIVE_LEVEL: AnswerLevel = 3;

export const INTAKE_STAGES = [
  {
    id: "early",
    label: "극초기",
    phase: "Plan",
    gate: "A",
    journeyPhase: "pre_entry",
    weight: 30,
    intro:
      "아직 목표 국가와 자원을 정하는 단계입니다. 지금 상태를 그대로 골라주세요. 아직 하지 않은 것을 고르셔도 불이익은 없습니다.",
    unlocks: "목표 국가를 확정하고 현지 규제·시장 조사에 예산을 투입할 수 있습니다."
  },
  {
    id: "preparing",
    label: "준비중",
    phase: "Enable",
    gate: "B",
    journeyPhase: "initial_entry",
    weight: 40,
    intro:
      "현지 규제와 시장을 조사하고 실제로 시험해 보는 단계입니다. 해본 만큼만 골라주세요.",
    unlocks: "제한된 범위에서 실제 거래를 열고 파트너 계약을 맺을 수 있습니다."
  },
  {
    id: "ready",
    label: "준비완료",
    phase: "Execute 진입요건",
    gate: "C",
    journeyPhase: "scale",
    weight: 30,
    intro:
      "진입을 실행에 옮기기 직전 단계입니다. 문서와 계약, 사람에 대해 여쭙습니다.",
    unlocks: "현지 운영을 시작하고 반복 가능한 성과와 확장을 검증할 수 있습니다."
  }
] as const;

export type IntakeStageId = (typeof INTAKE_STAGES)[number]["id"];

export const INTAKE_ITEMS = [
  { id: "global-mindset", stageId: "early", label: "Global mindset · MVC", weight: 6, owner: "대표·이사회", serviceTag: "leadership" },
  { id: "resources", stageId: "early", label: "인적 · 자원 · 운영 리소스", weight: 9, owner: "대표·재무 책임자", serviceTag: "leadership" },
  { id: "home-pmf", stageId: "early", label: "가치제안 · 국내 PMF", weight: 7.5, owner: "대표·제품 책임자", serviceTag: "market-validation" },
  { id: "target-market", stageId: "early", label: "타겟국 · 초기 고객군", weight: 7.5, owner: "사업개발 책임자", serviceTag: "market-validation" },
  { id: "bmlc", stageId: "preparing", label: "BMLC 규제 · 문화 분석", weight: 8, owner: "규제·법무 담당", serviceTag: "compliance" },
  { id: "lpa", stageId: "preparing", label: "LPA 6축 시장조사", weight: 8, owner: "제품·운영 책임자", serviceTag: "gtm" },
  { id: "market-testing", stageId: "preparing", label: "Market testing", weight: 12, owner: "제품·GTM 책임자", serviceTag: "gtm" },
  { id: "partner-acquisition", stageId: "preparing", label: "네트워크 · 파트너 확보", weight: 12, owner: "사업개발 책임자", serviceTag: "gtm" },
  { id: "local-plan", stageId: "ready", label: "현지 BMC · 30-60-90", weight: 9, owner: "대표·GTM 책임자", serviceTag: "gtm" },
  { id: "local-team", stageId: "ready", label: "현지 최소 운영인력", weight: 7, owner: "대표·인사 책임자", serviceTag: "organization" },
  { id: "partner-contract", stageId: "ready", label: "파트너 계약 · 운영화", weight: 8, owner: "사업개발·법무 담당", serviceTag: "compliance" },
  { id: "resource-allocation", stageId: "ready", label: "현지운영 리소스 배정", weight: 6, owner: "재무 책임자", serviceTag: "unit-economics" }
] as const;

export type IntakeItemId = (typeof INTAKE_ITEMS)[number]["id"];

export interface IntakeQuestion {
  id: string;
  itemId: IntakeItemId;
  weight: number;
  /** 창업자에게 그대로 보여주는 문항 */
  question: string;
  /** 1~4단계 선택지. 순서가 곧 단계다. */
  options: [string, string, string, string];
  /** 3~4단계를 고른 창업자에게만 이어서 묻는 서술형 */
  followUp: string;
  /** 3단계에 도달하기 위해 할 일. 답변이 1~2단계이면 액션으로 제시한다. */
  action: string;
  /** 볼트 v4.0 프레임워크의 원 출처 (영역·Level 2·문항번호) */
  source: string;
  /** Critical 선결조건. 3단계 미만이면 해당 Phase Gate를 차단한다. */
  critical?: true;
}

export const INTAKE_QUESTIONS: IntakeQuestion[] = [
  {
    id: "mvc-purpose-alignment",
    itemId: "global-mindset",
    weight: 2,
    question: "해외에 나가려는 이유를 경영진이 같은 말로 설명하나요?",
    options: [
      "경영진끼리 그 이야기를 따로 맞춰본 적이 없습니다",
      "이야기는 나눴지만 각자 표현이 다릅니다",
      "목적을 문서나 회의에서 한 번 정리했고 대체로 같은 말을 합니다",
      "정리한 목적을 기준으로 실제 의사결정을 여러 번 해봤습니다"
    ],
    followUp: "세 분이 각각 어떻게 설명하시는지, 다른 점이 있다면 무엇인지 적어주세요.",
    action: "경영진 3인의 진출 목적을 한 문장씩 받아 차이를 정리하고 하나로 합의한다",
    source: "영역4 L2-1 Q1"
  },
  {
    id: "mvc-stop-criteria",
    itemId: "global-mindset",
    weight: 1.5,
    question: "해외 성과가 기대에 못 미칠 때 어떻게 할지 미리 정해두셨나요?",
    options: [
      "아직 거기까지 생각해보지 못했습니다",
      "생각은 해봤지만 기준을 정하지는 않았습니다",
      "지표나 기간 기준을 정해두었습니다",
      "그 기준에 따라 실제로 축소하거나 중단해본 적이 있습니다"
    ],
    followUp: "어떤 지표가 어느 기간 미달이면 무엇을 하기로 정하셨는지 적어주세요.",
    action: "계속·축소·피벗·철수를 가르는 지표·기준값·기간을 정해 경영진 승인을 받는다",
    source: "영역4 L2-1 Q3"
  },
  {
    id: "mvc-resource-priority",
    itemId: "global-mindset",
    weight: 1.5,
    question: "국내 사업과 해외 사업이 같은 인력·예산을 두고 부딪힌 적이 있나요?",
    options: [
      "아직 해외에 인력이나 예산을 따로 배정하지 않았습니다",
      "배정은 했지만 충돌한 적은 없습니다",
      "충돌한 적이 있고 그때그때 판단해서 정했습니다",
      "우선순위 기준이 정해져 있어 그대로 적용합니다"
    ],
    followUp: "가장 최근 충돌 상황과 어느 쪽을 택하셨는지 적어주세요.",
    action: "국내·해외 자원 충돌 시 우선순위 판단 기준을 문서로 정한다",
    source: "영역4 L2-1 Q5"
  },
  {
    id: "mvc-reference-market",
    itemId: "global-mindset",
    weight: 1,
    question: "해외 고객의 가치를 확인할 초기 타겟 시장이 있나요?",
    options: [
      "아직 어느 시장을 기준으로 볼지 정하지 못했습니다",
      "국내 시장을 기준으로 보지만 아직 검증 중입니다",
      "국내 또는 특정 해외 시장에서 실제 고객 행동으로 확인했습니다",
      "그 검증이 여러 고객에서 반복됐습니다"
    ],
    followUp: "어느 시장의 누가 어떤 행동을 보였는지 적어주세요.",
    action: "가치를 검증할 기준 시장을 정하고 그 시장 고객의 실제 행동을 기록한다",
    source: "영역1 L2-4 Q2"
  },
  {
    id: "res-tce",
    itemId: "resources",
    weight: 3,
    question: "이번 해외 진출 계획에 총 얼마가 들지 계산해보셨나요?",
    options: [
      "아직 계산해보지 못했습니다",
      "대략 감은 있지만 항목별로 정리하진 않았습니다",
      "인증·현지화·인력·법률·물류·마케팅 등 항목별로 정리했습니다",
      "실제 견적이나 지출로 항목을 검증하며 갱신하고 있습니다"
    ],
    followUp: "총액과 가장 큰 비용 항목 세 가지를 적어주세요.",
    action: "인증·현지화·인력·법률·물류·마케팅·지원 비용을 항목별로 합산해 TCE를 산출한다",
    source: "영역4 L2-2 Q1",
    critical: true
  },
  {
    id: "res-cash-runway",
    itemId: "resources",
    weight: 2,
    question: "현지 매출이 늦어져도 버틸 수 있는 기간을 알고 계신가요?",
    options: [
      "따로 계산해보지 않았습니다",
      "대략 알지만 숫자로 정리하진 않았습니다",
      "몇 개월, 얼마까지 버틸 수 있는지 숫자로 알고 있습니다",
      "그 한도를 넘으면 무엇을 할지까지 정해두었습니다"
    ],
    followUp: "버틸 수 있는 개월 수와 금액을 적어주세요.",
    action: "매출 지연 시 버틸 개월 수와 현금 한도를 숫자로 계산한다",
    source: "영역4 L2-2 Q2"
  },
  {
    id: "res-no-grant-scope",
    itemId: "resources",
    weight: 2,
    question: "정부지원금 없이도 진행할 최소 범위를 정해두셨나요?",
    options: [
      "지원금을 전제로 계획을 세웠습니다",
      "지원금이 없으면 어떻게 할지 고민만 해봤습니다",
      "지원금 없이 할 최소 범위를 정해두었습니다",
      "이미 자체 자금만으로 그 범위를 실행하고 있습니다"
    ],
    followUp: "지원금 없이도 하실 국가·고객군·제품 범위를 적어주세요.",
    action: "정부지원금을 뺀 최소 실행범위를 국가·고객군·제품 단위로 확정한다",
    source: "영역4 L2-2 Q4"
  },
  {
    id: "res-owner-time",
    itemId: "resources",
    weight: 1,
    question: "이번 진출을 맡은 책임자가 정해져 있나요?",
    options: [
      "아직 정하지 않았고 그때그때 나눠서 합니다",
      "이름은 정했지만 다른 업무와 겸하고 있어 시간이 거의 없습니다",
      "책임자가 정해져 있고 주당 일정 시간을 고정으로 쓰고 있습니다",
      "책임자가 이 일을 주 업무로 하고 성과 책임까지 지고 있습니다"
    ],
    followUp: "책임자와 주당 실제 투입 시간, 겸하는 업무를 적어주세요.",
    action: "진출 책임자를 지정하고 주당 고정 투입 시간을 확보한다",
    source: "영역4 L2-4 Q1",
    critical: true
  },
  {
    id: "res-key-person-risk",
    itemId: "resources",
    weight: 1,
    question: "특정 한 사람이 빠지면 멈추는 일이 있나요?",
    options: [
      "생각해본 적이 없습니다",
      "있다는 건 알지만 무엇인지 정리하지 못했습니다",
      "어떤 의사결정과 관계가 그런지 파악하고 있습니다",
      "대체 인력이나 인수인계 방법까지 마련했습니다"
    ],
    followUp: "그 한 사람이 빠지면 멈추는 의사결정이나 관계를 적어주세요.",
    action: "한 사람에게 묶인 의사결정과 관계를 목록화하고 대체 방법을 마련한다",
    source: "영역4 L2-4 Q3"
  },
  {
    id: "pmf-paid-conversion",
    itemId: "home-pmf",
    weight: 3,
    question: "우리 제품이나 서비스에 대한 유료 고객이 있었나요?",
    options: [
      "아직 유료 고객이나 실사용 고객이 없습니다",
      "관심을 보인 고객은 있지만 아직 비용을 지불하진 않았습니다",
      "유료 PoC나 첫 주문이 있었습니다",
      "재구매·갱신·사용량 증가가 여러 고객에서 반복됐습니다"
    ],
    followUp:
      "최근 사례 3건을 시간순으로 적어주세요. 고객명은 «고객 A»처럼 익명으로 적으셔도 됩니다.",
    action: "유료 PoC나 첫 주문을 만들고 고객이 투입한 비용·시간을 기록한다",
    source: "영역1 L2-2 Q2",
    critical: true
  },
  {
    id: "pmf-churn-cases",
    itemId: "home-pmf",
    weight: 1.5,
    question: "관심을 보였다가 떠난 고객의 이유를 알고 계신가요?",
    options: [
      "아직 그런 고객을 겪어보지 못했습니다",
      "있었지만 왜 떠났는지 확인하지 못했습니다",
      "떠난 고객과 시점, 이유를 파악하고 있습니다",
      "그 이유를 제품이나 영업 방식에 반영했습니다"
    ],
    followUp: "떠난 고객이 언제, 왜 멈췄는지 적어주세요.",
    action: "이탈 고객에게 중단 시점과 이유를 직접 확인해 기록한다",
    source: "영역1 L2-2 Q3"
  },
  {
    id: "pmf-buying-roles",
    itemId: "home-pmf",
    weight: 1.5,
    question: "고객사에서 누가 쓰고 누가 결정하는지 파악하고 계신가요?",
    options: [
      "아직 거기까지 나눠서 보지 못했습니다",
      "대략 짐작은 하지만 확인하진 못했습니다",
      "최근 거래에서 사용자·구매자·승인자를 구분해 알고 있습니다",
      "역할별로 다르게 접근하는 방식이 자리 잡았습니다"
    ],
    followUp:
      "최근 3건에서 문제를 처음 꺼낸 사람, 쓰는 사람, 돈 내는 사람, 승인한 사람을 적어주세요.",
    action: "최근 거래 3건의 사용자·구매자·승인자를 구분해 정리한다",
    source: "영역1 L2-1 Q1"
  },
  {
    id: "pmf-customer-words",
    itemId: "home-pmf",
    weight: 1.5,
    question: "고객이 우리를 택하거나 거절한 이유를 직접 들어보셨나요?",
    options: [
      "아직 물어본 적이 없습니다",
      "짐작은 하지만 고객에게 직접 확인하진 않았습니다",
      "고객에게 직접 듣고 기록해두었습니다",
      "여러 고객에게서 같은 이유가 반복해서 나옵니다"
    ],
    followUp: "고객이 실제로 쓴 표현을 그대로 적어주세요.",
    action: "고객에게 선택·거절 이유를 직접 묻고 표현 그대로 기록한다",
    source: "영역1 L2-3 Q2"
  },
  {
    id: "mkt-icp-count",
    itemId: "target-market",
    weight: 2,
    question: "초기 타겟 국가(시장)에서 고객이 몇 곳이고 얼마나 되는지 확인해 보셨나요?",
    options: [
      "아직 목표 국가를 정하지 못했습니다",
      "국가는 정했지만 고객 수는 시장 규모 자료로만 알고 있습니다",
      "구체적인 고객이나 계정을 세어봤습니다",
      "그 명단을 기준으로 실제 접촉을 시작했습니다"
    ],
    followUp: "어떤 고객이 몇 곳인지 적어주세요.",
    action: "목표 국가의 구매 가능 고객을 명단으로 세어 ICP 계정 수를 산출한다",
    source: "영역3 L2-1 Q1"
  },
  {
    id: "mkt-icp-source",
    itemId: "target-market",
    weight: 1.5,
    question: "그 고객 수를 어디에서 얻으셨나요?",
    options: [
      "아직 세어보지 않았습니다",
      "인구나 산업 통계에서 추정했습니다",
      "명단, 채널, 시설, 계정 데이터에서 직접 세었습니다",
      "그 데이터를 최신으로 갱신하며 관리하고 있습니다"
    ],
    followUp: "출처 이름과 기준일을 적어주세요.",
    action: "고객 수 산출에 쓴 명단·채널·계정 데이터의 출처와 기준일을 명시한다",
    source: "영역3 L2-1 Q2"
  },
  {
    id: "mkt-inbound-signal",
    itemId: "target-market",
    weight: 2,
    question: "광고 없이 먼저 들어온 해외 문의나 제안이 있었나요?",
    options: [
      "아직 없습니다",
      "있었지만 어느 나라에서 왜 왔는지 정리하지 않았습니다",
      "어느 나라에서 어떤 문의가 왔는지 정리해두었습니다",
      "그 문의가 미팅·샘플·주문으로 이어진 적이 있습니다"
    ],
    followUp: "어느 나라에서 어떤 문의가 왔는지 적어주세요.",
    action: "광고 이전에 들어온 해외 문의·주문·제안을 국가별로 정리한다",
    source: "영역3 L2-2 Q1"
  },
  {
    id: "mkt-country-compare",
    itemId: "target-market",
    weight: 1,
    question: "후보 국가를 여러 개 놓고 비교해보셨나요?",
    options: [
      "한 나라만 보고 있습니다",
      "여러 나라를 생각은 했지만 비교표로 만들진 않았습니다",
      "기준을 정해 비교표를 만들었습니다",
      "기준이나 가중치를 바꿔가며 순위가 뒤집히는지도 확인했습니다"
    ],
    followUp: "비교 기준과 상위 국가 순위를 적어주세요.",
    action: "후보국을 매력도·적합도·장벽·접근성·학습가치로 비교표를 만든다",
    source: "영역3 L2-4 Q1"
  },
  {
    id: "mkt-bias-check",
    itemId: "target-market",
    weight: 1,
    question: "인맥이나 지원사업이 없다고 해도 그 초기 타겟 국가(시장)가 1순위인가요?",
    options: [
      "그렇게 따져본 적이 없습니다",
      "따져보면 순위가 바뀔 것 같습니다",
      "빼고 따져봐도 같은 나라가 1순위였습니다",
      "그 판단을 외부 전문가나 현지 관계자에게도 확인받았습니다"
    ],
    followUp: "빼고 따졌을 때 순위가 어떻게 되는지 적어주세요.",
    action: "인맥·지원금 변수를 뺀 채 후보국 순위를 다시 계산한다",
    source: "영역3 L2-4 Q3"
  },
  {
    id: "bmlc-classification",
    itemId: "bmlc",
    weight: 2.5,
    question: "우리 제품이 그 나라에서 법적으로 어떤 분류인지 확인하셨나요?",
    options: [
      "아직 확인해보지 못했습니다",
      "인터넷 검색이나 지인 이야기로 대략 파악한 정도입니다",
      "규제기관 원문이나 공식 자료로 확인했습니다",
      "현지 전문가나 규제기관 회신으로 분류를 확정받았습니다"
    ],
    followUp: "확인한 기관명, 문서명, 확인 날짜를 적어주세요.",
    action: "규제기관 원문으로 제품분류와 적용 법규를 확인하고 출처·날짜를 기록한다",
    source: "영역6 L2-1 Q1",
    critical: true
  },
  {
    id: "bmlc-preconditions",
    itemId: "bmlc",
    weight: 2,
    question: "판매 전에 반드시 받아야 할 인허가나 인증을 알고 계신가요?",
    options: [
      "무엇이 필요한지 아직 모릅니다",
      "몇 가지는 알지만 전체 목록은 없습니다",
      "필요한 요건을 목록으로 정리했습니다",
      "요건별 담당자·비용·기한까지 정해 진행 중입니다"
    ],
    followUp: "필요한 요건과 아는 만큼의 비용·기간을 적어주세요.",
    action: "판매 전 필요한 인허가·인증·등록·라벨·세금·통관 요건을 목록화한다",
    source: "영역6 L2-1 Q2"
  },
  {
    id: "bmlc-na-basis",
    itemId: "bmlc",
    weight: 1.5,
    question: "«우리에겐 해당 없다»고 넘어간 규제 요건이 있나요?",
    options: [
      "규제 요건을 아직 살펴보지 못했습니다",
      "해당 없다고 본 게 있지만 내부 판단이었습니다",
      "제외한 근거를 자료로 확인했습니다",
      "전문가나 규제기관 검토로 제외를 확인받았습니다"
    ],
    followUp: "해당 없다고 보신 요건과 그 근거를 적어주세요.",
    action: "«해당 없음»으로 제외한 요건의 근거 자료를 확보한다",
    source: "영역6 L2-1 Q3"
  },
  {
    id: "bmlc-local-practice",
    itemId: "bmlc",
    weight: 1,
    question: "현지 거래 관행이나 대금 지급 방식을 알아보셨나요?",
    options: [
      "아직 알아보지 못했습니다",
      "자료로 읽어본 정도입니다",
      "현지 관계자에게 직접 들었습니다",
      "실제 거래나 계약에서 겪어봤습니다"
    ],
    followUp: "예상과 달랐던 관행이 있으면 적어주세요.",
    action: "현지 관계자에게 거래 관행·대금 지급·신뢰 요건을 직접 확인한다",
    source: "영역3 L2-3 Q2"
  },
  {
    id: "bmlc-hq-gap",
    itemId: "bmlc",
    weight: 1,
    question: "현지 고객이 우리 생각과 다르게 반응한 적이 있나요?",
    options: [
      "아직 현지 고객 반응을 들어보지 못했습니다",
      "들어봤지만 특별히 다른 점은 못 느꼈습니다",
      "본사 생각과 다른 반응을 확인했습니다",
      "그 차이를 반영해 제품이나 메시지를 바꿨습니다"
    ],
    followUp: "본사와 현지의 판단이 달랐던 항목을 적어주세요.",
    action: "현지 고객 반응을 듣고 본사 판단과 다른 지점을 기록한다",
    source: "영역5 L2-1 Q3"
  },
  {
    id: "lpa-pricing-payment",
    itemId: "lpa",
    weight: 2,
    question: "현지 고객이 기대하는 가격 표시와 결제 방식을 알아보셨나요?",
    options: [
      "아직 알아보지 못했습니다",
      "자료로 대략 파악한 정도입니다",
      "현지 고객이나 파트너에게 직접 확인했습니다",
      "실제 견적이나 청구에서 그 방식으로 거래해봤습니다"
    ],
    followUp: "우리 방식과 다른 점을 적어주세요.",
    action: "현지 고객·파트너에게 가격 표시·결제 수단·외상 기간 기대치를 확인한다",
    source: "영역5 L2-3 Q1"
  },
  {
    id: "lpa-net-price",
    itemId: "lpa",
    weight: 1.5,
    question: "세금·환율·수수료까지 넣은 고객 실지불액을 계산해보셨나요?",
    options: [
      "아직 계산해보지 못했습니다",
      "대략 알지만 항목별로 계산하진 않았습니다",
      "항목별로 계산해 실지불액을 알고 있습니다",
      "실제 거래 정산에서 그 계산이 맞는지 확인했습니다"
    ],
    followUp: "우리가 받는 금액과 고객이 내는 금액을 각각 적어주세요.",
    action: "세금·환율·수수료·환불을 반영한 고객 실지불액을 항목별로 계산한다",
    source: "영역5 L2-3 Q4"
  },
  {
    id: "lpa-infra-partner",
    itemId: "lpa",
    weight: 1.5,
    question: "물류·결제·클라우드 같은 현지 공급자를 정하셨나요?",
    options: [
      "아직 알아보지 못했습니다",
      "후보는 있지만 조건을 받아보진 않았습니다",
      "견적이나 조건을 받아 후보를 좁혔습니다",
      "실제로 소량이나 시험 물량을 돌려봤습니다"
    ],
    followUp: "선정 기준과 시험해본 내용을 적어주세요.",
    action: "물류·결제·클라우드 공급자 후보에게 견적과 조건을 받아 좁힌다",
    source: "영역7 L2-3 Q1"
  },
  {
    id: "lpa-bridge-person",
    itemId: "lpa",
    weight: 1.5,
    question: "현지 사정을 아는 사람과 우리 제품을 아는 사람이 연결돼 있나요?",
    options: [
      "아직 그런 사람이 없습니다",
      "필요하다고 느끼지만 아직 찾지 못했습니다",
      "그 역할을 하는 사람이 있습니다",
      "그 사람을 통해 실제 의사결정이나 거래가 진행되고 있습니다"
    ],
    followUp: "그 역할을 누가 어떤 방식으로 하고 있는지 적어주세요.",
    action: "현지 지식과 본사 제품 지식을 잇는 담당자를 지정한다",
    source: "영역9 L2-1 Q3"
  },
  {
    id: "lpa-journey-blocker",
    itemId: "lpa",
    weight: 1.5,
    question: "현지 사용자가 어디에서 막히는지 보신 적이 있나요?",
    options: [
      "아직 현지 사용자가 써본 적이 없습니다",
      "써봤지만 어디서 막히는지 관찰하진 못했습니다",
      "막히는 지점을 실제로 관찰했습니다",
      "그 지점을 고친 뒤 개선됐는지까지 확인했습니다"
    ],
    followUp: "어디에서 막혔는지 구간별로 적어주세요.",
    action: "현지 사용자의 인지→구매→사용 흐름을 관찰해 막히는 지점을 찾는다",
    source: "영역5 L2-1 Q1"
  },
  {
    id: "test-environment",
    itemId: "market-testing",
    weight: 3,
    question: "현지 환경에서 제품이 제대로 작동하는지 시험해보셨나요?",
    options: [
      "아직 시험해보지 못했습니다",
      "국내에서만 시험했고 현지 조건은 반영하지 못했습니다",
      "현지 조건을 반영해 시험했습니다",
      "현지에서 실제 사용·납품하며 반복 확인했습니다"
    ],
    followUp:
      "어떤 조건에서 무엇을 시험하셨는지 적어주세요. 실물이 없는 서비스라면 네트워크·기기·데이터 규정 환경 시험을 적어주세요.",
    action: "현지 조건을 반영한 제품 작동 시험을 설계해 실행한다",
    source: "영역5 L2-2 Q1",
    critical: true
  },
  {
    id: "test-defects",
    itemId: "market-testing",
    weight: 2.5,
    question: "시험 과정에서 나온 문제를 파악하고 계신가요?",
    options: [
      "아직 시험을 하지 않아 해당 사항이 없습니다",
      "시험은 했지만 문제를 따로 기록하진 않았습니다",
      "나온 문제와 해결 결과를 기록해두었습니다",
      "원인 분석과 재발 방지까지 연결했습니다"
    ],
    followUp: "나온 문제와 아직 못 고친 것을 적어주세요.",
    action: "시험에서 나온 결함과 해결 결과를 기록하고 미해결 항목을 남긴다",
    source: "영역5 L2-2 Q2"
  },
  {
    id: "test-message-worked",
    itemId: "market-testing",
    weight: 2.5,
    question: "어떤 메시지나 데모가 실제 문의로 이어졌는지 아시나요?",
    options: [
      "아직 현지에 알려본 적이 없습니다",
      "알렸지만 무엇이 통했는지는 모르겠습니다",
      "문의나 구매로 이어진 메시지를 알고 있습니다",
      "그 메시지가 여러 번 반복해서 통했습니다"
    ],
    followUp: "어떤 메시지·콘텐츠·데모가 통했는지 적어주세요.",
    action: "메시지·데모·샘플별로 문의·구매 전환을 나눠 측정한다",
    source: "영역8 L2-3 Q1"
  },
  {
    id: "test-no-discount",
    itemId: "market-testing",
    weight: 2.5,
    question: "할인이나 무료 제공 없이도 고객이 구매까지 가나요?",
    options: [
      "아직 구매 사례가 없습니다",
      "구매는 있었지만 모두 할인이나 무료 제공이 있었습니다",
      "할인 없이 성사된 사례가 있습니다",
      "할인 없는 거래가 대부분입니다"
    ],
    followUp: "할인 없이 성사된 사례와 그 조건을 적어주세요.",
    action: "할인 없는 조건으로 제안해 성사되는지 확인한다",
    source: "영역8 L2-3 Q4"
  },
  {
    id: "test-counter-evidence",
    itemId: "market-testing",
    weight: 1.5,
    question: "«여기서는 안 통할 수도 있겠다» 싶은 신호를 본 적이 있나요?",
    options: [
      "그런 관점에서 살펴본 적이 없습니다",
      "걱정은 되지만 구체적인 신호를 확인하진 못했습니다",
      "실제로 그런 신호나 사례를 확인했습니다",
      "그 신호를 계획에 반영해 가설을 수정했습니다"
    ],
    followUp: "어떤 신호였는지, 무엇을 바꾸셨는지 적어주세요.",
    action: "가치 이전을 반박하는 현지 신호를 의도적으로 찾아 기록한다",
    source: "영역1 L2-4 Q4"
  },
  {
    id: "partner-actual-work",
    itemId: "partner-acquisition",
    weight: 3,
    question: "현지 파트너가 정해져 있고 실제로 일을 하고 있나요?",
    options: [
      "아직 파트너가 없습니다",
      "논의 중이거나 MOU·의향서만 있습니다",
      "역할을 정하고 실제로 일부를 수행했습니다",
      "파트너를 통해 거래가 반복해서 일어나고 있습니다"
    ],
    followUp: "파트너가 맡기로 한 일과 실제로 해낸 일을 적어주세요.",
    action: "파트너 역할을 문서로 정하고 일부를 실제로 수행하게 한다",
    source: "영역8 L2-4 Q1"
  },
  {
    id: "partner-economics",
    itemId: "partner-acquisition",
    weight: 2.5,
    question: "파트너를 통하는 게 직접 파는 것보다 나은지 계산해보셨나요?",
    options: [
      "아직 계산해보지 못했습니다",
      "대략 감은 있지만 숫자로 비교하진 않았습니다",
      "마진·리베이트·지원비까지 넣어 비교했습니다",
      "실제 거래 결과로 그 비교가 맞는지 확인했습니다"
    ],
    followUp: "두 방식의 건당 손익을 적어주세요.",
    action: "마진·리베이트·교육·지원비를 넣어 파트너 채널과 직접판매를 비교한다",
    source: "영역8 L2-4 Q2"
  },
  {
    id: "partner-ecosystem-interviews",
    itemId: "partner-acquisition",
    weight: 2.5,
    question: "현지에서 역할별로 사람을 만나보셨나요?",
    options: [
      "아직 만나본 적이 없습니다",
      "몇 명 만났지만 역할이 한쪽에 몰려 있습니다",
      "사용자·구매·유통·조달·규제 중 여러 역할을 만났습니다",
      "역할별로 충분히 만나 가설을 수정했습니다"
    ],
    followUp: "역할별로 몇 명씩 만나셨는지 적어주세요.",
    action: "사용자·구매·유통·조달·규제 역할별로 현지 인터뷰를 진행한다",
    source: "영역3 L2-3 Q1"
  },
  {
    id: "partner-shortfall",
    itemId: "partner-acquisition",
    weight: 2,
    question: "파트너가 약속을 못 지킨 적이 있나요?",
    options: [
      "아직 파트너가 없거나 판단할 기간이 안 됐습니다",
      "약속이 지켜지는지 따로 확인하지 않고 있습니다",
      "미달 여부를 확인하고 있습니다",
      "미달했을 때 조치하는 절차가 있고 실제로 적용했습니다"
    ],
    followUp: "미달 사례와 그때 하신 조치를 적어주세요.",
    action: "파트너 파이프라인·판매 약속의 달성 여부를 정기 점검한다",
    source: "영역8 L2-4 Q3"
  },
  {
    id: "partner-cold-check",
    itemId: "partner-acquisition",
    weight: 2,
    question: "아직 사지 않는 고객의 이야기도 들어보셨나요?",
    options: [
      "소개받은 분들 위주로만 만났습니다",
      "필요하다고 느끼지만 아직 못 만났습니다",
      "사지 않는 고객이나 냉담한 반응도 들어봤습니다",
      "그 이유를 분류해 제품이나 영업에 반영했습니다"
    ],
    followUp: "사지 않는 이유로 무엇을 들으셨는지 적어주세요.",
    action: "소개받지 않은 콜드 고객과 비구매자 의견을 확보한다",
    source: "영역3 L2-3 Q5"
  },
  {
    id: "plan-hypothesis-kpi",
    itemId: "local-plan",
    weight: 3,
    question: "지금 타겟 시장에서 확인해야 할 가설과 가설을 모니터링 할 지표가 정해져 있나요?",
    options: [
      "아직 정하지 못했습니다",
      "무엇을 봐야 할지 고민 중입니다",
      "가설과 지표를 정해두었습니다",
      "그 지표를 정기적으로 보고 결정에 쓰고 있습니다"
    ],
    followUp: "가설과 선행·후행 지표를 적어주세요.",
    action: "현 단계 검증 가설과 선행·후행 KPI를 정의한다",
    source: "영역10 L2-1 Q1"
  },
  {
    id: "plan-stop-rule",
    itemId: "local-plan",
    weight: 2.5,
    question: "추가 투자를 멈출 기준이 정해져 있나요?",
    options: [
      "아직 정하지 않았습니다",
      "필요하다고 생각은 하지만 숫자로 정하진 않았습니다",
      "지표·기준값·기간을 정해두었습니다",
      "경영진 승인까지 받아 문서로 확정했습니다"
    ],
    followUp: "어떤 지표가 얼마 동안 미달이면 멈추는지 적어주세요.",
    action: "추가 투자를 멈출 지표·기준값·기간을 정한다",
    source: "영역10 L2-2 Q1"
  },
  {
    id: "plan-single-tracker",
    itemId: "local-plan",
    weight: 2,
    question: "목표와 실적, 담당자를 한곳에서 보고 계신가요?",
    options: [
      "따로 관리하는 곳이 없습니다",
      "여러 문서와 메신저에 흩어져 있습니다",
      "한곳에 모아 보고 있습니다",
      "정기 회의에서 그 자료로 실제 결정을 내립니다"
    ],
    followUp: "어디에서 무엇을 보고 계신지 적어주세요.",
    action: "목표·실적·전망·담당자·다음 결정일을 한 곳에서 추적한다",
    source: "영역10 L2-1 Q4"
  },
  {
    id: "plan-change-control",
    itemId: "local-plan",
    weight: 1.5,
    question: "현지화 변경을 누가 승인하고 되돌릴지 정해져 있나요?",
    options: [
      "아직 정하지 않았습니다",
      "필요하면 그때그때 상의해서 정합니다",
      "버전·담당자·승인 절차가 있습니다",
      "실제로 되돌린 사례가 있습니다"
    ],
    followUp: "변경 승인과 되돌리기 절차를 적어주세요.",
    action: "현지화 변경의 버전·승인·롤백 절차를 만든다",
    source: "영역5 L2-4 Q4"
  },
  {
    id: "org-single-owner",
    itemId: "local-team",
    weight: 2,
    question: "그 시장의 성과를 최종 책임지는 한 사람이 있나요?",
    options: [
      "아직 정하지 않았습니다",
      "여러 명이 나눠서 보고 있습니다",
      "한 사람이 정해져 있습니다",
      "그 사람이 손익까지 책임지고 권한도 함께 갖고 있습니다"
    ],
    followUp: "그 사람이 누구이고 무엇까지 책임지는지 적어주세요.",
    action: "목표 시장의 매출·손익을 최종 책임질 한 사람을 지정한다",
    source: "영역9 L2-1 Q1",
    critical: true
  },
  {
    id: "org-continuity",
    itemId: "local-team",
    weight: 1.5,
    question: "해외진출에 대한 핵심 인력이 자리를 비워도 일이 계속 될 것이라 생각하시나요?",
    options: [
      "생각해본 적이 없습니다",
      "그 사람이 없으면 멈출 것 같습니다",
      "대신할 사람이나 방법이 정해져 있습니다",
      "실제로 자리를 비웠을 때 문제없이 돌아갔습니다"
    ],
    followUp: "누가 어떻게 대신하는지 적어주세요.",
    action: "핵심 인력 부재 시 대체 담당과 인수인계 방법을 정한다",
    source: "영역9 L2-1 Q5"
  },
  {
    id: "org-decision-cases",
    itemId: "local-team",
    weight: 1.5,
    question: "가격·품질·규제 문제를 실제로 누가 결정했는지 아시나요?",
    options: [
      "아직 그런 상황이 없었습니다",
      "상황마다 달라서 정해진 게 없습니다",
      "최근 사례에서 누가 결정하고 승인했는지 명확합니다",
      "그 방식이 문서로 정해져 있고 실제와 일치합니다"
    ],
    followUp: "최근 사례에서 누가 결정하고 누가 승인했는지 적어주세요.",
    action: "가격·품질·규제·보상 결정의 실제 결정자와 승인자를 기록한다",
    source: "영역9 L2-2 Q1"
  },
  {
    id: "org-local-authority",
    itemId: "local-team",
    weight: 1,
    question: "현지 책임자가 본사 승인 없이 정할 수 있는 게 있나요?",
    options: [
      "아직 현지 책임자가 없습니다",
      "모든 결정을 본사가 합니다",
      "일부 항목은 현지에서 정할 수 있습니다",
      "항목과 금액 한도가 정해져 있고 실제로 그렇게 운영됩니다"
    ],
    followUp: "현지에서 정할 수 있는 항목과 한도를 적어주세요.",
    action: "현지 책임자가 독자 결정할 항목과 금액 한도를 정한다",
    source: "영역4 L2-3 Q1"
  },
  {
    id: "org-escalation",
    itemId: "local-team",
    weight: 1,
    question: "급한 문제가 생기면 누구에게 얼마 안에 전달되나요?",
    options: [
      "정해둔 것이 없습니다",
      "그때그때 연락하는 사람에게 전달합니다",
      "누구에게 얼마 안에 전달할지 정해져 있습니다",
      "실제 문제 상황에서 그 경로가 작동했습니다"
    ],
    followUp: "급한 일과 일반적인 일의 전달 경로와 시간을 적어주세요.",
    action: "긴급·일반 사안의 에스컬레이션 대상과 응답 시간을 정한다",
    source: "영역9 L2-2 Q4",
    critical: true
  },
  {
    id: "contract-control",
    itemId: "partner-contract",
    weight: 2.5,
    question: "파트너 계약에 통제 조항이 들어가 있나요?",
    options: [
      "아직 계약을 맺지 않았습니다",
      "계약은 있지만 상대방 양식을 그대로 썼습니다",
      "독점·데이터·가격·종료 조건을 확인하고 반영했습니다",
      "전문가 검토를 거쳐 조항을 확정했습니다"
    ],
    followUp:
      "들어가 있는 조항의 요지를 적어주세요. 계약서 원본은 보내지 않으셔도 됩니다.",
    action: "파트너 계약에 독점·데이터·가격·브랜드·종료 조건을 반영한다",
    source: "영역8 L2-4 Q4"
  },
  {
    id: "contract-exit",
    itemId: "partner-contract",
    weight: 2,
    question: "파트너와 헤어져도 고객을 확보 할 수 있나요?",
    options: [
      "생각해본 적이 없습니다",
      "어려울 것 같지만 확인하진 않았습니다",
      "계약이나 실무상 가져올 수 있게 되어 있습니다",
      "고객 명단과 계약을 우리가 직접 보유하고 있습니다"
    ],
    followUp: "고객 명단과 계약을 누가 갖고 있는지 적어주세요.",
    action: "파트너 종료 시 고객과 운영을 이전받는 방법을 계약에 넣는다",
    source: "영역8 L2-4 Q5"
  },
  {
    id: "contract-switch-cost",
    itemId: "partner-contract",
    weight: 2,
    question: "그 파트너를 다른 업체나 인력으로 바꿀 수 있나요?",
    options: [
      "생각해본 적이 없습니다",
      "대체가 어렵다고만 알고 있습니다",
      "대체 후보와 예상 시간·비용을 파악하고 있습니다",
      "대체 후보를 실제로 접촉하거나 시험해봤습니다"
    ],
    followUp: "전환에 드는 시간과 비용을 적어주세요.",
    action: "대체 파트너 후보와 전환 소요 시간·비용을 파악한다",
    source: "영역7 L2-3 Q4"
  },
  {
    id: "contract-dependency-limit",
    itemId: "partner-contract",
    weight: 1.5,
    question: "한 파트너에 얼마나 의존 할 지 기준을 정하셨나요?",
    options: [
      "생각해본 적이 없습니다",
      "의존이 크다는 건 알지만 기준은 없습니다",
      "허용 한도를 정해두었습니다",
      "한도를 넘으면 무엇을 할지까지 정하고 실행합니다"
    ],
    followUp: "현재 의존 비중과 허용 한도를 적어주세요.",
    action: "단일 파트너 의존 허용 한도를 정하고 초과 시 조치를 정한다",
    source: "영역7 L2-3 Q5"
  },
  {
    id: "alloc-milestone-budget",
    itemId: "resource-allocation",
    weight: 2,
    question: "다음 예산이 나가는 조건이 정해져 있나요?",
    options: [
      "아직 정하지 않았습니다",
      "필요할 때마다 그때그때 결정합니다",
      "마일스톤과 금액이 연결되어 있습니다",
      "그 기준으로 실제 예산을 집행하거나 보류해봤습니다"
    ],
    followUp: "마일스톤과 걸린 금액을 적어주세요.",
    action: "마일스톤별 예산 해제 조건을 정한다",
    source: "영역4 L2-2 Q5"
  },
  {
    id: "alloc-capacity",
    itemId: "resource-allocation",
    weight: 1.5,
    question: "주문이 갑자기 늘면 어디가 먼저 막힐지 아시나요?",
    options: [
      "생각해본 적이 없습니다",
      "짐작은 하지만 확인하진 않았습니다",
      "어느 공정·시스템·인력이 먼저 막히는지 파악하고 있습니다",
      "실제로 겪어봤거나 부하 시험을 해봤습니다"
    ],
    followUp: "가장 먼저 막히는 지점과 그 근거를 적어주세요.",
    action: "수요 급증 시 먼저 무너지는 공정·시스템·인력을 파악한다",
    source: "영역7 L2-4 Q2"
  },
  {
    id: "alloc-conditional-limit",
    itemId: "resource-allocation",
    weight: 1.5,
    question: "해외진출 사업에서 조건부로 계속 진행 할 때 그 예산 한도를 정해 두었나요?",
    options: [
      "아직 정하지 않았습니다",
      "필요하다고 보지만 숫자로 정하진 않았습니다",
      "예산·기간·고객 범위 한도를 정해두었습니다",
      "그 한도를 실제 실험이나 진입에 적용해봤습니다"
    ],
    followUp: "예산·기간·고객 범위 한도를 적어주세요.",
    action: "조건부 계속의 예산·기간·고객 범위 한도를 정한다",
    source: "영역10 L2-2 Q5"
  },
  {
    id: "alloc-concentration",
    itemId: "resource-allocation",
    weight: 1,
    question: "특정 고객이나 채널에 매출이 쏠리는 것을 어디까지 관리하고 계신가요?",
    options: [
      "따로 보고 있지 않습니다",
      "몰려 있다는 건 알지만 기준은 없습니다",
      "허용 비중을 정하고 지켜보고 있습니다",
      "한도를 넘었을 때 실제로 완화 조치를 해봤습니다"
    ],
    followUp: "현재 가장 큰 고객·채널 비중과 허용 한도를 적어주세요.",
    action: "단일 고객·채널·공급자 의존 허용 비중과 완화 조치를 정한다",
    source: "영역10 L2-3 Q2"
  }
];
