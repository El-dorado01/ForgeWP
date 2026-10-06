import { defineBlock } from '@forgewp/react';
import type { Variants } from 'framer-motion';
import EventsSection from '../app/components/EventsSection';
export { editable } from '../app/components/EventsSection';

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: 'easeOut' },
  },
};

export default defineBlock({
  name: 'events-section',
  title: 'Hospitality Events Section',
  category: 'theme',
  icon: 'calendar-alt',
  description: 'Editable Hospitality 2035 events section.',
  attributes: {},
  editorPreview: ({ attributes }) => (
    <section
      id='events'
      className='border-t border-slate-200 bg-brand px-5 py-20 text-white sm:px-8 lg:px-12 lg:py-32'
    >
      <div className='mx-auto max-w-[1440px]'>
        <div className='grid gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16'>
          <div>
            <p className='text-xs font-bold uppercase tracking-[0.2em] text-accent sm:text-sm'>
              {attributes.eyebrow || '04 / Events 2026'}
            </p>
            <p className='mt-8 max-w-[220px] text-xs font-semibold uppercase leading-[1.5] tracking-[0.18em] text-slate-400 sm:text-sm'>
              {attributes.intro ||
                'Zwei Orte. Eine gemeinsame Frage nach der Zukunft der Hotellerie.'}
            </p>
          </div>
          <div>
            <h2 className='font-heading text-5xl font-black leading-[0.88] tracking-[-0.07em] sm:text-7xl lg:text-8xl'>
              {attributes.title || 'Hospitality 2035 live.'}
            </h2>
            <p className='mt-8 max-w-3xl text-lg leading-relaxed text-slate-300'>
              {attributes.description ||
                'Die Veröffentlichung der Studie wird von zwei Gesprächen für Entscheider aus Hotellerie, Technologie, Immobilienwirtschaft und Finanzierung begleitet.'}
            </p>
          </div>
        </div>
        <div className='mt-20 border-y border-white/20'>
          <article className='grid gap-6 border-b border-white/20 py-8 sm:grid-cols-[0.3fr_0.7fr] sm:gap-10'>
            <div>
              <p className='font-heading text-3xl font-black text-accent sm:text-4xl'>
                Berlin
              </p>
              <p className='mt-2 text-xs font-semibold uppercase text-slate-400'>
                Erste Novemberwoche 2026
              </p>
            </div>
            <div>
              <h3 className='font-heading text-2xl font-bold sm:text-3xl'>
                Hospitality 2035 – Study &amp; Media Launch
              </h3>
              <p className='mt-3 max-w-2xl text-sm leading-relaxed text-slate-300'>
                Präsentation ausgewählter Studienergebnisse und Gespräch über
                Technologie und Automatisierung.
              </p>
              <span className='mt-5 inline-flex border border-accent px-4 py-3 text-[10px] font-bold uppercase'>
                Veranstaltungsdetails
              </span>
            </div>
          </article>
          <article className='grid gap-6 py-8 sm:grid-cols-[0.3fr_0.7fr] sm:gap-10'>
            <div>
              <p className='font-heading text-3xl font-black text-accent sm:text-4xl'>
                Zürich
              </p>
              <p className='mt-2 text-xs font-semibold uppercase text-slate-400'>
                Zweite Novemberwoche 2026
              </p>
            </div>
            <div>
              <h3 className='font-heading text-2xl font-bold sm:text-3xl'>
                Hospitality 2035 – Executive Event Switzerland
              </h3>
              <p className='mt-3 max-w-2xl text-sm leading-relaxed text-slate-300'>
                Executive-Diskussion zu den Konsequenzen für die Schweizer
                Hotellerie.
              </p>
              <span className='mt-5 inline-flex border border-accent px-4 py-3 text-[10px] font-bold uppercase'>
                Veranstaltungsdetails
              </span>
            </div>
          </article>
        </div>
      </div>
    </section>
  ),
  edit: ({ attributes, setAttributes }) => (
    <EventsSection
      {...attributes}
      setAttributes={setAttributes}
      reduceMotion={false}
      revealInitial={false}
      revealVariants={revealVariants}
    />
  ),
});
