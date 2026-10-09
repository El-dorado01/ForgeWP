import { defineBlock } from '@forgewp/react';
import type { Variants } from 'framer-motion';
import LicensingSection from '../app/components/LicensingSection';
export { editable } from '../app/components/LicensingSection';
const revealVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: 'easeOut' },
  },
};

export default defineBlock({
  name: 'licensing-section',
  title: 'Hospitality Licensing Section',
  category: 'theme',
  icon: 'tickets-alt',
  description: 'Editable Hospitality 2035 licensing presentation.',
  attributes: {},
  edit: ({ attributes, setAttributes }) => (
    <LicensingSection
      {...attributes}
      setAttributes={setAttributes}
      reduceMotion={false}
      revealInitial={false}
      revealVariants={revealVariants}
    />
  ),
});
