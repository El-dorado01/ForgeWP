import { useWpQuery, useWpOption, useWpI18n, WpLink } from '@forgewp/react';
import { MapPin, Star } from 'lucide-react';

/**
 * Hydration island (useWpQuery + useWpOption) — the "hotel of the month"
 * spotlight card in the homepage hero.
 *
 * Split out of HeroSection so the hero's own padding-bearing outer <section>
 * stays fully static and never re-renders client-side — a hydrated component
 * re-renders with whatever className is hardcoded in its own source, which
 * would otherwise silently discard the server-computed paddingY/paddingX
 * classes the instant hydration ran. The lg:col-span-5 grid positioning for
 * this card lives on a static wrapper in HeroSection, not here — an
 * `isComponentInteractive` hydration boundary always mounts as an empty div
 * with no control over its own className, so anything grid/layout-critical
 * has to live one level up, in the static parent.
 */
export function HeroSpotlight() {
  const { __ } = useWpI18n();

  // Dynamically resolve the spotlight hotel ID set globally in site options
  const hotelOfTheMonthId = useWpOption('hotel_of_the_month', '6'); // default to ID 6 (Villa d'Este)

  let spotlightId = 6;
  const rawId = hotelOfTheMonthId;
  if (typeof rawId === 'string' && rawId.trim()) {
    try {
      const parsed = JSON.parse(rawId);
      if (Array.isArray(parsed)) {
        const firstVal = parsed[0];
        spotlightId = typeof firstVal === 'object' && firstVal !== null ? (firstVal.ID || firstVal.id) : firstVal;
      } else if (typeof parsed === 'object' && parsed !== null) {
        spotlightId = parsed.ID || parsed.id || spotlightId;
      } else {
        spotlightId = Number(parsed) || spotlightId;
      }
    } catch {
      spotlightId = Number(rawId) || spotlightId;
    }
    if (String(spotlightId).includes(',')) {
      spotlightId = Number(String(spotlightId).split(',')[0].trim()) || 6;
    }
  }

  const { posts: hotels, loading } = useWpQuery({
    postType: 'hotel',
    p: Number(spotlightId) || 6,
  } as any);

  const spotlight = hotels && hotels.length > 0 ? hotels[0] : null;

  const spotlightTitle = spotlight ? spotlight.title : "Villa d'Este";
  const spotlightRating = spotlight ? String(spotlight.customFields?.rating || '4.9') : '4.9';
  const spotlightCity = spotlight ? String(spotlight.customFields?.city || spotlight.customFields?.location || '') : 'Comer See';
  const spotlightCountry = spotlight ? (spotlight as any)._terms?.country?.[0]?.name || 'Italien' : 'Italien';
  const spotlightImage = spotlight ? (typeof spotlight.featuredImage === 'object' && spotlight.featuredImage !== null ? (spotlight.featuredImage as any).url : String(spotlight.featuredImage)) : 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80';
  const spotlightLink = spotlight ? (spotlight.permalink || `/hotel/${spotlight.id}`) : '#';

  if (loading) {
    return (
      <div className='w-full animate-pulse'>
        <div className='relative w-full aspect-4/5 sm:max-w-md lg:max-w-none rounded-[40px] bg-slate-200 border border-slate-200/60 shadow-2xl overflow-hidden'>
          {/* Float Card Overlay Skeleton */}
          <div className='absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md border border-white/20 p-5 rounded-3xl shadow-xl flex items-center justify-between'>
            <div className='flex-1 pr-4'>
              <div className='h-3 bg-[#929f5d]/20 rounded-md w-24 mb-2' />
              <div className='h-5 bg-slate-300 rounded-md w-3/4 mb-2' />
              <div className='h-3 bg-slate-300 rounded-md w-1/2' />
            </div>
            <div className='flex flex-col items-end shrink-0 w-16'>
              <div className='h-6 bg-slate-300 rounded-md w-12 mb-1.5' />
              <div className='h-2.5 bg-slate-300 rounded-md w-10' />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <WpLink
      href={spotlightLink}
      className='w-full cursor-pointer group block'
    >
      <div className='relative w-full aspect-4/5 sm:max-w-md lg:max-w-none rounded-[40px] overflow-hidden border border-slate-200/60 shadow-2xl'>
        {/* Curated Luxury Hotel Image */}
        <img
          src={spotlightImage}
          alt={spotlightTitle}
          className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out'
        />

        {/* Gradient Overlay for visual depth */}
        <div className='absolute inset-0 bg-linear-to-t from-slate-900/65 via-slate-900/10 to-transparent pointer-events-none' />

        {/* Float Card Overlay (Spotlight Destination) */}
        <div className='absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md border border-white/20 p-5 rounded-3xl shadow-xl flex items-center justify-between transition-all duration-300 group-hover:bg-white'>
          <div>
            <span className='text-[10px] font-bold uppercase tracking-wider text-[#929f5d] bg-[#929f5d]/10 px-2.5 py-0.5 rounded-md mb-1.5 inline-block'>
              {__('Hotel des Monats')}
            </span>
            <h4 className='font-sans font-black text-slate-800 text-lg leading-tight'>
              {spotlightTitle}
            </h4>
            <p className='text-slate-500 text-xs font-medium flex items-center gap-1.5 mt-0.5'>
              <MapPin className='w-3.5 h-3.5 text-primary' />
              {spotlightCity}{spotlightCountry ? `, ${spotlightCountry}` : ''}
            </p>
          </div>

          <div className='flex flex-col items-end shrink-0'>
            <span className='text-xs font-bold text-slate-800 flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 shadow-xs'>
              <Star className='w-3.5 h-3.5 text-accent fill-accent' />
              {spotlightRating}
            </span>
            <span className='text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider'>
              {__('Hervorragend')}
            </span>
          </div>
        </div>
      </div>
    </WpLink>
  );
}

export default HeroSpotlight;
