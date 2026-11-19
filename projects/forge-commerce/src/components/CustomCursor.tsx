'use client';

import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';

export default function CustomCursor() {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [cursorText, setCursorText] = useState('');

  // Motion values for raw mouse coordinates
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // Smooth springs for the outer trailing halo
  const springConfig = { damping: 28, stiffness: 350, mass: 0.5 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // Snappy springs for the inner dot
  const dotConfig = { damping: 40, stiffness: 1200 };
  const dotX = useSpring(mouseX, dotConfig);
  const dotY = useSpring(mouseY, dotConfig);

  useEffect(() => {
    // Only run on desktop/devices with fine pointer
    if (typeof window === 'undefined' || window.matchMedia('(pointer: coarse)').matches) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);

      if (!isVisible) setIsVisible(true);
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    // Event delegation to detect interactive hover targets dynamically
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const interactiveEl = target.closest(
        'a, button, [role="button"], input, select, textarea, .cursor-pointer, [data-cursor]'
      );

      if (interactiveEl) {
        setIsHovered(true);
        const customText = interactiveEl.getAttribute('data-cursor');
        setCursorText(customText || '');
      } else {
        setIsHovered(false);
        setCursorText('');
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseover', handleMouseOver);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseover', handleMouseOver);
    };
  }, [mouseX, mouseY, isVisible]);

  if (!isVisible) return null;

  return (
    <div className='pointer-events-none fixed inset-0 z-50 overflow-hidden hidden md:block'>
      {/* ── Outer Trailing Ring / Ambient Glow ── */}
      <motion.div
        style={{
          x: smoothX,
          y: smoothY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          width: isHovered ? (cursorText ? 80 : 54) : isClicking ? 28 : 36,
          height: isHovered ? (cursorText ? 80 : 54) : isClicking ? 28 : 36,
          backgroundColor: isHovered
            ? 'rgba(124, 106, 88, 0.15)'
            : 'rgba(124, 106, 88, 0.06)',
          borderColor: isHovered
            ? 'rgba(124, 106, 88, 0.6)'
            : 'rgba(124, 106, 88, 0.25)',
          scale: isClicking ? 0.85 : 1,
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 400 }}
        className='absolute rounded-full border border-solid backdrop-blur-[2px] flex items-center justify-center shadow-[0_0_20px_rgba(124,106,88,0.12)]'
      >
        <AnimatePresence>
          {cursorText && (
            <motion.span
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.15 }}
              className='font-heading text-[10px] font-black tracking-widest text-[#7C6A58] uppercase select-none'
            >
              {cursorText}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Inner Center Core Dot ── */}
      <motion.div
        style={{
          x: dotX,
          y: dotY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          scale: isClicking ? 1.8 : isHovered ? 0.4 : 1,
          backgroundColor: isHovered ? '#605143' : '#7C6A58',
          opacity: cursorText ? 0 : 1,
        }}
        transition={{ type: 'spring', damping: 30, stiffness: 500 }}
        className='absolute w-2 h-2 rounded-full shadow-[0_0_8px_rgba(124,106,88,0.6)]'
      />
    </div>
  );
}
