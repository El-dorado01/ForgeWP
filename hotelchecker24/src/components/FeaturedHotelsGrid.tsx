import { useWpQuery, WpLink, useWpI18n, useWpPageLink } from '../.forgewp/wordpress';
import { Star, MapPin, ArrowRight, Hotel, Sparkles } from 'lucide-react';

export function FeaturedHotelsGrid() {
  const { __ } = useWpI18n();
  const hotelsHref = useWpPageLink('hotels-page', '/hotels');
  const { posts: hotels, loading } = useWpQuery({
    postType: 'hotel',
    postsPerPage: 3,
  });

  if (loading) {
    return (
      <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className='bg-white rounded-3xl overflow-hidden border border-slate-100 animate-pulse'
          >
            <div className='h-60 bg-slate-100' />
            <div className='p-6 space-y-3'>
              <div className='h-3 bg-slate-100 rounded w-1/3' />
              <div className='h-5 bg-slate-100 rounded w-3/4' />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (hotels.length === 0) {
    return (
      <div className='relative overflow-hidden rounded-3xl border-2 border-dashed border-slate-200 bg-linear-to-br from-slate-50 via-white to-[#929f5d]/5 py-16 px-8 text-center'>
        {/* Decorative background blobs */}
        <div className='pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[#929f5d]/8 blur-2xl' />
        <div className='pointer-events-none absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-blue-100/60 blur-2xl' />

        <div className='relative z-10 flex flex-col items-center gap-4'>
          {/* Animated icon stack */}
          <div className='relative w-20 h-20 flex items-center justify-center'>
            <div className='absolute inset-0 rounded-2xl bg-[#929f5d]/10 animate-pulse' />
            <div className='absolute inset-2 rounded-xl bg-[#929f5d]/15' />
            <Hotel className='w-8 h-8 text-[#929f5d] relative z-10' />
            <Sparkles className='absolute -top-1 -right-1 w-4 h-4 text-[#929f5d]/70 animate-bounce' />
          </div>

          {/* Bilingual label */}
          <span className='inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#929f5d] bg-[#929f5d]/10 border border-[#929f5d]/20 px-3 py-1 rounded-full'>
            {__('Empfohlen')}
          </span>

          <div>
            <h3 className='text-xl font-black uppercase tracking-tight text-slate-800 font-sans mt-1'>
              {__('Keine Hotels gefunden')}
            </h3>
            <p className='text-slate-400 text-sm mt-2 max-w-xs mx-auto leading-relaxed'>
              {__('Derzeit sind keine empfohlenen Hotels verfügbar.')}
            </p>
          </div>

          {/* Divider dots */}
          <div className='flex items-center gap-1.5 my-1'>
            {[0,1,2].map(i => (
              <span key={i} className='w-1 h-1 rounded-full bg-slate-200' />
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

  return (
    <>
      <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
        {hotels.map((hotel) => {
          const postAny = hotel as any;
          const rating = String(hotel.customFields?.rating || '4.8');
          const city = String(hotel.customFields?.city || hotel.customFields?.location || '');
          const categoryTerms = postAny._terms?.category || [];
          const categoryName = categoryTerms.length > 0 ? categoryTerms[0].name : __('Boutique');
          const imageUrl =
            typeof hotel.featuredImage === 'object' && hotel.featuredImage !== null
              ? (hotel.featuredImage as any).url || ''
              : String(hotel.featuredImage || '');

          return (
            <WpLink
              key={hotel.id}
              href={hotel.permalink || `/hotel/${hotel.id}`}
              className='bg-white border border-slate-100/80 rounded-3xl overflow-hidden shadow-md shadow-slate-100 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 group block'
            >
              <div className='relative h-60 w-full overflow-hidden'>
                <img
                  src={imageUrl}
                  alt={hotel.title}
                  className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-500'
                  loading='lazy'
                />
                <div className='absolute top-4 left-4 bg-white/90 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-bold text-slate-800 flex items-center gap-1'>
                  <MapPin className='w-3 h-3 text-primary' />
                  <span>{city}</span>
                </div>
              </div>
              <div className='p-6'>
                <div className='flex items-center justify-between mb-3'>
                  <span className='text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-md'>
                    {categoryName}
                  </span>
                  <span className='text-xs font-bold text-slate-700 flex items-center gap-1'>
                    <Star className='w-3.5 h-3.5 text-accent fill-accent' />
                    {rating}
                  </span>
                </div>
                <h3 className='font-sans font-bold text-lg text-slate-800 group-hover:text-primary transition-colors leading-snug'>
                  {hotel.title}
                </h3>
                <p className='text-slate-500 text-xs mt-2 line-clamp-2 leading-relaxed'>
                  {hotel.excerpt}
                </p>
              </div>
            </WpLink>
          );
        })}
      </div>
      <div className='mt-8 text-center md:hidden'>
        <WpLink
          href={hotelsHref}
          className='inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary'
        >
          {__('Alle Hotels ansehen')} <ArrowRight className='w-3.5 h-3.5' />
        </WpLink>
      </div>
    </>
  );
}
