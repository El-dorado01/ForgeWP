import { defineBlock, WpEditable } from '@forgewp/react';
import type { Variants } from 'framer-motion';
import HeroSection from '../app/components/HeroSection';
export { editable } from '../app/components/HeroSection';

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: 'easeOut' },
  },
};

export default defineBlock({
  name: 'hero-section',
  title: 'Hospitality Hero Section',
  category: 'theme',
  icon: 'cover-image',
  description: 'Editable Hospitality 2035 hero section.',
  attributes: {},
  editorPreview: ({ attributes, setAttributes }) => (
    <section className='relative mx-auto flex min-h-[680px] w-full max-w-[1440px] flex-col justify-between overflow-hidden px-5 pb-8 pt-6 sm:px-8 lg:px-12 lg:pb-12 lg:pt-8'>
      <div className='relative z-10 flex items-start justify-between'>
        <p className='max-w-[240px] text-[10px] font-semibold uppercase leading-[1.5] tracking-[0.2em] text-slate-500'>
          <WpEditable
            tagName='span'
            value={
              attributes.eyebrow ||
              'Eine strategische Studie über die Zukunft der Hotellerie'
            }
            onChange={(value) => setAttributes({ eyebrow: value })}
          />
        </p>
        <p className='text-right font-serif text-sm italic text-slate-500'>
          <WpEditable
            tagName='span'
            value={attributes.location || 'Berlin / Zürich / 2026'}
            onChange={(value) => setAttributes({ location: value })}
          />
        </p>
      </div>
      <div className='relative flex flex-1 items-center justify-center py-10'>
        <h1 className='absolute left-1/2 top-1/2 w-screen -translate-x-1/2 -translate-y-1/2 text-center font-heading text-[clamp(4rem,16vw,14rem)] font-black uppercase leading-[0.6] tracking-[-0.08em] text-brand/95'>
          <WpEditable
            tagName='span'
            value={attributes.word || 'Hospitality'}
            onChange={(value) => setAttributes({ word: value })}
          />
        </h1>
        <div className='relative z-10 mt-10 w-[min(52vw,300px)] rotate-[-2deg] border border-white/80 bg-white p-2 shadow-[20px_28px_30px_rgba(15,23,42,0.25)] sm:w-[min(38vw,360px)]'>
          <img
            src='/assets/hospitality-cover.png'
            alt={attributes.coverAlt || 'Hospitality 2035 study cover'}
            className='block aspect-[0.7] w-full object-cover'
          />
        </div>
        <span className='absolute bottom-0 left-1/2 -translate-x-1/2 font-heading text-[clamp(5rem,20vw,14rem)] font-black uppercase tracking-[-0.1em] text-accent'>
          <WpEditable
            tagName='span'
            value={attributes.year || '2035'}
            onChange={(value) => setAttributes({ year: value })}
          />
        </span>
      </div>
      <div className='relative z-20 flex flex-col gap-6 pt-6 sm:flex-row sm:items-end sm:justify-between'>
        <p className='max-w-md text-sm leading-relaxed text-slate-600'>
          <WpEditable
            tagName='span'
            value={
              attributes.summary ||
              'Steigende Kosten, neue Technologien und veränderte Erwartungen stellen die wirtschaftlichen Grundlagen des Hotelbetriebs neu auf.'
            }
            onChange={(value) => setAttributes({ summary: value })}
          />
        </p>
        <div className='flex shrink-0 flex-col items-start gap-2 sm:items-end'>
          <p className='mb-4 max-w-[420px] text-right text-xs font-semibold uppercase leading-[1.5] tracking-[0.2em] text-slate-500 sm:max-w-[240px]'>
            <WpEditable
              tagName='span'
              value={
                attributes.subtitle ||
                'Wie sich die wirtschaftliche Logik der Hotellerie verändert'
              }
              onChange={(value) => setAttributes({ subtitle: value })}
            />
          </p>
          <div className='flex flex-wrap items-center justify-end gap-3'>
            <span className='inline-flex border border-slate-300 px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.16em] text-brand'>
              <WpEditable
                tagName='span'
                value={attributes.previewLabel || 'Vorschau ansehen'}
                onChange={(value) => setAttributes({ previewLabel: value })}
              />
            </span>
            <span className='inline-flex border border-accent bg-accent px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white'>
              <WpEditable
                tagName='span'
                value={attributes.buyLabel || 'Studie kaufen · 249 € netto'}
                onChange={(value) => setAttributes({ buyLabel: value })}
              />
            </span>
          </div>
        </div>
      </div>
    </section>
  ),
  edit: ({ attributes, setAttributes }) => (
    <HeroSection
      {...attributes}
      setAttributes={setAttributes}
      reduceMotion={false}
      revealInitial={false}
      revealVariants={revealVariants}
    />
  ),
});
