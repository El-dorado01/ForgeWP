'use client';

import { useState } from 'react';

export interface CounterIslandProps {
  initialCount?: number;
}

export function CounterIsland({ initialCount = 0 }: CounterIslandProps) {
  const [count, setCount] = useState(initialCount);

  return (
    <div className="island-card">
      <div className="island-copy">
        <span className="feature-badge">Hydrated Client Island</span>
        <h3>CounterIsland.tsx</h3>
        <p>
          Runs as an ordinary React Client Component in Next.js dev/decoupled mode, and
          bundles into a standalone ESM island for native WordPress themes via{' '}
          <code>&lt;Hydrate&gt;</code>.
        </p>
      </div>
      <div className="island-controls">
        <button
          type="button"
          className="island-btn"
          aria-label="Decrement count"
          onClick={() => setCount((c) => c - 1)}
        >
          −
        </button>
        <span className="island-count">Count: {count}</span>
        <button
          type="button"
          className="island-btn island-btn-primary"
          aria-label="Increment count"
          onClick={() => setCount((c) => c + 1)}
        >
          +
        </button>
        <button
          type="button"
          className="island-btn"
          onClick={() => setCount(initialCount)}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

export default CounterIsland;
