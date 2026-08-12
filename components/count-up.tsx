"use client";

import { useEffect, useState } from "react";

const SWAY_DURATION = 3600;
const SWAY_DEPTH = 0.08;

export function countAtTime(to: number, elapsed: number, duration: number) {
  if (elapsed < duration) {
    const progress = Math.max(elapsed / duration, 0);
    return Math.round((1 - Math.pow(1 - progress, 3)) * to);
  }

  const cycle = ((elapsed - duration) % SWAY_DURATION) / SWAY_DURATION;
  const distance = cycle <= 0.5 ? cycle * 2 : (1 - cycle) * 2;
  const eased = distance * distance * (3 - 2 * distance);
  return Math.round(to * (1 - SWAY_DEPTH * eased));
}

// 마지막 막대가 다 자란 뒤 숫자도 막대와 같은 주기로 증감한다.
export function CountUp({ to, duration = 1500 }: { to: number; duration?: number }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(to);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setValue(countAtTime(to, now - start, duration));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, duration]);

  return <>{value}</>;
}
