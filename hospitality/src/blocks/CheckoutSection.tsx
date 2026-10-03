import { defineBlock } from '@forgewp/react';
import type { Variants } from 'framer-motion';
import CheckoutSection from '../app/components/CheckoutSection';
export { editable } from '../app/components/CheckoutSection';
const revealVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: 'easeOut' },
  },
};
export default defineBlock({
  name: 'checkout-section',
  title: 'Hospitality Checkout Section',
  category: 'theme',
  icon: 'cart',
  description: 'Editable Hospitality 2035 checkout presentation.',
  attributes: {},
  edit: ({ attributes, setAttributes }) => (
    <CheckoutSection
      {...attributes}
      setAttributes={setAttributes}
      reduceMotion={false}
      revealInitial={false}
      revealVariants={revealVariants}
    />
  ),
});
