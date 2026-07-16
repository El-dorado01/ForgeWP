import { defineBlock } from '@forgewp/react';

/**
 * Parent shell — Contact details | form side-by-side.
 *
 * Layout-only InnerBlocks wrapper (same pattern as AboutSplitSection).
 */
export default defineBlock({
  name: 'contact-split-section',
  title: 'Contact Split Section',
  category: 'theme',
  icon: 'columns',
  description: 'Contact details + form side-by-side layout shell',
  attributes: {},
  innerBlocks: {
    allowedBlocks: ['contact-details', 'contact-form-section'],
    template: [['contact-details'], ['contact-form-section']],
    templateLock: false,
    orientation: 'horizontal',
  },
  shell: {
    className: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16',
    // 2fr | 3fr matches page layout without requiring col-span on children
    gridClassName:
      'grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-10 items-start',
  },
  edit: () => null,
});
