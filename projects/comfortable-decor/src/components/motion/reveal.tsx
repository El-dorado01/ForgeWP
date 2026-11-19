import * as React from 'react';
import {
  motion,
  useReducedMotion,
  AnimatePresence,
  type Variants,
} from 'framer-motion';

/**
 * useReducedMotion()
 * -------------------
 * Framer Motion hook that reads the OS/browser setting
 * `prefers-reduced-motion: reduce` (Windows/macOS accessibility).
 * When true, we skip transforms/staggers and render static markup so
 * vestibular-sensitive users aren’t forced into motion.
 * We still animate for everyone else (client preference).
 */

export const easeOutExpo: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const easeSoft: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: easeOutExpo },
  },
};

export const fadeUpSoft: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: easeOutExpo },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.5, ease: easeOutExpo },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 1.035 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.75, ease: easeOutExpo },
  },
};

export const slideLeft: Variants = {
  hidden: { opacity: 0, x: 32 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: easeOutExpo },
  },
};

export const slideRight: Variants = {
  hidden: { opacity: 0, x: -32 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: easeOutExpo },
  },
};

export const blurIn: Variants = {
  hidden: { opacity: 0, filter: 'blur(8px)', y: 12 },
  visible: {
    opacity: 1,
    filter: 'blur(0px)',
    y: 0,
    transition: { duration: 0.65, ease: easeOutExpo },
  },
};

const staggerContainer = (stagger = 0.07, delay = 0.04): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren: delay },
  },
});

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  variants?: Variants;
  delay?: number;
  amount?: number;
  once?: boolean;
};

export function Reveal({
  children,
  className,
  variants = fadeUp,
  delay = 0,
  amount = 0.15,
  once = true,
}: RevealProps) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      variants={variants}
      transition={{ delay, duration: 0.55, ease: easeOutExpo }}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({
  children,
  className,
  stagger = 0.07,
  amount = 0.1,
  delayChildren = 0.04,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  amount?: number;
  delayChildren?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      variants={staggerContainer(stagger, delayChildren)}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  variants = fadeUpSoft,
}: {
  children: React.ReactNode;
  className?: string;
  variants?: Variants;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  );
}

export function HeroMotion({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={staggerContainer(0.09, 0.1)}
    >
      {children}
    </motion.div>
  );
}

export function HeroItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={fadeUp}>
      {children}
    </motion.div>
  );
}

/** Micro hover lift for cards / tiles */
export function HoverLift({
  children,
  className,
  y = -4,
  scale = 1.01,
}: {
  children: React.ReactNode;
  className?: string;
  y?: number;
  scale?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      whileHover={{ y, scale, transition: { duration: 0.35, ease: easeOutExpo } }}
      whileTap={{ scale: 0.99 }}
    >
      {children}
    </motion.div>
  );
}

/** Image zoom on hover (wrap media) */
export function HoverMedia({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      whileHover="hover"
      initial="rest"
      variants={{
        rest: {},
        hover: {},
      }}
    >
      <motion.div
        className="h-full w-full"
        variants={{
          rest: { scale: 1 },
          hover: { scale: 1.045, transition: { duration: 0.7, ease: easeOutExpo } },
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/** Subtle continuous float for accent chips / orbs */
export function Float({
  children,
  className,
  amplitude = 6,
  duration = 4,
}: {
  children: React.ReactNode;
  className?: string;
  amplitude?: number;
  duration?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      animate={{ y: [0, -amplitude, 0] }}
      transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
}

/** Micro nudge on hover for text links / CTAs */
export function LinkMotion({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <span className={className}>{children}</span>;

  return (
    <motion.span
      className={className}
      whileHover={{ x: 3 }}
      transition={{ duration: 0.25, ease: easeOutExpo }}
    >
      {children}
    </motion.span>
  );
}

/** Animated number count-up when in view */
export function CountUp({
  to,
  suffix = '',
  className,
  duration = 1.4,
}: {
  to: number;
  suffix?: string;
  className?: string;
  duration?: number;
}) {
  const reduce = useReducedMotion();
  const [value, setValue] = React.useState(reduce ? to : 0);
  const ref = React.useRef<HTMLSpanElement>(null);
  const started = React.useRef(false);

  React.useEffect(() => {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / (duration * 1000));
          const eased = 1 - Math.pow(1 - t, 3);
          setValue(Math.round(eased * to));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [to, duration, reduce]);

  return (
    <span ref={ref} className={className}>
      {value}
      {suffix}
    </span>
  );
}

export { motion, useReducedMotion, AnimatePresence };
