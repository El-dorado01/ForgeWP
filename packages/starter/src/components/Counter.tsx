import { useState, useEffect } from "react";

export interface CounterProps {
  label?: string;
}

export function Counter({ label = "React State Island (Counter)" }: CounterProps) {
  const [count, setCount] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return (
    <div className="p-4 border-2 border-zinc-950 bg-white font-mono text-zinc-950">
      <div className="flex items-center justify-between gap-4 mb-2">
        <span className="block text-xs text-zinc-400 font-bold uppercase tracking-wider">
          {label}
        </span>
        <span
          className={`text-[9px] font-bold px-1.5 py-0.5 uppercase tracking-widest border transition-all duration-300 ${
            isHydrated
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-amber-50 border-amber-200 text-amber-700 animate-pulse"
          }`}
        >
          {isHydrated ? "● Hydrated" : "○ Static (SSR)"}
        </span>
      </div>
      <div className="flex items-center gap-4 mt-1.5">
        <span className="text-xl font-black">Count: {count}</span>
        <button
          onClick={() => setCount((c) => c + 1)}
          className="border-2 border-zinc-950 bg-brand text-white px-3 py-1 font-bold text-xs uppercase hover:bg-zinc-800 transition-colors"
        >
          Increment
        </button>
      </div>
    </div>
  );
}
