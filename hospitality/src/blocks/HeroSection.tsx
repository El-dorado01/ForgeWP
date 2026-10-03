import { defineBlock } from '@forgewp/react';
import type { Variants } from 'framer-motion';
import HeroSection from '../app/components/HeroSection';
export { editable } from '../app/components/HeroSection';

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: 'easeOut' },
  },
};

export default defineBlock({
  name: 'hero-section',
  title: 'Hospitality Hero Section',
  category: 'theme',
  icon: 'cover-image',
  description: 'Editable Hospitality 2035 hero section.',
  attributes: {},
  edit: ({ attributes, setAttributes }) => (
    <HeroSection
      {...attributes}
      setAttributes={setAttributes}
      reduceMotion={false}
      revealInitial={false}
      revealVariants={revealVariants}
    />
  ),
});
