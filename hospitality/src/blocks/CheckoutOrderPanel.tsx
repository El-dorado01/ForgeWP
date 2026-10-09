import { defineBlock } from '@forgewp/react';

export default defineBlock({
  name: 'checkout-order-panel',
  title: 'Checkout Purchase Panel',
  category: 'theme',
  icon: 'cart',
  description:
    'Purchase summary and the EDD Buy Button for the selected download.',
  innerBlocks: {
    allowedBlocks: ['checkout-product-details', 'edd/buy-button'],
    template: [
      ['checkout-product-details'],
      ['edd/buy-button', { show_price: false, button_text: 'Studie kaufen' }],
    ],
    templateLock: false,
    orientation: 'vertical',
  },
  shell: {
    className:
      'hospitality-checkout-order-panel flex flex-col gap-8 border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] sm:p-10 lg:flex-row lg:items-end lg:justify-between lg:p-12',
    gridClassName:
      'flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_max-content_max-content] lg:items-end lg:gap-x-4 lg:gap-y-0',
  },
  edit: () => null,
});
