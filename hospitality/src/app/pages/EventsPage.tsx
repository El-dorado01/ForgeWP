import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  MapPin,
} from 'lucide-react';
import {
  WpHead,
  WpQueryLoop,
  useWpCustomField,
  useWpExcerpt,
  useWpFeaturedImage,
  useWpPermalink,
  useWpTitle,
} from '@forgewp/react';

export const pageConfig = { layout: 'default' };

function EventFeatureTile() {
  const title = useWpTitle();
  const cityLabel = useWpCustomField('city_label', title);
  const image = useWpFeaturedImage() || '/assets/hospitality-cover.png';
  const permalink = useWpPermalink();

  return (
    <a
      href={permalink}
      className='event-reveal event-reveal-delay-1 group relative min-h-[360px] overflow-hidden sm:min-h-[460px] lg:min-h-full'
    >
      <img
        src={image}
        alt={cityLabel}
        className='absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]'
      />
      <div className='absolute inset-0 bg-gradient-to-t from-brand/80 via-brand/5 to-transparent' />
      <span className='absolute bottom-6 left-5 flex items-center gap-2 font-heading text-2xl font-bold text-white sm:bottom-9 sm:left-8 sm:text-3xl'>
        {cityLabel}{' '}
        <ArrowUpRight
          size={19}
          aria-hidden='true'
        />
      </span>
    </a>
  );
}

function EventListing() {
  const title = useWpTitle();
  const cityLabel = useWpCustomField('city_label', title);
  const image = useWpFeaturedImage() || '/assets/hospitality-cover.png';
  const permalink = useWpPermalink();

  return (
    <article className='event-reveal event-reveal-delay-2 grid gap-6 border-b border-brand/20 py-8 last:border-b-0 sm:grid-cols-[220px_0.34fr_0.66fr] sm:gap-8 sm:py-10'>
      <img
        src={image}
        alt={title}
        className='aspect-[16/9] w-full object-cover sm:aspect-[4/3]'
      />
      <div className='flex flex-col gap-3'>
        <p className='font-heading text-3xl font-bold text-brand sm:text-4xl'>
          {cityLabel}
        </p>
        <p className='flex items-center gap-2 text-sm font-medium text-slate-600'>
          <CalendarDays
            size={16}
            aria-hidden='true'
          />
          {useWpCustomField('timing', 'Termin wird bekannt gegeben')}
        </p>
        <p className='flex items-center gap-2 text-sm text-slate-600'>
          <MapPin
            size={16}
            aria-hidden='true'
          />
          {useWpCustomField('location', 'Veranstaltungsort folgt')}
        </p>
      </div>
      <div className='flex flex-col items-start'>
        <h3 className='font-heading text-2xl font-bold text-brand sm:text-3xl sm:col-span-2'>
          {title}
        </h3>
        <p className='mt-3 max-w-2xl text-base leading-relaxed text-slate-600'>
          {useWpExcerpt()}
        </p>
        <a
          href={permalink}
          className='mt-6 inline-flex items-center gap-2 border-b border-brand pb-2 text-xs font-bold uppercase tracking-[0.08em] text-brand transition-colors hover:border-accent hover:text-accent'
        >
          Veranstaltungsdetails{' '}
          <ArrowUpRight
            size={16}
            aria-hidden='true'
          />
        </a>
      </div>
    </article>
  );
}

export function EventsPage() {
  return (
    <main className='min-h-screen bg-[#f5f3ee] text-brand'>
      <WpHead
        title='Hospitality 2035 – Veranstaltungen | DICON'
        description='Veranstaltungen zur Studie Hospitality 2035 in Berlin und Zürich.'
        ogType='website'
      />
      <header className='overflow-hidden bg-brand text-white'>
        <div className='mx-auto grid max-w-[1440px] lg:min-h-[620px] lg:grid-cols-[0.9fr_1.1fr]'>
          <div className='event-reveal flex flex-col items-start justify-center px-5 py-16 sm:px-8 sm:py-20 lg:px-14 lg:py-24'>
            <p className='text-xs font-bold uppercase tracking-[0.18em] text-accent'>
              Hospitality 2035 <span className='px-2 text-white/40'>/</span>{' '}
              Study & Executive Events
            </p>
            <h1 className='mt-8 max-w-2xl font-heading text-5xl font-black leading-[0.98] sm:text-6xl lg:text-7xl'>
              Die Zukunft der Hotellerie im Gespräch.
            </h1>
            <p className='mt-7 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg'>
              Veranstaltungen bringen die Erkenntnisse aus Hospitality 2035 mit
              Entscheiderinnen und Entscheidern aus Hotellerie, Technologie und
              Immobilienwirtschaft zusammen.
            </p>
            <a
              href='#termine'
              className='mt-9 inline-flex items-center gap-3 border-b border-accent pb-2 text-sm font-semibold text-white transition-colors hover:text-accent'
            >
              Veranstaltungen entdecken{' '}
              <ArrowDownRight
                size={17}
                aria-hidden='true'
              />
            </a>
          </div>

          <div className='grid min-h-[360px] grid-cols-2 lg:min-h-full'>
            <WpQueryLoop
              postType='hospitality_event'
              postsPerPage={2}
            >
              <EventFeatureTile />
            </WpQueryLoop>
          </div>
        </div>
      </header>

      <section
        id='termine'
        className='event-reveal mx-auto max-w-[1280px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-28'
      >
        <div className='mb-10 flex flex-col justify-between gap-5 border-b border-brand/20 pb-7 sm:flex-row sm:items-end'>
          <div>
            <p className='text-xs font-bold uppercase tracking-[0.18em] text-accent'>
              Nächste Termine
            </p>
            <h2 className='mt-3 font-heading text-3xl font-bold sm:text-4xl'>
              Termine & Formate
            </h2>
          </div>
          <p className='max-w-md text-sm leading-relaxed text-slate-600'>
            Informationen zu Termin, Veranstaltungsort und Programm werden hier
            laufend ergänzt.
          </p>
        </div>
        <WpQueryLoop
          postType='hospitality_event'
          postsPerPage={10}
        >
          <EventListing />
        </WpQueryLoop>
      </section>
    </main>
  );
}
