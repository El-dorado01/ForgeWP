import { defineBlock } from '@forgewp/react';

export default defineBlock({
  name: 'license-inquiry-layout',
  title: 'Hospitality License Inquiry Layout',
  category: 'theme',
  icon: 'columns',
  description: 'Two-column shell for the license inquiry form and summary.',
  innerBlocks: {
    allowedBlocks: [
      'license-inquiry-form',
      'license-inquiry-overview',
      'company-license-inquiry-overview',
    ],
    template: [
      ['license-inquiry-form'],
      ['license-inquiry-overview'],
    ],
    templateLock: false,
    orientation: 'horizontal',
  },
  shell: {
    className:
      'mx-auto max-w-[1440px] px-6 py-12 sm:px-8 sm:py-16 lg:px-14 lg:py-20',
    gridClassName:
      'grid min-w-0 grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-20',
  },
  edit: () => null,
});
