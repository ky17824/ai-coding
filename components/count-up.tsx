"use client";

import { useEffect, useState } from "react";

// 마지막 막대가 끝나는 시점(지연 0.6s + 성장 0.9s)에 숫자도 함께 멈춘다.
export function CountUp({ to, duration = 1500 }: { to: number; duration?: number }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(to);
      return;
    }
    let frame = 0;
    const start = performance.now();
    // 막대의 cubic-bezier(0.22, 1, 0.36, 1) 에 맞춘 감속 곡선.
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setValue(Math.round(easeOut(t) * to));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, duration]);

  return <>{value}</>;
}
