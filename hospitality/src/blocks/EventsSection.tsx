import { defineBlock } from '@forgewp/react';
import type { Variants } from 'framer-motion';
import EventsSection from '../app/components/EventsSection';
export { editable } from '../app/components/EventsSection';

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: 'easeOut' },
  },
};

export default defineBlock({
  name: 'events-section',
  title: 'Hospitality Events Section',
  category: 'theme',
  icon: 'calendar-alt',
  description: 'Editable Hospitality 2035 events section.',
  attributes: {},
  edit: ({ attributes, setAttributes }) => (
    <EventsSection
      {...attributes}
      setAttributes={setAttributes}
      reduceMotion={false}
      revealInitial={false}
      revealVariants={revealVariants}
    />
  ),
});
