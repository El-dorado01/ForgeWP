import { defineBlock } from '@forgewp/react';
import type { Variants } from 'framer-motion';
import StudySection from '../app/components/StudySection';
export { editable } from '../app/components/StudySection';

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: 'easeOut' },
  },
};

export default defineBlock({
  name: 'study-section',
  title: 'Hospitality Study Section',
  category: 'theme',
  icon: 'book-alt',
  description: 'Editable Hospitality 2035 study section.',
  attributes: {},
  edit: ({ attributes, setAttributes }) => (
    <StudySection
      {...attributes}
      setAttributes={setAttributes}
      reduceMotion={false}
      revealInitial={false}
      revealVariants={revealVariants}
    />
  ),
});
