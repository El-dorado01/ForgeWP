import { defineBlock } from '@forgewp/react';
import type { Variants } from 'framer-motion';
import AboutSection from '../app/components/AboutSection';
export { editable } from '../app/components/AboutSection';

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: 'easeOut' },
  },
};

export default defineBlock({
  name: 'about-section',
  title: 'Hospitality About Section',
  category: 'theme',
  icon: 'businessman',
  description: 'Editable Hospitality 2035 publisher section.',
  attributes: {},
  editorPreview: ({ attributes }) => (
    <section
      id='about'
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
        <div className='mt-20 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]'>
          <div className='flex flex-col justify-between bg-brand p-6 text-white sm:p-10 lg:p-12'>
            <div>
              <img
                src='/assets/client-assets/dicon-brand/dicon-logo.jpg'
                alt='DICON Marketing- und Beratungsgesellschaft mbH'
                className='h-auto w-[min(75vw,360px)] bg-white p-3'
              />
              <p className='mt-10 max-w-2xl text-lg leading-relaxed text-slate-300'>
                {attributes.companyDescription}
              </p>
            </div>
            <div className='mt-12 grid gap-3 border-t border-white/20 pt-5 text-xs uppercase tracking-[0.12em] text-slate-400 sm:grid-cols-2'>
              <p>{attributes.cityLabel}</p>
              <p className='sm:text-right'>{attributes.foundedLabel}</p>
            </div>
          </div>
          <div className='border border-slate-200 bg-[#f8fafc] p-6 sm:p-10 lg:p-12'>
            <p className='text-[10px] font-bold uppercase tracking-[0.18em] text-accent'>
              {attributes.authorLabel}
            </p>
            <h3 className='mt-8 font-heading text-4xl font-black leading-none tracking-[-0.06em] text-brand sm:text-5xl'>
              {attributes.authorName}
            </h3>
            <p className='mt-2 text-sm font-semibold uppercase tracking-[0.12em] text-slate-400'>
              {attributes.authorRole}
            </p>
            <p className='mt-8 text-base leading-relaxed text-slate-600'>
              {attributes.authorDescription}
            </p>
            <span className='mt-8 inline-flex border-b border-accent pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-brand'>
              contact@dicon-beratung.de
            </span>
          </div>
        </div>
      </div>
    </section>
  ),
  edit: ({ attributes, setAttributes }) => (
    <AboutSection
      {...attributes}
      setAttributes={setAttributes}
      reduceMotion={false}
      revealInitial={false}
      revealVariants={revealVariants}
    />
  ),
});
