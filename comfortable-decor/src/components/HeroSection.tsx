import { useRef, useState, useEffect } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
} from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import heroImage from '../assets/hero-image.jpg';

export default function HeroSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showStatement, setShowStatement] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  /**
   * scrollYProgress 0→1 as the outer section (220vh tall) scrolls
   * from "top at viewport top" to "bottom at viewport bottom".
   * This aligns the end of progress with the end of the scroll runway.
   */
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  // Text fades out as it moves down and image slides over it
  const textOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);
  const textY = useTransform(scrollYProgress, [0, 0.8], ['0vh', '10vh']);

  // Responsive values for starting state
  const startWidth = isMobile ? '88%' : '64%';
  const startHeight = isMobile ? '45vh' : '38vh';
  const startY = isMobile ? '4vh' : '8vh';

  // Image animations: scales up and slides from bottom margin to take full screen
  const imageWidth = useTransform(
    scrollYProgress,
    [0, 0.88],
    [startWidth, '100%'],
  );
  const imageHeight = useTransform(
    scrollYProgress,
    [0, 0.88],
    [startHeight, '100vh'],
  );
  const imageY = useTransform(scrollYProgress, [0, 0.88], [startY, '0vh']);
  const imageRadius = useTransform(scrollYProgress, [0, 0.75], [24, 0]);

  // Trigger auto-play fade-in once scroll reaches 45% progress
  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    if (latest >= 0.45) {
      setShowStatement(true);
    } else if (latest < 0.38) {
      setShowStatement(false);
    }
  });

  // Variants for staggered auto-play animation (word-by-word reveal)
  const statementContainerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.06,
        delayChildren: 0.1,
      },
    },
  };

  const statementWordVariants = {
    hidden: {
      opacity: 0,
      y: 10,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 1.0,
        ease: [0.215, 0.61, 0.355, 1],
      },
    },
  };

  const statementText =
    'We believe in homes that tell a story—where raw, organic textures meet handcrafted wood furniture and quiet, light-filled corners designed to foster a slower, more intentional way of daily living.';
  const statementWords = statementText.split(' ');

  // Variants for staggered entrance load animations
  const titleContainerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.18,
        delayChildren: 0.15,
      },
    },
  };

  const wordVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 1.2,
        ease: [0.215, 0.61, 0.355, 1],
      },
    },
  };

  const paragraphContainerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.55,
      },
    },
  };

  const paragraphWordVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 1.0,
        ease: [0.215, 0.61, 0.355, 1],
      },
    },
  };

  const paragraphText =
    'Minimal interior spaces, handcrafted furniture, and organic ceramics — designed to feel like home.';
  const paragraphWords = paragraphText.split(' ');

  return (
    /*
     * Outer section is 220vh tall — provides the scroll runway.
     */
    <section
      ref={sectionRef}
      className='relative min-h-[220vh] bg-[#FAF9F6]'
    >
      {/*
       * Sticky wrapper — pins content in view while the outer section scrolls.
       * Sticky h-screen + overflow-hidden ensures the sliding/expanding elements
       * stay perfectly framed within the viewport.
       */}
      <div className='sticky top-0 h-screen w-full overflow-hidden bg-[#FAF9F6]'>
        {/* ── HERO TEXT & CTA (z-10, moves slowly downward and fades out) ── */}
        <motion.div
          style={{ opacity: textOpacity, y: textY }}
          className='absolute z-10 inset-x-0 top-[24vh] md:top-[22vh] flex flex-col items-center text-center
                     px-6 md:px-20 lg:px-28 max-w-[1400px] mx-auto'
        >
          <motion.h1
            variants={titleContainerVariants}
            initial='hidden'
            animate='visible'
            className='font-heading font-black tracking-tighter uppercase
                       leading-none text-zinc-950 mb-6 whitespace-nowrap'
            style={{ fontSize: 'clamp(1.15rem, 5.2vw, 5.5rem)' }}
          >
            <motion.span
              variants={wordVariants}
              className='inline-block mr-[0.25em]'
            >
              Comfortable
            </motion.span>
            <motion.span
              variants={wordVariants}
              className='inline-block font-serif italic font-normal normal-case tracking-normal text-brand mr-[0.25em]'
            >
              Living
            </motion.span>
            <motion.span
              variants={wordVariants}
              className='inline-block'
            >
              Presets
            </motion.span>
          </motion.h1>

          <motion.p
            variants={paragraphContainerVariants}
            initial='hidden'
            animate='visible'
            className='text-zinc-500 text-base md:text-lg leading-relaxed mb-8 font-semibold max-w-2xl flex flex-wrap justify-center'
          >
            {paragraphWords.map((word, i) => (
              <motion.span
                key={i}
                variants={paragraphWordVariants}
                className='inline-block mr-[0.25em] whitespace-nowrap'
              >
                {word}
              </motion.span>
            ))}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 1.2,
              delay: 1.2,
              ease: [0.215, 0.61, 0.355, 1],
            }}
          >
            <a
              href='#catalog'
              className='inline-flex items-center gap-2 bg-zinc-950 text-white font-heading
                         font-semibold text-sm uppercase tracking-wider px-8 py-4 rounded-full
                         hover:bg-brand transition-colors duration-300 group'
            >
              Explore Catalog
              <ArrowRight className='w-4 h-4 group-hover:translate-x-1 transition-transform duration-300' />
            </a>
          </motion.div>
        </motion.div>

        {/* ── HERO IMAGE (z-20, slides UP and grows to cover the whole viewport) ── */}
        <motion.div
          className='absolute bottom-0 left-1/2 z-20 overflow-hidden'
          style={{
            x: '-50%',
            y: imageY,
            width: imageWidth,
            height: imageHeight,
            borderRadius: imageRadius,
          }}
        >
          <img
            src={heroImage}
            alt='Minimal interior living room — Comfortable Decor'
            className='w-full h-full object-cover object-center block'
            draggable={false}
          />
        </motion.div>

        {/* ── STAGGERED STATEMENT OVERLAY (z-30, auto-plays once scroll passes 45%) ── */}
        <div className='absolute bottom-[8vh] left-0 right-0 z-30 flex flex-col items-center text-center px-6 pointer-events-none select-none'>
          <motion.p
            variants={statementContainerVariants}
            initial='hidden'
            animate={showStatement ? 'visible' : 'hidden'}
            className='font-serif italic text-[#FAF9F6] text-lg md:text-2xl leading-relaxed drop-shadow-sm font-semibold max-w-[850px] mx-auto flex flex-wrap justify-center'
          >
            {statementWords.map((word, i) => (
              <motion.span
                key={i}
                variants={statementWordVariants}
                className='inline-block mr-[0.23em] whitespace-nowrap'
              >
                {word}
              </motion.span>
            ))}
          </motion.p>
        </div>
      </div>
    </section>
  );
}
