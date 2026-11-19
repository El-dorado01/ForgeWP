import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { WpHead, WpImage, WpShortcode } from '@forgewp/react';

export default function EventsListingPage() {
  return (
    <main className='hospitality-em-page min-h-screen bg-[#f5f3ee] text-brand'>
      <WpHead
        title='Veranstaltungen | Hospitality 2035 – DICON'
        description='Treffen und Veranstaltungen rund um die Studie Hospitality 2035.'
        ogType='website'
      />

      <header className='overflow-hidden bg-brand text-white'>
        <div className='mx-auto grid max-w-[1440px] lg:min-h-[520px] lg:grid-cols-[1.1fr_0.9fr]'>
          <div className='flex flex-col items-start justify-center px-5 py-16 sm:px-8 sm:py-20 lg:px-14 lg:py-24'>
            <p className='text-xs font-bold uppercase tracking-[0.18em] text-accent'>
              Hospitality 2035 <span className='px-2 text-white/40'>/</span>{' '}
              Veranstaltungen
            </p>
            <h1 className='mt-8 max-w-3xl font-heading text-5xl font-black leading-[0.98] sm:text-6xl lg:text-7xl'>
              Die Zukunft der Hotellerie im Gespräch.
            </h1>
            <p className='mt-7 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg'>
              Erleben Sie die Erkenntnisse aus Hospitality 2035 im Austausch mit
              Entscheiderinnen und Entscheidern aus Hotellerie, Technologie und
              Immobilienwirtschaft.
            </p>
            <a
              href='#veranstaltungen'
              className='mt-9 inline-flex items-center gap-3 border-b border-accent pb-2 text-sm font-semibold text-white transition-colors hover:text-accent'
            >
              Termine entdecken{' '}
              <ArrowDownRight
                size={17}
                aria-hidden='true'
              />
            </a>
          </div>
          <div className='grid min-h-[300px] grid-cols-2 lg:min-h-full'>
            <a
              href='#veranstaltungen'
              className='group relative min-h-[300px] overflow-hidden sm:min-h-[360px] lg:min-h-full'
            >
              <WpImage
                src='/berlin.jpg'
                alt='Berlin, Veranstaltungsort von Hospitality 2035'
                priority
                className='absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]'
              />
              <div className='absolute inset-0 bg-gradient-to-t from-brand/55 via-brand/5 to-transparent' />
              <span className='absolute bottom-6 left-5 flex items-center gap-2 font-heading text-2xl font-bold text-white sm:bottom-9 sm:left-8 sm:text-3xl'>
                Berlin{' '}
                <ArrowUpRight
                  size={19}
                  aria-hidden='true'
                />
              </span>
            </a>
            <a
              href='#veranstaltungen'
              className='group relative min-h-[300px] overflow-hidden sm:min-h-[360px] lg:min-h-full'
            >
              <WpImage
                src='/zurich.jpg'
                alt='Zürich, Veranstaltungsort von Hospitality 2035'
                priority
                className='absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]'
              />
              <div className='absolute inset-0 bg-gradient-to-t from-brand/55 via-brand/5 to-transparent' />
              <span className='absolute bottom-6 left-5 flex items-center gap-2 font-heading text-2xl font-bold text-white sm:bottom-9 sm:left-8 sm:text-3xl'>
                Zürich{' '}
                <ArrowUpRight
                  size={19}
                  aria-hidden='true'
                />
              </span>
            </a>
          </div>
        </div>
      </header>

      <section
        id='veranstaltungen'
        className='mx-auto max-w-[1280px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-28'
      >
        <div className='mb-10 flex flex-col justify-between gap-5 border-b border-brand/20 pb-7 sm:flex-row sm:items-end'>
          <div>
            <p className='text-xs font-bold uppercase tracking-[0.18em] text-accent'>
              Berlin / Zürich
            </p>
            <h2 className='mt-3 font-heading text-3xl font-bold sm:text-4xl'>
              Kommende Veranstaltungen
            </h2>
          </div>
          <p className='max-w-md text-sm leading-relaxed text-slate-600'>
            Wählen Sie eine Veranstaltung aus, um mehr über Termin, Ort und
            Anmeldung zu erfahren.
          </p>
        </div>
        <div className='hospitality-em-list'>
          <WpShortcode code='[events_list limit="10" scope="future"]' />
        </div>
      </section>
    </main>
  );
}
