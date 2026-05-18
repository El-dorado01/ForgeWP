import { useState } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@forgewp/react";

export function PremiumGallery() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const reduced = useReducedMotion();

  const items = [
    {
      title: "Design System Sync",
      tag: "Vite + Figma",
      color: "bg-yellow-400",
      description: "Direct token translation compiling theme JSON maps into Tailwind tokens seamlessly.",
    },
    {
      title: "Selective Hydration",
      tag: "Zero CLS",
      color: "bg-cyan-400",
      description: "Code-split visual elements loading dynamic React bundles on viewport entry.",
    },
    {
      title: "Blocks Engine",
      tag: "Native WP",
      color: "bg-red-400",
      description: "Build custom Gutenberg blocks with React, compiling directly to solid PHP structures.",
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto py-12 px-6">
      {items.map((item, idx) => {
        const isHovered = hoveredIdx === idx;

        return (
          <div
            key={idx}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            className="relative border-4 border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between min-h-[300px] transition-all duration-200 hover:-translate-y-1 select-none cursor-pointer"
          >
            <div>
              <span className="inline-block bg-black text-white text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 mb-6">
                {item.tag}
              </span>
              
              <h3 className="font-serif font-black text-2xl text-zinc-950 uppercase leading-none mb-3">
                {item.title}
              </h3>
              
              <p className="text-sm text-zinc-600 font-sans font-medium leading-relaxed">
                {item.description}
              </p>
            </div>

            <div className="mt-8 border-t-2 border-zinc-200 pt-4 flex justify-between items-center">
              <span className="font-mono text-xs font-bold text-zinc-400">
                0{idx + 1} // Active
              </span>

              {/* Dynamic animated brutalist circle pointer */}
              <motion.div
                animate={reduced ? {} : {
                  scale: isHovered ? 1.25 : 1,
                  rotate: isHovered ? 90 : 0,
                }}
                className={`w-8 h-8 rounded-none border-2 border-black ${item.color} flex items-center justify-center font-black text-sm`}
              >
                +
              </motion.div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
