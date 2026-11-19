import { defineBlock } from '@forgewp/react';

export default defineBlock({
  name: 'checkout-section',
  title: 'Hospitality Checkout Section',
  category: 'theme',
  icon: 'cart',
  description:
    'Checkout section with editable purchase details and a nested EDD Buy Button.',
  innerBlocks: {
    allowedBlocks: [
      'checkout-section-intro',
      'checkout-benefits',
      'checkout-order-panel',
    ],
    template: [
      ['checkout-section-intro'],
      ['checkout-benefits'],
      ['checkout-order-panel'],
    ],
    templateLock: false,
    orientation: 'vertical',
  },
  shell: {
    className:
      'hospitality-checkout-section border-t border-slate-200 bg-[#eef2f6] px-5 py-20 sm:px-8 lg:px-12 lg:py-32',
    gridClassName:
      'mx-auto grid max-w-[1440px] gap-y-12 lg:gap-y-16',
  },
  edit: () => null,
});
