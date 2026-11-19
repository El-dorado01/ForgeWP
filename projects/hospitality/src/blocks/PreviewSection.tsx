import { defineBlock } from '@forgewp/react';
import type { Variants } from 'framer-motion';
import PreviewSection from '../app/components/PreviewSection';
export { editable } from '../app/components/PreviewSection';

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: 'easeOut' },
  },
};

export default defineBlock({
  name: 'preview-section',
  title: 'Hospitality Preview Section',
  category: 'theme',
  icon: 'visibility',
  description: 'Editable Hospitality 2035 preview section.',
  attributes: {},
  edit: ({ attributes, setAttributes }) => (
    <PreviewSection
      {...attributes}
      setAttributes={setAttributes}
      reduceMotion={false}
      revealInitial={false}
      revealVariants={revealVariants}
    />
  ),
});
