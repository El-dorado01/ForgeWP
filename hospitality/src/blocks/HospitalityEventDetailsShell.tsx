import { defineBlock } from '@forgewp/react';

export default defineBlock({
  name: 'hospitality-event-details-shell',
  title: 'Hospitality Event Details Layout',
  category: 'theme',
  icon: 'columns',
  description: 'Two-column layout for event information and programme blocks.',
  attributes: {},
  innerBlocks: {
    allowedBlocks: ['hospitality-event-overview', 'hospitality-event-program'],
    template: [['hospitality-event-overview'], ['hospitality-event-program']],
    templateLock: false,
    orientation: 'horizontal',
  },
  shell: {
    className:
      'mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20 lg:px-12 lg:py-24',
    gridClassName:
      'grid grid-cols-1 gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20',
  },
  edit: () => null,
});
