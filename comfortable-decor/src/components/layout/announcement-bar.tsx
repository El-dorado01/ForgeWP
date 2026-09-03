import * as React from 'react';
import { AnimatePresence, motion, useReducedMotion } from '@/components/motion/reveal';

const defaultAnnouncementMessages = [
  'Free Carbon-Neutral EU Delivery on Orders Over €150',
  '2026 Architectural Collection — Now Live in Munich & Online',
  'Sustainable Materials Guarantee — 100% Certified Hardwoods & Pure Wool',
];

export function AnnouncementBar() {
  const [index, setIndex] = React.useState(0);
  const reduce = useReducedMotion();
  const announcementMessages = defaultAnnouncementMessages;

  React.useEffect(() => {
    if (announcementMessages.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % announcementMessages.length);
    }, 4200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="bg-ink/95 text-cream backdrop-blur-md overflow-hidden border-b border-ink/10">
      <div className="container-wide flex h-8 md:h-9 items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="text-center text-xs tracking-wide font-medium"
          >
            {announcementMessages[index]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
