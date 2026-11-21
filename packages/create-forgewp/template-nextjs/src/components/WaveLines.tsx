import type { CSSProperties } from 'react';

/**
 * Flowing contour lines: each line falls from the top edge to the bottom edge and bends
 * around a shared fold. Dash length grows from left to right so the field reads as
 * dotted at the outer edge and solid near the fold. Computed at render time, so it
 * compiles to plain SVG in the exported theme.
 */
export function WaveLines({ className }: { className?: string }) {
  const width = 600;
  const height = 640;
  const count = 17;
  const samples = 48;

  const lines = Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1); // 0 = outer (left) edge, 1 = fold
    const baseX = 150 + t * 520; // spreads into the page centre; the solid line runs off the right edge
    const points: string[] = [];
    for (let s = 0; s <= samples; s++) {
      const v = s / samples; // 0 = top, 1 = bottom
      const y = v * (height + 40);
      // Fold bulges left through the middle and swings back near the bottom.
      const fold = Math.sin(v * Math.PI * 1.15 + 0.35) * (70 + t * 120);
      const ripple = Math.sin(v * Math.PI * 3 + t * 2.2) * (10 + t * 14);
      const x = baseX - fold * (0.35 + t * 0.65) + ripple;
      points.push(`${s === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return { d: points.join(''), t };
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio='xMaxYMin slice'
      fill='none'
      aria-hidden='true'
      className={className}
    >
      {lines.map(({ d, t }, i) => {
        const solid = i === count - 1; // the last line is solid; the rest are dashed
        // Outer lines are dots (near-zero dash with round caps); dashes lengthen toward the fold.
        const dash = 0.01 + t * t * 9;
        const gap = 6 - t * 3.2;
        // Motion lives in globals.css (.forgewp-wave); these variables tune it per line.
        const motion = {
          '--wave-i': i,
          '--wave-period': (dash + gap).toFixed(2),
          '--wave-flow': `${((dash + gap) / 6).toFixed(2)}s`,
        } as CSSProperties;
        return (
          <path
            key={i}
            d={d}
            stroke={solid ? '#f97316' : '#18181b'}
            strokeWidth={solid ? 1.8 : 1.4 + t * 0.6}
            strokeLinecap='round'
            strokeDasharray={solid ? undefined : `${dash.toFixed(2)} ${gap.toFixed(2)}`}
            opacity={solid ? 0.9 : 0.18 + t * 0.62}
            data-solid={solid ? '' : undefined}
            style={motion}
          />
        );
      })}
    </svg>
  );
}
