import { defineBlock } from '@forgewp/react';
import type { Variants } from 'framer-motion';
import PreviewSection from '../app/components/PreviewSection';
export { editable } from '../app/components/PreviewSection';

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: 'easeOut' },
  },
};

export default defineBlock({
  name: 'preview-section',
  title: 'Hospitality Preview Section',
  category: 'theme',
  icon: 'visibility',
  description: 'Editable Hospitality 2035 preview section.',
  attributes: {},
  editorPreview: ({ attributes }) => (
    <section
      id='preview'
      className='border-t border-slate-200 bg-[#eef2f6] px-5 py-20 sm:px-8 lg:px-12 lg:py-32'
    >
      <div className='mx-auto max-w-[1440px]'>
        <div className='grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24'>
          <div className='relative mx-auto w-[min(72vw,430px)]'>
            <div className='border border-white/80 bg-white p-3 shadow-[18px_24px_36px_rgba(15,23,42,0.18)]'>
              <img
                src='/assets/hospitality-cover.png'
                alt={attributes.coverAlt || 'Hospitality 2035 study cover'}
                className='block aspect-[0.7] w-full object-cover'
              />
              <span className='absolute bottom-7 left-7 bg-accent px-3 py-2 text-[9px] font-bold uppercase tracking-[0.18em] text-white'>
                Preview / 01
              </span>
            </div>
          </div>
          <div>
            <p className='text-xs font-bold uppercase tracking-[0.2em] text-accent sm:text-sm'>
              {attributes.eyebrow || '03 / Vorschau'}
            </p>
            <h2 className='mt-8 max-w-3xl font-heading text-5xl font-black leading-[0.88] tracking-[-0.07em] text-brand sm:text-7xl lg:text-8xl'>
              {attributes.title || 'Ein Blick in die Studie.'}
            </h2>
            <p className='mt-8 max-w-2xl text-lg leading-relaxed text-slate-600'>
              {attributes.description ||
                'Die Vorschau gibt Einblick in Titelblatt, Inhaltsverzeichnis und die Partnerstruktur von Hospitality 2035.'}
            </p>
            <div className='mt-10 grid max-w-xl gap-4 border-y border-slate-300 py-5 sm:grid-cols-3'>
              <div>
                <p className='text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400'>
                  {attributes.scopeLabel || 'Umfang'}
                </p>
                <p className='mt-2 font-heading text-lg font-bold text-brand'>
                  {attributes.scopeValue || 'ca. 80 Seiten'}
                </p>
              </div>
              <div>
                <p className='text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400'>
                  {attributes.formatLabel || 'Format'}
                </p>
                <p className='mt-2 font-heading text-lg font-bold text-brand'>
                  {attributes.formatValue || 'Digitale PDF'}
                </p>
              </div>
              <div>
                <p className='text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400'>
                  {attributes.sampleLabel || 'Einblick'}
                </p>
                <p className='mt-2 font-heading text-lg font-bold text-brand'>
                  {attributes.sampleValue || '5–8 Seiten'}
                </p>
              </div>
            </div>
            <div className='mt-8 flex flex-wrap items-center gap-4'>
              <span className='inline-flex border border-accent bg-accent px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white'>
                {attributes.previewLabel || 'Vorschau ansehen'}
              </span>
              <span className='text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400'>
                {attributes.pendingNote || 'PDF folgt nach Freigabe'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  ),
  edit: ({ attributes, setAttributes }) => (
    <PreviewSection
      {...attributes}
      setAttributes={setAttributes}
      reduceMotion={false}
      revealInitial={false}
      revealVariants={revealVariants}
    />
  ),
});
