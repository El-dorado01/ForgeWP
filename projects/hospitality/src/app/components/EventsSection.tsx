import {
  pickEditable,
  useWpPageLink,
  useWpMeta,
  WpEditable,
  WpLink,
} from '@forgewp/react';
import { ArrowRight } from 'lucide-react';
import { motion, type Variants } from 'framer-motion';
import { editable as pageEditable } from '../../../cms/editables/front-page';
import { defaults as eventDefaults } from '../../../cms/editables/sections/events';
import LandingSection from './LandingSection';
import WordReveal from './WordReveal';

export const editable = pickEditable(pageEditable, {
  eyebrow: 'events_eyebrow',
  intro: 'events_intro',
  title: 'events_title',
  description: 'events_description',
});

export type EventsSectionProps = {
  reduceMotion: boolean | null;
  revealInitial: false | 'hidden';
  revealVariants: Variants;
  eyebrow?: string;
  intro?: string;
  title?: string;
  description?: string;
  setAttributes?: (attributes: Partial<EventsSectionProps>) => void;
};

export default function EventsSection({
  reduceMotion,
  revealInitial,
  revealVariants,
  eyebrow: eyebrowProp,
  intro: introProp,
  title: titleProp,
  description: descriptionProp,
  setAttributes,
}: EventsSectionProps) {
  const eyebrow =
    eyebrowProp ?? useWpMeta('events_eyebrow', eventDefaults.eyebrow);
  const intro = introProp ?? useWpMeta('events_intro', eventDefaults.intro);
  const title = titleProp ?? useWpMeta('events_title', eventDefaults.title);
  const description =
    descriptionProp ??
    useWpMeta('events_description', eventDefaults.description);
  const eventsHref = useWpPageLink('events-page', '/events');

  return (
    <LandingSection
      id='events'
      className='border-t border-slate-200 bg-brand px-5 py-20 text-white sm:px-8 lg:px-12 lg:py-32'
    >
      <div className='mx-auto max-w-[1440px]'>
        <div className='grid gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16'>
          <motion.div
            initial={revealInitial}
            whileInView='visible'
            viewport={{ once: true, amount: 0.35 }}
            variants={revealVariants}
          >
            <p className='text-xs font-bold uppercase tracking-[0.2em] text-accent sm:text-sm'>
              {setAttributes ? (
                <WpEditable
                  tagName='span'
                  value={eyebrow}
                  onChange={(value) => setAttributes({ eyebrow: value })}
                />
              ) : (
                eyebrow
              )}
            </p>
            <p className='mt-8 max-w-[220px] text-xs font-semibold uppercase leading-[1.5] tracking-[0.18em] text-slate-400 sm:text-sm'>
              {setAttributes ? (
                <WpEditable
                  tagName='span'
                  value={intro}
                  onChange={(value) => setAttributes({ intro: value })}
                />
              ) : (
                intro
              )}
            </p>
          </motion.div>
          <motion.div
            initial={revealInitial}
            whileInView='visible'
            viewport={{ once: true, amount: 0.25 }}
            variants={revealVariants}
            transition={{ delay: 0.12 }}
          >
            <h2 className='w-full font-heading text-5xl font-black leading-[0.88] tracking-[-0.07em] sm:text-7xl lg:text-8xl'>
              {setAttributes ? (
                <WpEditable
                  tagName='span'
                  value={title}
                  onChange={(value) => setAttributes({ title: value })}
                />
              ) : (
                <WordReveal
                  text={title}
                  reduceMotion={reduceMotion}
                />
              )}
            </h2>
            <p className='mt-8 max-w-3xl text-lg leading-relaxed text-slate-300'>
              {setAttributes ? (
                <WpEditable
                  tagName='span'
                  value={description}
                  onChange={(value) => setAttributes({ description: value })}
                />
              ) : (
                <WordReveal
                  text={description}
                  reduceMotion={reduceMotion}
                  delay={0.12}
                />
              )}
            </p>
          </motion.div>
        </div>

        <div className='mt-20 border-t border-white/20 pt-8'>
          <WpLink
            href={eventsHref}
            className='inline-flex min-h-14 items-center justify-center gap-3 bg-accent px-7 py-4 text-xs font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-white hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white'
          >
            Alle Veranstaltungen
            <ArrowRight
              size={16}
              aria-hidden='true'
            />
          </WpLink>
        </div>
      </div>
    </LandingSection>
  );
}
