import * as React from 'react';
import { Link } from '@/components/ui/link';
import { cn } from '@/lib/utils';
import {
  RollText,
  DrawUnderline,
  ArrowSlide,
  StaggerLetters,
} from '@/components/motion/micro';

type AnimatedLinkProps = {
  href: string;
  className?: string;
  children: React.ReactNode;
  roll?: boolean;
  rollMode?: 'slide' | 'cube';
  underline?: boolean;
  letters?: boolean;
  slideIcon?: boolean;
};

/**
 * Storefront text link with micro-interactions.
 * Wraps content in a single element for wouter Link compatibility.
 */
export function AnimatedLink({
  href,
  className,
  children,
  roll = true,
  rollMode = 'slide',
  underline = true,
  letters = false,
  slideIcon = true,
}: AnimatedLinkProps) {
  const parts = React.Children.toArray(children);

  const body = (
    <>
      {parts.map((child, i) => {
        if (typeof child === 'string' && child.trim()) {
          if (letters) {
            return <StaggerLetters key={i}>{child.trim()}</StaggerLetters>;
          }
          if (roll) {
            return (
              <RollText key={i} mode={rollMode}>
                {child.trim()}
              </RollText>
            );
          }
          return <span key={i}>{child}</span>;
        }
        if (React.isValidElement(child) && slideIcon) {
          return <ArrowSlide key={i}>{child}</ArrowSlide>;
        }
        return <React.Fragment key={i}>{child}</React.Fragment>;
      })}
    </>
  );

  const linkClass = cn(
    'group/link relative inline-flex items-center gap-2 font-heading text-sm font-medium transition-colors duration-300',
    className,
  );

  const link = (
    <Link href={href} className={linkClass}>
      {body}
    </Link>
  );

  if (underline) {
    return <DrawUnderline className="inline-flex">{link}</DrawUnderline>;
  }

  return link;
}
