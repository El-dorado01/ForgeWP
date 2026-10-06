import { defineBlock } from '@forgewp/react';
import type { Variants } from 'framer-motion';
import StudySection from '../app/components/StudySection';
export { editable } from '../app/components/StudySection';

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: 'easeOut' },
  },
};

export default defineBlock({
  name: 'study-section',
  title: 'Hospitality Study Section',
  category: 'theme',
  icon: 'book-alt',
  description: 'Editable Hospitality 2035 study section.',
  attributes: {},
  editorPreview: ({ attributes }) => (
    <section
      id='study'
      className='mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-32'
    >
      <div className='grid gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16'>
        <div>
          <p className='text-xs font-bold uppercase tracking-[0.2em] text-accent sm:text-sm'>
            {attributes.eyebrow || '01 / Die Studie'}
          </p>
          <p className='mt-8 max-w-[240px] text-xs font-semibold uppercase leading-[1.5] tracking-[0.18em] text-slate-400 sm:text-sm'>
            {attributes.topics || 'Wirtschaft · Technologie · Betrieb · Raum'}
          </p>
        </div>
        <div>
          <h2 className='font-heading text-5xl font-black leading-[0.88] tracking-[-0.07em] text-brand sm:text-7xl lg:text-8xl'>
            {attributes.title || 'Die Hotellerie von morgen beginnt heute.'}
          </h2>
          <p className='mt-10 text-xl leading-relaxed text-slate-600'>
            {attributes.lead ||
              'Die entscheidende Frage lautet nicht, ob sich die wirtschaftliche Logik der Hotellerie verändert, sondern wie schnell und in welcher Form.'}
          </p>
          <p className='mt-5 text-base leading-relaxed text-slate-500'>
            {attributes.description ||
              'Hospitality 2035 verbindet wirtschaftliche Analyse mit strategischer Zukunftsbetrachtung.'}
          </p>
        </div>
      </div>
      <div className='mt-20 grid gap-x-8 border-y border-slate-200 lg:grid-cols-2'>
        {(attributes.theses || [
          {
            number: '01',
            title: 'Personal und Kosten',
            text: 'Personalengpässe und steigende Betriebskosten verändern die Grundlage jedes Hotelbetriebs.',
          },
          {
            number: '02',
            title: 'KI und Digitalisierung',
            text: 'Software, künstliche Intelligenz und automatisierte Prozesse werden zum operativen Kern.',
          },
          {
            number: '03',
            title: 'Robotik und Automation',
            text: 'Physische Automation verändert Abläufe, Servicequalität und die Organisation von Arbeit.',
          },
        ]).map((thesis: { number: string; title: string; text: string }) => (
          <article
            key={thesis.number}
            className='grid grid-cols-[48px_1fr] gap-5 border-b border-slate-200 py-6'
          >
            <span className='font-mono text-[10px] font-bold tracking-[0.12em] text-accent'>
              {thesis.number}
            </span>
            <div>
              <h3 className='font-heading text-xl font-bold tracking-[-0.03em] text-brand'>
                {thesis.title}
              </h3>
              <p className='mt-2 max-w-md text-sm leading-relaxed text-slate-500'>
                {thesis.text}
              </p>
            </div>
          </article>
        ))}
      </div>
      <div className='mt-20 grid gap-8 bg-brand px-6 py-8 text-white sm:px-10 sm:py-10 lg:grid-cols-[0.6fr_1.4fr] lg:items-center lg:px-12'>
        <p className='text-[10px] font-bold uppercase tracking-[0.2em] text-accent'>
          {attributes.frameworkLabel || 'Framework / 01'}
        </p>
        <div>
          <h3 className='font-heading text-3xl font-black leading-none tracking-[-0.05em] sm:text-5xl'>
            {attributes.frameworkTitle || 'Automation Readiness'}
          </h3>
          <p className='mt-4 max-w-2xl text-sm leading-relaxed text-slate-300'>
            {attributes.frameworkDescription ||
              'Eine Systematik zur Bewertung, wie gut Gebäude, Layout, Technik und Prozesse eines Hotelbetriebs auf zunehmende Automatisierung vorbereitet sind.'}
          </p>
        </div>
      </div>
    </section>
  ),
  edit: ({ attributes, setAttributes }) => (
    <StudySection
      {...attributes}
      setAttributes={setAttributes}
      reduceMotion={false}
      revealInitial={false}
      revealVariants={revealVariants}
    />
  ),
});
