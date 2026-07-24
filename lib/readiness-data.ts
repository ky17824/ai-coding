import type { JourneyPhase } from "@/lib/types";

export const DOMAINS = [
  { id: "market_finance", label: "시장 검증·재무", shortLabel: "시장·재무" },
  { id: "leadership", label: "리더십·자원", shortLabel: "리더십" },
  { id: "market_selection", label: "시장 선정", shortLabel: "시장 선정" },
  { id: "localization", label: "현지화·컴플라이언스", shortLabel: "현지화" },
  { id: "organization", label: "팀·조직", shortLabel: "조직" },
  { id: "gtm_funding", label: "GTM·자금", shortLabel: "GTM" }
] as const;

export type DomainId = (typeof DOMAINS)[number]["id"];

export interface ReadinessQuestion {
  id: string;
  domainId: DomainId;
  title: string;
  help: string;
  phase: JourneyPhase;
  priority: 1 | 2 | 3;
  action: {
    title: string;
    owner: string;
    completionEvidence: string;
    serviceTag: string;
  };
}

export const READINESS_QUESTIONS: ReadinessQuestion[] = [
  {
    id: "pmf",
    domainId: "market_finance",
    title: "본국 시장에서 PMF와 비즈니스 모델 확장성을 입증했나요?",
    help: "반복 구매·사용과 유지율 등 실제 고객 행동으로 확인합니다.",
    phase: "pre_entry",
    priority: 3,
    action: {
      title: "본국 PMF 증거와 반복 가능한 성장 가설 정리",
      owner: "대표·제품 책임자",
      completionEvidence: "고객 코호트와 반복 구매·유지 증거",
      serviceTag: "unit-economics"
    }
  },
  {
    id: "unit-economics",
    domainId: "market_finance",
    title: "LTV:CAC, CAC 회수기간, NRR 등 단위 경제성이 건강한가요?",
    help: "산업 특성에 맞는 분모와 기간을 명시한 실제 지표를 사용합니다.",
    phase: "pre_entry",
    priority: 3,
    action: {
      title: "단위 경제성 기준선과 개선 목표 수립",
      owner: "재무·RevOps 책임자",
      completionEvidence: "LTV:CAC·CAC 회수기간·NRR 계산표",
      serviceTag: "unit-economics"
    }
  },
  {
    id: "leadership-resources",
    domainId: "leadership",
    title: "경영진이 최소 2~3년의 자원 배정을 약속했나요?",
    help: "예산·인력·의사결정권이 문서로 합의되어야 합니다.",
    phase: "pre_entry",
    priority: 3,
    action: {
      title: "글로벌 진출 자원과 중단 기준을 경영진과 합의",
      owner: "대표·재무 책임자",
      completionEvidence: "2~3년 예산·인력·중단 기준 승인안",
      serviceTag: "leadership"
    }
  },
  {
    id: "local-autonomy",
    domainId: "leadership",
    title: "현지 팀에 시장에 맞는 의사결정 자율성을 줄 준비가 됐나요?",
    help: "본사 승인과 현지 결정의 경계를 명확히 합니다.",
    phase: "initial_entry",
    priority: 2,
    action: {
      title: "본사와 현지 팀의 의사결정 권한표 작성",
      owner: "대표·글로벌 책임자",
      completionEvidence: "단계별 권한·보고·승인 기준표",
      serviceTag: "leadership"
    }
  },
  {
    id: "bottom-up-tam",
    domainId: "market_selection",
    title: "ICP와 현지 경쟁을 반영한 바텀업 TAM을 계산했나요?",
    help: "도달 가능한 고객 수와 현실적인 연간 매출을 곱해 산정합니다.",
    phase: "pre_entry",
    priority: 3,
    action: {
      title: "교두보 ICP 기준 바텀업 TAM 산정",
      owner: "대표·GTM 책임자",
      completionEvidence: "ICP 수 × 현실적 ARPA 계산표",
      serviceTag: "market-validation"
    }
  },
  {
    id: "organic-signal",
    domainId: "market_selection",
    title: "유료 마케팅 전 타깃 시장의 자발적 고객 신호가 있나요?",
    help: "가입·문의·소개·구매 등 비용을 쓰지 않은 신호를 확인합니다.",
    phase: "pre_entry",
    priority: 2,
    action: {
      title: "타깃 시장의 자발적 수요 신호 분석",
      owner: "GTM·데이터 책임자",
      completionEvidence: "국가·유입경로별 가입·문의·매출 분석",
      serviceTag: "market-validation"
    }
  },
  {
    id: "discovery",
    domainId: "market_selection",
    title: "내부 팀이 잠재고객·파트너 현장 인터뷰를 수행했나요?",
    help: "책상 조사보다 최근 행동과 구매 맥락을 직접 확인합니다.",
    phase: "pre_entry",
    priority: 3,
    action: {
      title: "잠재고객·파트너 현장 인터뷰 실행",
      owner: "대표·제품 책임자",
      completionEvidence: "인터뷰 기록과 반복 문제 패턴",
      serviceTag: "market-validation"
    }
  },
  {
    id: "bmlc",
    domainId: "localization",
    title: "문화와 정부·규제 필터를 반영한 BMLC를 작성했나요?",
    help: "기존 사업모델에서 반드시 바꿀 것과 유지할 것을 구분합니다.",
    phase: "pre_entry",
    priority: 3,
    action: {
      title: "사업모델 현지화 캔버스 작성",
      owner: "글로벌·제품 책임자",
      completionEvidence: "문화·규제 필터가 포함된 BMLC",
      serviceTag: "compliance"
    }
  },
  {
    id: "security-compliance",
    domainId: "localization",
    title: "목표 고객이 요구하는 개인정보·보안 요건을 파악했나요?",
    help: "법률 자문이 필요한 판단과 제품·운영 조치를 분리합니다.",
    phase: "pre_entry",
    priority: 3,
    action: {
      title: "개인정보·보안·조달 필수요건 갭 분석",
      owner: "보안·법무 책임자",
      completionEvidence: "필수요건·현재상태·담당자·일정표",
      serviceTag: "compliance"
    }
  },
  {
    id: "localization-premium",
    domainId: "localization",
    title: "GTM과 운영 전반의 현지화 복잡성을 LPA로 분석했나요?",
    help: "영업·제품·마케팅과 법인·세무·인프라·채용을 함께 봅니다.",
    phase: "pre_entry",
    priority: 2,
    action: {
      title: "6개 영역 현지화 프리미엄 분석",
      owner: "글로벌 책임자",
      completionEvidence: "영역별 복잡도와 대응비용 LPA",
      serviceTag: "compliance"
    }
  },
  {
    id: "interpreneur",
    domainId: "organization",
    title: "본사와 현지를 잇는 인터프레너형 책임자가 있나요?",
    help: "회사 지식, 문화 공감, 실행 권한을 모두 확인합니다.",
    phase: "initial_entry",
    priority: 2,
    action: {
      title: "글로벌 진출 퍼스트맨 역할과 선발 기준 확정",
      owner: "대표·인사 책임자",
      completionEvidence: "역할기술서·후보·온보딩 계획",
      serviceTag: "organization"
    }
  },
  {
    id: "universal-values",
    domainId: "organization",
    title: "핵심가치가 특정 국가 문화에 치우치지 않도록 정리됐나요?",
    help: "글로벌 팀이 같은 행동 기준으로 이해할 수 있어야 합니다.",
    phase: "scale",
    priority: 1,
    action: {
      title: "핵심가치를 글로벌 행동 원칙으로 재정의",
      owner: "대표·인사 책임자",
      completionEvidence: "글로벌 핵심가치와 행동 예시",
      serviceTag: "organization"
    }
  },
  {
    id: "feedback-loops",
    domainId: "organization",
    title: "본사와 현지 팀의 비동기·공식 피드백 루프가 있나요?",
    help: "현지 인사이트가 제품과 정책 결정에 반영되는 경로를 봅니다.",
    phase: "initial_entry",
    priority: 2,
    action: {
      title: "본사–현지 양방향 피드백 루프 설계",
      owner: "글로벌·운영 책임자",
      completionEvidence: "회의·기록·의사결정 반영 운영안",
      serviceTag: "organization"
    }
  },
  {
    id: "gtm-motion",
    domainId: "gtm_funding",
    title: "구매행동에 맞는 주력 GTM 모션을 선택하고 검증했나요?",
    help: "PLG·직접영업·파트너 중 하나를 주력으로 정합니다.",
    phase: "initial_entry",
    priority: 3,
    action: {
      title: "ICP에 맞는 주력 GTM 모션과 실험 설계",
      owner: "대표·GTM 책임자",
      completionEvidence: "주력 모션·퍼널·성공 및 중단 기준",
      serviceTag: "gtm"
    }
  },
  {
    id: "funding-programs",
    domainId: "gtm_funding",
    title: "활용 가능한 지원사업과 자격요건을 확인했나요?",
    help: "마감일과 공식 공고가 확인된 프로그램만 계획에 반영합니다.",
    phase: "pre_entry",
    priority: 1,
    action: {
      title: "유효한 지원사업과 신청 준비항목 정리",
      owner: "재무·사업개발 책임자",
      completionEvidence: "공식 공고·마감일·자격요건 체크표",
      serviceTag: "funding"
    }
  }
];

export const JOURNEY_PHASES = [
  {
    id: "pre_entry" as const,
    label: "진출 전",
    description: "교두보 시장과 진입 가설을 증거로 확인합니다.",
    steps: [1, 2, 3, 4, 5, 6, 7, 8]
  },
  {
    id: "initial_entry" as const,
    label: "초기 진출",
    description: "같은 고객이 같은 이유로 구매하는 패턴을 만듭니다.",
    steps: [9, 10]
  },
  {
    id: "scale" as const,
    label: "확대",
    description: "경제성과 품질을 유지하며 반복 가능한 조직으로 전환합니다.",
    steps: [11]
  }
];
