import { ArrowDown, ArrowLeft, CalendarDays, MapPin } from 'lucide-react';
import {
  WpEditable,
  useWpExcerpt,
  useWpFeaturedImage,
  useWpTitle,
} from '@forgewp/react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';

const eventRevealVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: 'easeOut' },
  },
};

type SetAttributes = (attributes: Record<string, string>) => void;

type EventHeroSectionProps = {
  cityLabel?: string;
  setAttributes?: SetAttributes;
};

export function EventHeroSection({
  cityLabel = 'Hospitality 2035',
  setAttributes,
}: EventHeroSectionProps) {
  const reduceMotion = useReducedMotion();
  const title = useWpTitle();
  const excerpt = useWpExcerpt();
  const image = useWpFeaturedImage() || '/assets/hospitality-cover.png';

  return (
    <motion.header
      className='bg-brand text-white lg:col-span-2'
      initial={reduceMotion || setAttributes ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
    >
      <div className='mx-auto grid max-w-360 lg:min-h-147.5 lg:grid-cols-[0.9fr_1.1fr]'>
        <div className='flex flex-col items-start justify-center px-5 py-12 sm:px-8 sm:py-16 lg:px-14 lg:py-20'>
          <a
            href='/events'
            className='inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-300 transition-colors hover:text-white'
          >
            <ArrowLeft
              size={15}
              aria-hidden='true'
            />{' '}
            Alle Veranstaltungen
          </a>
          <p className='mt-10 text-xs font-bold uppercase tracking-[0.18em] text-accent'>
            <WpEditable
              tagName='span'
              value={cityLabel}
              onChange={(value) => setAttributes?.({ cityLabel: value })}
            />
          </p>
          <h1 className='mt-5 max-w-2xl font-heading text-4xl font-black leading-[1.02] sm:text-5xl lg:text-6xl'>
            {title}
          </h1>
          <p className='mt-6 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg'>
            {excerpt}
          </p>
          <a
            href='#event-program'
            className='mt-8 inline-flex items-center gap-3 border-b border-accent pb-2 text-sm font-semibold text-white transition-colors hover:text-accent'
          >
            Programm & Informationen{' '}
            <ArrowDown
              size={16}
              aria-hidden='true'
            />
          </a>
        </div>
        <div className='relative min-h-75 sm:min-h-105 lg:min-h-full'>
          <img
            src={image}
            alt={title}
            className='absolute inset-0 h-full w-full object-cover'
          />
          <div className='absolute inset-0 bg-linear-to-t from-brand/30 to-transparent' />
          <p className='absolute bottom-5 right-5 text-xs font-semibold uppercase tracking-[0.16em] text-white sm:bottom-8 sm:right-8'>
            Hospitality 2035 / {cityLabel}
          </p>
        </div>
      </div>
    </motion.header>
  );
}

type EventOverviewSectionProps = {
  timing?: string;
  location?: string;
  participants?: string;
  setAttributes?: SetAttributes;
};

export function EventOverviewSection({
  timing = 'Termin wird bekannt gegeben',
  location = 'Veranstaltungsort folgt',
  participants = 'Weitere Angaben folgen',
  setAttributes,
}: EventOverviewSectionProps) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.section
      className='min-w-0'
      initial={reduceMotion || setAttributes ? false : 'hidden'}
      whileInView='visible'
      viewport={{ once: true, amount: 0.2 }}
      variants={eventRevealVariants}
    >
      <aside>
        <p className='text-xs font-bold uppercase tracking-[0.18em] text-accent'>
          Veranstaltung
        </p>
        <h2 className='mt-3 font-heading text-2xl font-bold text-brand'>
          Auf einen Blick
        </h2>
        <dl className='mt-7 border-t border-brand/20'>
          <div className='border-b border-brand/20 py-5'>
            <dt className='flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-500'>
              <CalendarDays
                size={15}
                aria-hidden='true'
              />{' '}
              Termin
            </dt>
            <dd className='mt-2 text-sm leading-relaxed text-brand'>
              <WpEditable
                tagName='span'
                value={timing}
                onChange={(value) => setAttributes?.({ timing: value })}
              />
            </dd>
          </div>
          <div className='border-b border-brand/20 py-5'>
            <dt className='flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-500'>
              <MapPin
                size={15}
                aria-hidden='true'
              />{' '}
              Veranstaltungsort
            </dt>
            <dd className='mt-2 text-sm leading-relaxed text-brand'>
              <WpEditable
                tagName='span'
                value={location}
                onChange={(value) => setAttributes?.({ location: value })}
              />
            </dd>
          </div>
          <div className='border-b border-brand/20 py-5'>
            <dt className='text-xs font-bold uppercase tracking-[0.08em] text-slate-500'>
              Panel & Gäste
            </dt>
            <dd className='mt-2 whitespace-pre-line text-sm leading-relaxed text-brand'>
              <WpEditable
                tagName='span'
                value={participants}
                onChange={(value) => setAttributes?.({ participants: value })}
              />
            </dd>
          </div>
        </dl>
      </aside>
    </motion.section>
  );
}

type EventProgramSectionProps = {
  program?: string;
  setAttributes?: SetAttributes;
};

export function EventProgramSection({
  program = 'Weitere Programminformationen folgen.',
  setAttributes,
}: EventProgramSectionProps) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.section
      id='event-program'
      className='min-w-0 scroll-mt-8'
      initial={reduceMotion || setAttributes ? false : 'hidden'}
      whileInView='visible'
      viewport={{ once: true, amount: 0.15 }}
      variants={eventRevealVariants}
    >
      <div className='border-t border-brand/20 pt-8 lg:border-t-0 lg:pt-0'>
        <p className='text-xs font-bold uppercase tracking-[0.18em] text-accent'>
          Hospitality 2035 / Programm
        </p>
        <h2 className='mt-3 font-heading text-3xl font-bold text-brand sm:text-4xl'>
          Programm
        </h2>
        <p className='mt-6 max-w-4xl whitespace-pre-line text-base leading-[1.8] text-slate-600'>
          <WpEditable
            tagName='span'
            value={program}
            onChange={(value) => setAttributes?.({ program: value })}
          />
        </p>
      </div>
    </motion.section>
  );
}

export type {
  EventHeroSectionProps,
  EventOverviewSectionProps,
  EventProgramSectionProps,
};
