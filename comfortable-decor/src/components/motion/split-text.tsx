import * as React from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';
import { easeOutExpo } from './reveal';

interface SplitTextProps {
  text: string;
  className?: string;
  wordClassName?: string;
  delay?: number;
  stagger?: number;
  as?: keyof React.JSX.IntrinsicElements;
  once?: boolean;
}

export function SplitText({
  text,
  className,
  wordClassName,
  delay = 0,
  stagger = 0.04,
  as: Component = 'div',
  once = true,
}: SplitTextProps) {
  const reduce = useReducedMotion();
  const words = text.split(' ');

  if (reduce) {
    return <Component className={className}>{text}</Component>;
  }

  const container: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: stagger,
        delayChildren: delay,
      },
    },
  };

  const wordVariant: Variants = {
    hidden: {
      y: '100%',
      opacity: 0,
    },
    visible: {
      y: '0%',
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: easeOutExpo,
      },
    },
  };

  return (
    <Component className={className}>
      <motion.span
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once, margin: '-40px' }}
        className="inline-block"
      >
        {words.map((word, i) => (
          <span
            key={`${word}-${i}`}
            className={cn('inline-block overflow-hidden pb-[0.1em] align-bottom mr-[0.25em]', wordClassName)}
          >
            <motion.span
              variants={wordVariant}
              className="inline-block will-change-transform"
            >
              {word}
            </motion.span>
          </span>
        ))}
      </motion.span>
    </Component>
  );
}
