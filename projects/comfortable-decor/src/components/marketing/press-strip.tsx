import { useState, useEffect, useRef } from 'react';
import { Reveal } from '@/components/motion/reveal';
import { cn } from '@/lib/utils';

const pressLogos = [
  { name: 'stir', label: 'STIR World' },
  { name: 'archdaily', label: 'ArchDaily' },
  { name: 'designboom', label: 'designboom' },
  { name: 'dezeen', label: 'dezeen' },
  { name: 'FRAME', label: 'FRAME Magazine' },
];

export function PressStrip() {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % pressLogos.length);
    }, 2500);

    return () => clearInterval(timer);
  }, []);

  // Auto-scroll active item into the center of the mobile horizontal strip
  useEffect(() => {
    const activeEl = itemRefs.current[activeIndex];
    const container = containerRef.current;
    if (activeEl && container) {
      const scrollLeft =
        activeEl.offsetLeft - container.clientWidth / 2 + activeEl.clientWidth / 2;
      container.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
    }
  }, [activeIndex]);

  return (
    <section className="border-b border-border/80 bg-cream py-7 md:py-10 select-none overflow-hidden">
      <div className="container-wide">
        <Reveal className="flex flex-col md:flex-row items-center justify-between gap-5 md:gap-8">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-muted shrink-0 text-center md:text-left">
            Featured In &amp; Recognized By:
          </p>

          {/* Single-Line Horizontal Scroll Strip on Mobile (Scrollbar Hidden) */}
          <div
            ref={containerRef}
            className="w-full md:w-auto overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden scroll-smooth flex items-center justify-start md:justify-end gap-8 md:gap-14 whitespace-nowrap py-2 px-4 md:px-0"
          >
            {pressLogos.map((logo, index) => {
              const isActive = index === activeIndex;
              return (
                <span
                  key={logo.name}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  onClick={() => setActiveIndex(index)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    'relative shrink-0 font-heading text-lg md:text-2xl font-bold tracking-tight transition-all duration-500 cursor-pointer touch-manipulation',
                    isActive
                      ? 'text-ink scale-105 opacity-100 drop-shadow-xs'
                      : 'text-ink/35 opacity-70 hover:text-ink hover:scale-105 hover:opacity-100'
                  )}
                  title={logo.label}
                >
                  {logo.name}
                  <span
                    aria-hidden
                    className={cn(
                      'absolute -bottom-1 left-0 right-0 h-[2px] bg-sage-deep transition-transform duration-500 origin-center',
                      isActive ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
                    )}
                  />
                </span>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

