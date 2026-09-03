import * as React from 'react';
import { cn } from '@/lib/utils';

interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  direction?: 'left' | 'right';
  speed?: number; // duration in seconds
  pauseOnHover?: boolean;
  className?: string;
}

export function Marquee({
  children,
  direction = 'left',
  speed = 35,
  pauseOnHover = true,
  className,
  ...props
}: MarqueeProps) {
  return (
    <div
      className={cn(
        'group flex overflow-hidden select-none mask-[linear-gradient(to_right,transparent_0%,black_10%,black_90%,transparent_100%)]',
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          'flex min-w-full shrink-0 items-center justify-around gap-8',
          direction === 'left' ? 'animate-marquee' : 'animate-marquee-reverse',
          pauseOnHover && 'group-hover:paused',
        )}
        style={{ animationDuration: `${speed}s` }}
      >
        {children}
      </div>
      <div
        aria-hidden
        className={cn(
          'flex min-w-full shrink-0 items-center justify-around gap-8',
          direction === 'left' ? 'animate-marquee' : 'animate-marquee-reverse',
          pauseOnHover && 'group-hover:paused',
        )}
        style={{ animationDuration: `${speed}s` }}
      >
        {children}
      </div>
    </div>
  );
}
