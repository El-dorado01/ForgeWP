import { pickEditable, useWpMeta, WpEditable } from '@forgewp/react';
import { motion, type Variants } from 'framer-motion';
import { editable as pageEditable } from '../../../cms/editables/front-page';
import { defaults as checkoutDefaults } from '../../../cms/editables/sections/checkout';
import LandingSection from './LandingSection';
import WordReveal from './WordReveal';

type Requirement = { text: string };
export const editable = pickEditable(pageEditable, {
  eyebrow: 'checkout_eyebrow',
  intro: 'checkout_intro',
  title: 'checkout_title',
  description: 'checkout_description',
  consentText: 'checkout_consent_text',
  consentNote: 'checkout_consent_note',
  productLabel: 'checkout_product_label',
  productName: 'checkout_product_name',
  orderButtonLabel: 'checkout_order_button_label',
  integrationNote: 'checkout_integration_note',
  liveSystemLabel: 'checkout_live_system_label',
  requirements: 'checkout_requirements',
});
export type CheckoutSectionProps = {
  reduceMotion: boolean | null;
  revealInitial: false | 'hidden';
  revealVariants: Variants;
  eyebrow?: string;
  intro?: string;
  title?: string;
  description?: string;
  consentText?: string;
  consentNote?: string;
  productLabel?: string;
  productName?: string;
  orderButtonLabel?: string;
  integrationNote?: string;
  liveSystemLabel?: string;
  requirements?: Requirement[];
  setAttributes?: (attributes: Partial<CheckoutSectionProps>) => void;
};

export default function CheckoutSection({
  reduceMotion,
  revealInitial,
  revealVariants,
  eyebrow: eyebrowProp,
  intro: introProp,
  title: titleProp,
  description: descriptionProp,
  consentText: consentTextProp,
  consentNote: consentNoteProp,
  productLabel: productLabelProp,
  productName: productNameProp,
  orderButtonLabel: orderButtonLabelProp,
  integrationNote: integrationNoteProp,
  liveSystemLabel: liveSystemLabelProp,
  requirements: requirementsProp,
  setAttributes,
}: CheckoutSectionProps) {
  const eyebrow =
    eyebrowProp ?? useWpMeta('checkout_eyebrow', checkoutDefaults.eyebrow);
  const intro =
    introProp ?? useWpMeta('checkout_intro', checkoutDefaults.intro);
  const title =
    titleProp ?? useWpMeta('checkout_title', checkoutDefaults.title);
  const description =
    descriptionProp ??
    useWpMeta('checkout_description', checkoutDefaults.description);
  const consentText =
    consentTextProp ??
    useWpMeta('checkout_consent_text', checkoutDefaults.consentText);
  const consentNote =
    consentNoteProp ??
    useWpMeta('checkout_consent_note', checkoutDefaults.consentNote);
  const productLabel =
    productLabelProp ??
    useWpMeta('checkout_product_label', checkoutDefaults.productLabel);
  const productName =
    productNameProp ??
    useWpMeta('checkout_product_name', checkoutDefaults.productName);
  const orderButtonLabel =
    orderButtonLabelProp ??
    useWpMeta('checkout_order_button_label', checkoutDefaults.orderButtonLabel);
  const integrationNote =
    integrationNoteProp ??
    useWpMeta('checkout_integration_note', checkoutDefaults.integrationNote);
  const liveSystemLabel =
    liveSystemLabelProp ??
    useWpMeta('checkout_live_system_label', checkoutDefaults.liveSystemLabel);
  const requirements =
    requirementsProp ??
    (useWpMeta(
      'checkout_requirements',
      checkoutDefaults.requirements,
    ) as Requirement[]);

  return (
    <LandingSection
      id='checkout'
      className='border-t border-slate-200 bg-[#eef2f6] px-5 py-20 sm:px-8 lg:px-12 lg:py-32'
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
                  onChange={(v) => setAttributes({ eyebrow: v })}
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
                  onChange={(v) => setAttributes({ intro: v })}
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
                  onChange={(v) => setAttributes({ title: v })}
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
                  onChange={(v) => setAttributes({ description: v })}
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
          <div className='bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] sm:p-10 lg:p-12'>
            <div className='flex items-start justify-between gap-6 border-b border-slate-200 pb-6'>
              <div>
                <p className='text-[10px] font-bold uppercase tracking-[0.18em] text-accent'>
                  {setAttributes ? (
                    <WpEditable
                      tagName='span'
                      value={productLabel}
                      onChange={(v) => setAttributes({ productLabel: v })}
                    />
                  ) : (
                    productLabel
                  )}
                </p>
                <h3 className='mt-3 font-heading text-3xl font-black text-brand sm:text-4xl'>
                  {setAttributes ? (
                    <WpEditable
                      tagName='span'
                      value={productName}
                      onChange={(v) => setAttributes({ productName: v })}
                    />
                  ) : (
                    productName
                  )}
                </h3>
              </div>
              <p className='font-heading text-3xl font-black text-brand'>
                249 €
              </p>
            </div>
            <div className='mt-8 space-y-5'>
              <label className='flex items-start gap-3 text-sm leading-relaxed text-slate-600'>
                <input
                  type='checkbox'
                  disabled
                  className='mt-1 size-4 accent-accent'
                />
                <span>
                  {setAttributes ? (
                    <WpEditable
                      tagName='span'
                      value={consentText}
                      onChange={(v) => setAttributes({ consentText: v })}
                    />
                  ) : (
                    consentText
                  )}
                </span>
              </label>
              <p className='border-l-2 border-accent pl-4 text-xs leading-relaxed text-slate-500'>
                {setAttributes ? (
                  <WpEditable
                    tagName='span'
                    value={consentNote}
                    onChange={(v) => setAttributes({ consentNote: v })}
                  />
                ) : (
                  consentNote
                )}
              </p>
            </div>
            <div className='mt-8 flex flex-wrap items-center gap-4'>
              <button
                type='button'
                disabled
                className='inline-flex cursor-not-allowed items-center justify-center bg-brand px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white opacity-60'
              >
                {setAttributes ? (
                  <WpEditable
                    tagName='span'
                    value={orderButtonLabel}
                    onChange={(v) => setAttributes({ orderButtonLabel: v })}
                  />
                ) : (
                  orderButtonLabel
                )}
              </button>
              <span className='text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400'>
                {setAttributes ? (
                  <WpEditable
                    tagName='span'
                    value={integrationNote}
                    onChange={(v) => setAttributes({ integrationNote: v })}
                  />
                ) : (
                  integrationNote
                )}
              </span>
            </div>
          </div>
          <div className='border border-slate-200 bg-brand p-6 text-white sm:p-10 lg:p-12'>
            <p className='text-[10px] font-bold uppercase tracking-[0.18em] text-accent'>
              {setAttributes ? (
                <WpEditable
                  tagName='span'
                  value={liveSystemLabel}
                  onChange={(v) => setAttributes({ liveSystemLabel: v })}
                />
              ) : (
                liveSystemLabel
              )}
            </p>
            <div className='mt-8 space-y-5'>
              {requirements.map((item, index) => (
                <p
                  key={`${index}-${item.text}`}
                  className='border-b border-white/20 pb-5 text-sm leading-relaxed text-slate-300 last:border-b-0'
                >
                  {setAttributes ? (
                    <WpEditable
                      tagName='span'
                      value={item.text}
                      onChange={(v) =>
                        setAttributes({
                          requirements: requirements.map((entry, itemIndex) =>
                            itemIndex === index ? { text: v } : entry,
                          ),
                        })
                      }
                    />
                  ) : (
                    item.text
                  )}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </LandingSection>
  );
}
