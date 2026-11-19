import { defineBlock } from '@forgewp/react';
import type { Variants } from 'framer-motion';
import PartnersSection from '../app/components/PartnersSection';
export { editable } from '../app/components/PartnersSection';
const revealVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: 'easeOut' },
  },
};

export default defineBlock({
  name: 'partners-section',
  title: 'Hospitality Partners Section',
  category: 'theme',
  icon: 'groups',
  description: 'Editable Hospitality 2035 partner network.',
  attributes: {},
  edit: ({ attributes, setAttributes }) => (
    <PartnersSection
      {...attributes}
      setAttributes={setAttributes}
      reduceMotion={false}
      revealInitial={false}
      revealVariants={revealVariants}
    />
  ),
});
