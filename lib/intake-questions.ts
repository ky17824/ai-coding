import type { Locale } from "@/lib/i18n";
import {
  EN_ITEM_COPY,
  EN_QUESTION_COPY,
  EN_STAGE_COPY,
  V5_EN_DETAIL_OVERRIDES,
  V5_EN_QUESTION_TEXT
} from "@/lib/intake-questions.en";

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
export type SurveyVersion = "4.0" | "5.0";
export const LATEST_SURVEY_VERSION: SurveyVersion = "5.0";

export const V5_RETIRED_IDS = [
  "mvc-stop-criteria",
  "res-key-person-risk",
  "mkt-icp-source",
  "mkt-inbound-signal",
  "mkt-bias-check",
  "bmlc-hq-gap",
  "lpa-pricing-payment",
  "org-decision-cases",
  "alloc-conditional-limit"
] as const;

export const V5_REWRITTEN_IDS = [
  "mvc-resource-priority",
  "pmf-paid-conversion",
  "pmf-buying-roles",
  "mkt-icp-count",
  "mkt-country-compare",
  "bmlc-na-basis",
  "bmlc-local-practice",
  "lpa-net-price",
  "lpa-journey-blocker",
  "test-defects",
  "test-no-discount",
  "test-counter-evidence",
  "partner-shortfall",
  "contract-control",
  "contract-dependency-limit",
  "alloc-capacity",
  "alloc-concentration"
] as const;

/**
 * 스타트업이 파는 것이 제품인지 서비스인지 아직 모를 때가 많다. 그래서 문항은
 * «제품·서비스»로 써 두고, 대표님이 밝히시면 그때부터 한쪽으로 좁혀 보여준다.
 */
export type OfferingType = "both" | "product" | "service";

/** «제품·서비스» 뒤 조사는 받침 없는 '서비스' 기준으로 적혀 있다. '제품'으로 좁히면 함께 바꾼다. */
const PARTICLE_AFTER_BATCHIM: Record<string, string> = {
  "가": "이",
  "를": "을",
  "는": "은",
  "와": "과"
};

/** 문항·보기·액션 문구를 대표님이 파는 것에 맞춰 좁힌다. 모르면 그대로 둔다. */
export function applyOffering(text: string, offering: OfferingType, locale: Locale = "ko"): string {
  if (offering === "both") return text;
  if (locale === "en") {
    return text.replaceAll("product or service", offering);
  }
  const word = offering === "product" ? "제품" : "서비스";
  return text.replace(/제품·서비스([가를는와])?/g, (_match, particle?: string) => {
    if (!particle) return word;
    return word + (offering === "product" ? PARTICLE_AFTER_BATCHIM[particle] : particle);
  });
}

/** 이 단계 이상이면 «긍정적인 대답»으로 센다. */
export const POSITIVE_LEVEL: AnswerLevel = 3;
export const PAID_PILOT_QUESTION_ID = "pmf-paid-conversion";

export const INTAKE_STAGES = [
  {
    id: "early",
    label: "준비 1단계",
    phase: "Plan",
    gate: "A",
    journeyPhase: "pre_entry",
    weight: 30,
    intro:
      "아직 목표국가(Target Country)와 자원(Resource)을 정하는 단계입니다. 지금 상태를 그대로 골라주세요. 아직 하지 않은 것을 고르셔도 불이익은 없습니다.",
    unlocks: "목표국가(Target Country)를 확정하고 현지 규제·시장 조사에 예산을 투입할 수 있습니다."
  },
  {
    id: "preparing",
    label: "준비 2단계",
    phase: "Enable",
    gate: "B",
    journeyPhase: "initial_entry",
    weight: 40,
    intro:
      "현지 규제와 시장을 조사하고 실제로 시험해보는 단계입니다. 해보신 만큼만 골라주세요.",
    unlocks: "제한된 범위에서 실제 거래를 열고 파트너 계약을 맺을 수 있습니다."
  },
  {
    id: "ready",
    label: "준비 3단계",
    phase: "Execute 진입요건",
    gate: "C",
    journeyPhase: "scale",
    weight: 30,
    intro:
      "진입을 실행에 옮기기 직전 단계입니다. 문서와 계약, 사람에 관해 여쭙습니다.",
    unlocks: "현지 운영을 시작하고 반복 가능한 성과와 확장을 검증할 수 있습니다."
  }
] as const;

export type IntakeStageId = (typeof INTAKE_STAGES)[number]["id"];

export const INTAKE_ITEMS = [
  { id: "global-mindset", stageId: "early", label: "글로벌 진출 관점(Global Mindset)", weight: 6, owner: "대표·이사회", serviceTag: "leadership" },
  { id: "resources", stageId: "early", label: "인적·운영 자원(Resource)", weight: 9, owner: "대표·재무 책임자", serviceTag: "leadership" },
  { id: "home-pmf", stageId: "early", label: "가치제안 · 국내 PMF", weight: 7.5, owner: "대표·제품 책임자", serviceTag: "market-validation" },
  { id: "target-market", stageId: "early", label: "목표국가(Target Country) · 초기 고객군", weight: 7.5, owner: "사업개발 책임자", serviceTag: "market-validation" },
  { id: "bmlc", stageId: "preparing", label: "사업모델 현지화 캔버스(Business Model Localization Canvas) 규제·문화 분석", weight: 8, owner: "규제·법무 담당", serviceTag: "compliance" },
  { id: "lpa", stageId: "preparing", label: "현지화 프리미엄 분석(Localization Premium Analysis) 6축 시장조사", weight: 8, owner: "제품·운영 책임자", serviceTag: "gtm" },
  { id: "market-testing", stageId: "preparing", label: "시장 실증시험(Market Testing)", weight: 12, owner: "제품·GTM 책임자", serviceTag: "gtm" },
  { id: "partner-acquisition", stageId: "preparing", label: "네트워크 · 파트너 확보", weight: 12, owner: "사업개발 책임자", serviceTag: "gtm" },
  { id: "local-plan", stageId: "ready", label: "현지 비즈니스 모델 캔버스(Business Model Canvas) · 단계별 실행계획(30·60·90 Day Plan)", weight: 9, owner: "대표·GTM 책임자", serviceTag: "gtm" },
  { id: "local-team", stageId: "ready", label: "현지 최소 운영인력", weight: 7, owner: "대표·인사 책임자", serviceTag: "organization" },
  { id: "partner-contract", stageId: "ready", label: "파트너 계약 · 운영화", weight: 8, owner: "사업개발·법무 담당", serviceTag: "compliance" },
  { id: "resource-allocation", stageId: "ready", label: "현지 운영 자원(Resource) 배정", weight: 6, owner: "재무 책임자", serviceTag: "unit-economics" }
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
  /** Critical 선결 조건. 3단계 미만이면 해당 Phase Gate를 차단한다. */
  critical?: true;
}

export const INTAKE_QUESTIONS: IntakeQuestion[] = [
  {
    id: "mvc-purpose-alignment",
    itemId: "global-mindset",
    weight: 2,
    question: "왜 글로벌 시장에 진출해야 하는지, 대표님과 경영진이 서로 같은 이유를 말씀하시나요?",
    options: [
      "경영진끼리 이 주제를 따로 맞춰본 적이 없습니다",
      "이야기를 나눠보긴 했지만 각자 설명이 다릅니다",
      "회의나 문서로 목적을 한 번 정리했고 대체로 같게 설명합니다",
      "정리한 목적을 기준으로 실제 의사결정을 여러 번 내려봤습니다"
    ],
    followUp: "경영진이 각각 어떻게 설명하시는지, 서로 다른 점이 있다면 무엇인지 적어주세요.",
    action: "경영진 각자의 진출 목적을 한 문장씩 받아 차이를 정리하고 하나로 합의한다",
    source: "영역4 L2-1 Q1"
  },
  {
    id: "mvc-stop-criteria",
    itemId: "global-mindset",
    weight: 1.5,
    question: "글로벌 진출 성과가 기대에 못 미칠 경우 언제 어떤 조치를 할지 기준을 미리 정해두셨나요?",
    options: [
      "아직 거기까지 생각해보지 못했습니다",
      "생각은 해봤지만 기준을 정해두지는 않았습니다",
      "어떤 지표가 얼마 동안 미달이면 조치할지 정해두었습니다",
      "그 기준에 따라 실제로 축소하거나 중단해본 적이 있습니다"
    ],
    followUp: "어떤 지표가 얼마 동안 미달이면 무엇을 하기로 정하셨는지 적어주세요.",
    action: "계속·축소·사업방향 전환(Pivot)·철수를 가르는 지표·기준값·기간을 정해 경영진 승인을 받는다",
    source: "영역4 L2-1 Q3"
  },
  {
    id: "mvc-resource-priority",
    itemId: "global-mindset",
    weight: 1.5,
    question: "국내 사업과 글로벌 사업이 같은 인력이나 예산을 놓고 부딪힌 적이 있는지요? 있었다면 어떻게 정하셨나요?",
    options: [
      "아직 글로벌 사업에 인력이나 예산을 따로 배정하지 않았습니다",
      "배정은 했지만 아직 부딪힌 적은 없습니다",
      "부딪힌 적이 있고 그때그때 판단해서 정했습니다",
      "우선순위 기준이 정해져 있어 그대로 적용합니다"
    ],
    followUp: "가장 최근에 부딪힌 상황과 어느 쪽을 택하셨는지 적어주세요.",
    action: "국내·글로벌 자원(Resource) 충돌 시 우선순위 판단 기준을 문서로 정한다",
    source: "영역4 L2-1 Q5"
  },
  {
    id: "mvc-reference-market",
    itemId: "global-mindset",
    weight: 1,
    question: "우리 제품·서비스의 가치가 글로벌 고객에게도 통하는지 확인해 볼 초기 목표시장(Target Market)을 정하셨는지요?",
    options: [
      "아직 어느 시장을 기준으로 볼지 정하지 못했습니다",
      "국내 시장을 기준으로 보고 있고 아직 검증하는 중입니다",
      "국내나 특정 글로벌 시장에서 실제 고객 행동으로 확인했습니다",
      "여러 고객에게서 같은 결과가 반복됐습니다"
    ],
    followUp: "어느 시장의 누가 어떤 행동을 보였는지 적어주세요.",
    action: "가치를 검증할 기준 시장을 정하고 그 시장 고객의 실제 행동을 기록한다",
    source: "영역1 L2-4 Q2"
  },
  {
    id: "res-tce",
    itemId: "resources",
    weight: 3,
    question: "이번 글로벌 진출에 인증·현지화(Localization)·인력·법률·물류를 모두 더해 총 얼마가 들지 계산해보셨나요?",
    options: [
      "아직 계산해보지 못했습니다",
      "대략 감은 있지만 항목별로 정리하지는 않았습니다",
      "인증·현지화(Localization)·인력·법률·물류·마케팅 등 항목별로 정리했습니다",
      "실제 견적과 지출로 항목을 확인하며 갱신하고 있습니다"
    ],
    followUp: "총액과 가장 큰 비용 항목 세 가지를 적어주세요.",
    action: "인증·현지화(Localization)·인력·법률·물류·마케팅·지원 비용을 항목별로 합산해 총 진입비용(Total Cost of Entry)을 산출한다",
    source: "영역4 L2-2 Q1",
    critical: true
  },
  {
    id: "res-cash-runway",
    itemId: "resources",
    weight: 2,
    question: "현지 매출이 예상보다 늦어질 경우 회사가 몇 개월이나 버틸 수 있는지 알고 계신가요?",
    options: [
      "따로 계산해보지 않았습니다",
      "대략 알지만 숫자로 정리하지는 않았습니다",
      "몇 개월을 얼마로 버틸 수 있는지 숫자로 알고 있습니다",
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
    question: "정부 지원금을 받지 못하더라도 자체 자금만으로 진행할 최소 범위를 정해두셨는지요?",
    options: [
      "지원금을 전제로 계획을 세웠습니다",
      "지원금이 없으면 어떻게 할지 고민만 해봤습니다",
      "지원금 없이 진행할 최소 범위를 정해두었습니다",
      "이미 자체 자금만으로 그 범위를 실행하고 있습니다"
    ],
    followUp: "지원금 없이도 진행하실 국가와 고객군, 제품·서비스 범위를 적어주세요.",
    action: "정부 지원금을 뺀 최소 실행 범위를 국가와 고객군, 제품·서비스 단위로 확정한다",
    source: "영역4 L2-2 Q4"
  },
  {
    id: "res-owner-time",
    itemId: "resources",
    weight: 1,
    question: "이번 글로벌 진출을 책임지고 이끌 담당자가 정해져 있는지요? 그분이 이 일에 쓸 시간은 확보되어 있나요?",
    options: [
      "아직 정하지 않았고 그때그때 나눠서 합니다",
      "사람은 정했지만 다른 업무를 겸하고 있어 쓸 시간이 거의 없습니다",
      "책임자가 정해져 있고 매주 일정 시간을 고정으로 쓰고 있습니다",
      "책임자가 이 일을 주 업무로 하고 성과 책임까지 지고 있습니다"
    ],
    followUp: "책임자와 주당 실제 투입 시간, 겸하고 있는 업무를 적어주세요.",
    action: "진출 책임자를 지정하고 주당 고정 투입 시간을 확보한다",
    source: "영역4 L2-4 Q1",
    critical: true
  },
  {
    id: "res-key-person-risk",
    itemId: "resources",
    weight: 1,
    question: "특정 한 사람이 자리를 비우면 진행이 멈춰 버리는 의사결정이나 거래 관계가 있는지요?",
    options: [
      "생각해본 적이 없습니다",
      "있다는 것은 알지만 무엇인지 정리하지 못했습니다",
      "어떤 의사결정과 관계가 거기에 해당하는지 파악하고 있습니다",
      "대체 인력이나 인수인계 방법까지 마련했습니다"
    ],
    followUp: "그 한 사람이 빠지면 멈추는 의사결정이나 관계를 적어주세요.",
    action: "한 사람에게 묶인 의사결정과 관계를 목록으로 정리하고 대체 방법을 마련한다",
    source: "영역4 L2-4 Q3"
  },
  {
    id: "pmf-paid-conversion",
    itemId: "home-pmf",
    weight: 3,
    question: "국내 유료 판매 경험이 있나요? 없다면 초기 목표국가에서 유료 실증시험(PoC)이나 파일럿을 완료했나요?",
    options: [
      "국내 유료 고객이 없고 초기 목표국가의 유료 실증시험이나 파일럿도 시작하지 않았습니다",
      "관심 고객은 있지만 국내 판매나 초기 목표국가의 유료 검증을 아직 완료하지 못했습니다",
      "국내 유료 판매 또는 초기 목표국가의 유료 실증시험·파일럿을 완료했습니다",
      "국내외 여러 고객에게서 재구매·갱신·사용량 증가가 반복됐습니다"
    ],
    followUp:
      "국내 유료 판매 또는 초기 목표국가의 유료 실증시험·파일럿 결과를 적어주세요. 고객명은 익명화할 수 있으며 고객이 투입한 비용·시간과 확인된 시장 반응을 포함해 주세요.",
    action: "초기 목표국가에서 유료 PoC나 첫 주문을 확보하고 고객이 투입한 비용·시간을 기록한다",
    source: "영역1 L2-2 Q2",
    critical: true
  },
  {
    id: "pmf-churn-cases",
    itemId: "home-pmf",
    weight: 1.5,
    question: "우리 제품·서비스에 관심을 보였던 고객이 이탈한 적이 있는지요? 있었다면 왜 이탈했는지 파악하고 계신가요?",
    options: [
      "아직 그런 고객이 없었습니다",
      "있었지만 왜 떠났는지 확인하지 못했습니다",
      "어떤 고객이 언제, 왜 떠났는지 파악하고 있습니다",
      "그 이유를 제품·서비스나 영업 방식에 반영했습니다"
    ],
    followUp: "떠난 고객이 언제, 왜 거래를 멈췄는지 적어주세요.",
    action: "이탈 고객에게 중단 시점과 이유를 직접 확인해 기록한다",
    source: "영역1 L2-2 Q3"
  },
  {
    id: "pmf-buying-roles",
    itemId: "home-pmf",
    weight: 1.5,
    question: "대표님의 고객사에서 누가 우리 서비스를 실제로 사용하고, 누가 구매를 결정하는지 파악하고 계신지요?",
    options: [
      "아직 거기까지 나눠서 보지 못했습니다",
      "대략 짐작은 하지만 확인해보지는 않았습니다",
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
    question: "고객이 우리를 선택했거나 거절했을 때 그 이유를 고객에게 직접 들어보신 적이 있는지요?",
    options: [
      "아직 물어본 적이 없습니다",
      "짐작은 하지만 고객에게 직접 확인해보지는 않았습니다",
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
    question: "초기 목표시장(Target Market)에 우리 고객이 될 만한 회사가 몇 곳이나 되는지 실제로 세어보셨는지요?",
    options: [
      "아직 목표국가(Target Country)를 정하지 못했습니다",
      "국가는 정했지만 고객 수는 시장 규모 자료로만 알고 있습니다",
      "구체적인 고객이나 계정을 세어봤습니다",
      "그 명단을 기준으로 실제 접촉을 시작했습니다"
    ],
    followUp: "어떤 고객이 몇 곳인지 적어주세요.",
    action: "목표국가(Target Country)의 구매 가능 고객을 명단으로 세어 이상적 고객 프로필(Ideal Customer Profile)에 맞는 계정 수를 산출한다",
    source: "영역3 L2-1 Q1"
  },
  {
    id: "mkt-icp-source",
    itemId: "target-market",
    weight: 1.5,
    question: "그 고객 수를 어떤 자료에서 얻으셨는지요? 통계로 추정하신 것인가요, 실제 명단을 세신 것인가요?",
    options: [
      "아직 세어보지 않았습니다",
      "인구나 산업 통계에서 추정했습니다",
      "명단·채널·시설·계정 데이터에서 직접 세었습니다",
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
    question: "광고나 영업을 하지 않았는데도 글로벌 시장에서 먼저 들어온 문의나 제안이 있었는지요?",
    options: [
      "아직 없습니다",
      "있었지만 어느 나라에서 왜 왔는지 정리하지 않았습니다",
      "어느 나라에서 어떤 문의가 왔는지 정리해두었습니다",
      "그 문의가 미팅·샘플·주문으로 이어진 적이 있습니다"
    ],
    followUp: "어느 나라에서 어떤 문의가 왔는지 적어주세요.",
    action: "광고 이전에 들어온 글로벌 문의·주문·제안을 국가별로 정리한다",
    source: "영역3 L2-2 Q1"
  },
  {
    id: "mkt-country-compare",
    itemId: "target-market",
    weight: 1,
    question: "진출 후보 국가를 여러 곳 놓고 같은 기준으로 비교해보신 적이 있는지요?",
    options: [
      "한 나라만 보고 있습니다",
      "여러 나라를 생각해보긴 했지만 비교표로 정리하지는 않았습니다",
      "기준을 정해 비교표를 만들었습니다",
      "기준이나 가중치를 바꿔가며 순위가 뒤집히는지도 확인했습니다"
    ],
    followUp: "비교 기준과 상위 국가 순위를 적어주세요.",
    action: "후보국을 매력도·적합도·장벽·접근성·학습 가치로 비교한 표를 만든다",
    source: "영역3 L2-4 Q1"
  },
  {
    id: "mkt-bias-check",
    itemId: "target-market",
    weight: 1,
    question: "인맥이나 정부 지원사업이라는 조건을 빼고 따져도 그 시장이 여전히 1순위인지요?",
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
    question: "우리 제품·서비스가 진출하려는 나라에서 법적으로 어떻게 분류되는지 확인하셨는지요?",
    options: [
      "아직 확인해보지 못했습니다",
      "인터넷 검색이나 지인 이야기로 대략 파악한 정도입니다",
      "규제기관 원문이나 공식 자료로 확인했습니다",
      "현지 전문가나 규제기관 회신으로 분류를 확정받았습니다"
    ],
    followUp: "확인한 기관 이름과 문서 이름, 확인 날짜를 적어주세요.",
    action: "규제기관 원문으로 제품·서비스 분류와 적용 법규를 확인하고 출처·날짜를 기록한다",
    source: "영역6 L2-1 Q1",
    critical: true
  },
  {
    id: "bmlc-preconditions",
    itemId: "bmlc",
    weight: 2,
    question: "그 나라에서 판매를 시작하기 전에 반드시 받아야 할 인허가나 인증이 무엇인지 알고 계신가요?",
    options: [
      "무엇이 필요한지 아직 모릅니다",
      "몇 가지는 알지만 전체 목록은 없습니다",
      "필요한 요건을 목록으로 정리했습니다",
      "요건별 담당자·비용·기한까지 정해 진행 중입니다"
    ],
    followUp: "필요한 요건과 파악하신 만큼의 비용·기간을 적어주세요.",
    action: "판매 전에 필요한 인허가·인증·등록·라벨·세금·통관 요건을 목록으로 정리한다",
    source: "영역6 L2-1 Q2"
  },
  {
    id: "bmlc-na-basis",
    itemId: "bmlc",
    weight: 1.5,
    question: "규제 요건을 검토하시면서 '우리에게는 해당 없다'고 판단해 넘어간 항목이 있는지요? 그 판단의 근거는 확인하셨나요?",
    options: [
      "규제 요건을 아직 살펴보지 못했습니다",
      "해당 없다고 본 항목이 있지만 내부 판단이었습니다",
      "제외한 근거를 자료로 확인했습니다",
      "전문가나 규제기관 검토로 제외를 확인받았습니다"
    ],
    followUp: "해당 없다고 보신 요건과 그 근거를 적어주세요.",
    action: "'해당 없음'으로 제외한 요건의 근거 자료를 확보한다",
    source: "영역6 L2-1 Q3"
  },
  {
    id: "bmlc-local-practice",
    itemId: "bmlc",
    weight: 1,
    question: "그 나라의 거래 관행과 대금 지급 방식이 국내와 어떻게 다른지 알아보셨는지요?",
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
    question: "현지 고객이 본사에서 예상한 것과 다르게 반응한 적이 있는지요?",
    options: [
      "아직 현지 고객 반응을 들어보지 못했습니다",
      "들어봤지만 특별히 다른 점은 느끼지 못했습니다",
      "본사 생각과 다른 반응을 확인했습니다",
      "그 차이를 반영해 제품·서비스나 메시지를 바꿨습니다"
    ],
    followUp: "본사와 현지의 판단이 달랐던 항목을 적어주세요.",
    action: "현지 고객 반응을 듣고 본사 판단과 다른 지점을 기록한다",
    source: "영역5 L2-1 Q3"
  },
  {
    id: "lpa-pricing-payment",
    itemId: "lpa",
    weight: 2,
    question: "현지 고객이 익숙한 가격 표시 방식과 결제 수단이 무엇인지 알아보셨는지요?",
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
    question: "세금과 환율, 수수료까지 모두 더했을 때 현지 고객이 실제로 내는 금액이 얼마인지 계산해보셨는지요?",
    options: [
      "아직 계산해보지 못했습니다",
      "대략 알지만 항목별로 계산해보지는 않았습니다",
      "항목별로 계산해 실제 지불 금액을 알고 있습니다",
      "실제 거래 정산에서 그 계산이 맞는지 확인했습니다"
    ],
    followUp: "우리가 받는 금액과 고객이 내는 금액을 각각 적어주세요.",
    action: "세금·환율·수수료·환불을 반영한 고객이 실제로 내는 금액을 항목별로 계산한다",
    source: "영역5 L2-3 Q4"
  },
  {
    id: "lpa-infra-partner",
    itemId: "lpa",
    weight: 1.5,
    question: "현지에서 이용할 물류·결제·클라우드 같은 공급업체를 정하셨는지요?",
    options: [
      "아직 알아보지 못했습니다",
      "후보는 있지만 조건을 받아보지는 않았습니다",
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
    question: "현지 사정과 우리 제품·서비스를 모두 알아서 본사와 현지 사이를 이어 줄 사람이 있는지요?",
    options: [
      "아직 그런 사람이 없습니다",
      "필요하다고 느끼지만 아직 찾지 못했습니다",
      "그 역할을 하는 사람이 있습니다",
      "그 사람을 통해 실제 의사결정이나 거래가 진행되고 있습니다"
    ],
    followUp: "그 역할을 누가 어떤 방식으로 하고 있는지 적어주세요.",
    action: "현지 지식과 본사 제품·서비스 지식을 잇는 담당자를 지정한다",
    source: "영역9 L2-1 Q3"
  },
  {
    id: "lpa-journey-blocker",
    itemId: "lpa",
    weight: 1.5,
    question: "현지 사용자가 우리 제품·서비스를 쓰다가 어디에서 막히는지 직접 지켜보신 적이 있는지요?",
    options: [
      "아직 현지 사용자가 써본 적이 없습니다",
      "써보기는 했지만 어디에서 막히는지 지켜보지는 못했습니다",
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
    question: "현지의 실제 환경에서 우리 제품·서비스가 제대로 작동하는지 시험해보셨는지요?",
    options: [
      "아직 시험해보지 못했습니다",
      "국내에서만 시험했고 현지 조건은 반영하지 못했습니다",
      "현지 조건을 반영해 시험했습니다",
      "현지에서 실제 사용·납품하며 반복 확인했습니다"
    ],
    followUp:
      "어떤 조건에서 무엇을 시험하셨는지 적어주세요. 실물이 없는 서비스라면 네트워크·기기·데이터 규정 환경에서 시험한 내용을 적어주세요.",
    action: "현지 조건을 반영한 제품·서비스 작동 시험을 설계해 실행한다",
    source: "영역5 L2-2 Q1",
    critical: true
  },
  {
    id: "test-defects",
    itemId: "market-testing",
    weight: 2.5,
    question: "시장 실증시험(Market Testing) 과정에서 나온 문제들을 기록해 두고 어디까지 해결되었는지 파악하고 계신가요?",
    options: [
      "아직 시장 실증시험(Market Testing)을 하지 않아 해당 사항이 없습니다",
      "시장 실증시험(Market Testing)은 했지만 문제를 따로 기록하지는 않았습니다",
      "나온 문제와 해결 결과를 기록해두었습니다",
      "원인 분석과 재발 방지 조치까지 이어갔습니다"
    ],
    followUp: "나온 문제와 아직 고치지 못한 것을 적어주세요.",
    action: "시장 실증시험(Market Testing)에서 나온 결함과 해결 결과를 기록하고 아직 해결하지 못한 항목을 남긴다",
    source: "영역5 L2-2 Q2"
  },
  {
    id: "test-message-worked",
    itemId: "market-testing",
    weight: 2.5,
    question: "현지에 홍보한 메시지나 제품 시연(Demo) 가운데 어떤 것이 실제 문의로 이어졌는지 아시는지요?",
    options: [
      "아직 현지에 홍보해본 적이 없습니다",
      "홍보하기는 했지만 무엇이 통했는지는 모릅니다",
      "문의나 구매로 이어진 메시지를 알고 있습니다",
      "그 메시지가 여러 번 반복해서 통했습니다"
    ],
    followUp: "어떤 메시지·콘텐츠·제품 시연(Demo)이 통했는지 적어주세요.",
    action: "메시지·제품 시연(Demo)·샘플별로 문의·구매 전환율(Conversion Rate)을 나눠 측정한다",
    source: "영역8 L2-3 Q1"
  },
  {
    id: "test-no-discount",
    itemId: "market-testing",
    weight: 2.5,
    question: "할인이나 무료 제공 없이 제값을 받고도 고객이 구매까지 이어진 사례가 있는지요?",
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
    question: "'이 시장에서는 우리 방식이 통하지 않을 수도 있겠다' 싶은 신호를 보신 적이 있는지요?",
    options: [
      "그런 관점에서 살펴본 적이 없습니다",
      "걱정은 되지만 구체적인 신호를 확인하지는 못했습니다",
      "실제로 그런 신호나 사례를 확인했습니다",
      "그 신호를 계획에 반영해 가설(Hypothesis)을 수정했습니다"
    ],
    followUp: "어떤 신호였는지, 무엇을 바꾸셨는지 적어주세요.",
    action: "우리 가치가 현지에서 통하지 않는다는 신호를 일부러 찾아 기록한다",
    source: "영역1 L2-4 Q4"
  },
  {
    id: "partner-actual-work",
    itemId: "partner-acquisition",
    weight: 3,
    question: "현지 파트너가 정해져 있는지요? 있다면 맡기로 한 일을 실제로 수행하고 있나요?",
    options: [
      "아직 파트너가 없습니다",
      "논의 중이거나 MOU·의향서만 있습니다",
      "역할을 정했고 그중 일부를 실제로 수행했습니다",
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
    question: "파트너를 통해 파는 것과 직접 파는 것 중 어느 쪽이 이익인지 숫자로 비교해보셨는지요?",
    options: [
      "아직 계산해보지 못했습니다",
      "대략 감은 있지만 숫자로 비교해보지는 않았습니다",
      "수익률(Margin)·가격할인 보상(Rebate)·지원비까지 넣어 비교했습니다",
      "실제 거래 결과로 그 비교가 맞는지 확인했습니다"
    ],
    followUp: "두 방식의 건당 손익을 적어주세요.",
    action: "수익률(Margin)·가격할인 보상(Rebate)·교육·지원비를 넣어 파트너 채널과 직접 판매를 비교한다",
    source: "영역8 L2-4 Q2"
  },
  {
    id: "partner-ecosystem-interviews",
    itemId: "partner-acquisition",
    weight: 2.5,
    question: "현지에서 사용자·구매 담당·유통·조달·규제 등 역할이 다른 사람들을 고루 만나보셨는지요?",
    options: [
      "아직 만나본 적이 없습니다",
      "몇 명 만났지만 역할이 한쪽에 몰려 있습니다",
      "사용자·구매·유통·조달·규제 등 여러 역할을 만났습니다",
      "역할별로 충분히 만나 가설(Hypothesis)을 수정했습니다"
    ],
    followUp: "역할별로 몇 명씩 만나셨는지 적어주세요.",
    action: "사용자·구매·유통·조달·규제 역할별로 현지 인터뷰를 진행한다",
    source: "영역3 L2-3 Q1"
  },
  {
    id: "partner-shortfall",
    itemId: "partner-acquisition",
    weight: 2,
    question: "파트너가 약속한 물량이나 일정을 지키지 못한 적이 있는지요? 그때 어떻게 대응하셨나요?",
    options: [
      "아직 파트너가 없거나 판단하기에 이릅니다",
      "약속이 지켜지는지 따로 확인하지 않고 있습니다",
      "약속대로 되고 있는지 확인하고 있습니다",
      "지켜지지 않았을 때 조치하는 절차가 있고 실제로 적용해봤습니다"
    ],
    followUp: "지켜지지 않았던 사례와 그때 하신 조치를 적어주세요.",
    action: "파트너 판매기회 목록(Partner Pipeline)·판매 약속의 달성 여부를 정기 점검한다",
    source: "영역8 L2-4 Q3"
  },
  {
    id: "partner-cold-check",
    itemId: "partner-acquisition",
    weight: 2,
    question: "소개로 만난 분들 외에, 아직 구매하지 않는 고객의 이야기도 들어보셨는지요?",
    options: [
      "소개받은 분들 위주로만 만났습니다",
      "필요하다고 느끼지만 아직 만나지 못했습니다",
      "사지 않는 고객이나 냉담한 반응도 들어봤습니다",
      "그 이유를 분류해 제품·서비스나 영업에 반영했습니다"
    ],
    followUp: "사지 않는 이유로 무엇을 들으셨는지 적어주세요.",
    action: "소개로 만나지 않은 고객과 구매하지 않은 고객의 의견을 확보한다",
    source: "영역3 L2-3 Q5"
  },
  {
    id: "plan-hypothesis-kpi",
    itemId: "local-plan",
    weight: 3,
    question: "지금 목표시장(Target Market)에서 무엇을 검증할지, 그리고 그것을 어떤 지표로 확인할지 정해두셨는지요?",
    options: [
      "아직 정하지 못했습니다",
      "무엇을 봐야 할지 고민 중입니다",
      "가설(Hypothesis)과 지표를 정해두었습니다",
      "그 지표를 정기적으로 보고 결정에 쓰고 있습니다"
    ],
    followUp: "가설(Hypothesis)과 선행지표(Leading Indicator)·후행지표(Lagging Indicator)를 적어주세요.",
    action: "현재 단계에서 검증할 가설(Hypothesis)과 선행지표(Leading Indicator)·후행지표(Lagging Indicator)를 정의한다",
    source: "영역10 L2-1 Q1"
  },
  {
    id: "plan-stop-rule",
    itemId: "local-plan",
    weight: 2.5,
    question: "성과가 나지 않을 때 추가 투자를 멈출 기준이 숫자로 정해져 있는지요?",
    options: [
      "아직 정하지 않았습니다",
      "필요하다고 생각은 하지만 숫자로 정하지는 않았습니다",
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
    question: "글로벌 진출의 목표와 실적, 담당자를 한곳에 모아서 보고 계신가요?",
    options: [
      "따로 관리하는 곳이 없습니다",
      "여러 문서와 메신저에 흩어져 있습니다",
      "한곳에 모아 보고 있습니다",
      "정기 회의에서 그 자료로 실제 결정을 내립니다"
    ],
    followUp: "어디에서 무엇을 보고 계신지 적어주세요.",
    action: "목표·실적·전망·담당자·다음 결정일을 한곳에서 추적한다",
    source: "영역10 L2-1 Q4"
  },
  {
    id: "plan-change-control",
    itemId: "local-plan",
    weight: 1.5,
    question: "제품·서비스나 정책을 현지에 맞게 바꿀 때 누가 승인하고, 문제가 생기면 누가 되돌릴지 정해져 있는지요?",
    options: [
      "아직 정하지 않았습니다",
      "필요하면 그때그때 상의해서 정합니다",
      "버전·담당자·승인 절차가 있습니다",
      "실제로 되돌린 사례가 있습니다"
    ],
    followUp: "변경 승인과 되돌리기 절차를 적어주세요.",
    action: "현지화(Localization) 변경의 버전 관리(Version Control)·승인·되돌리기 절차를 만든다",
    source: "영역5 L2-4 Q4"
  },
  {
    id: "org-single-owner",
    itemId: "local-team",
    weight: 2,
    question: "그 시장의 매출과 손익을 최종적으로 책임지는 사람이 한 명으로 정해져 있는지요?",
    options: [
      "아직 정하지 않았습니다",
      "여러 명이 나눠서 보고 있습니다",
      "한 사람이 정해져 있습니다",
      "그 사람이 손익까지 책임지고 권한도 함께 갖고 있습니다"
    ],
    followUp: "그 사람이 누구이고 무엇까지 책임지는지 적어주세요.",
    action: "목표시장(Target Market)의 매출·손익을 최종 책임질 한 사람을 지정한다",
    source: "영역9 L2-1 Q1",
    critical: true
  },
  {
    id: "org-continuity",
    itemId: "local-team",
    weight: 1.5,
    question: "글로벌 진출을 이끄는 핵심 인력이 자리를 비우더라도 일이 계속 돌아갈 수 있는지요?",
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
    question: "가격이나 품질, 규제 문제가 생겼을 때 실제로 누가 결정하고 누가 승인했는지 아시는지요?",
    options: [
      "아직 그런 상황이 없었습니다",
      "상황마다 달라서 정해진 것이 없습니다",
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
    question: "현지 책임자가 본사 승인 없이 스스로 정할 수 있는 일과 금액 범위가 있는지요?",
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
    question: "현지에서 급한 문제가 생겼을 때 누구에게 얼마 만에 전달되는지 정해져 있는지요?",
    options: [
      "정해둔 것이 없습니다",
      "그때그때 연락하는 사람에게 전달합니다",
      "누구에게 얼마 만에 전달할지 정해져 있습니다",
      "실제 문제 상황에서 그 경로가 작동했습니다"
    ],
    followUp: "급한 일과 일반적인 일의 전달 경로와 시간을 적어주세요.",
    action: "긴급 사안과 일반 사안의 보고 대상과 응답 시간을 정한다",
    source: "영역9 L2-2 Q4",
    critical: true
  },
  {
    id: "contract-control",
    itemId: "partner-contract",
    weight: 2.5,
    question: "파트너 계약서에 독점 범위(Exclusivity Scope)·데이터·가격·계약 종료처럼 우리를 지켜 줄 조항이 들어가 있는지요?",
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
    question: "파트너와 계약이 끝나더라도 그동안 확보한 고객을 우리가 그대로 유지할 수 있는지요?",
    options: [
      "생각해본 적이 없습니다",
      "어려울 것 같지만 확인해보지는 않았습니다",
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
    question: "지금 파트너를 다른 업체로 바꿔야 할 상황이 오면 바꾸는 데 얼마나 걸릴지 알고 계신가요?",
    options: [
      "생각해본 적이 없습니다",
      "바꾸기 어렵다고만 알고 있습니다",
      "대체 후보와 예상 시간·비용을 파악하고 있습니다",
      "대체 후보를 실제로 접촉하거나 시험해봤습니다"
    ],
    followUp: "고객 전환비용(Switching Cost)에 해당하는 시간과 비용을 적어주세요.",
    action: "대체 파트너 후보와 고객 전환비용(Switching Cost)에 해당하는 시간·비용을 파악한다",
    source: "영역7 L2-3 Q4"
  },
  {
    id: "contract-dependency-limit",
    itemId: "partner-contract",
    weight: 1.5,
    question: "한 파트너에 어느 정도까지 의존해도 되는지 의존도 허용한도(Dependency Limit)를 정해두셨는지요?",
    options: [
      "생각해본 적이 없습니다",
      "의존도가 크다는 것은 알지만 기준은 없습니다",
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
    question: "다음 단계 예산을 집행하려면 무엇이 달성되어야 하는지 조건이 정해져 있는지요?",
    options: [
      "아직 정하지 않았습니다",
      "필요할 때마다 그때그때 결정합니다",
      "단계별 실행목표(Milestone)와 금액이 연결되어 있습니다",
      "그 기준으로 실제 예산을 집행하거나 보류해봤습니다"
    ],
    followUp: "단계별 실행목표(Milestone)와 거기에 걸린 금액을 적어주세요.",
    action: "단계별 실행목표(Milestone)별로 예산을 집행하는 조건을 정한다",
    source: "영역4 L2-2 Q5"
  },
  {
    id: "alloc-capacity",
    itemId: "resource-allocation",
    weight: 1.5,
    question: "주문이 갑자기 늘어날 경우 생산·시스템·인력 가운데 어디가 먼저 막힐지 아시는지요?",
    options: [
      "생각해본 적이 없습니다",
      "짐작은 하지만 확인해보지는 않았습니다",
      "어느 공정·시스템·인력이 먼저 막히는지 파악하고 있습니다",
      "실제로 겪어봤거나 시스템 부하 시험(Load Test)을 해봤습니다"
    ],
    followUp: "가장 먼저 막히는 지점과 그 근거를 적어주세요.",
    action: "수요 급증 시 먼저 무너지는 공정·시스템·인력을 파악한다",
    source: "영역7 L2-4 Q2"
  },
  {
    id: "alloc-conditional-limit",
    itemId: "resource-allocation",
    weight: 1.5,
    question: "성과가 확실하지 않은 상태로 사업을 이어갈 때 쓸 예산의 상한을 정해두셨는지요?",
    options: [
      "아직 정하지 않았습니다",
      "필요하다고 보지만 숫자로 정하지는 않았습니다",
      "예산·기간·고객 범위 한도를 정해두었습니다",
      "그 한도를 실제 실험이나 진입에 적용해봤습니다"
    ],
    followUp: "예산·기간·고객 범위 한도를 적어주세요.",
    action: "조건부로 사업을 이어갈 때의 예산·기간·고객 범위 한도를 정한다",
    source: "영역10 L2-2 Q5"
  },
  {
    id: "alloc-concentration",
    itemId: "resource-allocation",
    weight: 1,
    question: "특정 고객이나 채널 한 곳에 매출이 쏠리고 있지는 않은지 살펴보고 계신가요?",
    options: [
      "따로 보고 있지 않습니다",
      "쏠려 있다는 것은 알지만 기준은 없습니다",
      "허용 비중을 정하고 지켜보고 있습니다",
      "한도를 넘었을 때 실제로 위험 완화조치(Risk Mitigation)를 해봤습니다"
    ],
    followUp: "현재 가장 큰 고객·채널 비중과 허용 한도를 적어주세요.",
    action: "단일 고객·채널·공급자 의존 허용 비중과 위험 완화조치(Risk Mitigation)를 정한다",
    source: "영역10 L2-3 Q2"
  }
];

const V5_RETIRED_ID_SET = new Set<string>(V5_RETIRED_IDS);
const V5_REWRITTEN_ID_SET = new Set<string>(V5_REWRITTEN_IDS);

const V5_KO_QUESTION_TEXT: Record<string, string> = {
  "mvc-purpose-alignment": "대표와 경영진은 글로벌 진출 목적에 합의했나요?",
  "mvc-resource-priority": "국내 사업과 글로벌 사업에 인력·예산을 배정할 때 적용할 우선순위 기준이 정해져 있나요?",
  "mvc-reference-market": "제품·서비스의 가치가 글로벌 고객에게도 통하는지 검증할 초기 목표시장을 정했나요?",
  "res-tce": "인증·현지화·인력·법률·물류 비용을 포함한 총 진입 비용을 계산했나요?",
  "res-cash-runway": "현지 매출이 예상보다 늦어질 때 자체 자금으로 몇 개월 동안 버틸 수 있는지 계산했나요?",
  "res-no-grant-scope": "정부 지원금 없이 자체 자금으로 실행할 최소 진출 범위를 정했나요?",
  "res-owner-time": "글로벌 진출 책임자와 그 사람이 매주 투입할 시간을 정했나요?",
  "pmf-paid-conversion": "현재 고객이 실제로 비용을 지불했다는 가장 강한 증거는 무엇인가요?",
  "pmf-churn-cases": "관심을 보이다 이탈한 잠재 고객에게 그 이유를 직접 확인했나요?",
  "pmf-buying-roles": "실제 사용자, 비용을 내는 사람, 구매를 결정하는 사람과 승인하는 사람을 구분해 확인했나요?",
  "pmf-customer-words": "제품·서비스를 선택하거나 거절한 사람에게 그 이유를 직접 확인했나요?",
  "mkt-icp-count": "초기 목표시장에서 실제로 접근 가능한 잠재 고객 또는 고객사 수를 명단과 출처를 바탕으로 산출했나요?",
  "mkt-country-compare": "후보 국가를 시장성·진입비용·규제·고객 접근성이라는 동일 기준으로 비교해 우선순위를 정했나요?",
  "bmlc-classification": "초기 목표국가에서 제품·서비스의 법적 분류를 공식 자료로 확인했나요?",
  "bmlc-preconditions": "초기 목표국가에서 판매 전에 필요한 인허가·인증 요건을 확인했나요?",
  "bmlc-na-basis": "각 규제 항목의 적용 여부와 판단 근거를 확인했나요?",
  "bmlc-local-practice": "초기 목표국가의 가격 표시·계약·결제·정산 관행이 국내와 어떻게 다른지 확인했나요?",
  "lpa-net-price": "세금·수수료·환전 비용·파트너 수수료를 제외한 순매출과 마진을 계산했나요?",
  "lpa-infra-partner": "초기 목표국가에서 이용할 물류·결제·클라우드 공급업체 후보를 정했나요?",
  "lpa-bridge-person": "현지 상황과 제품·서비스를 이해하고 본사와 현지를 연결할 담당자가 있나요?",
  "lpa-journey-blocker": "현지 고객 여정(발견·비교·구매·결제·사용·지원)에서 중단되거나 막히는 지점을 직접 관찰했나요?",
  "test-environment": "초기 목표국가의 실제 환경에서 제품·서비스가 정상 작동하는지 시험했나요?",
  "test-defects": "현지 시험에서 발견한 제품·서비스 문제와 고객 여정의 마찰을 기록하고 해결 상태를 관리하나요?",
  "test-message-worked": "어떤 현지 홍보 메시지나 제품 시연이 실제 문의로 이어졌는지 확인했나요?",
  "test-no-discount": "할인이나 무료 제공 없이 목표 마진을 확보할 수 있는 가격으로 실제 결제한 고객이 있나요?",
  "test-counter-evidence": "거절·중단·미전환·사용 장애 등 시장 가설을 반박하는 증거를 확인해 계획에 반영했나요?",
  "partner-actual-work": "현지 파트너가 맡은 역할을 실제로 수행하고 있나요?",
  "partner-economics": "파트너 판매와 직접 판매의 수익성을 숫자로 비교했나요?",
  "partner-ecosystem-interviews": "사용자, 구매 담당자, 유통·조달 관계자, 규제 기관 등 서로 다른 현지 이해관계자의 의견이나 요구사항을 직접 확인했나요?",
  "partner-shortfall": "파트너의 약속 물량·일정 이행 여부를 정기적으로 점검하고, 미달 시 조치 기준을 정했나요?",
  "partner-cold-check": "기존 인맥 밖의 잠재 고객과 구매하지 않은 잠재 고객에게도 직접 의견을 들었나요?",
  "plan-hypothesis-kpi": "초기 목표시장에서 검증할 가설과 이를 판단할 지표를 정했나요?",
  "plan-stop-rule": "성과 미달 시 추가 투자를 중단할 수치 기준을 정했나요?",
  "plan-single-tracker": "글로벌 진출의 목표·실적·담당자를 한곳에서 관리하나요?",
  "plan-change-control": "현지화 변경의 승인자와 문제 발생 시 복구 책임자를 정했나요?",
  "org-single-owner": "초기 목표시장의 매출과 손익을 최종 책임지는 담당자를 한 명으로 정했나요?",
  "org-continuity": "핵심 인력이 자리를 비워도 글로벌 진출 업무를 계속할 수 있나요?",
  "org-local-authority": "현지 책임자가 본사 승인 없이 결정할 수 있는 업무와 금액 한도를 정했나요?",
  "org-escalation": "현지에서 긴급 문제가 발생하면 누구에게 몇 시간 이내에 보고할지 정했나요?",
  "contract-control": "파트너 계약의 독점 범위·데이터·가격·계약 종료·고객 이전 조건을 확인하고, 사업 보호 조항에 반영했나요?",
  "contract-exit": "파트너 계약 종료 후에도 확보한 고객을 우리 회사가 유지할 수 있나요?",
  "contract-switch-cost": "파트너 교체에 필요한 예상 시간·비용과 대체 후보를 파악했나요?",
  "contract-dependency-limit": "판매·고객 데이터·운영을 한 파트너에게 어느 정도까지 의존할지 한도와 대체 조치를 정했나요?",
  "alloc-milestone-budget": "다음 단계 예산을 집행하기 위한 달성 조건을 정했나요?",
  "alloc-capacity": "초기 출시나 파일럿 수요가 늘 때 생산·시스템·인력·공급 중 어디가 먼저 한계에 도달하는지 파악했나요?",
  "alloc-concentration": "현재 매출이 있다면 특정 고객·채널에 매출이 과도하게 집중돼 있는지 측정하고 완화 기준을 정했나요?"
};

const V5_KO_DETAIL_OVERRIDES: Partial<Record<string, Partial<IntakeQuestion>>> = {
  "mvc-resource-priority": {
    options: ["아직 우선순위 기준을 생각해보지 못했습니다", "필요하다고 느끼지만 기준을 정하지는 않았습니다", "우선순위 기준을 정해 문서나 회의로 공유했습니다", "그 기준에 따라 실제 배정 결정을 여러 번 내렸습니다"],
    followUp: "적용한 기준과 가장 최근의 배정 결정을 적어주세요."
  },
  "pmf-paid-conversion": {
    options: ["아직 유료 고객 증거가 없습니다", "관심·문의·무료 사용은 있지만 유료 전환은 없습니다", "국내 유료 판매 또는 초기 목표국가의 유료 실증시험(PoC)·파일럿을 완료했습니다", "국내외 여러 고객에게서 재구매·갱신·사용량 증가가 반복되고 있습니다"],
    followUp: "가장 강한 증거 사례를 시간순으로 적어주세요. 고객명은 '고객 A'처럼 익명으로 적으셔도 됩니다."
  },
  "pmf-buying-roles": {
    options: ["아직 역할을 나눠서 확인해보지 못했습니다", "대략 짐작은 하지만 실제 거래에서 확인하지는 않았습니다", "최근 거래에서 사용자·지불자·결정자·승인자를 구분해 확인했습니다", "여러 거래에서 네 역할을 반복 확인하고 역할별 접근 방식에 반영하고 있습니다"],
    followUp: "최근 거래에서 네 역할이 각각 누구였는지 적어주세요."
  },
  "mkt-icp-count": {
    options: ["아직 세어보지 못했습니다", "시장 규모 자료나 산업 통계로 추정만 했습니다", "명단·채널·계정 데이터 같은 출처에서 직접 세어 산출했습니다", "그 명단을 최신으로 갱신하며 실제 접촉에 쓰고 있습니다"],
    followUp: "산출한 고객·계정 수와 출처, 기준일을 적어주세요.",
    action: "초기 목표국가의 구매 가능 고객을 명단·출처·기준일과 함께 산출한다"
  },
  "mkt-country-compare": {
    options: ["한 나라만 보고 있어 비교해보지 못했습니다", "여러 나라를 살펴봤지만 같은 기준으로 정리하지는 않았습니다", "동일 기준으로 비교해 우선순위를 정했습니다", "인맥·지원사업 같은 우연한 조건을 빼고 따져도 순위가 유지되는지 확인했습니다"],
    followUp: "비교 기준과 상위 국가 순위, 우연한 조건을 빼고 따졌을 때의 변화를 적어주세요.",
    action: "후보 국가를 동일 기준으로 비교하고 우연한 조건을 뺀 뒤에도 순위가 유지되는지 확인한다"
  },
  "bmlc-na-basis": {
    options: ["규제 요건을 아직 검토하지 못했습니다", "적용 여부를 내부 판단으로만 정리했고 근거 자료는 확인하지 못했습니다", "각 항목의 적용 여부와 판단 근거를 목록으로 확인했습니다", "전문가나 규제기관 확인을 받아 적용 여부와 근거를 확정했습니다"],
    followUp: "주요 규제 항목의 적용 여부와 판단 근거를 적어주세요."
  },
  "bmlc-local-practice": {
    options: ["아직 확인해보지 못했습니다", "자료로 대략 파악한 정도입니다", "현지 고객이나 파트너에게 차이를 직접 확인했습니다", "실제 견적·계약·정산에서 그 관행대로 거래해봤습니다"],
    followUp: "국내와 달랐던 관행을 적어주세요.",
    action: "가격 표시·계약·결제 수단·정산 주기 차이를 확인한다"
  },
  "lpa-net-price": {
    options: ["아직 계산해보지 못했습니다", "대략 감은 있지만 항목별로 계산하지는 않았습니다", "항목별로 빼고 남는 순매출과 마진을 계산했습니다", "실제 거래 정산에서 그 계산이 맞는지 확인했습니다"],
    followUp: "항목별 차감 내역과 남는 마진을 적어주세요."
  },
  "lpa-journey-blocker": {
    options: ["아직 현지 고객이 전체 과정을 거쳐본 적이 없습니다", "이용은 있었지만 어디서 막히는지 지켜보지는 못했습니다", "여정 단계별로 중단·마찰 지점을 직접 관찰했습니다", "관찰한 지점을 고친 뒤 개선됐는지까지 확인했습니다"],
    followUp: "어느 단계에서 막혔는지 단계별로 적어주세요."
  },
  "test-defects": {
    options: ["아직 현지 시험을 하지 않아 기록할 내용이 없습니다", "시험은 했지만 문제를 따로 기록하지는 않았습니다", "발견된 문제와 여정 마찰을 기록하고 해결 여부를 관리하고 있습니다", "원인 분석과 재발 방지 조치까지 반복하고 있습니다"],
    followUp: "기록된 문제와 아직 해결하지 못한 항목을 적어주세요."
  },
  "test-no-discount": {
    options: ["아직 유료 거래 사례가 없습니다", "거래는 있었지만 할인·무료 제공에 의존했거나 목표 마진을 확보하지 못했습니다", "할인·무료 제공 없이 목표 마진을 확보한 유료 거래가 있습니다", "같은 가격 조건의 유료 거래가 여러 고객에게서 반복되고 있습니다"],
    followUp: "목표 마진을 확보한 유료 거래와 가격 조건을 적어주세요."
  },
  "test-counter-evidence": {
    options: ["그런 관점에서 살펴본 적이 없습니다", "걱정되는 신호는 있지만 증거로 확인하지는 못했습니다", "반박하는 증거를 확인해 기록했습니다", "그 증거를 반영해 가설이나 계획을 실제로 수정했습니다"],
    followUp: "확인한 반증 증거와 수정한 내용을 적어주세요.",
    action: "시장 가설을 반박하는 증거를 기록하고 가설·계획에 반영한다"
  },
  "partner-shortfall": {
    options: ["아직 실제 파트너가 없어 이행 여부를 점검할 수 없습니다", "약속한 물량·일정은 있지만 이행 여부를 정기적으로 점검하지 않습니다", "약속한 물량·일정의 이행 여부를 정기적으로 점검합니다", "미달 기준과 조치 절차를 정해 점검 결과에 따라 적용하고 있습니다"],
    followUp: "점검 주기, 미달 기준과 조치 절차를 적어주세요."
  },
  "contract-control": {
    options: ["아직 파트너 계약을 맺지 않았습니다", "계약은 있지만 상대방 양식을 그대로 썼습니다", "다섯 가지 조건을 확인해 계약에 반영했습니다", "전문가 검토를 거쳐 보호 조항을 확정했습니다"],
    followUp: "반영된 조항의 요지를 적어주세요. 계약서 원본은 보내지 않으셔도 됩니다."
  },
  "contract-dependency-limit": {
    options: ["아직 생각해보지 못했습니다", "의존이 크다는 것은 알지만 한도를 정하지는 않았습니다", "판매·고객 데이터·운영에 대한 허용 한도와 대체 조치를 정해두었습니다", "한도와 대체 조치를 정기적으로 점검하고 대체 경로를 실제로 확인했습니다"],
    followUp: "현재 의존 비중과 허용 한도, 대체 조치를 적어주세요."
  },
  "alloc-capacity": {
    options: ["아직 생각해보지 못했습니다", "짐작은 하지만 확인해보지는 않았습니다", "먼저 한계에 도달할 지점을 파악하고 있습니다", "실제 수요 증가나 부하 시험으로 그 지점을 확인해봤습니다"],
    followUp: "가장 먼저 한계에 도달할 지점과 그 근거를 적어주세요."
  },
  "alloc-concentration": {
    options: ["집중 여부를 따로 살펴보지 않았습니다", "쏠려 있다는 것은 알지만 측정하거나 기준을 정하지는 않았습니다", "고객·채널별 매출 비중을 측정하고 완화 기준을 정해두었습니다", "고객·채널별 매출 비중을 정기적으로 갱신하고 기준 초과 전에 실행할 완화 조치를 점검합니다"],
    followUp: "가장 큰 고객·채널의 매출 비중과 완화 기준을 적어주세요."
  }
};

export function getIntakeStages(locale: Locale) {
  if (locale === "ko") return INTAKE_STAGES.map((stage) => ({ ...stage }));
  return INTAKE_STAGES.map((stage) => ({ ...stage, ...EN_STAGE_COPY[stage.id] }));
}

export function getIntakeItems(locale: Locale) {
  if (locale === "ko") return INTAKE_ITEMS.map((item) => ({ ...item }));
  return INTAKE_ITEMS.map((item) => ({ ...item, ...EN_ITEM_COPY[item.id] }));
}

export function getIntakeQuestions(
  locale: Locale,
  version: SurveyVersion = "4.0"
): IntakeQuestion[] {
  const localized = locale === "ko"
    ? INTAKE_QUESTIONS
    : INTAKE_QUESTIONS.map((question) => ({
        ...question,
        ...EN_QUESTION_COPY[question.id]
      }));
  if (version === "4.0") return localized;

  return localized
    .filter((question) => !V5_RETIRED_ID_SET.has(question.id))
    .map((question) => ({
      ...question,
      question: locale === "ko"
        ? V5_KO_QUESTION_TEXT[question.id]
        : V5_EN_QUESTION_TEXT[question.id],
      ...(locale === "ko"
        ? V5_KO_DETAIL_OVERRIDES[question.id]
        : V5_EN_DETAIL_OVERRIDES[question.id]),
      weight: question.id === "bmlc-local-practice" ? 2 : question.weight
    }));
}

export function getQuestionNumber(
  questionId: string,
  version: SurveyVersion = "4.0"
): number | null {
  const index = getIntakeQuestions("ko", version)
    .findIndex((question) => question.id === questionId);
  return index < 0 ? null : index + 1;
}

export function getEffectiveQuestionWeight(
  questionId: string,
  version: SurveyVersion = "4.0"
): number | null {
  return getIntakeQuestions("ko", version)
    .find((question) => question.id === questionId)?.weight ?? null;
}

export function isAnswerCompatibleAcrossVersions(
  questionId: string,
  from: SurveyVersion,
  to: SurveyVersion
): boolean {
  if (from === to) {
    return getQuestionNumber(questionId, from) !== null;
  }
  return from === "4.0" &&
    to === "5.0" &&
    !V5_RETIRED_ID_SET.has(questionId) &&
    !V5_REWRITTEN_ID_SET.has(questionId);
}
