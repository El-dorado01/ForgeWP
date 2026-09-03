import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { easeOutExpo } from '@/components/motion/reveal';

/**
 * Micro-interactions for buttons & links (not cards).
 * Cube-roll text, magnetic hover, underline draw, arrow slide, fill wipe.
 */

/** Text rolls up like a cube face swap on parent group hover */
export function RollText({
  children,
  className,
  mode = 'slide',
}: {
  children: React.ReactNode;
  className?: string;
  /** slide = vertical dual-line roll; cube = 3D rotateX */
  mode?: 'slide' | 'cube';
}) {
  const reduce = useReducedMotion();
  const label = typeof children === 'string' ? children : null;

  if (!label || reduce) {
    return <span className={className}>{children}</span>;
  }

  if (mode === 'cube') {
    return (
      <span
        className={cn(
          'relative inline-block h-[1.2em] overflow-hidden [perspective:600px] leading-none align-middle',
          className,
        )}
      >
        <span
          className={cn(
            'relative block h-full w-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] [transform-style:preserve-3d]',
            'group-hover/btn:[transform:rotateX(90deg)] group-hover/link:[transform:rotateX(90deg)]',
            'group-focus-visible/btn:[transform:rotateX(90deg)]',
          )}
        >
          <span className="block [backface-visibility:hidden]">{label}</span>
          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center [backface-visibility:hidden] [transform:rotateX(-90deg)_translateZ(0.55em)]"
          >
            {label}
          </span>
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        'relative inline-flex h-[1.2em] items-center overflow-hidden leading-none align-middle',
        className,
      )}
    >
      <span
        className={cn(
          'block transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform',
          'group-hover/btn:-translate-y-full group-hover/link:-translate-y-full',
          'group-focus-visible/btn:-translate-y-full',
        )}
      >
        {label}
      </span>
      <span
        aria-hidden
        className={cn(
          'absolute left-0 top-0 flex h-full w-full items-center translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform',
          'group-hover/btn:translate-y-0 group-hover/link:translate-y-0',
          'group-focus-visible/btn:translate-y-0',
        )}
      >
        {label}
      </span>
    </span>
  );
}

/** Letters cascade in on hover */
export function StaggerLetters({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <span className={className}>{children}</span>;

  return (
    <span className={cn('inline-flex', className)} aria-label={children}>
      {children.split('').map((char, i) => (
        <span
          key={`${char}-${i}`}
          className="inline-block transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/link:-translate-y-0.5 group-hover/btn:-translate-y-0.5"
          style={{ transitionDelay: `${i * 18}ms` }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
}

/** Underline that draws from left → right */
export function DrawUnderline({
  children,
  className,
  color = 'currentColor',
}: {
  children: React.ReactNode;
  className?: string;
  color?: string;
}) {
  return (
    <span className={cn('group/link relative inline-flex items-center', className)}>
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/link:scale-x-100"
        style={{ backgroundColor: color }}
      />
    </span>
  );
}

/** Magnetic pull toward cursor (buttons / icon hits) */
export function Magnetic({
  children,
  className,
  strength = 0.28,
}: {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState({ x: 0, y: 0 });

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      className={cn('inline-flex', className)}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: 'spring', stiffness: 280, damping: 18, mass: 0.4 }}
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        setPos({ x: x * strength, y: y * strength });
      }}
      onMouseLeave={() => setPos({ x: 0, y: 0 })}
    >
      {children}
    </motion.div>
  );
}

/** Arrow that slides right on hover (pair with links/buttons) */
export function ArrowSlide({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <span
      className={cn(
        'inline-flex items-center transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]',
        !reduce &&
          'group-hover/btn:translate-x-1 group-hover/link:translate-x-1',
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Soft pulse ring on interactive control */
export function PulseRing({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/btn:opacity-100',
        className,
      )}
    >
      <span className="absolute inset-0 animate-ping rounded-[inherit] bg-current opacity-10" />
    </span>
  );
}

export { easeOutExpo };
