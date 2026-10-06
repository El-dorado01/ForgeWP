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
  editorPreview: ({ attributes }) => (
    <section
      id='checkout'
      className='border-t border-slate-200 bg-[#eef2f6] px-5 py-20 sm:px-8 lg:px-12 lg:py-32'
    >
      <div className='mx-auto max-w-[1440px]'>
        <div className='grid gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16'>
          <div>
            <p className='text-xs font-bold uppercase tracking-[0.2em] text-accent sm:text-sm'>
              {attributes.eyebrow}
            </p>
            <p className='mt-8 max-w-[220px] text-xs font-semibold uppercase leading-[1.5] tracking-[0.18em] text-slate-400 sm:text-sm'>
              {attributes.intro}
            </p>
          </div>
          <div>
            <h2 className='font-heading text-5xl font-black leading-[0.88] tracking-[-0.07em] text-brand sm:text-7xl lg:text-8xl'>
              {attributes.title}
            </h2>
            <p className='mt-8 max-w-3xl text-lg leading-relaxed text-slate-600'>
              {attributes.description}
            </p>
          </div>
        </div>
        <div className='mt-20 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]'>
          <div className='bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] sm:p-10 lg:p-12'>
            <div className='flex items-start justify-between gap-6 border-b border-slate-200 pb-6'>
              <div>
                <p className='text-[10px] font-bold uppercase tracking-[0.18em] text-accent'>
                  {attributes.productLabel}
                </p>
                <h3 className='mt-3 font-heading text-3xl font-black text-brand sm:text-4xl'>
                  {attributes.productName}
                </h3>
              </div>
              <p className='font-heading text-3xl font-black text-brand'>
                249 €
              </p>
            </div>
            <div className='mt-8 space-y-5'>
              <label className='flex items-start gap-3 text-sm leading-relaxed text-slate-600'>
                <input
                  type='checkbox'
                  disabled
                  className='mt-1 size-4 accent-accent'
                />
                <span>{attributes.consentText}</span>
              </label>
              <p className='border-l-2 border-accent pl-4 text-xs leading-relaxed text-slate-500'>
                {attributes.consentNote}
              </p>
            </div>
            <div className='mt-8 flex flex-wrap items-center gap-4'>
              <button
                type='button'
                disabled
                className='inline-flex cursor-not-allowed items-center justify-center bg-brand px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white opacity-60'
              >
                {attributes.orderButtonLabel}
              </button>
              <span className='text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400'>
                {attributes.integrationNote}
              </span>
            </div>
          </div>
          <div className='border border-slate-200 bg-brand p-6 text-white sm:p-10 lg:p-12'>
            <p className='text-[10px] font-bold uppercase tracking-[0.18em] text-accent'>
              {attributes.liveSystemLabel}
            </p>
            <div className='mt-8 space-y-5'>
              {(attributes.requirements || []).map(
                (item: { text: string }, index: number) => (
                  <p
                    key={index}
                    className='border-b border-white/20 pb-5 text-sm leading-relaxed text-slate-300 last:border-b-0'
                  >
                    {item.text}
                  </p>
                ),
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  ),
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
