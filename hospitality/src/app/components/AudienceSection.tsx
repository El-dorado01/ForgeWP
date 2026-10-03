import { motion, type Variants } from 'framer-motion';
import { pickEditable, useWpMeta, WpEditable } from '@forgewp/react';
import { editable as pageEditable } from '../../../cms/editables/front-page';
import { defaults as audienceDefaults } from '../../../cms/editables/sections/audiences';
import LandingSection from './LandingSection';
import WordReveal from './WordReveal';

type AudienceGroup = { number: string; title: string; text: string };

export const editable = pickEditable(pageEditable, {
  eyebrow: 'audiences_eyebrow',
  intro: 'audiences_intro',
  title: 'audiences_title',
  description: 'audiences_description',
  audiences: 'audiences_audiences',
});

export type AudienceSectionProps = {
  reduceMotion: boolean | null;
  revealInitial: false | 'hidden';
  revealVariants: Variants;
  eyebrow?: string;
  intro?: string;
  title?: string;
  description?: string;
  audiences?: AudienceGroup[];
  setAttributes?: (attributes: Partial<AudienceSectionProps>) => void;
};

export default function AudienceSection({
  reduceMotion,
  revealInitial,
  revealVariants,
  eyebrow: eyebrowProp,
  intro: introProp,
  title: titleProp,
  description: descriptionProp,
  audiences: audiencesProp,
  setAttributes,
}: AudienceSectionProps) {
  const eyebrow =
    eyebrowProp ?? useWpMeta('audiences_eyebrow', audienceDefaults.eyebrow);
  const intro =
    introProp ?? useWpMeta('audiences_intro', audienceDefaults.intro);
  const title =
    titleProp ?? useWpMeta('audiences_title', audienceDefaults.title);
  const description =
    descriptionProp ??
    useWpMeta('audiences_description', audienceDefaults.description);
  const audiences =
    audiencesProp ??
    (useWpMeta(
      'audiences_audiences',
      audienceDefaults.audiences,
    ) as AudienceGroup[]);

  return (
    <LandingSection
      id='audiences'
      className='border-t border-slate-200 bg-white px-5 py-20 sm:px-8 lg:px-12 lg:py-32'
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
            <h2 className='w-full font-heading text-5xl font-black leading-[0.88] tracking-[-0.07em] text-brand sm:text-7xl lg:text-8xl'>
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
            <p className='mt-8 max-w-3xl text-lg leading-relaxed text-slate-600'>
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

        <div className='mt-20 border-y border-slate-200'>
          {audiences.map(({ number, title, text }, index) => (
            <motion.article
              key={number}
              className='grid gap-5 border-b border-slate-200 py-8 last:border-b-0 sm:grid-cols-[72px_0.9fr_1.1fr] sm:items-start sm:gap-8'
              initial={revealInitial}
              whileInView='visible'
              viewport={{ once: true, amount: 0.25 }}
              variants={revealVariants}
              transition={{ delay: index * 0.07 }}
            >
              <span className='font-mono text-xs font-bold tracking-[0.12em] text-accent'>
                {number}
              </span>
              <h3 className='font-heading text-2xl font-bold leading-tight tracking-[-0.04em] text-brand sm:text-3xl'>
                {title}
              </h3>
              <p className='max-w-xl text-base leading-relaxed text-slate-500'>
                {text}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </LandingSection>
  );
}
