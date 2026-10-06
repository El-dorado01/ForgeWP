import { defineBlock } from '@forgewp/react';
import type { Variants } from 'framer-motion';
import AutomationSection from '../app/components/AutomationSection';
export { editable } from '../app/components/AutomationSection';

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: 'easeOut' },
  },
};

export default defineBlock({
  name: 'automation-section',
  title: 'Hospitality Automation Section',
  category: 'theme',
  icon: 'settings',
  description: 'Editable Hospitality 2035 automation section.',
  attributes: {},
  editorPreview: ({ attributes }) => (
    <section
      id='automation'
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
        <figure className='mt-16'>
          <img
            src='/assets/editorial-images/robotic-hotel-lobby-01.png'
            alt={attributes.imageAlt}
            className='block aspect-[3/1] w-full object-cover'
          />
          <figcaption className='mt-3 flex flex-wrap justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400'>
            <span>Editorial concept / Hotel lobby of the future</span>
            <span>Hospitality 2035</span>
          </figcaption>
        </figure>
        <div className='mt-20 grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-24'>
          <div>
            <h3 className='font-heading text-4xl font-black leading-[0.92] tracking-[-0.06em] text-brand sm:text-6xl'>
              {attributes.detailTitle}
            </h3>
            <p className='mt-8 max-w-2xl text-base leading-relaxed text-slate-600'>
              {attributes.detailDescription}
            </p>
          </div>
          <div className='border-t border-slate-200'>
            {(attributes.details || []).map(
              (detail: { number: string; title: string; text: string }) => (
                <div
                  key={detail.number}
                  className='grid grid-cols-[48px_1fr] gap-4 border-b border-slate-200 py-5'
                >
                  <span className='font-mono text-xs font-bold tracking-[0.12em] text-accent'>
                    {detail.number}
                  </span>
                  <div>
                    <h4 className='font-heading text-xl font-bold text-brand'>
                      {detail.title}
                    </h4>
                    <p className='mt-2 text-sm leading-relaxed text-slate-500'>
                      {detail.text}
                    </p>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
        <figure className='mt-20 ml-auto max-w-5xl'>
          <img
            src='/assets/editorial-images/robotic-hotel-lobby-02.png'
            alt={attributes.secondImageAlt}
            className='block aspect-[3/1] w-full object-cover'
          />
        </figure>
      </div>
    </section>
  ),
  edit: ({ attributes, setAttributes }) => (
    <AutomationSection
      {...attributes}
      setAttributes={setAttributes}
      reduceMotion={false}
      revealInitial={false}
      revealVariants={revealVariants}
    />
  ),
});
