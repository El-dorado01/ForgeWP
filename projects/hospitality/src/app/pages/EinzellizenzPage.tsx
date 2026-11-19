import { ArrowLeft } from 'lucide-react';
import {
  BlockArea,
  useWpPageLink,
  WpHead,
  WpImage,
  WpLink,
} from '@forgewp/react';
import { motion, useReducedMotion } from 'framer-motion';

export const pageConfig = { layout: 'default' };

export function EinzellizenzPage() {
  const reduceMotion = useReducedMotion();
  const revealInitial = reduceMotion ? false : { opacity: 0, y: 24 };
  const licensesHref = useWpPageLink('lizenzen-page', '/lizenzen');
  const termsHref = useWpPageLink(
    'agb-lizenzbedingungen-page',
    '/agb-lizenzbedingungen',
  );
  const withdrawalHref = useWpPageLink(
    'widerrufsbelehrung-page',
    '/widerrufsbelehrung',
  );

  return (
    <main className='min-h-screen bg-[#f5f3ee] text-brand'>
      <WpHead
        title='Einzellizenz bestellen | Hospitality 2035 – DICON'
        description='Bestellübersicht für die Hospitality 2035 Einzellizenz für Unternehmen und gewerbliche Nutzer.'
      />

      <motion.header
        className='bg-brand text-white'
        initial={revealInitial}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.75, ease: 'easeOut' }}
      >
        <div className='mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14 lg:px-12'>
          <WpLink
            href={licensesHref}
            className='inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-300 transition-colors hover:text-white'
          >
            <ArrowLeft
              size={15}
              aria-hidden='true'
            />{' '}
            Alle Lizenzen
          </WpLink>
          <p className='mt-9 text-xs font-bold uppercase tracking-[0.18em] text-accent'>
            Hospitality 2035 <span className='px-2 text-white/40'>/</span>{' '}
            Einzellizenz
          </p>
          <h1 className='mt-4 break-words font-heading text-5xl font-black leading-[0.98] hyphens-auto sm:text-6xl lg:text-7xl'>
            <span className='hidden sm:inline'>Bestellübersicht</span>
            <span className='sm:hidden'>
              Bestell-
              <br />
              übersicht
            </span>
          </h1>
          <p className='mt-4 max-w-2xl text-base leading-relaxed text-slate-300'>
            Für Unternehmen und gewerbliche Nutzer. Prüfen Sie Lizenzumfang und
            Preis; Rechnungs- und Zahlungsdaten erfassen Sie im EDD-Checkout.
          </p>
        </div>
      </motion.header>

      <div className='mx-auto grid max-w-7xl gap-12 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16 lg:px-12 lg:py-20'>
        <motion.div
          initial={revealInitial}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ delay: 0.12, duration: 0.65, ease: 'easeOut' }}
        >
          <section aria-labelledby='billing-heading'>
            <p className='text-xs font-bold uppercase tracking-[0.16em] text-accent'>
              01 / Checkout
            </p>
            <h2
              id='billing-heading'
              className='mt-3 font-heading text-2xl font-bold text-brand sm:text-3xl'
            >
              Rechnungsdaten und Zahlung
            </h2>
            <p className='mt-3 max-w-2xl text-sm leading-relaxed text-slate-600'>
              Der sichere Checkout wird von Easy Digital Downloads
              bereitgestellt. Dort geben Sie die Rechnungsdaten ein und wählen
              die angebotene Zahlungsart. Die Umsatzsteuer wird anhand der
              Checkout-Einstellungen berechnet.
            </p>
          </section>

          <section
            aria-labelledby='consent-heading'
            className='mt-14 border-t border-brand/20 pt-10'
          >
            <p className='text-xs font-bold uppercase tracking-[0.16em] text-accent'>
              02 / Unterlagen
            </p>
            <h2
              id='consent-heading'
              className='mt-3 font-heading text-2xl font-bold text-brand sm:text-3xl'
            >
              Lizenzbedingungen
            </h2>
            <p className='mt-4 text-sm leading-relaxed text-slate-600'>
              Bitte lesen Sie vor dem Kauf die{' '}
              <WpLink
                href={termsHref}
                className='font-semibold text-brand underline decoration-accent underline-offset-4'
              >
                AGB & Lizenzbedingungen
              </WpLink>{' '}
              und die{' '}
              <WpLink
                href={withdrawalHref}
                className='font-semibold text-brand underline decoration-accent underline-offset-4'
              >
                Widerrufsbelehrung
              </WpLink>
              . Die erforderlichen Vertragsbestätigungen und eine gegebenenfalls
              notwendige Zustimmung zur sofortigen Bereitstellung müssen im EDD-
              Checkout eingerichtet und vor dem Live-Verkauf geprüft werden.
            </p>
          </section>
        </motion.div>

        <motion.aside
          className='h-fit border border-brand/15 bg-white p-5 sm:p-7 lg:sticky lg:top-28'
          initial={revealInitial}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ delay: 0.24, duration: 0.65, ease: 'easeOut' }}
        >
          <p className='text-xs font-bold uppercase tracking-[0.16em] text-accent'>
            Ihre Bestellung
          </p>
          <div className='mt-5 flex gap-4 border-b border-brand/15 pb-5'>
            <WpImage
              src='/assets/hospitality-cover.png'
              alt='Cover der Studie Hospitality 2035'
              className='h-28 w-20 shrink-0 object-cover object-top'
            />
            <div>
              <h2 className='font-heading text-lg font-bold leading-snug text-brand'>
                Hospitality 2035
              </h2>
              <p className='mt-2 text-sm leading-relaxed text-slate-600'>
                Einzellizenz · ein Nutzer
              </p>
              <p className='mt-2 text-xs text-slate-500'>
                Digitale Studie (PDF)
              </p>
            </div>
          </div>
          <dl className='space-y-4 border-b border-brand/15 py-5 text-sm'>
            <div className='flex justify-between gap-4'>
              <dt className='text-slate-600'>Nettopreis</dt>
              <dd className='font-semibold text-brand'>249,00 €</dd>
            </div>
            <div className='flex justify-between gap-4'>
              <dt className='text-slate-600'>Umsatzsteuer</dt>
              <dd className='text-right text-slate-600'>
                zzgl. gesetzlicher Umsatzsteuer
              </dd>
            </div>
          </dl>
          <p className='flex justify-between gap-4 py-5 font-heading text-lg font-bold text-brand'>
            <span>Gesamtbetrag</span>
            <span>249,00 € netto</span>
          </p>
          <p className='text-xs leading-relaxed text-slate-500'>
            Die anfallende Umsatzsteuer wird im finalen Checkout ausgewiesen.
            Die digitale Bereitstellung erfolgt nach erfolgreicher Zahlung.
          </p>
          <div className='hospitality-edd-purchase-wrap mt-7'>
            <BlockArea name='single-license-edd-purchase-button' />
          </div>
          <WpLink
            href={licensesHref}
            className='mt-6 inline-flex w-full items-center justify-center gap-2 text-xs font-semibold text-slate-600 transition-colors hover:text-accent'
          >
            <ArrowLeft
              size={15}
              aria-hidden='true'
            />{' '}
            Zur Lizenzübersicht
          </WpLink>
        </motion.aside>
      </div>
    </main>
  );
}
