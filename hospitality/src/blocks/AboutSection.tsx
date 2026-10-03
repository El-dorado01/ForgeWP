import { defineBlock } from '@forgewp/react';
import type { Variants } from 'framer-motion';
import AboutSection from '../app/components/AboutSection';
export { editable } from '../app/components/AboutSection';

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: 'easeOut' },
  },
};

export default defineBlock({
  name: 'about-section',
  title: 'Hospitality About Section',
  category: 'theme',
  icon: 'businessman',
  description: 'Editable Hospitality 2035 publisher section.',
  attributes: {},
  edit: ({ attributes, setAttributes }) => (
    <AboutSection
      {...attributes}
      setAttributes={setAttributes}
      reduceMotion={false}
      revealInitial={false}
      revealVariants={revealVariants}
    />
  ),
});
