import React from "react";
import { motion } from "framer-motion";
import { useReducedMotion, getStaticMotionStyle } from "@forgewp/react";

interface FadeRevealProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  yOffset?: number;
  className?: string;
}

export function FadeReveal({
  children,
  delay = 0,
  duration = 0.6,
  yOffset = 40,
  className = "",
}: FadeRevealProps) {
  const reduced = useReducedMotion();

  // Core accessibility & zero-CLS initialization
  const initial = reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: yOffset };
  const animate = { opacity: 1, y: 0 };
  const transition = {
    duration: reduced ? 0 : duration,
    delay,
    ease: [0.16, 1, 0.3, 1], // Premium custom bezier easeOutExpo
  };

  return (
    <motion.div
      initial={initial}
      animate={animate}
      transition={transition}
      style={getStaticMotionStyle(initial)}
      className={className}
    >
      {children}
    </motion.div>
  );
}
