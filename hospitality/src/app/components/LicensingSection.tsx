import {
  pickEditable,
  useWpMeta,
  useWpPageLink,
  WpEditable,
  WpLink,
} from '@forgewp/react';
import { motion, type Variants } from 'framer-motion';
import { editable as pageEditable } from '../../../cms/editables/front-page';
import { defaults as licenseDefaults } from '../../../cms/editables/sections/licensing';
import LandingSection from './LandingSection';
import WordReveal from './WordReveal';

type LicenseCard = {
  name: string;
  label: string;
  scope: string;
  description: string;
  action: string;
};
export const editable = pickEditable(pageEditable, {
  eyebrow: 'licensing_eyebrow',
  intro: 'licensing_intro',
  title: 'licensing_title',
  description: 'licensing_description',
  licenses: 'licensing_licenses',
  vatNote: 'licensing_vat_note',
});
export type LicensingSectionProps = {
  reduceMotion: boolean | null;
  revealInitial: false | 'hidden';
  revealVariants: Variants;
  eyebrow?: string;
  intro?: string;
  title?: string;
  description?: string;
  licenses?: LicenseCard[];
  vatNote?: string;
  setAttributes?: (attributes: Partial<LicensingSectionProps>) => void;
};

export default function LicensingSection({
  reduceMotion,
  revealInitial,
  revealVariants,
  eyebrow: eyebrowProp,
  intro: introProp,
  title: titleProp,
  description: descriptionProp,
  licenses: licensesProp,
  vatNote: vatNoteProp,
  setAttributes,
}: LicensingSectionProps) {
  const singleLicenseHref = useWpPageLink(
    'einzellizenz-page',
    '/checkout/single-license',
  );
  const teamLicenseHref = useWpPageLink('teamlizenz-page', '/lizenz/team');
  const companyLicenseHref = useWpPageLink(
    'unternehmenslizenz-page',
    '/lizenz/unternehmen',
  );
  const eyebrow =
    eyebrowProp ?? useWpMeta('licensing_eyebrow', licenseDefaults.eyebrow);
  const intro =
    introProp ?? useWpMeta('licensing_intro', licenseDefaults.intro);
  const title =
    titleProp ?? useWpMeta('licensing_title', licenseDefaults.title);
  const description =
    descriptionProp ??
    useWpMeta('licensing_description', licenseDefaults.description);
  const licenses =
    licensesProp ??
    (useWpMeta(
      'licensing_licenses',
      licenseDefaults.licenses,
    ) as LicenseCard[]);
  const vatNote =
    vatNoteProp ?? useWpMeta('licensing_vat_note', licenseDefaults.vatNote);
  const updateCard = (index: number, field: keyof LicenseCard, value: string) =>
    setAttributes?.({
      licenses: licenses.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    });

  return (
    <LandingSection
      id='buy'
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
        <div className='mt-20 grid gap-5 lg:grid-cols-3'>
          {licenses.map((license, index) => {
            const featured = index === 0;
            return (
              <motion.article
                key={`${license.name}-${index}`}
                className={`flex min-h-[390px] flex-col border p-6 sm:p-8 ${featured ? 'border-accent bg-brand text-white shadow-[0_18px_40px_rgba(15,23,42,0.16)]' : 'border-slate-200 bg-white text-brand'}`}
                initial={revealInitial}
                whileInView='visible'
                viewport={{ once: true, amount: 0.2 }}
                variants={revealVariants}
                transition={{ delay: index * 0.1 }}
              >
                <p
                  className={`text-[10px] font-bold uppercase tracking-[0.18em] ${featured ? 'text-accent' : 'text-slate-400'}`}
                >
                  {setAttributes ? (
                    <WpEditable
                      tagName='span'
                      value={license.label}
                      onChange={(v) => updateCard(index, 'label', v)}
                    />
                  ) : (
                    license.label
                  )}
                </p>
                <h3 className='mt-4 font-heading text-3xl font-bold sm:text-4xl'>
                  {setAttributes ? (
                    <WpEditable
                      tagName='span'
                      value={license.name}
                      onChange={(v) => updateCard(index, 'name', v)}
                    />
                  ) : (
                    license.name
                  )}
                </h3>
                <p className='mt-8 text-sm font-semibold'>
                  {setAttributes ? (
                    <WpEditable
                      tagName='span'
                      value={license.scope}
                      onChange={(v) => updateCard(index, 'scope', v)}
                    />
                  ) : (
                    license.scope
                  )}
                </p>
                <p className='mt-3 text-sm leading-relaxed opacity-75'>
                  {setAttributes ? (
                    <WpEditable
                      tagName='span'
                      value={license.description}
                      onChange={(v) => updateCard(index, 'description', v)}
                    />
                  ) : (
                    license.description
                  )}
                </p>
                <WpLink
                  href={
                    featured
                      ? singleLicenseHref
                      : index === 1
                        ? teamLicenseHref
                        : companyLicenseHref
                  }
                  className={`mt-auto inline-flex items-center justify-center border px-4 py-3.5 text-center text-[10px] font-bold uppercase tracking-[0.15em] ${featured ? 'border-accent bg-accent text-white' : 'border-brand text-brand'}`}
                >
                  {setAttributes ? (
                    <WpEditable
                      tagName='span'
                      value={license.action}
                      onChange={(v) => updateCard(index, 'action', v)}
                    />
                  ) : (
                    license.action
                  )}
                </WpLink>
              </motion.article>
            );
          })}
        </div>
        <p className='mt-8 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400'>
          {setAttributes ? (
            <WpEditable
              tagName='span'
              value={vatNote}
              onChange={(v) => setAttributes({ vatNote: v })}
            />
          ) : (
            vatNote
          )}
        </p>
      </div>
    </LandingSection>
  );
}
