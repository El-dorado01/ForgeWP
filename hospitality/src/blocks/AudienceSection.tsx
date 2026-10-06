import { defineBlock } from '@forgewp/react';
import type { Variants } from 'framer-motion';
import AudienceSection from '../app/components/AudienceSection';
export { editable } from '../app/components/AudienceSection';

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: 'easeOut' },
  },
};

export default defineBlock({
  name: 'audience-section',
  title: 'Hospitality Audience Section',
  category: 'theme',
  icon: 'groups',
  description: 'Editable Hospitality 2035 audience section.',
  attributes: {},
  editorPreview: ({ attributes }) => (
    <section
      id='audiences'
      className='border-t border-slate-200 bg-white px-5 py-20 sm:px-8 lg:px-12 lg:py-32'
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
        <div className='mt-20 border-y border-slate-200'>
          {(attributes.audiences || []).map(
            (audience: { number: string; title: string; text: string }) => (
            <article
              key={audience.number}
              className='grid gap-5 border-b border-slate-200 py-8 last:border-b-0 sm:grid-cols-[72px_0.9fr_1.1fr] sm:items-start sm:gap-8'
            >
              <span className='font-mono text-xs font-bold tracking-[0.12em] text-accent'>
                {audience.number}
              </span>
              <h3 className='font-heading text-2xl font-bold leading-tight tracking-[-0.04em] text-brand sm:text-3xl'>
                {audience.title}
              </h3>
              <p className='max-w-xl text-base leading-relaxed text-slate-500'>
                {audience.text}
              </p>
            </article>
            ),
          )}
        </div>
      </div>
    </section>
  ),
  edit: ({ attributes, setAttributes }) => (
    <AudienceSection
      {...attributes}
      setAttributes={setAttributes}
      reduceMotion={false}
      revealInitial={false}
      revealVariants={revealVariants}
    />
  ),
});
