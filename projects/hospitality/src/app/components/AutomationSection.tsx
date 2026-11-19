import { motion, type Variants } from 'framer-motion';
import { pickEditable, useWpMeta, WpEditable, WpImage } from '@forgewp/react';
import { editable as pageEditable } from '../../../cms/editables/front-page';
import { defaults as automationDefaults } from '../../../cms/editables/sections/automation';
import LandingSection from './LandingSection';
import WordReveal from './WordReveal';

type AutomationDetail = { number: string; title: string; text: string };

export const editable = pickEditable(pageEditable, {
  eyebrow: 'automation_eyebrow',
  intro: 'automation_intro',
  title: 'automation_title',
  description: 'automation_description',
  imageAlt: 'automation_image_alt',
  primaryImage: 'automation_primary_image',
  detailTitle: 'automation_detail_title',
  detailDescription: 'automation_detail_description',
  details: 'automation_details',
  secondImageAlt: 'automation_second_image_alt',
  secondaryImage: 'automation_secondary_image',
});

export type AutomationSectionProps = {
  reduceMotion: boolean | null;
  revealInitial: false | 'hidden';
  revealVariants: Variants;
  eyebrow?: string;
  intro?: string;
  title?: string;
  description?: string;
  imageAlt?: string;
  primaryImage?: string | number | { id?: number; url?: string; alt?: string };
  detailTitle?: string;
  detailDescription?: string;
  details?: AutomationDetail[];
  secondImageAlt?: string;
  secondaryImage?: string | number | { id?: number; url?: string; alt?: string };
  setAttributes?: (attributes: Partial<AutomationSectionProps>) => void;
};

export default function AutomationSection({
  reduceMotion,
  revealInitial,
  revealVariants,
  eyebrow: eyebrowProp,
  intro: introProp,
  title: titleProp,
  description: descriptionProp,
  imageAlt: imageAltProp,
  primaryImage: primaryImageProp,
  detailTitle: detailTitleProp,
  detailDescription: detailDescriptionProp,
  details: detailsProp,
  secondImageAlt: secondImageAltProp,
  secondaryImage: secondaryImageProp,
  setAttributes,
}: AutomationSectionProps) {
  const metaEyebrow = useWpMeta(
    'automation_eyebrow',
    automationDefaults.eyebrow,
  );
  const metaIntro = useWpMeta('automation_intro', automationDefaults.intro);
  const metaTitle = useWpMeta('automation_title', automationDefaults.title);
  const metaDescription = useWpMeta(
    'automation_description',
    automationDefaults.description,
  );
  const metaImageAlt = useWpMeta(
    'automation_image_alt',
    automationDefaults.imageAlt,
  );
  const metaPrimaryImage = useWpMeta(
    'automation_primary_image',
    automationDefaults.primaryImage,
  );
  const metaDetailTitle = useWpMeta(
    'automation_detail_title',
    automationDefaults.detailTitle,
  );
  const metaDetailDescription = useWpMeta(
    'automation_detail_description',
    automationDefaults.detailDescription,
  );
  const metaDetails = useWpMeta(
    'automation_details',
    automationDefaults.details,
  ) as AutomationDetail[];
  const metaSecondImageAlt = useWpMeta(
    'automation_second_image_alt',
    automationDefaults.secondImageAlt,
  );
  const metaSecondaryImage = useWpMeta(
    'automation_secondary_image',
    automationDefaults.secondaryImage,
  );
  const eyebrow = eyebrowProp ?? metaEyebrow;
  const intro = introProp ?? metaIntro;
  const title = titleProp ?? metaTitle;
  const description = descriptionProp ?? metaDescription;
  const imageAlt = imageAltProp ?? metaImageAlt;
  const primaryImage = primaryImageProp ?? metaPrimaryImage;
  const detailTitle = detailTitleProp ?? metaDetailTitle;
  const detailDescription = detailDescriptionProp ?? metaDetailDescription;
  const details = detailsProp ?? metaDetails;
  const secondImageAlt = secondImageAltProp ?? metaSecondImageAlt;
  const secondaryImage = secondaryImageProp ?? metaSecondaryImage;
  const updateDetail = (
    index: number,
    field: keyof AutomationDetail,
    value: string,
  ) =>
    setAttributes?.({
      details: details.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    });

  return (
    <LandingSection
      id='automation'
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

        <motion.figure
          className='mt-16'
          initial={reduceMotion ? false : { opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <WpImage
            src={
              primaryImage ||
              '/assets/editorial-images/robotic-hotel-lobby-01.png'
            }
            alt={imageAlt}
            className='block aspect-[3/1] w-full object-cover'
          />
          <figcaption className='mt-3 flex flex-wrap justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400'>
            <span>Editorial concept / Hotel lobby of the future</span>
            <span>Hospitality 2035</span>
          </figcaption>
        </motion.figure>

        <div className='mt-20 grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-24'>
          <motion.div
            initial={revealInitial}
            whileInView='visible'
            viewport={{ once: true, amount: 0.25 }}
            variants={revealVariants}
          >
            <h3 className='font-heading text-4xl font-black leading-[0.92] tracking-[-0.06em] text-brand sm:text-6xl'>
              {setAttributes ? (
                <WpEditable
                  tagName='span'
                  value={detailTitle}
                  onChange={(value) => setAttributes({ detailTitle: value })}
                />
              ) : (
                <WordReveal
                  text={detailTitle}
                  reduceMotion={reduceMotion}
                />
              )}
            </h3>
            <p className='mt-8 max-w-2xl text-base leading-relaxed text-slate-600'>
              {setAttributes ? (
                <WpEditable
                  tagName='span'
                  value={detailDescription}
                  onChange={(value) =>
                    setAttributes({ detailDescription: value })
                  }
                />
              ) : (
                <WordReveal
                  text={detailDescription}
                  reduceMotion={reduceMotion}
                  delay={0.12}
                />
              )}
            </p>
          </motion.div>

          <motion.div
            className='border-t border-slate-200'
            initial={revealInitial}
            whileInView='visible'
            viewport={{ once: true, amount: 0.25 }}
            variants={revealVariants}
          >
            {details.map(({ number, title, text }, index) => (
              <div
                key={number}
                className='grid grid-cols-[48px_1fr] gap-4 border-b border-slate-200 py-5'
              >
                <span className='font-mono text-xs font-bold tracking-[0.12em] text-accent'>
                  {number}
                </span>
                <div>
                  <h4 className='font-heading text-xl font-bold text-brand'>
                    {setAttributes ? (
                      <WpEditable
                        tagName='span'
                        value={title}
                        onChange={(value) =>
                          updateDetail(index, 'title', value)
                        }
                      />
                    ) : (
                      title
                    )}
                  </h4>
                  <p className='mt-2 text-sm leading-relaxed text-slate-500'>
                    {setAttributes ? (
                      <WpEditable
                        tagName='span'
                        value={text}
                        onChange={(value) => updateDetail(index, 'text', value)}
                      />
                    ) : (
                      text
                    )}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.figure
          className='mt-20 ml-auto max-w-5xl'
          initial={reduceMotion ? false : { opacity: 0, x: 32 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <WpImage
            src={
              secondaryImage ||
              '/assets/editorial-images/robotic-hotel-lobby-02.png'
            }
            alt={secondImageAlt}
            className='block aspect-[3/1] w-full object-cover'
          />
        </motion.figure>
      </div>
    </LandingSection>
  );
}
