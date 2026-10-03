import { pickEditable, useWpMeta, WpEditable } from '@forgewp/react';
import { motion, type Variants } from 'framer-motion';
import { editable as pageEditable } from '../../../cms/editables/front-page';
import { defaults as partnerDefaults } from '../../../cms/editables/sections/partners';
import LandingSection from './LandingSection';

type NameItem = { name: string };
type PartnerItem = { name: string; role: string };

const associationLogos: Record<string, { src: string; alt: string }> = {
  hotelleriesuisse: {
    src: '/assets/client-assets/partner-assets/suisse-sharp-3x-removebg-preview-section07.png',
    alt: 'HotellerieSuisse logo',
  },
  'knx deutschland': {
    src: '/assets/client-assets/partner-assets/knx-sharp-3x-removebg-preview-section07.png',
    alt: 'KNX Deutschland logo',
  },
};

const strategicLogos: Record<string, { src: string; alt: string }> = {
  accor: {
    src: '/assets/client-assets/partner-assets/accor-sharp-3x-removebg-preview-section07.png',
    alt: 'Accor logo',
  },
  'oracle hospitality': {
    src: '/assets/client-assets/partner-assets/oracle-sharp-3x-removebg-preview-section07.png',
    alt: 'Oracle Hospitality logo',
  },
};

export const editable = pickEditable(pageEditable, {
  eyebrow: 'partners_eyebrow',
  intro: 'partners_intro',
  title: 'partners_title',
  description: 'partners_description',
  associationLabel: 'partners_association_label',
  associationNote: 'partners_association_note',
  associations: 'partners_associations',
  strategicLabel: 'partners_strategic_label',
  strategicPartners: 'partners_strategic_partners',
  innovationLabel: 'partners_innovation_label',
  innovationPartners: 'partners_innovation_partners',
  mediaLabel: 'partners_media_label',
  mediaName: 'partners_media_name',
  mediaDescription: 'partners_media_description',
});

export type PartnersSectionProps = {
  reduceMotion: boolean | null;
  revealInitial: false | 'hidden';
  revealVariants: Variants;
  eyebrow?: string;
  intro?: string;
  title?: string;
  description?: string;
  associationLabel?: string;
  associationNote?: string;
  associations?: NameItem[];
  strategicLabel?: string;
  strategicPartners?: PartnerItem[];
  innovationLabel?: string;
  innovationPartners?: NameItem[];
  mediaLabel?: string;
  mediaName?: string;
  mediaDescription?: string;
  setAttributes?: (attributes: Partial<PartnersSectionProps>) => void;
};

export default function PartnersSection({
  revealInitial,
  revealVariants,
  eyebrow: eyebrowProp,
  intro: introProp,
  title: titleProp,
  description: descriptionProp,
  associationLabel: associationLabelProp,
  associationNote: associationNoteProp,
  associations: associationsProp,
  strategicLabel: strategicLabelProp,
  strategicPartners: strategicPartnersProp,
  innovationLabel: innovationLabelProp,
  innovationPartners: innovationPartnersProp,
  mediaLabel: mediaLabelProp,
  mediaName: mediaNameProp,
  mediaDescription: mediaDescriptionProp,
  setAttributes,
}: PartnersSectionProps) {
  const eyebrow =
    eyebrowProp ?? useWpMeta('partners_eyebrow', partnerDefaults.eyebrow);
  const intro = introProp ?? useWpMeta('partners_intro', partnerDefaults.intro);
  const title = titleProp ?? useWpMeta('partners_title', partnerDefaults.title);
  const description =
    descriptionProp ??
    useWpMeta('partners_description', partnerDefaults.description);
  const associationLabel =
    associationLabelProp ??
    useWpMeta('partners_association_label', partnerDefaults.associationLabel);
  const associationNote =
    associationNoteProp ??
    useWpMeta('partners_association_note', partnerDefaults.associationNote);
  const associations =
    associationsProp ??
    (useWpMeta(
      'partners_associations',
      partnerDefaults.associations,
    ) as NameItem[]);
  const strategicLabel =
    strategicLabelProp ??
    useWpMeta('partners_strategic_label', partnerDefaults.strategicLabel);
  const strategicPartners =
    strategicPartnersProp ??
    (useWpMeta(
      'partners_strategic_partners',
      partnerDefaults.strategicPartners,
    ) as PartnerItem[]);
  const innovationLabel =
    innovationLabelProp ??
    useWpMeta('partners_innovation_label', partnerDefaults.innovationLabel);
  const innovationPartners =
    innovationPartnersProp ??
    (useWpMeta(
      'partners_innovation_partners',
      partnerDefaults.innovationPartners,
    ) as NameItem[]);
  const mediaLabel =
    mediaLabelProp ??
    useWpMeta('partners_media_label', partnerDefaults.mediaLabel);
  const mediaName =
    mediaNameProp ??
    useWpMeta('partners_media_name', partnerDefaults.mediaName);
  const mediaDescription =
    mediaDescriptionProp ??
    useWpMeta('partners_media_description', partnerDefaults.mediaDescription);
  const update = (field: string, value: string) =>
    setAttributes?.({ [field]: value } as Partial<PartnersSectionProps>);

  return (
    <LandingSection
      id='partners'
      className='border-t border-slate-200 bg-[#f8fafc] px-5 py-20 sm:px-8 lg:px-12 lg:py-32'
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
                  onChange={(v) => update('eyebrow', v)}
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
                  onChange={(v) => update('intro', v)}
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
                  onChange={(v) => update('title', v)}
                />
              ) : (
                title
              )}
            </h2>
            <p className='mt-8 max-w-3xl text-lg leading-relaxed text-slate-600'>
              {setAttributes ? (
                <WpEditable
                  tagName='span'
                  value={description}
                  onChange={(v) => update('description', v)}
                />
              ) : (
                description
              )}
            </p>
          </motion.div>
        </div>
        <div className='mt-20 grid gap-5 lg:grid-cols-2'>
          <article className='border border-slate-200 bg-white p-6 sm:p-8 lg:p-10'>
            <p className='text-[10px] font-bold uppercase tracking-[0.18em] text-accent'>
              {setAttributes ? (
                <WpEditable
                  tagName='span'
                  value={associationLabel}
                  onChange={(v) => update('associationLabel', v)}
                />
              ) : (
                associationLabel
              )}
            </p>
            <div className='mt-10 grid gap-5 sm:grid-cols-3 sm:items-center'>
              <div className='flex min-h-36 flex-col items-center justify-center bg-white p-4'>
                <img
                  src='/assets/client-assets/partner-assets/iha-logo.png'
                  alt='Hotelverband Deutschland IHA logo'
                  className='h-20 w-full object-contain'
                />
                <span className='mt-2 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500'>
                  IHA
                </span>
              </div>
              {associations.map((partner, index) =>
                (() => {
                  const logo = associationLogos[partner.name.toLowerCase()];
                  return (
                    <div
                      key={`${partner.name}-${index}`}
                      className='flex min-h-36 flex-col items-center justify-center bg-white p-4'
                    >
                      {logo && (
                        <img
                          src={logo.src}
                          alt={logo.alt}
                          className='h-20 w-full object-contain'
                        />
                      )}
                      <span className='mt-2 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500'>
                        {setAttributes ? (
                          <WpEditable
                            tagName='span'
                            value={partner.name}
                            onChange={(v) =>
                              setAttributes({
                                associations: associations.map((item, i) =>
                                  i === index ? { name: v } : item,
                                ),
                              })
                            }
                          />
                        ) : (
                          partner.name
                        )}
                      </span>
                    </div>
                  );
                })(),
              )}
            </div>
            <p className='mt-6 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400'>
              {setAttributes ? (
                <WpEditable
                  tagName='span'
                  value={associationNote}
                  onChange={(v) => update('associationNote', v)}
                />
              ) : (
                associationNote
              )}
            </p>
          </article>
          <article className='border border-slate-200 bg-brand p-6 text-white sm:p-8 lg:p-10'>
            <p className='text-[10px] font-bold uppercase tracking-[0.18em] text-accent'>
              {setAttributes ? (
                <WpEditable
                  tagName='span'
                  value={strategicLabel}
                  onChange={(v) => update('strategicLabel', v)}
                />
              ) : (
                strategicLabel
              )}
            </p>
            <div className='mt-10 grid gap-0 divide-y divide-white/20'>
              {strategicPartners.map((partner, index) => {
                const logo = strategicLogos[partner.name.toLowerCase()];

                return (
                  <div
                    key={`${partner.name}-${index}`}
                    className='flex flex-col gap-3 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6'
                  >
                    <div className='flex min-w-0 items-center gap-4'>
                      {logo && (
                        <div className='flex h-14 w-28 shrink-0 items-center justify-center bg-white px-3 py-2'>
                          <img
                            src={logo.src}
                            alt={logo.alt}
                            className='max-h-full max-w-full object-contain'
                          />
                        </div>
                      )}
                      <span className='font-heading text-xl font-bold sm:text-2xl'>
                        {setAttributes ? (
                          <WpEditable
                            tagName='span'
                            value={partner.name}
                            onChange={(v) =>
                              setAttributes({
                                strategicPartners: strategicPartners.map(
                                  (item, i) =>
                                    i === index ? { ...item, name: v } : item,
                                ),
                              })
                            }
                          />
                        ) : (
                          partner.name
                        )}
                      </span>
                    </div>
                    <span className='text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 sm:text-right'>
                      {setAttributes ? (
                        <WpEditable
                          tagName='span'
                          value={partner.role}
                          onChange={(v) =>
                            setAttributes({
                              strategicPartners: strategicPartners.map(
                                (item, i) =>
                                  i === index ? { ...item, role: v } : item,
                              ),
                            })
                          }
                        />
                      ) : (
                        partner.role
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </article>
          <article className='border border-slate-200 bg-white p-6 sm:p-8 lg:p-10'>
            <p className='text-[10px] font-bold uppercase tracking-[0.18em] text-accent'>
              {setAttributes ? (
                <WpEditable
                  tagName='span'
                  value={innovationLabel}
                  onChange={(v) => update('innovationLabel', v)}
                />
              ) : (
                innovationLabel
              )}
            </p>
            <div className='mt-10 grid gap-4 sm:grid-cols-2'>
              {innovationPartners.map((partner, index) => (
                <div
                  key={`${partner.name}-${index}`}
                  className='border border-slate-200 p-5 font-heading text-2xl font-bold text-brand'
                >
                  {setAttributes ? (
                    <WpEditable
                      tagName='span'
                      value={partner.name}
                      onChange={(v) =>
                        setAttributes({
                          innovationPartners: innovationPartners.map(
                            (item, i) => (i === index ? { name: v } : item),
                          ),
                        })
                      }
                    />
                  ) : (
                    partner.name
                  )}
                </div>
              ))}
            </div>
          </article>
          <article className='border border-slate-200 bg-white p-6 sm:p-8 lg:p-10'>
            <p className='text-[10px] font-bold uppercase tracking-[0.18em] text-accent'>
              {setAttributes ? (
                <WpEditable
                  tagName='span'
                  value={mediaLabel}
                  onChange={(v) => update('mediaLabel', v)}
                />
              ) : (
                mediaLabel
              )}
            </p>
            <div className='mt-10 flex min-h-28 items-center border border-slate-200 p-5 font-heading text-3xl font-bold text-brand'>
              {setAttributes ? (
                <WpEditable
                  tagName='span'
                  value={mediaName}
                  onChange={(v) => update('mediaName', v)}
                />
              ) : (
                mediaName
              )}
            </div>
            <p className='mt-5 text-sm leading-relaxed text-slate-500'>
              {setAttributes ? (
                <WpEditable
                  tagName='span'
                  value={mediaDescription}
                  onChange={(v) => update('mediaDescription', v)}
                />
              ) : (
                mediaDescription
              )}
            </p>
          </article>
        </div>
      </div>
    </LandingSection>
  );
}
