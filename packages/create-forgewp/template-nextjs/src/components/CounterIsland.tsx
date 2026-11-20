'use client';

import { useState } from 'react';

export interface CounterIslandProps {
  initialCount?: number;
}

export function CounterIsland({ initialCount = 0 }: CounterIslandProps) {
  const [count, setCount] = useState(initialCount);

  return (
    <div className="fwp-tile">
      <span className="fwp-tile-icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      </span>
      <div className="fwp-tile-body" style={{ paddingRight: 0 }}>
        <h2 className="fwp-tile-title">Selective Hydration Island</h2>
        <p className="fwp-tile-desc">
          Interactive client component bundled via esbuild only where wrapped in{' '}
          <code>&lt;Hydrate&gt;</code>.
        </p>
        <div className="fwp-island-row">
          <button
            type="button"
            className="fwp-mini-btn"
            aria-label="Decrement count"
            onClick={() => setCount((c) => c - 1)}
          >
            −
          </button>
          <span className="fwp-mini-count">Count: {count}</span>
          <button
            type="button"
            className="fwp-mini-btn fwp-mini-btn-accent"
            aria-label="Increment count"
            onClick={() => setCount((c) => c + 1)}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

export default CounterIsland;
