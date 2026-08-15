import { describe, expect, it } from "vitest";
import {
  INTAKE_ITEMS,
  V5_RETIRED_IDS,
  V5_REWRITTEN_IDS,
  getIntakeQuestions,
  getQuestionNumber,
  isAnswerCompatibleAcrossVersions
} from "@/lib/intake-questions";

const FINAL_V5_KO_QUESTIONS = [
  "대표와 경영진은 글로벌 진출 목적에 합의했나요?",
  "국내 사업과 글로벌 사업에 인력·예산을 배정할 때 적용할 우선순위 기준이 정해져 있나요?",
  "제품·서비스의 가치가 글로벌 고객에게도 통하는지 검증할 초기 목표시장을 정했나요?",
  "인증·현지화·인력·법률·물류 비용을 포함한 총 진입 비용을 계산했나요?",
  "현지 매출이 예상보다 늦어질 때 자체 자금으로 몇 개월 동안 버틸 수 있는지 계산했나요?",
  "정부 지원금 없이 자체 자금으로 실행할 최소 진출 범위를 정했나요?",
  "글로벌 진출 책임자와 그 사람이 매주 투입할 시간을 정했나요?",
  "현재 고객이 실제로 비용을 지불했다는 가장 강한 증거는 무엇인가요?",
  "관심을 보이다 이탈한 잠재 고객에게 그 이유를 직접 확인했나요?",
  "실제 사용자, 비용을 내는 사람, 구매를 결정하는 사람과 승인하는 사람을 구분해 확인했나요?",
  "제품·서비스를 선택하거나 거절한 사람에게 그 이유를 직접 확인했나요?",
  "초기 목표시장에서 실제로 접근 가능한 잠재 고객 또는 고객사 수를 명단과 출처를 바탕으로 산출했나요?",
  "후보 국가를 시장성·진입비용·규제·고객 접근성이라는 동일 기준으로 비교해 우선순위를 정했나요?",
  "초기 목표국가에서 제품·서비스의 법적 분류를 공식 자료로 확인했나요?",
  "초기 목표국가에서 판매 전에 필요한 인허가·인증 요건을 확인했나요?",
  "각 규제 항목의 적용 여부와 판단 근거를 확인했나요?",
  "초기 목표국가의 가격 표시·계약·결제·정산 관행이 국내와 어떻게 다른지 확인했나요?",
  "세금·수수료·환전 비용·파트너 수수료를 제외한 순매출과 마진을 계산했나요?",
  "초기 목표국가에서 이용할 물류·결제·클라우드 공급업체 후보를 정했나요?",
  "현지 상황과 제품·서비스를 이해하고 본사와 현지를 연결할 담당자가 있나요?",
  "현지 고객 여정(발견·비교·구매·결제·사용·지원)에서 중단되거나 막히는 지점을 직접 관찰했나요?",
  "초기 목표국가의 실제 환경에서 제품·서비스가 정상 작동하는지 시험했나요?",
  "현지 시험에서 발견한 제품·서비스 문제와 고객 여정의 마찰을 기록하고 해결 상태를 관리하나요?",
  "어떤 현지 홍보 메시지나 제품 시연이 실제 문의로 이어졌는지 확인했나요?",
  "할인이나 무료 제공 없이 목표 마진을 확보할 수 있는 가격으로 실제 결제한 고객이 있나요?",
  "거절·중단·미전환·사용 장애 등 시장 가설을 반박하는 증거를 확인해 계획에 반영했나요?",
  "현지 파트너가 맡은 역할을 실제로 수행하고 있나요?",
  "파트너 판매와 직접 판매의 수익성을 숫자로 비교했나요?",
  "사용자, 구매 담당자, 유통·조달 관계자, 규제 기관 등 서로 다른 현지 이해관계자의 의견이나 요구사항을 직접 확인했나요?",
  "파트너의 약속 물량·일정 이행 여부를 정기적으로 점검하고, 미달 시 조치 기준을 정했나요?",
  "기존 인맥 밖의 잠재 고객과 구매하지 않은 잠재 고객에게도 직접 의견을 들었나요?",
  "초기 목표시장에서 검증할 가설과 이를 판단할 지표를 정했나요?",
  "성과 미달 시 추가 투자를 중단할 수치 기준을 정했나요?",
  "글로벌 진출의 목표·실적·담당자를 한곳에서 관리하나요?",
  "현지화 변경의 승인자와 문제 발생 시 복구 책임자를 정했나요?",
  "초기 목표시장의 매출과 손익을 최종 책임지는 담당자를 한 명으로 정했나요?",
  "핵심 인력이 자리를 비워도 글로벌 진출 업무를 계속할 수 있나요?",
  "현지 책임자가 본사 승인 없이 결정할 수 있는 업무와 금액 한도를 정했나요?",
  "현지에서 긴급 문제가 발생하면 누구에게 몇 시간 이내에 보고할지 정했나요?",
  "파트너 계약의 독점 범위·데이터·가격·계약 종료·고객 이전 조건을 확인하고, 사업 보호 조항에 반영했나요?",
  "파트너 계약 종료 후에도 확보한 고객을 우리 회사가 유지할 수 있나요?",
  "파트너 교체에 필요한 예상 시간·비용과 대체 후보를 파악했나요?",
  "판매·고객 데이터·운영을 한 파트너에게 어느 정도까지 의존할지 한도와 대체 조치를 정했나요?",
  "다음 단계 예산을 집행하기 위한 달성 조건을 정했나요?",
  "초기 출시나 파일럿 수요가 늘 때 생산·시스템·인력·공급 중 어디가 먼저 한계에 도달하는지 파악했나요?",
  "현재 매출이 있다면 특정 고객·채널에 매출이 과도하게 집중돼 있는지 측정하고 완화 기준을 정했나요?"
] as const;

const FINAL_V5_EN_QUESTIONS = [
  "Are the CEO and leadership team aligned on why the company is expanding globally?",
  "Do you have an agreed rule for allocating people and budget between domestic operations and global expansion?",
  "Have you selected an initial target market in which to test whether the offering's value resonates with global customers?",
  "Have you calculated the total cost of entry, including certification, localization, people, legal, and logistics costs?",
  "Have you calculated how many months the company can operate on its own cash if local revenue is delayed?",
  "Have you defined the minimum market-entry scope that can be executed without government funding?",
  "Have you named the person accountable for global expansion and set their weekly time commitment?",
  "What is the strongest evidence you have today that a customer has paid?",
  "Have you directly confirmed why interested prospects dropped out?",
  "Have you distinguished and confirmed the actual user, payer, decision-maker, and approver?",
  "Have you asked people who selected or rejected the offering why they made that choice?",
  "Have you counted the prospects or customer accounts you can actually reach in the initial target market, using a named list and sources?",
  "Have you compared candidate countries on the same criteria—market potential, entry cost, regulation, and customer access—and ranked them?",
  "Have you verified the offering's legal classification in the initial target country using official sources?",
  "Have you identified the approvals and certifications required before selling in the initial target country?",
  "Have you determined whether each regulatory requirement applies and recorded the basis for that decision?",
  "Have you confirmed how price display, contracting, payment, and settlement practices in the initial target country differ from domestic practice?",
  "Have you calculated net revenue and margin after taxes, fees, currency-conversion costs, and partner commissions?",
  "Have you selected candidate logistics, payment, and cloud providers for the initial target country?",
  "Do you have a person who understands both local conditions and the offering and can connect headquarters with the local market?",
  "Have you directly observed where local customers stall or drop off across discovery, comparison, purchase, payment, use, and support?",
  "Have you tested whether the offering works as intended in the real environment of the initial target country?",
  "Do you record product, service, and customer-journey issues found in local testing and track their resolution?",
  "Have you confirmed which local marketing messages or product demonstrations led to real inquiries?",
  "Has a customer paid, without discounts or free offers, at a price that preserves your target margin?",
  "Have you identified evidence that contradicts the market hypothesis—such as rejection, churn, non-conversion, or usage failure—and reflected it in the plan?",
  "Is the local partner performing the role it agreed to take on?",
  "Have you compared the profitability of partner-led and direct sales using numbers?",
  "Have you directly confirmed the input or requirements of different local stakeholders, including users, buyers, distributors, procurement, and regulators?",
  "Do you regularly review whether the partner meets committed volumes and schedules, and have you set actions for shortfalls?",
  "Have you directly sought input from prospects outside your referral network and prospects who chose not to buy?",
  "Have you defined the hypothesis to test in the initial target market and the metrics used to judge it?",
  "Have you set numeric criteria for stopping further investment when performance falls short?",
  "Do you manage global-expansion objectives, performance, and owners in one place?",
  "Have you named the approver for localization changes and the owner responsible for recovery if a change causes problems?",
  "Is one person ultimately accountable for revenue and profit in the initial target market?",
  "Can global-expansion work continue when a key team member is absent?",
  "Have you defined which decisions and spending limits the local owner can approve without headquarters?",
  "When an urgent local issue occurs, have you defined who must be notified and within how many hours?",
  "Does the partner contract cover exclusivity, data, pricing, termination, and customer transfer in a way that protects the business?",
  "Can the company retain the customers it acquired after the partner contract ends?",
  "Have you estimated the time and cost required to replace the partner and identified alternatives?",
  "Have you set limits on how much sales, customer data, and operations may depend on one partner, along with fallback actions?",
  "Have you defined the achievement criteria required before the next budget is released?",
  "Have you identified which of production, systems, people, or supply will reach its limit first as launch or pilot demand grows?",
  "If you have revenue, have you measured whether it is overly concentrated in specific customers or channels and set mitigation thresholds?"
] as const;

describe("readiness v5 catalog", () => {
  it("keeps v4 frozen and exposes the exact 46-question v5 catalog", () => {
    expect(getIntakeQuestions("ko", "4.0")).toHaveLength(55);
    expect(getIntakeQuestions("ko", "5.0").map((question) => question.question))
      .toEqual(FINAL_V5_KO_QUESTIONS);
    expect(getIntakeQuestions("en", "5.0").map((question) => question.question))
      .toEqual(FINAL_V5_EN_QUESTIONS);
  });

  it("retires only the approved nine v4 questions", () => {
    const v4Ids = getIntakeQuestions("ko", "4.0").map((question) => question.id);
    const v5Ids = new Set(getIntakeQuestions("ko", "5.0").map((question) => question.id));
    expect(v4Ids.filter((id) => !v5Ids.has(id))).toEqual([...V5_RETIRED_IDS]);
  });

  it("keeps stage counts, critical flags, and locale structure stable", () => {
    const items = new Map(INTAKE_ITEMS.map((item) => [item.id, item]));
    const korean = getIntakeQuestions("ko", "5.0");
    const english = getIntakeQuestions("en", "5.0");
    const stageCount = (stageId: string) => korean
      .filter((question) => items.get(question.itemId)?.stageId === stageId).length;

    expect([stageCount("early"), stageCount("preparing"), stageCount("ready")])
      .toEqual([13, 18, 15]);
    expect(korean.filter((question) => question.critical)).toHaveLength(7);
    expect(english.map(({ id, itemId, weight, critical, options }) => ({
      id, itemId, weight, critical: Boolean(critical), options: options.length
    }))).toEqual(korean.map(({ id, itemId, weight, critical, options }) => ({
      id, itemId, weight, critical: Boolean(critical), options: options.length
    })));
  });

  it("uses stable v5 numbering and copies only unchanged answers from v4", () => {
    const v5 = getIntakeQuestions("ko", "5.0");
    expect(v5.map((question) => getQuestionNumber(question.id, "5.0")))
      .toEqual(Array.from({ length: 46 }, (_, index) => index + 1));
    expect(V5_REWRITTEN_IDS).toHaveLength(17);
    expect(v5.filter((question) => isAnswerCompatibleAcrossVersions(question.id, "4.0", "5.0")))
      .toHaveLength(29);
    expect(isAnswerCompatibleAcrossVersions("mvc-purpose-alignment", "5.0", "4.0"))
      .toBe(false);
  });
});
