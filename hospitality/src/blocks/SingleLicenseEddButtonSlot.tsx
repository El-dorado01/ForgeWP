import { defineBlock } from '@forgewp/react';

export default defineBlock({
  name: 'single-license-edd-button-slot',
  title: 'EDD Buy Button Slot',
  category: 'theme',
  icon: 'cart',
  description: 'Insert the EDD Buy Button block inside this slot.',
  innerBlocks: {
    template: [],
    templateLock: false,
    orientation: 'vertical',
  },
  shell: {
    className: 'hospitality-edd-purchase-wrap mt-7',
    gridClassName: 'block',
  },
  edit: () => null,
});
