import {
  pickEditable,
  resolveWpAsset,
  useWpMeta,
  useWpPageLink,
  WpEditable,
  WpLink,
} from '@forgewp/react';
import { motion, type Variants } from 'framer-motion';
import { editable as pageEditable } from '../../../cms/editables/front-page';
import { defaults as checkoutDefaults } from '../../../cms/editables/sections/checkout';
import LandingSection from './LandingSection';
import WordReveal from './WordReveal';

type Takeaway = { text: string };
export const editable = pickEditable(pageEditable, {
  eyebrow: 'checkout_eyebrow',
  intro: 'checkout_intro',
  title: 'checkout_title',
  description: 'checkout_description',
  takeawaysTitle: 'checkout_takeaways_title',
  takeaways: 'checkout_takeaways',
  productLabel: 'checkout_product_label',
  productName: 'checkout_product_name',
  orderButtonLabel: 'checkout_order_button_label',
  previewButtonLabel: 'checkout_preview_button_label',
});
export type CheckoutSectionProps = {
  reduceMotion: boolean | null;
  revealInitial: false | 'hidden';
  revealVariants: Variants;
  eyebrow?: string;
  intro?: string;
  title?: string;
  description?: string;
  takeawaysTitle?: string;
  takeaways?: Takeaway[];
  productLabel?: string;
  productName?: string;
  orderButtonLabel?: string;
  previewButtonLabel?: string;
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
  takeawaysTitle: takeawaysTitleProp,
  takeaways: takeawaysProp,
  productLabel: productLabelProp,
  productName: productNameProp,
  orderButtonLabel: orderButtonLabelProp,
  previewButtonLabel: previewButtonLabelProp,
  setAttributes,
}: CheckoutSectionProps) {
  const singleLicenseHref = useWpPageLink(
    'einzellizenz-page',
    '/checkout/single-license',
  );
  const metaEyebrow = useWpMeta('checkout_eyebrow', checkoutDefaults.eyebrow);
  const metaIntro = useWpMeta('checkout_intro', checkoutDefaults.intro);
  const metaTitle = useWpMeta('checkout_title', checkoutDefaults.title);
  const metaDescription = useWpMeta(
    'checkout_description',
    checkoutDefaults.description,
  );
  const metaTakeawaysTitle = useWpMeta(
    'checkout_takeaways_title',
    checkoutDefaults.takeawaysTitle,
  );
  const metaTakeaways = useWpMeta(
    'checkout_takeaways',
    checkoutDefaults.takeaways,
  ) as Takeaway[];
  const metaProductLabel = useWpMeta(
    'checkout_product_label',
    checkoutDefaults.productLabel,
  );
  const metaProductName = useWpMeta(
    'checkout_product_name',
    checkoutDefaults.productName,
  );
  const metaOrderButtonLabel = useWpMeta(
    'checkout_order_button_label',
    checkoutDefaults.orderButtonLabel,
  );
  const metaPreviewButtonLabel = useWpMeta(
    'checkout_preview_button_label',
    checkoutDefaults.previewButtonLabel,
  );

  const eyebrow = eyebrowProp ?? metaEyebrow;
  const intro = introProp ?? metaIntro;
  const title = titleProp ?? metaTitle;
  const description = descriptionProp ?? metaDescription;
  const takeawaysTitle = takeawaysTitleProp ?? metaTakeawaysTitle;
  const takeaways = takeawaysProp ?? metaTakeaways;
  const productLabel = productLabelProp ?? metaProductLabel;
  const productName = productNameProp ?? metaProductName;
  const orderButtonLabel = orderButtonLabelProp ?? metaOrderButtonLabel;
  const previewButtonLabel = previewButtonLabelProp ?? metaPreviewButtonLabel;

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
        <section
          aria-labelledby='checkout-takeaways-title'
          className='mt-16 border-y border-slate-300 py-8 sm:py-10'
        >
          <h3
            id='checkout-takeaways-title'
            className='font-heading text-2xl font-bold text-brand sm:text-3xl'
          >
            {setAttributes ? (
              <WpEditable
                tagName='span'
                value={takeawaysTitle}
                onChange={(value) => setAttributes({ takeawaysTitle: value })}
              />
            ) : (
              takeawaysTitle
            )}
          </h3>
          <ul className='mt-6 grid gap-x-10 sm:grid-cols-2'>
            {takeaways.map((item, index) => (
              <li
                key={`${index}-${item.text}`}
                className='border-b border-slate-200 py-4 text-sm leading-relaxed text-slate-600 last:border-b-0'
              >
                <span className='mr-3 font-bold text-accent' aria-hidden='true'>
                  —
                </span>
                {setAttributes ? (
                  <WpEditable
                    tagName='span'
                    value={item.text}
                    onChange={(value) =>
                      setAttributes({
                        takeaways: takeaways.map((entry, itemIndex) =>
                          itemIndex === index ? { text: value } : entry,
                        ),
                      })
                    }
                  />
                ) : (
                  item.text
                )}
              </li>
            ))}
          </ul>
        </section>

        <div className='mt-12 flex flex-col gap-8 border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] sm:p-10 md:flex-row md:items-center md:justify-between lg:p-12'>
          <div>
            <p className='text-[10px] font-bold uppercase tracking-[0.18em] text-accent'>
              {setAttributes ? (
                <WpEditable
                  tagName='span'
                  value={productLabel}
                  onChange={(value) => setAttributes({ productLabel: value })}
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
                  onChange={(value) => setAttributes({ productName: value })}
                />
              ) : (
                productName
              )}
            </h3>
            <p className='mt-3 text-sm text-slate-600'>
              Single License · 249 € netto
            </p>
          </div>
          <div className='flex flex-wrap gap-3'>
            <WpLink
              href={singleLicenseHref}
              className='inline-flex min-h-12 items-center justify-center bg-brand px-6 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-accent'
            >
              {setAttributes ? (
                <WpEditable
                  tagName='span'
                  value={orderButtonLabel}
                  onChange={(value) =>
                    setAttributes({ orderButtonLabel: value })
                  }
                />
              ) : (
                orderButtonLabel
              )}
            </WpLink>
            <a
              href={resolveWpAsset(
                '/assets/client-assets/Studie_Hospitality_2035_08102026_Kurz.pdf',
              )}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex min-h-12 items-center justify-center border border-brand px-6 py-3 text-xs font-bold uppercase tracking-[0.12em] text-brand transition-colors hover:border-accent hover:text-accent'
            >
              {setAttributes ? (
                <WpEditable
                  tagName='span'
                  value={previewButtonLabel}
                  onChange={(value) =>
                    setAttributes({ previewButtonLabel: value })
                  }
                />
              ) : (
                previewButtonLabel
              )}
            </a>
          </div>
        </div>
      </div>
    </LandingSection>
  );
}
