function FloatingPaths({ position }: { position: number }) {
  return (
    <svg viewBox="0 0 696 316" preserveAspectRatio="none">
      {Array.from({ length: 24 }, (_, index) => (
        <path
          key={index}
          d={`M-${380 - index * 5 * position} -${189 + index * 6}C-${380 - index * 5 * position} -${189 + index * 6} -${312 - index * 5 * position} ${216 - index * 6} ${152 - index * 5 * position} ${343 - index * 6}C${616 - index * 5 * position} ${470 - index * 6} ${684 - index * 5 * position} ${875 - index * 6} ${684 - index * 5 * position} ${875 - index * 6}`}
          pathLength="1"
          strokeWidth={0.5 + index * 0.04}
          strokeOpacity={0.08 + index * 0.018}
          style={{
            animationDelay: `${index * -0.7}s`,
            animationDuration: `${22 + (index % 7)}s`
          }}
        />
      ))}
    </svg>
  );
}

export function BackgroundPaths() {
  return (
    <div className="background-paths" aria-hidden="true">
      <FloatingPaths position={1} />
      <FloatingPaths position={-1} />
    </div>
  );
}
