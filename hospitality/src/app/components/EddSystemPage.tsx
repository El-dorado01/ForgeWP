import { BlockArea, WpHead } from '@forgewp/react';

type EddSystemPageProps = {
  title: string;
  description: string;
  intro: string;
  slot: string;
};

export function EddSystemPage({
  title,
  description,
  intro,
  slot,
}: EddSystemPageProps) {
  return (
    <main className='min-h-screen bg-[#f5f3ee] text-brand'>
      <WpHead
        title={`${title} | Hospitality 2035 – DICON`}
        description={description}
      />

      <header className='bg-brand text-white'>
        <div className='mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14 lg:px-12'>
          <p className='text-xs font-bold uppercase tracking-[0.16em] text-accent'>
            Hospitality 2035 <span className='px-2 text-white/40'>/</span>{' '}
            Kundenbereich
          </p>
          <h1 className='mt-4 wrap-break-word font-heading text-4xl font-black leading-[1.02] sm:text-5xl lg:text-6xl'>
            {title}
          </h1>
          <p className='mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base'>
            {intro}
          </p>
        </div>
      </header>

      <div className='edd-system-page__content'>
        <section
          className='edd-system-page__surface'
          aria-label={title}
        >
          <BlockArea name={slot} />
        </section>
      </div>
    </main>
  );
}
