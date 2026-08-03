"use client";

import { useEffect } from "react";

const MOBILE = "(max-width: 620px)";
const DURATION = 12000;
const START_DELAY = 2600;
const STEP_MS = 40;

/** 좁은 화면에서 랜딩 전체를 한 번 훑어 내려준다. 사용자가 건드리면 즉시 멈춘다. */
export function MobileAutoScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const events = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    let timer = 0;
    let ticker = 0;
    const stop = () => {
      window.clearTimeout(timer);
      window.clearInterval(ticker);
      events.forEach((event) => window.removeEventListener(event, stop));
    };
    events.forEach((event) =>
      window.addEventListener(event, stop, { passive: true })
    );

    timer = window.setTimeout(() => {
      // 화면 크기는 시작 시점에 본다. 회전이나 늦게 적용된 뷰포트를 놓치지 않는다.
      if (!window.matchMedia(MOBILE).matches) return stop();

      const from = window.scrollY;
      const distance =
        document.documentElement.scrollHeight - window.innerHeight - from;
      if (distance <= 0) return stop();

      const started = Date.now();
      // ponytail: rAF 대신 인터벌. 스크롤 한 축만 움직여 40ms 간격이면 충분하고,
      // 배경 탭에서 rAF 가 멈추는 환경에서도 동작한다.
      ticker = window.setInterval(() => {
        const t = Math.min(1, (Date.now() - started) / DURATION);
        const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        // html { scroll-behavior: smooth } 가 매 호출을 개별 애니메이션으로
        // 만들어 서로 취소시킨다. instant 로 CSS 를 덮는다.
        window.scrollTo({ top: from + distance * eased, behavior: "instant" });
        if (t >= 1) stop();
      }, STEP_MS);
    }, START_DELAY);

    return stop;
  }, []);

  return null;
}
