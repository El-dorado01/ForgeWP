import { ArrowLeft, LockKeyhole } from 'lucide-react';
import { WpHead } from '@forgewp/react';
import { motion, useReducedMotion } from 'framer-motion';

export const pageConfig = { layout: 'default' };

export function EinzellizenzPage() {
  const reduceMotion = useReducedMotion();
  const revealInitial = reduceMotion ? false : { opacity: 0, y: 24 };

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
          <a
            href='/lizenzen'
            className='inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-300 transition-colors hover:text-white'
          >
            <ArrowLeft
              size={15}
              aria-hidden='true'
            />{' '}
            Alle Lizenzen
          </a>
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
            Für Unternehmen und gewerbliche Nutzer. Prüfen Sie den Lizenzumfang
            und die Bestelldaten vor dem zahlungspflichtigen Kauf.
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
              01 / Rechnungsdaten
            </p>
            <h2
              id='billing-heading'
              className='mt-3 font-heading text-2xl font-bold text-brand sm:text-3xl'
            >
              Angaben zum Unternehmen
            </h2>
            <p className='mt-3 max-w-2xl text-sm leading-relaxed text-slate-600'>
              Der Bestellprozess wird für gewerbliche Käufer eingerichtet.
            </p>

            <div className='mt-8 grid gap-x-6 gap-y-5 sm:grid-cols-2'>
              <label className='text-xs font-bold uppercase tracking-[0.06em] text-slate-600'>
                Unternehmen
                <input
                  type='text'
                  autoComplete='organization'
                  disabled
                  className='mt-2 block w-full border border-brand/20 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal text-brand disabled:bg-white/60'
                />
              </label>
              <label className='text-xs font-bold uppercase tracking-[0.06em] text-slate-600'>
                Umsatzsteuer-ID{' '}
                <span className='font-normal normal-case text-slate-400'>
                  optional
                </span>
                <input
                  type='text'
                  autoComplete='off'
                  disabled
                  className='mt-2 block w-full border border-brand/20 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal text-brand disabled:bg-white/60'
                />
              </label>
              <label className='text-xs font-bold uppercase tracking-[0.06em] text-slate-600'>
                Vorname
                <input
                  type='text'
                  autoComplete='given-name'
                  disabled
                  className='mt-2 block w-full border border-brand/20 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal text-brand disabled:bg-white/60'
                />
              </label>
              <label className='text-xs font-bold uppercase tracking-[0.06em] text-slate-600'>
                Nachname
                <input
                  type='text'
                  autoComplete='family-name'
                  disabled
                  className='mt-2 block w-full border border-brand/20 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal text-brand disabled:bg-white/60'
                />
              </label>
              <label className='text-xs font-bold uppercase tracking-[0.06em] text-slate-600 sm:col-span-2'>
                Geschäftliche E-Mail-Adresse
                <input
                  type='email'
                  autoComplete='email'
                  disabled
                  className='mt-2 block w-full border border-brand/20 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal text-brand disabled:bg-white/60'
                />
              </label>
              <label className='text-xs font-bold uppercase tracking-[0.06em] text-slate-600 sm:col-span-2'>
                Straße und Hausnummer
                <input
                  type='text'
                  autoComplete='street-address'
                  disabled
                  className='mt-2 block w-full border border-brand/20 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal text-brand disabled:bg-white/60'
                />
              </label>
              <label className='text-xs font-bold uppercase tracking-[0.06em] text-slate-600'>
                Postleitzahl
                <input
                  type='text'
                  autoComplete='postal-code'
                  disabled
                  className='mt-2 block w-full border border-brand/20 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal text-brand disabled:bg-white/60'
                />
              </label>
              <label className='text-xs font-bold uppercase tracking-[0.06em] text-slate-600'>
                Ort
                <input
                  type='text'
                  autoComplete='address-level2'
                  disabled
                  className='mt-2 block w-full border border-brand/20 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal text-brand disabled:bg-white/60'
                />
              </label>
              <label className='text-xs font-bold uppercase tracking-[0.06em] text-slate-600 sm:col-span-2'>
                Land
                <select
                  autoComplete='country-name'
                  disabled
                  className='mt-2 block w-full border border-brand/20 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal text-brand disabled:bg-white/60'
                  defaultValue=''
                >
                  <option value=''>Land auswählen</option>
                </select>
              </label>
            </div>
          </section>

          <section
            aria-labelledby='consent-heading'
            className='mt-14 border-t border-brand/20 pt-10'
          >
            <p className='text-xs font-bold uppercase tracking-[0.16em] text-accent'>
              02 / Vereinbarungen
            </p>
            <h2
              id='consent-heading'
              className='mt-3 font-heading text-2xl font-bold text-brand sm:text-3xl'
            >
              Vor dem Kauf
            </h2>
            <div className='mt-7 space-y-6'>
              <label className='flex items-start gap-3 text-sm leading-relaxed text-slate-600'>
                <input
                  type='checkbox'
                  disabled
                  className='mt-1 size-4 shrink-0 accent-accent'
                  aria-describedby='digital-consent-note'
                />
                <span>
                  Ich stimme ausdrücklich zu, dass DICON vor Ablauf der
                  Widerrufsfrist mit der Bereitstellung der digitalen Studie
                  beginnt. Mir ist bekannt, dass ich mit Beginn der
                  Bereitstellung mein Widerrufsrecht verliere.
                </span>
              </label>
              <p
                id='digital-consent-note'
                className='ml-7 border-l-2 border-accent pl-4 text-xs leading-relaxed text-slate-500'
              >
                Die finale Formulierung ist noch rechtlich zu prüfen. Im live
                Checkout müssen Zustimmung und Zeitstempel dokumentiert und in
                der Bestellbestätigung ausgewiesen werden.
              </p>
              <label className='flex items-start gap-3 text-sm leading-relaxed text-slate-600'>
                <input
                  type='checkbox'
                  disabled
                  className='mt-1 size-4 shrink-0 accent-accent'
                />
                <span>
                  Ich akzeptiere die{' '}
                  <a
                    href='/agb-lizenzbedingungen'
                    className='font-semibold text-brand underline decoration-accent underline-offset-4'
                  >
                    AGB & Lizenzbedingungen
                  </a>{' '}
                  und habe die{' '}
                  <a
                    href='/widerrufsbelehrung'
                    className='font-semibold text-brand underline decoration-accent underline-offset-4'
                  >
                    Widerrufsbelehrung
                  </a>{' '}
                  zur Kenntnis genommen.
                </span>
              </label>
            </div>
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
            <img
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
          <button
            type='button'
            disabled
            className='mt-7 inline-flex w-full cursor-not-allowed items-center justify-center gap-1 whitespace-nowrap bg-brand px-2 py-4 text-[9px] font-bold uppercase tracking-normal text-white opacity-55 sm:gap-3 sm:px-4 sm:text-xs sm:tracking-[0.1em]'
          >
            <LockKeyhole
              size={16}
              className='hidden shrink-0 sm:block'
              aria-hidden='true'
            />
            <span className='whitespace-nowrap'>
              Zahlungspflichtig bestellen – 249,00 €
            </span>
          </button>
          <p className='mt-3 text-center text-xs leading-relaxed text-slate-500'>
            Online-Bestellung noch nicht freigeschaltet.
          </p>
          <a
            href='/lizenzen'
            className='mt-6 inline-flex w-full items-center justify-center gap-2 text-xs font-semibold text-slate-600 transition-colors hover:text-accent'
          >
            <ArrowLeft
              size={15}
              aria-hidden='true'
            />{' '}
            Zur Lizenzübersicht
          </a>
        </motion.aside>
      </div>
    </main>
  );
}
