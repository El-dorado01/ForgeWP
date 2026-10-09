import { motion, type Variants } from 'framer-motion';
import {
  pickEditable,
  useWpMeta,
  WpEditable,
  WpImage,
  WpLink,
} from '@forgewp/react';
import { editable as pageEditable } from '../../../cms/editables/front-page';
import { defaults as aboutDefaults } from '../../../cms/editables/sections/about';
import LandingSection from './LandingSection';
import WordReveal from './WordReveal';

export const editable = pickEditable(pageEditable, {
  eyebrow: 'about_eyebrow',
  intro: 'about_intro',
  title: 'about_title',
  description: 'about_description',
  companyDescription: 'about_company_description',
  companyLogo: 'about_company_logo',
  cityLabel: 'about_city_label',
  foundedLabel: 'about_founded_label',
  authorLabel: 'about_author_label',
  authorName: 'about_author_name',
  authorRole: 'about_author_role',
  authorDescription: 'about_author_description',
  contactLabel: 'about_contact_label',
  contactUrl: 'about_contact_url',
});

export type AboutSectionProps = {
  reduceMotion: boolean | null;
  revealInitial: false | 'hidden';
  revealVariants: Variants;
  eyebrow?: string;
  intro?: string;
  title?: string;
  description?: string;
  companyDescription?: string;
  companyLogo?: string | number | { id?: number; url?: string; alt?: string };
  cityLabel?: string;
  foundedLabel?: string;
  authorLabel?: string;
  authorName?: string;
  authorRole?: string;
  authorDescription?: string;
  contactLabel?: string;
  contactUrl?: string;
  setAttributes?: (attributes: Partial<AboutSectionProps>) => void;
};

export default function AboutSection({
  reduceMotion,
  revealInitial,
  revealVariants,
  eyebrow: eyebrowProp,
  intro: introProp,
  title: titleProp,
  description: descriptionProp,
  companyDescription: companyDescriptionProp,
  companyLogo: companyLogoProp,
  cityLabel: cityLabelProp,
  foundedLabel: foundedLabelProp,
  authorLabel: authorLabelProp,
  authorName: authorNameProp,
  authorRole: authorRoleProp,
  authorDescription: authorDescriptionProp,
  contactLabel: contactLabelProp,
  contactUrl: contactUrlProp,
  setAttributes,
}: AboutSectionProps) {
  const eyebrow =
    eyebrowProp ?? useWpMeta('about_eyebrow', aboutDefaults.eyebrow);
  const intro = introProp ?? useWpMeta('about_intro', aboutDefaults.intro);
  const title = titleProp ?? useWpMeta('about_title', aboutDefaults.title);
  const description =
    descriptionProp ??
    useWpMeta('about_description', aboutDefaults.description);
  const companyDescription =
    companyDescriptionProp ??
    useWpMeta('about_company_description', aboutDefaults.companyDescription);
  const companyLogo =
    companyLogoProp ??
    useWpMeta('about_company_logo', aboutDefaults.companyLogo);
  const cityLabel =
    cityLabelProp ?? useWpMeta('about_city_label', aboutDefaults.cityLabel);
  const foundedLabel =
    foundedLabelProp ??
    useWpMeta('about_founded_label', aboutDefaults.foundedLabel);
  const authorLabel =
    authorLabelProp ??
    useWpMeta('about_author_label', aboutDefaults.authorLabel);
  const authorName =
    authorNameProp ?? useWpMeta('about_author_name', aboutDefaults.authorName);
  const authorRole =
    authorRoleProp ?? useWpMeta('about_author_role', aboutDefaults.authorRole);
  const authorDescription =
    authorDescriptionProp ??
    useWpMeta('about_author_description', aboutDefaults.authorDescription);
  const contactLabel =
    contactLabelProp ??
    useWpMeta('about_contact_label', aboutDefaults.contactLabel);
  const contactUrl =
    contactUrlProp ?? useWpMeta('about_contact_url', aboutDefaults.contactUrl);

  return (
    <LandingSection
      id='about'
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

        <div className='mt-20 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]'>
          <motion.div
            className='flex flex-col justify-between bg-brand p-6 text-white sm:p-10 lg:p-12'
            initial={revealInitial}
            whileInView='visible'
            viewport={{ once: true, amount: 0.25 }}
            variants={revealVariants}
          >
            <div>
              <WpImage
                src={
                  companyLogo ||
                  '/assets/client-assets/dicon-brand/dicon-logo.jpg'
                }
                alt='DICON Marketing- und Beratungsgesellschaft mbH'
                className='h-auto w-[min(75vw,360px)] bg-white p-3'
              />
              <p className='mt-10 max-w-2xl text-lg leading-relaxed text-slate-300'>
                {setAttributes ? (
                  <WpEditable
                    tagName='span'
                    value={companyDescription}
                    onChange={(value) =>
                      setAttributes({ companyDescription: value })
                    }
                  />
                ) : (
                  companyDescription
                )}
              </p>
            </div>
            <div className='mt-12 grid gap-3 border-t border-white/20 pt-5 text-xs uppercase tracking-[0.12em] text-slate-400 sm:grid-cols-2'>
              <p>
                {setAttributes ? (
                  <WpEditable
                    tagName='span'
                    value={cityLabel}
                    onChange={(value) => setAttributes({ cityLabel: value })}
                  />
                ) : (
                  cityLabel
                )}
              </p>
              <p className='sm:text-right'>
                {setAttributes ? (
                  <WpEditable
                    tagName='span'
                    value={foundedLabel}
                    onChange={(value) => setAttributes({ foundedLabel: value })}
                  />
                ) : (
                  foundedLabel
                )}
              </p>
            </div>
          </motion.div>

          <motion.div
            className='border border-slate-200 bg-[#f8fafc] p-6 sm:p-10 lg:p-12'
            initial={revealInitial}
            whileInView='visible'
            viewport={{ once: true, amount: 0.25 }}
            variants={revealVariants}
            transition={{ delay: 0.1 }}
          >
            <p className='text-[10px] font-bold uppercase tracking-[0.18em] text-accent'>
              {setAttributes ? (
                <WpEditable
                  tagName='span'
                  value={authorLabel}
                  onChange={(value) => setAttributes({ authorLabel: value })}
                />
              ) : (
                authorLabel
              )}
            </p>
            <h3 className='mt-8 font-heading text-4xl font-black leading-none tracking-[-0.06em] text-brand sm:text-5xl'>
              {setAttributes ? (
                <WpEditable
                  tagName='span'
                  value={authorName}
                  onChange={(value) => setAttributes({ authorName: value })}
                />
              ) : (
                authorName
              )}
            </h3>
            <p className='mt-2 text-sm font-semibold uppercase tracking-[0.12em] text-slate-400'>
              {setAttributes ? (
                <WpEditable
                  tagName='span'
                  value={authorRole}
                  onChange={(value) => setAttributes({ authorRole: value })}
                />
              ) : (
                authorRole
              )}
            </p>
            <p className='mt-8 text-base leading-relaxed text-slate-600'>
              {setAttributes ? (
                <WpEditable
                  tagName='span'
                  value={authorDescription}
                  onChange={(value) =>
                    setAttributes({ authorDescription: value })
                  }
                />
              ) : (
                authorDescription
              )}
            </p>
            <WpLink
              href={contactUrl || 'mailto:contact@dicon-beratung.de'}
              className='mt-8 inline-flex border-b border-accent pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-brand transition-colors hover:text-accent'
            >
              <WpEditable
                tagName='span'
                value={contactLabel}
                onChange={(value) => setAttributes?.({ contactLabel: value })}
              />
            </WpLink>
          </motion.div>
        </div>
      </div>
    </LandingSection>
  );
}
