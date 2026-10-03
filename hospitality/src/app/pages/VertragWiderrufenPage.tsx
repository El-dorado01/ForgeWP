import { LegalPageTemplate } from '../components/LegalPageTemplate';
import type { FormEvent } from 'react';

export const pageConfig = { layout: 'default' };

function prepareWithdrawalEmail(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  const data = new FormData(event.currentTarget);
  const body = [
    `Name: ${data.get('name') ?? ''}`,
    `E-Mail-Adresse: ${data.get('email') ?? ''}`,
    `Bestellnummer: ${data.get('orderNumber') ?? ''}`,
    `Vertragsdatum: ${data.get('contractDate') ?? ''}`,
    `Erklärung: ${data.get('declaration') ?? ''}`,
  ].join('\n');

  window.location.href = `mailto:contact@dicon-beratung.de?subject=${encodeURIComponent('Vertrag widerrufen – Hospitality 2035')}&body=${encodeURIComponent(body)}`;
}

export function VertragWiderrufenPage() {
  return (
    <LegalPageTemplate
      slug='vertrag-widerrufen'
      title='Vertrag widerrufen'
      description='Informationen und Kontakt zur Ausübung eines Widerrufsrechts bei Hospitality 2035.'
      notice='Die hier mögliche Kontaktaufnahme ist noch keine vollständige elektronische Widerrufsfunktion. Automatische Eingangsbestätigung mit Inhalt, Datum und Uhrzeit benötigt einen angebundenen Backend-Prozess vor dem Launch.'
      sections={[
        {
          heading: 'Widerruf erklären',
          paragraphs: [
            'Wenn Sie einen Vertrag widerrufen möchten, teilen Sie DICON Ihren Entschluss bitte eindeutig mit. Zur Zuordnung helfen Name, Bestellnummer, die beim Kauf verwendete E-Mail-Adresse und das Bestelldatum.',
            'Sie können dazu eine E-Mail an contact@dicon-beratung.de senden. Diese Kontaktmöglichkeit ersetzt nicht die noch einzurichtende elektronische Widerrufsfunktion mit automatischer Eingangsbestätigung.',
          ],
        },
        {
          heading: 'Anbieter',
          paragraphs: [
            'DICON Marketing- und Beratungsgesellschaft mbH\nReinhardtstraße 29C\n10117 Berlin\ncontact@dicon-beratung.de\n+49 (0)30 300 132 500',
          ],
        },
      ]}
      links={[
        {
          label: 'E-Mail an DICON',
          href: 'mailto:contact@dicon-beratung.de?subject=Vertrag%20widerrufen',
        },
        { label: 'Widerrufsbelehrung', href: '/widerrufsbelehrung' },
      ]}
      afterContent={
        <form
          onSubmit={prepareWithdrawalEmail}
          className='mt-12 border-t border-brand/15 pt-8'
        >
          <h2 className='font-heading text-xl font-bold text-brand sm:text-2xl'>
            Widerruf per E-Mail vorbereiten
          </h2>
          <div className='mt-6 grid gap-5 sm:grid-cols-2'>
            <label className='text-xs font-bold uppercase tracking-[0.06em] text-slate-600'>
              Name
              <input
                name='name'
                autoComplete='name'
                required
                className='mt-2 block w-full border border-brand/20 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal text-brand outline-none focus:border-accent focus:ring-1 focus:ring-accent'
              />
            </label>
            <label className='text-xs font-bold uppercase tracking-[0.06em] text-slate-600'>
              E-Mail-Adresse
              <input
                name='email'
                type='email'
                autoComplete='email'
                required
                className='mt-2 block w-full border border-brand/20 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal text-brand outline-none focus:border-accent focus:ring-1 focus:ring-accent'
              />
            </label>
            <label className='text-xs font-bold uppercase tracking-[0.06em] text-slate-600'>
              Bestellnummer
              <input
                name='orderNumber'
                className='mt-2 block w-full border border-brand/20 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal text-brand outline-none focus:border-accent focus:ring-1 focus:ring-accent'
              />
            </label>
            <label className='text-xs font-bold uppercase tracking-[0.06em] text-slate-600'>
              Vertragsdatum
              <input
                name='contractDate'
                type='date'
                className='mt-2 block w-full border border-brand/20 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal text-brand outline-none focus:border-accent focus:ring-1 focus:ring-accent'
              />
            </label>
            <label className='text-xs font-bold uppercase tracking-[0.06em] text-slate-600 sm:col-span-2'>
              Erklärung
              <textarea
                name='declaration'
                rows={4}
                required
                defaultValue='Hiermit widerrufe ich den von mir abgeschlossenen Vertrag über die Bereitstellung der digitalen Studie Hospitality 2035.'
                className='mt-2 block w-full border border-brand/20 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal text-brand outline-none focus:border-accent focus:ring-1 focus:ring-accent'
              />
            </label>
          </div>
          <button
            type='submit'
            className='mt-6 inline-flex min-h-12 items-center border border-brand bg-brand px-5 py-3 text-xs font-bold uppercase tracking-[0.08em] text-white transition-colors hover:bg-accent hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
          >
            E-Mail vorbereiten
          </button>
          <p className='mt-3 text-xs leading-relaxed text-slate-500'>
            Ihr E-Mail-Programm öffnet sich mit den Angaben. Die Nachricht wird
            erst nach dem Versand übermittelt; diese Funktion bestätigt den
            Eingang nicht automatisch.
          </p>
        </form>
      }
    />
  );
}
