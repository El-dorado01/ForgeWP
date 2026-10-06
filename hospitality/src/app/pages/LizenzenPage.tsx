import { ArrowRight, Check } from 'lucide-react';
import { useWpPageLink, WpHead, WpLink } from '@forgewp/react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';

export const pageConfig = { layout: 'default' };

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: 'easeOut' },
  },
};

export function LizenzenPage() {
  const reduceMotion = useReducedMotion();
  const revealInitial = reduceMotion ? false : 'hidden';
  const singleLicenseHref = useWpPageLink(
    'einzellizenz-page',
    '/checkout/single-license',
  );
  const teamLicenseHref = useWpPageLink('teamlizenz-page', '/lizenz/team');
  const companyLicenseHref = useWpPageLink(
    'unternehmenslizenz-page',
    '/lizenz/unternehmen',
  );
  const termsHref = useWpPageLink(
    'agb-lizenzbedingungen-page',
    '/agb-lizenzbedingungen',
  );

  return (
    <main className='min-h-screen bg-[#f5f3ee] text-brand'>
      <WpHead
        title='Lizenzen | Hospitality 2035 – DICON'
        description='Vergleichen Sie die Einzellizenz, Teamlizenz und Firmenlizenz für Hospitality 2035.'
      />

      <motion.header
        className='bg-brand text-white'
        initial={revealInitial}
        whileInView='visible'
        viewport={{ once: true, amount: 0.15 }}
        variants={revealVariants}
      >
        <div className='mx-auto grid min-w-0 max-w-[1440px] grid-cols-1 gap-10 px-6 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:px-14 lg:py-24'>
          <div>
            <p className='text-xs font-bold uppercase tracking-[0.18em] text-accent'>
              Hospitality 2035 <span className='px-2 text-white/40'>/</span>{' '}
              Lizenzmodelle
            </p>
            <h1 className='mt-8 max-w-4xl break-words font-heading text-5xl font-black leading-[0.98] hyphens-auto sm:text-6xl lg:text-7xl'>
              Die passende Lizenz für Ihr Unternehmen.
            </h1>
          </div>
          <div className='border-l border-white/20 pl-5 sm:pl-7'>
            <p className='text-base leading-relaxed text-slate-300 sm:text-lg'>
              Die vollständige Studie zur wirtschaftlichen Zukunft der
              Hotellerie. Wählen Sie den Nutzungsumfang passend zu Ihrem Team.
            </p>
            <p className='mt-5 text-xs font-bold uppercase tracking-[0.12em] text-accent'>
              Ausschließlich für Unternehmen und gewerbliche Nutzer
            </p>
          </div>
        </div>
      </motion.header>

      <motion.section
        aria-labelledby='license-options'
        className='mx-auto max-w-[1440px] px-6 py-14 sm:px-8 sm:py-20 lg:px-14 lg:py-24'
        initial={revealInitial}
        whileInView='visible'
        viewport={{ once: true, amount: 0.08 }}
        variants={revealVariants}
      >
        <div className='mb-8 flex flex-col justify-between gap-4 border-b border-brand/20 pb-6 sm:flex-row sm:items-end'>
          <div>
            <p className='text-xs font-bold uppercase tracking-[0.18em] text-accent'>
              Preisübersicht
            </p>
            <h2
              id='license-options'
              className='mt-3 font-heading text-3xl font-bold sm:text-4xl'
            >
              Drei Nutzungsumfänge
            </h2>
          </div>
          <p className='max-w-md text-sm leading-relaxed text-slate-600'>
            Alle Preise verstehen sich netto zzgl. der gesetzlichen
            Umsatzsteuer.
          </p>
        </div>

        <div className='grid border border-brand/20 bg-brand/20 lg:grid-cols-3 lg:gap-px'>
          <motion.article
            className='flex min-h-[390px] flex-col bg-white p-6 sm:p-8'
            initial={revealInitial}
            whileInView='visible'
            viewport={{ once: true, amount: 0.2 }}
            variants={revealVariants}
            transition={{ delay: 0.04, duration: 0.65, ease: 'easeOut' }}
          >
            <p className='text-xs font-bold uppercase tracking-[0.16em] text-slate-500'>
              Für eine Person
            </p>
            <h3 className='mt-5 font-heading text-2xl font-bold text-brand'>
              Einzellizenz
            </h3>
            <p className='mt-6 font-heading text-4xl font-bold text-brand'>
              249 €
            </p>
            <p className='mt-1 text-sm text-slate-500'>netto zzgl. MwSt.</p>
            <ul className='mt-7 space-y-3 border-t border-brand/15 pt-6 text-sm leading-relaxed text-slate-600'>
              <li className='flex gap-3'>
                <Check
                  size={17}
                  className='mt-0.5 shrink-0 text-accent'
                  aria-hidden='true'
                />
                <span>Nutzungsrecht für einen persönlichen Nutzer</span>
              </li>
              <li className='flex gap-3'>
                <Check
                  size={17}
                  className='mt-0.5 shrink-0 text-accent'
                  aria-hidden='true'
                />
                <span>Für einzelne Entscheider und Fachverantwortliche</span>
              </li>
            </ul>
            <WpLink
              href={singleLicenseHref}
              className='mt-auto inline-flex items-center justify-between gap-2 whitespace-nowrap border border-brand px-3 py-3.5 text-[10px] font-bold uppercase tracking-[0.06em] text-brand transition-colors hover:bg-brand hover:text-white sm:gap-3 sm:px-4 sm:text-xs sm:tracking-[0.1em]'
            >
              Einzellizenz auswählen{' '}
              <ArrowRight
                size={16}
                aria-hidden='true'
              />
            </WpLink>
          </motion.article>

          <motion.article
            className='flex min-h-[390px] flex-col bg-brand p-6 text-white shadow-[0_18px_40px_rgba(15,23,42,0.16)]'
            initial={revealInitial}
            whileInView='visible'
            viewport={{ once: true, amount: 0.2 }}
            variants={revealVariants}
            transition={{ delay: 0.14, duration: 0.65, ease: 'easeOut' }}
          >
            <p className='text-xs font-bold uppercase tracking-[0.16em] text-accent'>
              Für bis zu 10 Nutzer
            </p>
            <h3 className='mt-5 font-heading text-2xl font-bold'>Teamlizenz</h3>
            <p className='mt-6 font-heading text-4xl font-bold'>1.490 €</p>
            <p className='mt-1 text-sm text-slate-300'>netto zzgl. MwSt.</p>
            <ul className='mt-7 space-y-3 border-t border-white/20 pt-6 text-sm leading-relaxed text-slate-300'>
              <li className='flex gap-3'>
                <Check
                  size={17}
                  className='mt-0.5 shrink-0 text-accent'
                  aria-hidden='true'
                />
                <span>Nutzungsrecht für bis zu 10 Personen</span>
              </li>
              <li className='flex gap-3'>
                <Check
                  size={17}
                  className='mt-0.5 shrink-0 text-accent'
                  aria-hidden='true'
                />
                <span>Für Managementteams und Fachabteilungen</span>
              </li>
            </ul>
            <WpLink
              href={teamLicenseHref}
              className='mt-auto inline-flex items-center justify-between gap-2 whitespace-nowrap border border-accent bg-accent px-3 py-3.5 text-[10px] font-bold uppercase tracking-[0.06em] text-white transition-colors hover:bg-transparent sm:gap-3 sm:px-4 sm:text-xs sm:tracking-[0.1em]'
            >
              Teamlizenz anfragen{' '}
              <ArrowRight
                size={16}
                aria-hidden='true'
              />
            </WpLink>
          </motion.article>

          <motion.article
            className='flex min-h-[390px] flex-col bg-white p-6 sm:p-8'
            initial={revealInitial}
            whileInView='visible'
            viewport={{ once: true, amount: 0.2 }}
            variants={revealVariants}
            transition={{ delay: 0.24, duration: 0.65, ease: 'easeOut' }}
          >
            <p className='text-xs font-bold uppercase tracking-[0.16em] text-slate-500'>
              Für größere Organisationen
            </p>
            <h3 className='mt-5 font-heading text-2xl font-bold text-brand'>
              Firmenlizenz
            </h3>
            <p className='mt-6 font-heading text-4xl font-bold text-brand'>
              ab 2.490 €
            </p>
            <p className='mt-1 text-sm text-slate-500'>netto zzgl. MwSt.</p>
            <ul className='mt-7 space-y-3 border-t border-brand/15 pt-6 text-sm leading-relaxed text-slate-600'>
              <li className='flex gap-3'>
                <Check
                  size={17}
                  className='mt-0.5 shrink-0 text-accent'
                  aria-hidden='true'
                />
                <span>Für größere Teams, Hotelgruppen und Unternehmen</span>
              </li>
              <li className='flex gap-3'>
                <Check
                  size={17}
                  className='mt-0.5 shrink-0 text-accent'
                  aria-hidden='true'
                />
                <span>Preis abhängig vom vereinbarten Nutzungsumfang</span>
              </li>
            </ul>
            <WpLink
              href={companyLicenseHref}
              className='mt-auto inline-flex items-center justify-between gap-2 whitespace-nowrap border border-brand px-3 py-3.5 text-[10px] font-bold uppercase tracking-[0.06em] text-brand transition-colors hover:bg-brand hover:text-white sm:gap-3 sm:px-4 sm:text-xs sm:tracking-[0.1em]'
            >
              Firmenlizenz anfragen{' '}
              <ArrowRight
                size={16}
                aria-hidden='true'
              />
            </WpLink>
          </motion.article>
        </div>
      </motion.section>

      <motion.section
        className='border-y border-brand/15 bg-white'
        initial={revealInitial}
        whileInView='visible'
        viewport={{ once: true, amount: 0.18 }}
        variants={revealVariants}
      >
        <div className='mx-auto grid max-w-[1440px] gap-8 px-6 py-12 sm:px-8 sm:py-16 lg:grid-cols-[0.7fr_1.3fr] lg:px-14'>
          <div>
            <p className='text-xs font-bold uppercase tracking-[0.18em] text-accent'>
              Nutzung
            </p>
            <h2 className='mt-3 font-heading text-2xl font-bold text-brand sm:text-3xl'>
              Für Ihr Unternehmen
            </h2>
          </div>
          <div className='max-w-3xl'>
            <p className='text-base leading-relaxed text-slate-600'>
              Die passende Lizenz richtet sich danach, wie viele Personen die
              Studie innerhalb Ihres Unternehmens nutzen. Nutzungsrechte und
              Lizenzbedingungen gelten gemäß den vereinbarten Konditionen.
            </p>
            <WpLink
              href={termsHref}
              className='mt-5 inline-flex items-center gap-2 border-b border-brand pb-1 text-xs font-bold uppercase tracking-[0.1em] text-brand hover:border-accent hover:text-accent'
            >
              AGB & Lizenzbedingungen{' '}
              <ArrowRight
                size={15}
                aria-hidden='true'
              />
            </WpLink>
          </div>
        </div>
      </motion.section>
    </main>
  );
}
