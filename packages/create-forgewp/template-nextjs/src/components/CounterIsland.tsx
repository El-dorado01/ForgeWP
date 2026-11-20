'use client';

import { useState } from 'react';

export interface CounterIslandProps {
  initialCount?: number;
}

export function CounterIsland({ initialCount = 0 }: CounterIslandProps) {
  const [count, setCount] = useState(initialCount);

  return (
    <div className="hero-block">
      <p>Interactive client island (bundled cleanly for WordPress via &lt;Hydrate&gt;):</p>
      <button type="button" onClick={() => setCount((c) => c + 1)}>
        Count: {count}
      </button>
    </div>
  );
}

export default CounterIsland;
