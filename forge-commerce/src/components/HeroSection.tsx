import { useRef } from 'react';
import { WpHead, WpImage } from '@forgewp/react';
import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const heroContainerVariants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.4,
    },
  },
} as const;

const heroLineVariants = {
  initial: { y: 60, opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 1.0,
      ease: [0.16, 1, 0.3, 1],
    },
  },
} as const;

const heroTextHover = {
  type: 'spring',
  stiffness: 400,
  damping: 25,
} as const;

export default function HeroSection() {
  const heroRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={heroRef}
      className='relative h-screen w-full flex flex-col justify-between overflow-hidden text-slate-900 font-sans select-none bg-[#fafafa]'
    >
      <WpHead
        title='Forge Commerce — Headless React Shop Theme'
        description='Headless e-commerce development with native WordPress block theme output.'
        ogType='website'
      />


      {/* ── BACKGROUND: AI Image Asset ── */}
      <div className='absolute inset-0 w-full h-full z-0 overflow-hidden lg:flex lg:justify-end lg:items-end'>
        <WpImage
          src='/bg-image.png'
          alt='Background fashion model'
          className='w-full h-full object-cover object-center opacity-25 lg:opacity-100 lg:h-full lg:w-auto lg:object-contain lg:object-bottom will-change-transform transform-gpu'
        />
      </div>

      {/* ── HERO CONTENT: Left aligned overlay ── */}
      <main className='relative w-full max-w-7xl mx-auto flex-1 flex items-center z-20 px-6 md:px-12 py-12 lg:py-0 pt-24 lg:pt-24'>
        {/* Desktop Layout (Left aligned overlay) */}
        <motion.div
          variants={heroContainerVariants}
          initial="initial"
          animate="animate"
          className='max-w-[48%] text-left hidden lg:block'
        >
          <h2 className='text-4xl md:text-5xl lg:text-6.5xl font-sans font-normal tracking-wide leading-[1.05] text-slate-900 mb-6 lowercase select-none'>
            <span className='block overflow-hidden py-1'>
              <motion.span
                variants={heroLineVariants}
                whileHover={{ x: 12, color: '#7C6A58' }}
                transition={heroTextHover}
                className='block cursor-pointer origin-left'
              >
                Artisanal style,
              </motion.span>
            </span>
            <span className='block overflow-visible py-2'>
              <motion.span
                variants={heroLineVariants}
                whileHover={{ x: 12, color: '#7C6A58' }}
                transition={heroTextHover}
                className='block cursor-pointer origin-left'
              >
                <span className='relative inline-block pr-1'>
                  curated
                  <svg
                    aria-hidden='true'
                    className='absolute -inset-x-7 -inset-y-5 w-[calc(100%+50px)] h-[calc(100%+35px)] pointer-events-none text-[#7C6A58] overflow-visible'
                    viewBox='0 0 170 65'
                    fill='none'
                  >
                    <motion.path
                      d='M 155,12 C 120,5 50,5 15,14 C 2,24 2,46 15,55 C 50,64 120,64 155,55 C 168,46 168,24 155,12 C 120,6 45,6 10,18'
                      stroke='currentColor'
                      strokeWidth='2.5'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{
                        pathLength: { duration: 1.3, delay: 1.6, ease: [0.16, 1, 0.3, 1] },
                        opacity: { duration: 0.2, delay: 1.6 },
                      }}
                    />
                  </svg>
                </span>{' '}
                for the
              </motion.span>
            </span>
            <span className='block overflow-hidden py-1'>
              <motion.span
                variants={heroLineVariants}
                whileHover={{ x: 12, scale: 1.02 }}
                transition={heroTextHover}
                className='block cursor-pointer origin-left bg-linear-to-r from-primary to-[#605143] bg-clip-text text-transparent'
              >
                modern everyday.
              </motion.span>
            </span>
          </h2>

          <motion.p
            variants={heroLineVariants}
            className='text-slate-600 font-heading text-sm md:text-base leading-relaxed font-bold max-w-xl mb-8'
          >
            Discover a collection of thoughtfully designed wool outerwear,
            knitwear, and accessories made to elevate your seasonal wardrobe.
            Sustainably sourced, crafted with care.
          </motion.p>

          <motion.div variants={heroLineVariants} className='flex flex-wrap gap-4'>
            <motion.a
              href='/shop'
              whileHover={{ scale: 1.015, y: -1, boxShadow: '0 10px 25px -5px rgba(124, 106, 88, 0.4), 0 8px 10px -6px rgba(124, 106, 88, 0.4)' }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              className='group relative overflow-hidden inline-flex items-center justify-center bg-[#7C6A58] hover:bg-[#605143] text-white border border-[#7C6A58] hover:border-[#605143] font-heading font-bold text-xs uppercase tracking-widest px-8 py-4 transition-all duration-300 rounded-full shadow-md cursor-pointer'
            >
              <span className='pointer-events-none absolute top-0 h-full w-1/2 -translate-x-full bg-linear-to-r from-transparent via-white/30 to-transparent -skew-x-12 group-hover:translate-x-[250%] transition-transform duration-800 ease-[cubic-bezier(0.16,1,0.3,1)] z-10' />
              Shop Collection
              <ChevronRight className='w-4 h-4 ml-1 group-hover:translate-x-1.5 transition-transform' />
            </motion.a>

            <motion.a
              href='#'
              whileHover={{ scale: 1.015, y: -1, backgroundColor: 'rgba(15, 23, 42, 0.05)' }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              className='group inline-flex items-center justify-center bg-transparent hover:bg-slate-100 text-slate-800 border border-slate-300 font-heading font-bold text-xs uppercase tracking-widest px-8 py-4 transition-all rounded-full cursor-pointer'
            >
              View Lookbook
            </motion.a>
          </motion.div>
        </motion.div>

        {/* Mobile Layout (Full width container overlaying image) */}
        <motion.div
          variants={heroContainerVariants}
          initial="initial"
          animate="animate"
          className='w-full text-left lg:hidden'
        >
          <h2 className='text-4xl font-sans font-normal tracking-wide leading-[1.05] text-slate-900 mb-6 lowercase select-none'>
            <span className='block overflow-hidden py-0.5'>
              <motion.span
                variants={heroLineVariants}
                whileHover={{ x: 8, color: '#7C6A58' }}
                transition={heroTextHover}
                className='block cursor-pointer origin-left'
              >
                Artisanal style,
              </motion.span>
            </span>
            <span className='block overflow-visible py-1.5'>
              <motion.span
                variants={heroLineVariants}
                whileHover={{ x: 8, color: '#7C6A58' }}
                transition={heroTextHover}
                className='block cursor-pointer origin-left'
              >
                <span className='relative inline-block px-1'>
                  curated
                  <svg
                    aria-hidden='true'
                    className='absolute -inset-x-3.5 -inset-y-3 w-[calc(100%+28px)] h-[calc(100%+24px)] pointer-events-none text-[#7C6A58] overflow-visible'
                    viewBox='0 0 170 65'
                    fill='none'
                  >
                    <motion.path
                      d='M 155,12 C 120,5 50,5 15,14 C 2,24 2,46 15,55 C 50,64 120,64 155,55 C 168,46 168,24 155,12 C 120,6 45,6 10,18'
                      stroke='currentColor'
                      strokeWidth='2.6'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{
                        pathLength: { duration: 1.3, delay: 1.6, ease: [0.16, 1, 0.3, 1] },
                        opacity: { duration: 0.2, delay: 1.6 },
                      }}
                    />
                  </svg>
                </span>{' '}
                for the
              </motion.span>
            </span>
            <span className='block overflow-hidden py-0.5'>
              <motion.span
                variants={heroLineVariants}
                whileHover={{ x: 8, scale: 1.02 }}
                transition={heroTextHover}
                className='block cursor-pointer origin-left bg-linear-to-r from-primary to-[#8C7A6B] bg-clip-text text-transparent'
              >
                modern everyday.
              </motion.span>
            </span>
          </h2>

          <motion.p
            variants={heroLineVariants}
            className='text-slate-600 font-heading text-xs leading-relaxed font-normal max-w-xl mb-8'
          >
            Discover a collection of thoughtfully designed wool outerwear,
            knitwear, and accessories made to elevate your seasonal wardrobe.
            Sustainably sourced, crafted with care.
          </motion.p>

          <motion.div variants={heroLineVariants} className='flex flex-wrap gap-4'>
            <motion.a
              href='#storefront'
              whileHover={{ scale: 1.015, y: -1 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              className='group relative overflow-hidden inline-flex items-center justify-center bg-[#7C6A58] hover:bg-[#605143] text-white border border-[#7C6A58] hover:border-[#605143] font-heading font-bold text-xs uppercase tracking-widest px-6 py-3.5 transition-all duration-300 rounded-full shadow-md cursor-pointer'
            >
              <span className='pointer-events-none absolute top-0 h-full w-1/2 -translate-x-full bg-linear-to-r from-transparent via-white/30 to-transparent -skew-x-12 group-hover:translate-x-[250%] transition-transform duration-800 ease-[cubic-bezier(0.16,1,0.3,1)] z-10' />
              Shop Collection
              <ChevronRight className='w-4 h-4 ml-1' />
            </motion.a>

            <motion.a
              href='#'
              whileHover={{ scale: 1.015, y: -1, backgroundColor: 'rgba(15, 23, 42, 0.05)' }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              className='group inline-flex items-center justify-center bg-transparent hover:bg-slate-100 text-slate-800 border border-slate-300 font-heading font-bold text-xs uppercase tracking-widest px-6 py-3.5 transition-all rounded-full cursor-pointer'
            >
              View Lookbook
            </motion.a>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
