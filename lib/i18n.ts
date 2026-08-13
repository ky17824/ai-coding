export const LOCALES = ["ko", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ko";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** 로케일별 홈 경로. 언어 선택기와 metadata alternates가 함께 쓴다. */
export const LOCALE_HOME: Record<Locale, string> = {
  ko: "/",
  en: "/en"
};

export function localeFromPath(pathname: string): Locale {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "ko";
}

export function stripLocalePath(path: string): string {
  if (path === "/en") return "/";
  return path.startsWith("/en/") ? path.slice(3) || "/" : path;
}

export function localizedPath(path: string, locale: Locale): string {
  const unprefixed = stripLocalePath(path);
  if (locale === "ko") return unprefixed;
  return unprefixed === "/" ? "/en" : `/en${unprefixed}`;
}

const ko = {
  meta: {
    title: "Borderless | 글로벌 진출 준비부터 실행까지",
    description:
      "한국 스타트업을 위한 글로벌 진출 준비도 진단, 실행 여정, 검증된 전문가 서비스 플랫폼"
  },
  language: {
    label: "언어 선택",
    ko: "KO",
    en: "EN"
  },
  header: {
    brandHome: "Borderless 홈",
    mainNav: "주요 메뉴",
    dashboard: "대시보드",
    assessment: "준비도 진단",
    journey: "GTM 여정",
    services: "전문가 서비스",
    admin: "운영",
    account: "마이페이지",
    signOut: "로그아웃",
    signIn: "로그인"
  },
  hero: {
    eyebrow: "글로벌 GTM 여정(Global GTM Journey)",
    // 각 줄은 <span><em>{em}</em>{after}</span> 로 렌더된다. 3줄 stagger 애니메이션이
    // 이 구조에 의존하므로 줄 수를 바꾸지 말 것.
    headline: [
      { em: "글로벌 진출", after: "" },
      { em: "준비", after: "된 만큼" },
      { em: "성공", after: "합니다" }
    ],
    body:
      "준비도를 객관적으로 진단해 드리고 지금 필요한 액션과 전문가를 연결해 드립니다. 글로벌 진출의 전 과정을 한눈에 관리하세요.",
    primaryCta: "무료 준비도 진단 시작",
    secondaryCta: "데모 대시보드 보기",
    privacyNote: "이메일로 참여하는 비공개 베타입니다."
  },
  preview: {
    ariaLabel: "준비도 대시보드 미리보기",
    windowTitle: "시장진입 준비도(Global Readiness) 개요",
    scoreEyebrow: "시장진입 준비도(Global Readiness)",
    scoreLabel: "진출 준비도",
    chartLabels: ["시장", "리더십", "선정", "현지화", "조직", "GTM"],
    actionEyebrow: "가장 먼저 할 일",
    actionLabel: "보안·법규 준수(Compliance) 차이 분석(Gap Analysis)",
    priority: "우선순위 0(Priority 0)"
  },
  steps: {
    eyebrow: "이용 방법(How It Works)",
    // <br /> 위치를 코드가 아닌 데이터로 유지한다.
    headingLines: ["막연한 글로벌 진출을", "실행 가능한 여정으로"],
    items: [
      {
        number: "01",
        title: "대표님 회사의 글로벌 진출 준비도를 확인하세요",
        description:
          "55개 문항에 답하시면 준비 1단계·준비 2단계·준비 3단계 가운데 지금 어느 단계인지 알려드립니다."
      },
      {
        number: "02",
        title: "맞춤형 진단으로 대응 방안을 확인하세요",
        description:
          "가장 큰 준비도 격차부터 책임자와 기한, 완료 기준이 있는 액션으로 바꿔 드립니다."
      },
      {
        number: "03",
        title: "AI-GTM 어시스턴트가 계획 작성을 돕습니다",
        description:
          "진단 결과와 목표시장(Target Market)을 반영해 GTM 실행 계획 초안을 만들어 드리면, 대표님이 검토해 확정하십니다."
      },
      {
        number: "04",
        title: "검증된 전문가가 여러분과 함께합니다",
        description:
          "필요한 순간에 승인된 멘토와 컨설팅 패키지를 예약하고 여정 안에서 관리합니다."
      }
    ]
  },
  ctaBand: {
    eyebrow: "준비된 글로벌 진출의 시작",
    heading: "글로벌 진출 준비도를 확인해 보세요.",
    button: "준비도 진단 시작"
  }
};

/**
 * `typeof ko`가 키 집합을 강제한다. 키를 빠뜨리거나 오타를 내면 컴파일이 깨진다.
 * `as const`를 쓰지 않았기 때문에 값은 string으로 넓혀져 번역문을 넣을 수 있다.
 */
const en: typeof ko = {
  meta: {
    title: "Borderless | From global readiness to execution",
    description:
      "Readiness assessment, execution journey, and vetted expert services for startups going global."
  },
  language: {
    label: "Select language",
    ko: "KO",
    en: "EN"
  },
  header: {
    brandHome: "Borderless home",
    mainNav: "Main menu",
    dashboard: "Dashboard",
    assessment: "Assessment",
    journey: "GTM Journey",
    services: "Expert Services",
    admin: "Admin",
    account: "My Account",
    signOut: "Sign out",
    signIn: "Sign in"
  },
  hero: {
    eyebrow: "Global GTM Journey",
    headline: [
      { em: "Go Global", after: "" },
      { em: "Ready", after: " to" },
      { em: "Succeed", after: "" }
    ],
    body:
      "We assess your readiness using evidence and connect you with the right actions and experts at the right time. Manage your entire global expansion in one place.",
    primaryCta: "Start the Assessment",
    secondaryCta: "See demo dashboard",
    privacyNote: "Beta version 0.1."
  },
  preview: {
    ariaLabel: "Readiness Dashboard preview",
    windowTitle: "Readiness Overview",
    scoreEyebrow: "GLOBAL READINESS",
    scoreLabel: "Expansion Readiness",
    chartLabels: [
      "Market",
      "Leadership",
      "Selection",
      "Localization",
      "Org",
      "GTM"
    ],
    actionEyebrow: "Do This First",
    actionLabel: "Security & Compliance Gap Analysis",
    priority: "Priority 0"
  },
  steps: {
    eyebrow: "HOW IT WORKS",
    headingLines: ["From a vague ambition", "to an executable journey"],
    items: [
      {
        number: "01",
        title: "See where your company actually stands",
        description:
          "Answer 55 questions and we'll tell you which stage you are in: early, preparing, or ready."
      },
      {
        number: "02",
        title: "Turn your biggest gaps into a plan",
        description:
          "We convert your widest readiness gaps into actions with an owner, a deadline, and a definition of done."
      },
      {
        number: "03",
        title: "An AI GTM assistant helps you draft the plan",
        description:
          "It helps draft your GTM execution plan from your assessment results and target market — you review it and make the call."
      },
      {
        number: "04",
        title: "Vetted experts work alongside you",
        description:
          "Book approved mentors and consulting packages at the moment you need them, tracked inside your journey."
      }
    ]
  },
  ctaBand: {
    eyebrow: "Start Global Expansion Prepared",
    heading: "Check Your Global Expansion Readiness.",
    button: "Start the Assessment"
  }
};

export const messages = { ko, en };

export type Messages = typeof ko;

export function t(locale: Locale): Messages {
  return messages[locale];
}
