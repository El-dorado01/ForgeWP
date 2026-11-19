import { useEffect, useRef, useState } from 'react';
import { WpImage } from '@forgewp/react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export interface CampaignSlide {
  id: number | string;
  image: string;
  title: string;
  subtitle: string;
  description: string;
}

interface CampaignSliderProps {
  slides: CampaignSlide[];
}

// Spacing between card left edges in vw.
// < 100vw lets the next card peek in at the right edge on desktop.
// Mobile = 100vw (one slide fills the viewport).
const CARD_SPACING_VW = { mobile: 100, desktop: 90 };

export default function CampaignSlider({ slides }: CampaignSliderProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!sectionRef.current || slides.length === 0) return;

    const section = sectionRef.current;
    const ctx = gsap.context(() => {
      const isMobile = window.innerWidth < 768;
      const spacing = isMobile
        ? CARD_SPACING_VW.mobile
        : CARD_SPACING_VW.desktop;
      const totalTransitions = Math.max(slides.length - 1, 1);
      const scrollRunwayPx = totalTransitions * (window.innerHeight || 800);

      // Set initial positions
      cardRefs.current.forEach((el, i) => {
        if (!el) return;
        gsap.set(el, { yPercent: -50, x: `${i * spacing}vw` });
      });

      // Pure ScrollTrigger timeline with native scrub
      const tl = gsap.timeline({
        scrollTrigger: {
          id: 'campaign-slider-pin',
          trigger: section,
          start: 'top top',
          end: `+=${scrollRunwayPx}`,
          pin: true,
          anticipatePin: 1,
          scrub: 0.6,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const rawIdx = self.progress * totalTransitions;
            const activeIdx = Math.min(Math.round(rawIdx), slides.length - 1);
            setActiveIndex(activeIdx);
          },
        },
      });

      scrollTriggerRef.current = tl.scrollTrigger || null;

      // Animate all cards together across the runway
      cardRefs.current.forEach((el, i) => {
        if (!el) return;
        tl.to(
          el,
          {
            x: `${(i - totalTransitions) * spacing}vw`,
            ease: 'none',
          },
          0,
        );
      });
    }, sectionRef);

    return () => {
      ctx.revert();
      scrollTriggerRef.current = null;
    };
  }, [slides.length]);

  // ── button / progress navigation ─────────────────────────────────────────────

  const goTo = (index: number) => {
    const st =
      scrollTriggerRef.current || ScrollTrigger.getById('campaign-slider-pin');
    const clamped = Math.max(0, Math.min(slides.length - 1, index));
    if (st) {
      const targetScroll =
        st.start +
        (clamped / Math.max(slides.length - 1, 1)) * (st.end - st.start);
      window.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }
    setActiveIndex(clamped);
  };

  // ── render ────────────────────────────────────────────────────────────────────

  if (slides.length === 0) return null;

  const controls = (
    <>
      <span className='font-mono text-sm font-bold text-slate-400 select-none'>
        {String(activeIndex + 1).padStart(2, '0')}
        <span className='text-slate-300 mx-1'>/</span>
        {String(slides.length).padStart(2, '0')}
      </span>
      <div className='w-16 md:w-24 h-0.75 bg-slate-200 rounded-full overflow-hidden'>
        <div
          className='h-full w-full bg-[#7C6A58] origin-left rounded-full'
          style={{
            transform: `scaleX(${slides.length > 1 ? activeIndex / (slides.length - 1) : 1})`,
            transition: 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      </div>
      <div className='flex items-center gap-2.5'>
        <button
          onClick={() => goTo(activeIndex - 1)}
          className='w-11 h-11 rounded-full border border-slate-200/60 bg-white text-slate-700 hover:text-primary shadow-md flex items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed'
          aria-label='Previous look'
          disabled={activeIndex === 0}
        >
          <ChevronLeft className='w-5 h-5' />
        </button>
        <button
          onClick={() => goTo(activeIndex + 1)}
          className='w-11 h-11 rounded-full border border-slate-200/60 bg-white text-slate-700 hover:text-primary shadow-md flex items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed'
          aria-label='Next look'
          disabled={activeIndex === slides.length - 1}
        >
          <ChevronRight className='w-5 h-5' />
        </button>
      </div>
    </>
  );

  return (
    <section
      ref={sectionRef}
      className='campaign-slider-section relative w-full h-screen overflow-hidden select-none bg-[#fafafa]'
    >
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          ref={(el) => {
            cardRefs.current[i] = el;
          }}
          className='absolute top-1/2 left-0 w-full md:w-[74vw] md:max-w-4xl'
        >
          {/* Watermark: slide number behind image + text */}
          <div className='hidden md:flex absolute inset-0 items-center justify-center pointer-events-none overflow-visible -z-10'>
            <span className='text-[11vw] font-heading font-black text-slate-900/4 tracking-tight select-none'>
              {String(i + 1).padStart(2, '0')}
            </span>
          </div>

          <div className='relative h-screen md:h-[58vh]'>
            {/* Image: full card on mobile, left ~60% on desktop */}
            <div className='absolute inset-0 md:right-[40%] overflow-hidden shadow-xl'>
              <WpImage
                src={slide.image}
                alt={slide.title}
                className='w-full h-full object-cover object-top select-none pointer-events-none'
                draggable={false}
              />
            </div>

            {/* Text panel */}
            <div className='absolute left-0 right-0 bottom-0 md:left-auto md:right-0 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:w-1/2 z-10'>
              <AnimatePresence>
                {activeIndex === i && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{
                      duration: 0.45,
                      ease: [0.16, 1, 0.3, 1],
                      delay: 0.1,
                    }}
                    className='relative overflow-hidden backdrop-blur-sm rounded-none p-6 md:p-8 pl-6 md:pl-28 bg-linear-to-t from-[#fafafa]/95 via-[#fafafa]/85 to-[#fafafa]/15 md:bg-linear-to-r md:from-[#fafafa]/40 md:via-[#fafafa]/90 md:to-[#fafafa]/95'
                  >
                    {/* Shimmer sweep */}
                    <span className='pointer-events-none absolute top-0 h-full w-[50%] bg-linear-to-r from-transparent via-white/35 to-transparent animate-[shimmer-sweep_3s_ease-in-out] z-10' />
                    <span className='font-mono text-xs font-bold uppercase tracking-widest text-[#A38E7A]'>
                      {slide.subtitle}
                    </span>
                    <h3 className='font-heading font-black uppercase text-3xl md:text-4xl text-slate-900 tracking-tight mt-2 leading-tight'>
                      {slide.title}
                    </h3>
                    <p className='text-slate-600 font-sans text-base md:text-lg leading-relaxed mt-4 max-w-sm'>
                      {slide.description}
                    </p>
                    <div className='mt-6 inline-flex items-center gap-1.5 text-sm font-heading font-black uppercase text-primary hover:text-[#605143] tracking-wider cursor-pointer group transition-colors duration-300'>
                      View Collection
                      <ChevronRight className='w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300' />
                    </div>

                    {/* Mobile: controls live inline below the CTA */}
                    <div className='md:hidden mt-8 flex items-center gap-4'>
                      {controls}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      ))}

      {/* Progress + index + prev/next controls: desktop-only floating overlay */}
      <div className='hidden md:flex absolute bottom-10 left-16 lg:left-24 items-center gap-4 z-20'>
        {controls}
      </div>
    </section>
  );
}
