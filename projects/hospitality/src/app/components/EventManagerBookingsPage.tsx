import { WpHead, WpShortcode } from '@forgewp/react';

export default function MyBookingsPage() {
  return (
    <main className='hospitality-em-bookings-page min-h-screen bg-[#f5f3ee] text-brand'>
      <WpHead
        title='Meine Veranstaltungsbuchungen | Hospitality 2035 – DICON'
        description='Verwalten Sie Ihre Anmeldungen zu Veranstaltungen von Hospitality 2035.'
      />

      <header className='bg-brand text-white'>
        <div className='mx-auto max-w-[1280px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20'>
          <p className='text-xs font-bold uppercase tracking-[0.18em] text-accent'>
            Hospitality 2035 <span className='px-2 text-white/40'>/</span>{' '}
            Kundenbereich
          </p>
          <h1 className='mt-5 max-w-4xl font-heading text-4xl font-black leading-[1.02] sm:text-5xl lg:text-6xl'>
            Meine Veranstaltungsbuchungen
          </h1>
          <p className='mt-6 max-w-2xl text-base leading-relaxed text-slate-300'>
            Melden Sie sich mit dem Konto an, das Sie bei der Buchung verwendet
            haben, um Ihre Anmeldungen und deren aktuellen Status zu sehen.
          </p>
        </div>
      </header>

      <section className='mx-auto max-w-[1280px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20'>
        <div className='mb-7 border-b border-brand/20 pb-5'>
          <p className='text-xs font-bold uppercase tracking-[0.18em] text-accent'>
            Kundenbereich
          </p>
          <h2 className='mt-3 font-heading text-3xl font-bold sm:text-4xl'>
            Ihre Buchungen
          </h2>
        </div>
        <div className='hospitality-em-bookings'>
          <WpShortcode code='[my_bookings]' />
        </div>
      </section>
    </main>
  );
}
