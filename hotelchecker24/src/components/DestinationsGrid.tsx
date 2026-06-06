import { useWpTerms, WpLink, useWpI18n, useWpPageLink } from '../.forgewp/wordpress';
import type { WpTerm } from '../.forgewp/wordpress';
import { MapPin, Globe, ArrowRight } from 'lucide-react';

// ── Skeleton loader shown while terms are fetching ────────────────────────────
function DestinationsSkeleton() {
  return (
    <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className='relative aspect-square rounded-2xl overflow-hidden bg-slate-100 animate-pulse'
        >
          <div className='absolute inset-0 bg-linear-to-t from-slate-200 to-transparent' />
          <div className='absolute bottom-4 left-4 space-y-1.5'>
            <div className='w-6 h-6 rounded-full bg-slate-200' />
            <div className='w-20 h-3 rounded bg-slate-200' />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Empty state when no country terms exist in WP ─────────────────────────────
function DestinationsEmpty() {
  const { __ } = useWpI18n();
  const hotelsHref = useWpPageLink('hotels-page', '/hotels');
  return (
    <div className='relative overflow-hidden rounded-3xl border-2 border-dashed border-slate-200 bg-linear-to-br from-slate-50 via-white to-[#929f5d]/5 py-16 px-8 text-center'>
      <div className='pointer-events-none absolute -top-10 -right-10 w-36 h-36 rounded-full bg-[#929f5d]/6 blur-2xl' />
      <div className='pointer-events-none absolute -bottom-10 -left-10 w-28 h-28 rounded-full bg-blue-50/80 blur-2xl' />

      <div className='relative z-10 flex flex-col items-center gap-4'>
        <div className='relative w-20 h-20 flex items-center justify-center'>
          <div className='absolute inset-0 rounded-2xl bg-[#929f5d]/10 animate-pulse' />
          <div className='absolute inset-2 rounded-xl bg-[#929f5d]/15' />
          <Globe className='w-8 h-8 text-[#929f5d] relative z-10' />
          <MapPin className='absolute -top-1 -right-1 w-4 h-4 text-[#929f5d]/70 animate-bounce' />
        </div>

        <span className='inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#929f5d] bg-[#929f5d]/10 border border-[#929f5d]/20 px-3 py-1 rounded-full'>
          {__('Reiseziele')}
        </span>

        <div>
          <h3 className='text-xl font-black uppercase tracking-tight text-slate-800 font-sans mt-1'>
            {__('Keine Reiseziele vorhanden')}
          </h3>
          <p className='text-slate-400 text-sm mt-2 max-w-xs mx-auto leading-relaxed'>
            {__('Fügen Sie Länder im WP-Admin unter Reiseziel hinzu.')}
          </p>
        </div>

        <div className='flex items-center gap-1.5 my-1'>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className='w-1 h-1 rounded-full bg-slate-200'
            />
          ))}
        </div>

        <WpLink
          href={hotelsHref}
          className='inline-flex items-center gap-2 bg-[#929f5d] hover:bg-[#929f5d]/90 text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-full transition-all duration-300 active:scale-95 shadow-lg shadow-[#929f5d]/20'
        >
          {__('Alle Hotels entdecken')} <ArrowRight className='w-3.5 h-3.5' />
        </WpLink>
      </div>
    </div>
  );
}

function DestinationCard({ term }: { term: WpTerm }) {
  const { __ } = useWpI18n();
  const hotelsHref = useWpPageLink('hotels-page', '/hotels');
  const base = hotelsHref.includes('?') ? hotelsHref.split('?')[0] : hotelsHref;
  const href = `${base.replace(/\/$/, '')}?country=${term.slug}`;

  const rawImage = term.meta?.featured_image;
  const image = (typeof rawImage === 'object' && rawImage !== null)
    ? rawImage.url || `https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80`
    : (typeof rawImage === 'string' && rawImage)
      ? rawImage
      : `https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80`;
  const flag = term.meta?.flag || '🌍';

  return (
    <WpLink
      href={href}
      className='relative overflow-hidden rounded-2xl aspect-square group cursor-pointer block'
    >
      <img
        src={image}
        alt={term.name}
        className='w-full h-full object-cover group-hover:scale-110 transition-transform duration-700'
        loading='lazy'
      />
      <div className='absolute inset-0 bg-linear-to-t from-slate-950/70 via-slate-900/20 to-transparent' />

      {/* Hover shimmer */}
      <div className='absolute inset-0 bg-[#929f5d]/0 group-hover:bg-[#929f5d]/10 transition-colors duration-500' />

      <div className='absolute bottom-4 left-4'>
        <span className='text-xl'>{flag}</span>
        <p className='text-white font-black uppercase tracking-tight text-sm mt-0.5 drop-shadow-sm'>
          {term.name}
        </p>
        {term.count > 0 && (
          <p className='text-white/60 text-[10px] font-mono mt-0.5'>
            {term.count} {term.count === 1 ? __('Hotel') : __('Hotels')}
          </p>
        )}
      </div>

      {/* Arrow badge on hover */}
      <div className='absolute top-3 right-3 w-7 h-7 rounded-full bg-white/0 group-hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100'>
        <ArrowRight className='w-3.5 h-3.5 text-white' />
      </div>
    </WpLink>
  );
}

// ── Main exported component ────────────────────────────────────────────────────
export function DestinationsGrid() {
  const { terms, loading } = useWpTerms('country');

  if (loading) return <DestinationsSkeleton />;
  if (terms.length === 0) return <DestinationsEmpty />;

  return (
    <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
      {terms.map((term) => (
        <DestinationCard
          key={term.id}
          term={term}
        />
      ))}
    </div>
  );
}
