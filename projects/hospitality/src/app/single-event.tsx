import { ArrowLeft } from 'lucide-react';
import {
  WpHead,
  WpLink,
  WpShortcode,
  useWpPageLink,
  useWpTitle,
} from '@forgewp/react';

const eventDescription =
  'Hier finden Sie alle wichtigen Informationen zu Termin, Veranstaltungsort und Anmeldung.';

export default function SingleEvent() {
  const title = useWpTitle();
  const eventsHref = useWpPageLink('events-page', '/events');

  return (
    <main className='hospitality-em-single min-h-screen bg-[#f5f3ee] text-brand'>
      <WpHead
        title={`${title} | Hospitality 2035 – DICON`}
        description={eventDescription}
        ogType='article'
      />

      <header className='bg-brand text-white'>
        <div className='mx-auto max-w-[1280px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20'>
          <WpLink
            href={eventsHref}
            className='inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300 transition-colors hover:text-white'
          >
            <ArrowLeft
              size={15}
              aria-hidden='true'
            />
            Alle Veranstaltungen
          </WpLink>
          <p className='mt-10 text-xs font-bold uppercase tracking-[0.18em] text-accent'>
            Hospitality 2035 <span className='px-2 text-white/40'>/</span>{' '}
            Veranstaltung
          </p>
          <h1 className='mt-5 max-w-4xl font-heading text-4xl font-black leading-[1.02] sm:text-5xl lg:text-6xl'>
            {title}
          </h1>
          <p className='mt-6 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg'>
            {eventDescription}
          </p>
        </div>
      </header>

      <section className='mx-auto max-w-[1280px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20'>
        <div className='hospitality-em-content'>
          <WpShortcode code='[event]' />
        </div>
      </section>
    </main>
  );
}
