import { useState, useEffect } from "react";

/**
 * ⚡ ForgeWP Selective Hydration Island Component — "ActiveSlider"
 * 
 * IMPORTANT FOR INTERACTIVITY:
 * This component runs client-side React state hooks (useState, useEffect). To enable
 * interactivity on the WordPress frontend, you MUST wrap this component in the `<Hydrate>`
 * controller when rendering it in your page layout.
 * 
 * Example:
 * import ActiveSlider from "@/components/ActiveSlider";
 * import { Hydrate } from "@forgewp/react";
 * 
 * <Hydrate trigger="visible" preload="near-visible">
 *   <ActiveSlider />
 * </Hydrate>
 */
export interface ActiveSliderProps {
  label?: string;
}

export default function ActiveSlider({ label = "React State Island (ActiveSlider)" }: ActiveSliderProps) {
  const [count, setCount] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return (
    <div className="p-6 border-4 border-zinc-950 bg-white font-mono text-zinc-950 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all">
      <div className="flex items-center justify-between gap-4 mb-4 border-b-2 border-zinc-950 pb-2">
        <span className="block text-sm font-bold uppercase tracking-wider">
          {label}
        </span>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 uppercase tracking-widest border-2 border-zinc-950 transition-all duration-300 ${
            isHydrated
              ? "bg-green-400 text-zinc-950 font-black"
              : "bg-amber-400 text-zinc-950 font-black animate-pulse"
          }`}
        >
          {isHydrated ? "● Hydrated" : "○ Static (SSR)"}
        </span>
      </div>
      
      <div className="flex items-center gap-4 mt-2">
        <span className="text-2xl font-black">Counter: {count}</span>
        <button
          onClick={() => setCount((c) => c + 1)}
          className="border-2 border-zinc-950 bg-brand text-white px-4 py-2 font-black text-sm uppercase tracking-wide shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[0px] active:translate-y-[0px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
        >
          Increment Value
        </button>
      </div>
    </div>
  );
}
