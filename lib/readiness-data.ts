export const JOURNEY_PHASES = [
  {
    id: "pre_entry" as const,
    label: "진출 전",
    description: "초기 집중시장(Beachhead Market)과 진입 가설(Hypothesis)을 증거로 확인합니다.",
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
