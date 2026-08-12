"use client";

import { useEffect } from "react";

const MOBILE = "(max-width: 620px)";
const START_DELAY = 3200;
const PIXELS_PER_SECOND = 70;
const MIN_DURATION = 24000;
const MAX_DURATION = 60000;

export function autoScrollDuration(distance: number) {
  return Math.min(
    MAX_DURATION,
    Math.max(MIN_DURATION, (distance / PIXELS_PER_SECOND) * 1000)
  );
}

export function autoScrollProgress(elapsed: number, duration: number) {
  const progress = Math.min(1, Math.max(0, elapsed / duration));
  return (1 - Math.cos(Math.PI * progress)) / 2;
}

/** 좁은 화면에서 랜딩 전체를 한 번 훑어 내려준다. 사용자가 건드리면 즉시 멈춘다. */
export function MobileAutoScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const events = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    let timer = 0;
    let frame = 0;
    const stop = () => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
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

      const duration = autoScrollDuration(distance);
      const started = performance.now();
      const tick = (now: number) => {
        const elapsed = now - started;
        const eased = autoScrollProgress(elapsed, duration);
        // html { scroll-behavior: smooth } 가 매 호출을 개별 애니메이션으로
        // 만들어 서로 취소시킨다. instant 로 CSS 를 덮는다.
        window.scrollTo({ top: from + distance * eased, behavior: "instant" });
        if (elapsed < duration) frame = window.requestAnimationFrame(tick);
        else stop();
      };
      frame = window.requestAnimationFrame(tick);
    }, START_DELAY);

    return stop;
  }, []);

  return null;
}
