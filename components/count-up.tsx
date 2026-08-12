"use client";

import { useEffect, useRef, useState } from "react";

export function countAtTime(from: number, to: number, elapsed: number, duration: number) {
  const progress = Math.min(Math.max(elapsed / duration, 0), 1);
  return Math.round(from + (to - from) * (1 - Math.pow(1 - progress, 3)));
}

export function CountUp({ to, duration = 1200 }: { to: number; duration?: number }) {
  const [value, setValue] = useState(0);
  const valueRef = useRef(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      valueRef.current = to;
      setValue(to);
      return;
    }

    let frame = 0;
    const from = valueRef.current;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const next = countAtTime(from, to, elapsed, duration);
      valueRef.current = next;
      setValue(next);
      if (elapsed < duration) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, duration]);

  return <>{value}</>;
}
