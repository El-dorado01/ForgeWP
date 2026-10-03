import { defineBlock } from '@forgewp/react';
import type { Variants } from 'framer-motion';
import AutomationSection from '../app/components/AutomationSection';
export { editable } from '../app/components/AutomationSection';

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: 'easeOut' },
  },
};

export default defineBlock({
  name: 'automation-section',
  title: 'Hospitality Automation Section',
  category: 'theme',
  icon: 'settings',
  description: 'Editable Hospitality 2035 automation section.',
  attributes: {},
  edit: ({ attributes, setAttributes }) => (
    <AutomationSection
      {...attributes}
      setAttributes={setAttributes}
      reduceMotion={false}
      revealInitial={false}
      revealVariants={revealVariants}
    />
  ),
});
