import { defineBlock } from '@forgewp/react';
import type { Variants } from 'framer-motion';
import AudienceSection from '../app/components/AudienceSection';
export { editable } from '../app/components/AudienceSection';

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: 'easeOut' },
  },
};

export default defineBlock({
  name: 'audience-section',
  title: 'Hospitality Audience Section',
  category: 'theme',
  icon: 'groups',
  description: 'Editable Hospitality 2035 audience section.',
  attributes: {},
  edit: ({ attributes, setAttributes }) => (
    <AudienceSection
      {...attributes}
      setAttributes={setAttributes}
      reduceMotion={false}
      revealInitial={false}
      revealVariants={revealVariants}
    />
  ),
});
