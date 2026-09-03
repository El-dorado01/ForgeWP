import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ChevronRight, Play } from 'lucide-react';
import { resolveWpAsset } from '@forgewp/react';

// Staggered container for the text column
const textContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.25 },
  },
};

const textLine = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export default function CTASection() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: '-10% 0px' });

  return (
    <section
      ref={sectionRef}
      className='w-full bg-[#fafafa] overflow-hidden border-t border-slate-100 my-12'
    >
      {/* 2-col tight grid — no gap, compact height */}
      <div className='grid grid-cols-1 md:grid-cols-3 min-h-[380px] md:min-h-[440px]'>

        {/* ── LEFT: Video frame — md:col-span-2 (≈2/3) ── */}
        <motion.div
          data-cursor='PLAY'
          className='relative md:col-span-2 min-h-[300px] md:min-h-0 overflow-hidden bg-slate-900 cursor-pointer'
          initial={{ clipPath: 'inset(0 100% 0 0)' }}
          animate={inView ? { clipPath: 'inset(0 0% 0 0)' } : {}}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Video */}
          <video
            src={resolveWpAsset('/video-1.mp4')}
            autoPlay
            muted
            loop
            playsInline
            className='absolute inset-0 w-full h-full object-cover'
          />

          {/* Dark overlay — softens the video so it doesn't overwhelm */}
          <div className='absolute inset-0 bg-slate-900/30' />

          {/* Subtle corner label */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.9, duration: 0.6, ease: 'easeOut' }}
            className='absolute bottom-4 left-4 md:bottom-5 md:left-5 flex items-center gap-2 select-none'
          >
            <span className='flex items-center justify-center w-7 h-7 rounded-full bg-white/15 backdrop-blur-md border border-white/25'>
              <Play className='w-3 h-3 text-white fill-white' />
            </span>
            <span className='font-mono text-[9px] uppercase tracking-widest text-white/70 font-bold'>
              Campaign Film — A/W 2026
            </span>
          </motion.div>
        </motion.div>

        {/* ── RIGHT: Text panel — md:col-span-1 (≈1/3) ── */}
        <motion.div
          className='relative flex flex-col justify-center px-6 py-10 md:px-10 md:py-12 bg-[#F5F1ED] overflow-hidden'
          variants={textContainer}
          initial='hidden'
          animate={inView ? 'visible' : 'hidden'}
        >
          {/* Shimmer sweep on the right panel */}
          <span className='pointer-events-none absolute top-0 h-full w-[60%] bg-linear-to-r from-transparent via-white/40 to-transparent animate-[shimmer-sweep_5s_infinite_ease-in-out] z-10' />

          {/* Eyebrow */}
          <motion.span
            variants={textLine}
            className='font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#A38E7A] mb-2 block'
          >
            New Season
          </motion.span>

          {/* Headline */}
          <motion.h2
            variants={textLine}
            className='font-heading font-black uppercase text-2xl md:text-3xl lg:text-4xl text-slate-900 tracking-tight leading-[1.08] mb-3'
          >
            Crafted for the <span className='text-[#7C6A58]'>Season.</span>
          </motion.h2>

          {/* Body */}
          <motion.p
            variants={textLine}
            className='font-sans text-slate-500 text-xs md:text-sm leading-relaxed max-w-xs mb-6'
          >
            Premium outerwear and knitwear designed for modern minimalists.
            Ethically sourced, endlessly wearable.
          </motion.p>

          {/* CTA button */}
          <motion.div variants={textLine}>
            <motion.a
              href='#storefront'
              whileHover={{
                y: -1,
                boxShadow: '0 8px 20px -4px rgba(124, 106, 88, 0.4)',
              }}
              whileTap={{ y: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className='group relative overflow-hidden inline-flex items-center gap-2 bg-[#7C6A58] hover:bg-[#605143] text-white font-heading font-bold text-[11px] uppercase tracking-widest px-6 py-3 rounded-full shadow-sm cursor-pointer transition-colors duration-300'
            >
              {/* Hover shimmer */}
              <span className='pointer-events-none absolute top-0 h-full w-1/2 -translate-x-full bg-linear-to-r from-transparent via-white/30 to-transparent -skew-x-12 group-hover:translate-x-[250%] transition-transform duration-800 ease-[cubic-bezier(0.16,1,0.3,1)] z-10' />
              Shop Collection
              <ChevronRight className='w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300' />
            </motion.a>
          </motion.div>

          {/* Decorative side rule */}
          <motion.div
            initial={{ scaleY: 0 }}
            animate={inView ? { scaleY: 1 } : {}}
            transition={{ delay: 0.6, duration: 0.8, ease: [0.16, 1, 0.3, 1] as const }}
            className='absolute left-0 top-8 bottom-8 w-[2px] bg-linear-to-b from-transparent via-[#7C6A58]/40 to-transparent origin-top'
          />
        </motion.div>
      </div>
    </section>
  );
}
