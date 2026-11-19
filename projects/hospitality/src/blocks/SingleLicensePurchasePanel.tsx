import { defineBlock } from '@forgewp/react';

export default defineBlock({
  name: 'single-license-purchase-panel',
  title: 'Single License Purchase Panel',
  category: 'theme',
  icon: 'cart',
  description:
    'Product summary, price details, EDD button slot, and return link in the original purchase card.',
  innerBlocks: {
    allowedBlocks: [
      'single-license-summary',
      'single-license-price-details',
      'single-license-edd-button-slot',
      'single-license-back-link',
    ],
    template: [
      ['single-license-summary'],
      ['single-license-price-details'],
      ['single-license-edd-button-slot'],
      ['single-license-back-link'],
    ],
    templateLock: false,
    orientation: 'vertical',
  },
  shell: {
    className:
      'h-fit border border-brand/15 bg-white p-5 sm:p-7 lg:sticky lg:top-28',
    gridClassName: 'block',
  },
  edit: () => null,
});
