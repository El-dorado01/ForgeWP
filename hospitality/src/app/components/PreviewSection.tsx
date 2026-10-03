import { Eye } from 'lucide-react';
import { motion, type Variants } from 'framer-motion';
import { pickEditable, useWpMeta, WpEditable } from '@forgewp/react';
import { editable as pageEditable } from '../../../cms/editables/front-page';
import { defaults as previewDefaults } from '../../../cms/editables/sections/preview';
import LandingSection from './LandingSection';
import WordReveal from './WordReveal';

export const editable = pickEditable(pageEditable, {
  eyebrow: 'preview_eyebrow',
  title: 'preview_title',
  description: 'preview_description',
  scopeLabel: 'preview_scope_label',
  scopeValue: 'preview_scope_value',
  formatLabel: 'preview_format_label',
  formatValue: 'preview_format_value',
  sampleLabel: 'preview_sample_label',
  sampleValue: 'preview_sample_value',
  previewLabel: 'preview_preview_label',
  pendingNote: 'preview_pending_note',
  coverAlt: 'preview_cover_alt',
});

export type PreviewSectionProps = {
  reduceMotion: boolean | null;
  revealInitial: false | 'hidden';
  revealVariants: Variants;
  eyebrow?: string;
  title?: string;
  description?: string;
  scopeLabel?: string;
  scopeValue?: string;
  formatLabel?: string;
  formatValue?: string;
  sampleLabel?: string;
  sampleValue?: string;
  previewLabel?: string;
  pendingNote?: string;
  coverAlt?: string;
  setAttributes?: (attributes: Partial<PreviewSectionProps>) => void;
};

export default function PreviewSection({
  reduceMotion,
  revealInitial,
  revealVariants,
  eyebrow: eyebrowProp,
  title: titleProp,
  description: descriptionProp,
  scopeLabel: scopeLabelProp,
  scopeValue: scopeValueProp,
  formatLabel: formatLabelProp,
  formatValue: formatValueProp,
  sampleLabel: sampleLabelProp,
  sampleValue: sampleValueProp,
  previewLabel: previewLabelProp,
  pendingNote: pendingNoteProp,
  coverAlt: coverAltProp,
  setAttributes,
}: PreviewSectionProps) {
  const eyebrow =
    eyebrowProp ?? useWpMeta('preview_eyebrow', previewDefaults.eyebrow);
  const title = titleProp ?? useWpMeta('preview_title', previewDefaults.title);
  const description =
    descriptionProp ??
    useWpMeta('preview_description', previewDefaults.description);
  const scopeLabel =
    scopeLabelProp ??
    useWpMeta('preview_scope_label', previewDefaults.scopeLabel);
  const scopeValue =
    scopeValueProp ??
    useWpMeta('preview_scope_value', previewDefaults.scopeValue);
  const formatLabel =
    formatLabelProp ??
    useWpMeta('preview_format_label', previewDefaults.formatLabel);
  const formatValue =
    formatValueProp ??
    useWpMeta('preview_format_value', previewDefaults.formatValue);
  const sampleLabel =
    sampleLabelProp ??
    useWpMeta('preview_sample_label', previewDefaults.sampleLabel);
  const sampleValue =
    sampleValueProp ??
    useWpMeta('preview_sample_value', previewDefaults.sampleValue);
  const previewLabel =
    previewLabelProp ??
    useWpMeta('preview_preview_label', previewDefaults.previewLabel);
  const pendingNote =
    pendingNoteProp ??
    useWpMeta('preview_pending_note', previewDefaults.pendingNote);
  const coverAlt =
    coverAltProp ?? useWpMeta('preview_cover_alt', previewDefaults.coverAlt);

  return (
    <LandingSection
      id='preview'
      className='border-t border-slate-200 bg-[#eef2f6] px-5 py-20 sm:px-8 lg:px-12 lg:py-32'
    >
      <div className='mx-auto max-w-[1440px]'>
        <div className='grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24'>
          <motion.div
            className='relative mx-auto w-[min(72vw,430px)] [perspective:1200px] lg:mx-0'
            initial={reduceMotion ? false : { opacity: 0, x: -36, rotate: -3 }}
            whileInView={{ opacity: 1, x: 0, rotate: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          >
            <div className='absolute -inset-5 translate-y-5 bg-brand/10 blur-2xl' />
            <div className='relative rotate-[-4deg] border border-white/80 bg-white p-3 shadow-[18px_24px_36px_rgba(15,23,42,0.18)] transition-transform duration-700 hover:rotate-[-1deg]'>
              <img
                src='/assets/hospitality-cover.png'
                alt={coverAlt}
                className='block aspect-[0.7] w-full object-cover'
              />
              <div className='absolute bottom-7 left-7 bg-accent px-3 py-2 text-[9px] font-bold uppercase tracking-[0.18em] text-white'>
                Preview / 01
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={revealInitial}
            whileInView='visible'
            viewport={{ once: true, amount: 0.3 }}
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
            <h2 className='mt-8 max-w-3xl font-heading text-5xl font-black leading-[0.88] tracking-[-0.07em] text-brand sm:text-7xl lg:text-8xl'>
              <WordReveal
                text={title}
                reduceMotion={reduceMotion}
              />
            </h2>
            <p className='mt-8 max-w-2xl text-lg leading-relaxed text-slate-600'>
              <WordReveal
                text={description}
                reduceMotion={reduceMotion}
                delay={0.12}
              />
            </p>

            <div className='mt-10 grid max-w-xl gap-4 border-y border-slate-300 py-5 sm:grid-cols-3'>
              <div>
                <p className='text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400'>
                  {setAttributes ? (
                    <WpEditable
                      tagName='span'
                      value={scopeLabel}
                      onChange={(value) => setAttributes({ scopeLabel: value })}
                    />
                  ) : (
                    scopeLabel
                  )}
                </p>
                <p className='mt-2 font-heading text-lg font-bold text-brand'>
                  {setAttributes ? (
                    <WpEditable
                      tagName='span'
                      value={scopeValue}
                      onChange={(value) => setAttributes({ scopeValue: value })}
                    />
                  ) : (
                    scopeValue
                  )}
                </p>
              </div>
              <div>
                <p className='text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400'>
                  {setAttributes ? (
                    <WpEditable
                      tagName='span'
                      value={formatLabel}
                      onChange={(value) =>
                        setAttributes({ formatLabel: value })
                      }
                    />
                  ) : (
                    formatLabel
                  )}
                </p>
                <p className='mt-2 font-heading text-lg font-bold text-brand'>
                  {setAttributes ? (
                    <WpEditable
                      tagName='span'
                      value={formatValue}
                      onChange={(value) =>
                        setAttributes({ formatValue: value })
                      }
                    />
                  ) : (
                    formatValue
                  )}
                </p>
              </div>
              <div>
                <p className='text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400'>
                  {setAttributes ? (
                    <WpEditable
                      tagName='span'
                      value={sampleLabel}
                      onChange={(value) =>
                        setAttributes({ sampleLabel: value })
                      }
                    />
                  ) : (
                    sampleLabel
                  )}
                </p>
                <p className='mt-2 font-heading text-lg font-bold text-brand'>
                  {setAttributes ? (
                    <WpEditable
                      tagName='span'
                      value={sampleValue}
                      onChange={(value) =>
                        setAttributes({ sampleValue: value })
                      }
                    />
                  ) : (
                    sampleValue
                  )}
                </p>
              </div>
            </div>

            <div className='mt-8 flex flex-wrap items-center gap-4'>
              <a
                href='/assets/hospitality-preview.pdf'
                className='group relative inline-flex items-center gap-2 overflow-hidden border border-accent bg-accent px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white shadow-[0_10px_24px_rgba(225,29,72,0.2)] transition-all duration-300 hover:-translate-y-1 hover:border-brand hover:shadow-[0_14px_28px_rgba(15,23,42,0.2)]'
              >
                <span
                  className='absolute inset-0 origin-left scale-x-0 bg-brand transition-transform duration-300 ease-out group-hover:scale-x-100'
                  aria-hidden='true'
                />
                <span className='relative z-10 inline-flex items-center gap-2'>
                  <Eye className='size-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6' />
                  <span className='transition-[letter-spacing] duration-300 group-hover:tracking-[0.2em]'>
                    {setAttributes ? (
                      <WpEditable
                        tagName='span'
                        value={previewLabel}
                        onChange={(value) =>
                          setAttributes({ previewLabel: value })
                        }
                      />
                    ) : (
                      previewLabel
                    )}
                  </span>
                </span>
              </a>
              <span className='text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400'>
                {setAttributes ? (
                  <WpEditable
                    tagName='span'
                    value={pendingNote}
                    onChange={(value) => setAttributes({ pendingNote: value })}
                  />
                ) : (
                  pendingNote
                )}
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </LandingSection>
  );
}
