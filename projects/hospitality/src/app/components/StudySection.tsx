import { motion, type Variants } from 'framer-motion';
import { pickEditable, useWpMeta, WpEditable } from '@forgewp/react';
import { editable as pageEditable } from '../../../cms/editables/front-page';
import { defaults as studyDefaults } from '../../../cms/editables/sections/study';
import LandingSection from './LandingSection';
import WordReveal from './WordReveal';

type StudyThesis = {
  number: string;
  title: string;
  text: string;
};

export const editable = pickEditable(pageEditable, {
  eyebrow: 'study_eyebrow',
  topics: 'study_topics',
  title: 'study_title',
  lead: 'study_lead',
  description: 'study_description',
  theses: 'study_theses',
  frameworkLabel: 'study_framework_label',
  frameworkTitle: 'study_framework_title',
  frameworkDescription: 'study_framework_description',
});

export type StudySectionProps = {
  reduceMotion: boolean | null;
  revealInitial: false | 'hidden';
  revealVariants: Variants;
  eyebrow?: string;
  topics?: string;
  title?: string;
  lead?: string;
  description?: string;
  theses?: StudyThesis[];
  frameworkLabel?: string;
  frameworkTitle?: string;
  frameworkDescription?: string;
  setAttributes?: (attributes: Partial<StudySectionProps>) => void;
};

export default function StudySection({
  reduceMotion,
  revealInitial,
  revealVariants,
  eyebrow: eyebrowProp,
  topics: topicsProp,
  title: titleProp,
  lead: leadProp,
  description: descriptionProp,
  theses: thesesProp,
  frameworkLabel: frameworkLabelProp,
  frameworkTitle: frameworkTitleProp,
  frameworkDescription: frameworkDescriptionProp,
  setAttributes,
}: StudySectionProps) {
  const eyebrow =
    eyebrowProp ?? useWpMeta('study_eyebrow', studyDefaults.eyebrow);
  const topics = topicsProp ?? useWpMeta('study_topics', studyDefaults.topics);
  const title = titleProp ?? useWpMeta('study_title', studyDefaults.title);
  const lead = leadProp ?? useWpMeta('study_lead', studyDefaults.lead);
  const description =
    descriptionProp ??
    useWpMeta('study_description', studyDefaults.description);
  const theses =
    thesesProp ??
    (useWpMeta('study_theses', studyDefaults.theses) as StudyThesis[]);
  const frameworkLabel =
    frameworkLabelProp ??
    useWpMeta('study_framework_label', studyDefaults.frameworkLabel);
  const frameworkTitle =
    frameworkTitleProp ??
    useWpMeta('study_framework_title', studyDefaults.frameworkTitle);
  const frameworkDescription =
    frameworkDescriptionProp ??
    useWpMeta(
      'study_framework_description',
      studyDefaults.frameworkDescription,
    );

  return (
    <LandingSection
      id='study'
      className='mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-32'
    >
      <div className='grid gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16'>
        <motion.div
          initial={revealInitial}
          whileInView='visible'
          viewport={{ once: true, amount: 0.4 }}
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
          <p className='mt-8 max-w-[240px] text-xs font-semibold uppercase leading-[1.5] tracking-[0.18em] text-slate-400 sm:text-sm'>
            {setAttributes ? (
              <WpEditable
                tagName='span'
                value={topics}
                onChange={(value) => setAttributes({ topics: value })}
              />
            ) : (
              topics
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
          <motion.h2 className='w-full font-heading text-5xl font-black leading-[0.88] tracking-[-0.07em] text-brand sm:text-7xl lg:text-8xl'>
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
          </motion.h2>
          <motion.p className='mt-10 w-full text-xl leading-relaxed text-slate-600'>
            {setAttributes ? (
              <WpEditable
                tagName='span'
                value={lead}
                onChange={(value) => setAttributes({ lead: value })}
              />
            ) : (
              <WordReveal
                text={lead}
                reduceMotion={reduceMotion}
                delay={0.1}
              />
            )}
          </motion.p>
          <motion.p className='mt-5 w-full text-base leading-relaxed text-slate-500'>
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
                delay={0.2}
              />
            )}
          </motion.p>
        </motion.div>
      </div>

      <div className='mt-20 grid gap-x-8 gap-y-0 border-y border-slate-200 lg:grid-cols-2'>
        {theses.map(({ number, title, text }, index) => (
          <motion.article
            key={number}
            className='grid grid-cols-[48px_1fr] gap-5 border-b border-slate-200 py-6 last:border-b-0 lg:odd:border-r lg:odd:pr-8 lg:even:pl-8'
            initial={revealInitial}
            whileInView='visible'
            viewport={{ once: true, amount: 0.2 }}
            variants={revealVariants}
            transition={{ delay: index * 0.05 }}
          >
            <span className='font-mono text-[10px] font-bold tracking-[0.12em] text-accent'>
              {number}
            </span>
            <div>
              <h3 className='font-heading text-xl font-bold tracking-[-0.03em] text-brand'>
                {title}
              </h3>
              <p className='mt-2 max-w-md text-sm leading-relaxed text-slate-500'>
                {text}
              </p>
            </div>
          </motion.article>
        ))}
      </div>

      <motion.div
        className='mt-20 grid gap-8 bg-brand px-6 py-8 text-white sm:px-10 sm:py-10 lg:grid-cols-[0.6fr_1.4fr] lg:items-center lg:px-12'
        initial={revealInitial}
        whileInView='visible'
        viewport={{ once: true, amount: 0.3 }}
        variants={revealVariants}
      >
        <p className='text-[10px] font-bold uppercase tracking-[0.2em] text-accent'>
          {setAttributes ? (
            <WpEditable
              tagName='span'
              value={frameworkLabel}
              onChange={(value) => setAttributes({ frameworkLabel: value })}
            />
          ) : (
            frameworkLabel
          )}
        </p>
        <div>
          <h3 className='font-heading text-3xl font-black leading-none tracking-[-0.05em] sm:text-5xl'>
            {setAttributes ? (
              <WpEditable
                tagName='span'
                value={frameworkTitle}
                onChange={(value) => setAttributes({ frameworkTitle: value })}
              />
            ) : (
              frameworkTitle
            )}
          </h3>
          <p className='mt-4 max-w-2xl text-sm leading-relaxed text-slate-300'>
            {setAttributes ? (
              <WpEditable
                tagName='span'
                value={frameworkDescription}
                onChange={(value) =>
                  setAttributes({ frameworkDescription: value })
                }
              />
            ) : (
              frameworkDescription
            )}
          </p>
        </div>
      </motion.div>
    </LandingSection>
  );
}
