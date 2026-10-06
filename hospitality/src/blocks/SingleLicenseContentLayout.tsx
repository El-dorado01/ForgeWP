import { defineBlock } from '@forgewp/react';

export default defineBlock({
  name: 'single-license-content-layout',
  title: 'Single License Content Layout',
  category: 'theme',
  icon: 'columns',
  description:
    'Two-column layout with checkout information and the purchase panel.',
  innerBlocks: {
    allowedBlocks: [
      'single-license-checkout-info',
      'single-license-purchase-panel',
    ],
    template: [
      ['single-license-checkout-info'],
      ['single-license-purchase-panel'],
    ],
    templateLock: false,
    orientation: 'horizontal',
  },
  shell: {
    className:
      'mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20',
    gridClassName:
      'grid min-w-0 grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16',
  },
  edit: () => null,
});
