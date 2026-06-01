import { WpHead, WpLink, useWpI18n } from '../.forgewp/wordpress';
import { Hydrate } from '@forgewp/react';
import { HeroSection } from '../components/HeroSection';
import { FeaturedHotelsGrid } from '../components/FeaturedHotelsGrid';
import { LatestListiclesGrid } from '../components/LatestListiclesGrid';
import { DestinationsGrid } from '../components/DestinationsGrid';
import { ArrowRight } from 'lucide-react';

export default function HomePage() {
  const { __ } = useWpI18n();

  return (
    <div className='min-h-screen w-full bg-slate-50 font-sans selection:bg-primary selection:text-white'>
      <WpHead
        title={__('Hotelchecker24 — Premium Hotel- & Vergleichs-Magazin')}
        description={__('Entdecken Sie kuratierte Boutique- und Luxushotels in Österreich, Deutschland, der Schweiz und Italien.')}
        ogType='website'
      />

      {/* HERO SECTION */}
      <Hydrate trigger='load'>
        <HeroSection />
      </Hydrate>

      {/* ── SECTION 1: TRUST STRIP ─────────────────────────────── */}
      <div className='bg-white border-y border-slate-100'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-6 text-center'>
            {[
              { value: '500+', label: __('Kuratierte Hotels') },
              { value: '4', label: __('Länder abgedeckt') },
              { value: '100%', label: __('Unabhängig & redaktionell') },
              { value: 'DE / EN', label: __('Deutsch & Englisch') },
            ].map((stat) => (
              <div
                key={stat.label}
                className='flex flex-col items-center gap-1'
              >
                <span className='text-2xl font-black text-slate-900 font-sans'>
                  {stat.value}
                </span>
                <span className='text-[10px] font-bold uppercase tracking-wider text-slate-400'>
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* ── SECTION 2: FEATURED HOTELS ─────────────────────────── */}
        <section className='py-16'>
          <div className='flex items-end justify-between mb-10'>
            <div>
              <span className='text-[10px] font-bold uppercase tracking-widest text-[#929f5d] bg-[#929f5d]/10 px-3 py-1 rounded-full'>
                {__('Empfohlen')}
              </span>
              <h2 className='text-3xl font-sans font-black text-slate-800 uppercase tracking-tight mt-3'>
                {__('Ausgewählte Hotels')}
              </h2>
              <p className='text-slate-500 text-sm mt-1 max-w-md'>
                {__('Von unserer Redaktion handverlesen — außergewöhnliche Aufenthalte in ganz Europa.')}
              </p>
            </div>
            <WpLink
              href='/hotels'
              className='hidden md:inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors'
            >
              {__('Alle Hotels')} <ArrowRight className='w-3.5 h-3.5' />
            </WpLink>
          </div>

          <Hydrate trigger='load'>
            <FeaturedHotelsGrid />
          </Hydrate>
        </section>

        {/* ── SECTION 3: EDITORIAL STRIP ─────────────────────────── */}
        <section className='py-12 border-t border-slate-200/60'>
          <div className='bg-[#121416] rounded-3xl overflow-hidden px-8 sm:px-12 py-12 grid grid-cols-1 md:grid-cols-2 gap-10 items-center relative'>
            <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(146,159,93,0.15)_0%,transparent_60%)] pointer-events-none' />
            <div className='relative z-10'>
              <span className='text-[10px] font-bold uppercase tracking-widest text-[#929f5d] bg-[#929f5d]/10 border border-[#929f5d]/20 px-3 py-1 rounded-md inline-block mb-4'>
                {__('Redaktionell & Unabhängig')}
              </span>
              <h2 className='text-3xl sm:text-4xl font-black text-white uppercase tracking-tight leading-tight mb-4'>
                {__('Kuratiert von')} <br />
                <span className='text-[#929f5d]'>{__('echten Reisenden')}</span>
              </h2>
              <p className='text-slate-400 text-sm leading-relaxed mb-6 max-w-sm'>
                {__('Kein bezahltes Ranking. Kein Algorithmus. Nur ehrliche, redaktionell geprüfte Empfehlungen von unserem Team, das die Hotels selbst besucht hat.')}
              </p>
              <WpLink
                href='/hotelvergleiche'
                className='inline-flex items-center gap-2 bg-[#929f5d] hover:bg-[#929f5d]/90 text-white text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-full transition-all duration-300 active:scale-95'
              >
                {__('Alle Hotelvergleiche lesen')} <ArrowRight className='w-3.5 h-3.5' />
              </WpLink>
            </div>
            <div className='relative z-10 grid grid-cols-2 gap-3'>
              {[
                {
                  num: '01',
                  label: __('Vor-Ort-Besuche'),
                  desc: __('Jedes Hotel wird persönlich getestet'),
                },
                {
                  num: '02',
                  label: __('Keine Werbung'),
                  desc: __('Vollständig redaktionell unabhängig'),
                },
                {
                  num: '03',
                  label: __('DE & EN'),
                  desc: __('Inhalte auf Deutsch und Englisch'),
                },
                {
                  num: '04',
                  label: __('Laufend aktuell'),
                  desc: __('Regelmäßige neue Empfehlungen'),
                },
              ].map((item) => (
                <div
                  key={item.num}
                  className='bg-white/5 border border-white/10 rounded-2xl p-4'
                >
                  <span className='text-[10px] font-mono font-black text-[#929f5d]'>
                    {item.num}
                  </span>
                  <p className='text-white text-xs font-bold uppercase tracking-wide mt-1'>
                    {item.label}
                  </p>
                  <p className='text-slate-500 text-[10px] mt-1 leading-snug'>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 4: LATEST LISTICLES ────────────────────────── */}
        <section className='py-16'>
          <div className='flex items-end justify-between mb-10'>
            <div>
              <span className='text-[10px] font-bold uppercase tracking-widest text-[#929f5d] bg-[#929f5d]/10 px-3 py-1 rounded-full'>
                {__('Magazin')}
              </span>
              <h2 className='text-3xl font-sans font-black text-slate-800 uppercase tracking-tight mt-3'>
                {__('Aktuelle Hotelvergleiche')}
              </h2>
              <p className='text-slate-500 text-sm mt-1 max-w-md'>
                {__('Tiefgehende Reiseberichte und Empfehlungen von unserer Redaktion.')}
              </p>
            </div>
            <WpLink
              href='/hotelvergleiche'
              className='hidden md:inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors'
            >
              {__('Alle Vergleiche')} <ArrowRight className='w-3.5 h-3.5' />
            </WpLink>
          </div>

          <Hydrate trigger='load'>
            <LatestListiclesGrid />
          </Hydrate>
        </section>

        {/* ── SECTION 5: DESTINATION COUNTRIES ──────────────────── */}
        <section className='py-12 border-t border-slate-200/60 pb-20'>
          <div className='text-center mb-10'>
            <h2 className='text-3xl font-sans font-black text-slate-800 uppercase tracking-tight'>
              {__('Nach Reiseziel entdecken')}
            </h2>
            <p className='text-slate-500 text-sm mt-2'>
              {__('Handverlesene Hotels in den schönsten Reisezielen Europas.')}
            </p>
          </div>
          <Hydrate trigger='load'>
            <DestinationsGrid />
          </Hydrate>
        </section>
      </main>
    </div>
  );
}
