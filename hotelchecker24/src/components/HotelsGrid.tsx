import React from 'react';
import { useWpQuery, WpLink, useWpSearch, useWpLocation, useWpI18n } from '../.forgewp/wordpress';
import { MapPin, Star, SlidersHorizontal, X, RotateCcw, DollarSign } from 'lucide-react';
import { Button } from './ui/button';

export function HotelsGrid() {
  const { __ } = useWpI18n();
  const searchString = useWpSearch();
  const [, setLocation] = useWpLocation();
  const params = React.useMemo(() => new URLSearchParams(searchString), [searchString]);

  const keyword = params.get('q') || params.get('s') || '';
  const country = params.get('country') || '';
  const category = params.get('category') || '';

  const { posts, loading } = useWpQuery({
    postType: 'hotel',
    postsPerPage: 12,
    s: keyword,
  });

  const handleResetFilters = () => setLocation('/hotels');
  const removeFilter = (key: 'q' | 's' | 'country' | 'category') => {
    const newParams = new URLSearchParams(searchString);
    newParams.delete(key);
    if (key === 'q' || key === 's') {
      newParams.delete('q');
      newParams.delete('s');
    }
    const qs = newParams.toString();
    setLocation(qs ? `/hotels?${qs}` : '/hotels');
  };

  // Client-side filter by country and category taxonomy terms
  const filtered = posts.filter((p) => {
    const postAny = p as any;
    const countryTerms: any[] = postAny._terms?.country || [];
    const categoryTerms: any[] = postAny._terms?.category || [];

    const countryMatch =
      !country ||
      countryTerms.some(
        (t) => t.slug === country || t.name?.toLowerCase() === country.toLowerCase()
      );

    const categoryMatch =
      !category ||
      categoryTerms.some(
        (t) => t.slug === category || t.name?.toLowerCase() === category.toLowerCase()
      );

    return countryMatch && categoryMatch;
  });

  const hasFilters = keyword || country || category;

  return (
    <div>
      {hasFilters && (
        <div className='flex flex-wrap items-center gap-2 mb-6'>
          <span className='text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5'>
            <SlidersHorizontal className='w-3 h-3' /> {__('Aktive Filter:')}
          </span>
          {keyword && (
            <button
              onClick={() => removeFilter('q')}
              className='flex items-center gap-1.5 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full hover:bg-primary/20 transition-colors'
            >
              {__('Suche:')} {keyword} <X className='w-3 h-3' />
            </button>
          )}
          {category && (
            <button
              onClick={() => removeFilter('category')}
              className='flex items-center gap-1.5 bg-accent/10 text-slate-700 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full hover:bg-accent/20 transition-colors'
            >
              {__('Kategorie:')} {category} <X className='w-3 h-3' />
            </button>
          )}
          {country && (
            <button
              onClick={() => removeFilter('country')}
              className='flex items-center gap-1.5 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full hover:bg-slate-200 transition-colors'
            >
              {__('Land:')} {country} <X className='w-3 h-3' />
            </button>
          )}
          <button
            onClick={handleResetFilters}
            className='flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-700 transition-colors ml-auto'
          >
            <RotateCcw className='w-3 h-3' /> {__('Alle zurücksetzen')}
          </button>
        </div>
      )}

      {loading ? (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className='bg-white rounded-2xl overflow-hidden border border-slate-100 animate-pulse'>
              <div className='h-52 bg-slate-100' />
              <div className='p-5 space-y-3'>
                <div className='h-3 bg-slate-100 rounded w-1/3' />
                <div className='h-5 bg-slate-100 rounded w-3/4' />
                <div className='h-3 bg-slate-100 rounded w-1/2' />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200/60 rounded-3xl p-12 max-w-md mx-auto shadow-xs text-center flex flex-col items-center justify-center my-12 select-none">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 text-primary">
            <SlidersHorizontal className="w-7 h-7" />
          </div>
          <h3 className="text-slate-900 font-black text-lg uppercase tracking-tight mb-1">{__('Keine Hotels gefunden')}</h3>
          <p className="text-slate-400 text-xs leading-relaxed max-w-xs">
            {__('Für die ausgewählten Filter gibt es keine Ergebnisse. Passen Sie die Auswahl von Land oder Kategorie an.')}
          </p>
          <Button 
            onClick={handleResetFilters} 
            className="mt-6 bg-primary hover:bg-primary/95 text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl cursor-pointer hover:shadow-md hover:shadow-primary/20 active:scale-95 transition-all border-none"
          >
            {__('Filter zurücksetzen')}
          </Button>
        </div>
      ) : (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
          {filtered.map((hotel) => {
            const postAny = hotel as any;
            const rating = String(hotel.customFields?.rating || '4.8');
            const city = String(hotel.customFields?.city || hotel.customFields?.location || '');
            const priceRange = String(hotel.customFields?.price_range || '$$$');
            const starsVal = parseInt(String(hotel.customFields?.stars || '5'), 10) || 5;
            const categoryTerms = postAny._terms?.category || [];
            const categoryName = categoryTerms.length > 0 ? categoryTerms[0].name : __('Boutique Hotel');
            const imageUrl =
              typeof hotel.featuredImage === 'object' && hotel.featuredImage !== null
                ? (hotel.featuredImage as any).url || ''
                : String(hotel.featuredImage || '');

            return (
              <WpLink
                key={hotel.id}
                href={hotel.permalink || `/hotel/${hotel.id}`}
                className='group bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col'
              >
                <div className='relative h-52 w-full overflow-hidden'>
                  <img
                    src={imageUrl}
                    alt={hotel.title}
                    className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-500'
                    loading='lazy'
                  />
                  <div className='absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-700 flex items-center gap-1 shadow-xs'>
                    <MapPin className='w-3 h-3 text-primary' />
                    <span>{city}</span>
                  </div>
                  <div className='absolute top-3 right-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-700 flex items-center gap-1 shadow-xs'>
                    <DollarSign className='w-3 h-3 text-amber-500' />
                    <span>{priceRange}</span>
                  </div>
                </div>
                <div className='p-5 flex flex-col grow'>
                  <div className='flex items-center justify-between mb-2'>
                    <span className='text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md'>
                      {categoryName}
                    </span>
                    <div className='flex items-center gap-1'>
                      {Array.from({ length: Math.min(starsVal, 5) }).map((_, i) => (
                        <Star key={i} className='w-3 h-3 text-amber-400 fill-amber-400' />
                      ))}
                    </div>
                  </div>
                  <h3 className='font-bold text-slate-900 group-hover:text-primary transition-colors leading-snug text-sm grow'>
                    {hotel.title}
                  </h3>
                  <p className='text-slate-400 text-xs mt-2 line-clamp-2 leading-relaxed'>
                    {hotel.excerpt}
                  </p>
                  <div className='mt-4 pt-3 border-t border-slate-100 flex items-center justify-between'>
                    <span className='text-[10px] font-mono font-black text-[#929f5d] uppercase tracking-widest'>
                      {__('Details ansehen')}
                    </span>
                    <span className='text-xs font-bold text-slate-500 flex items-center gap-1'>
                      <Star className='w-3 h-3 text-primary fill-primary' />
                      {rating}
                    </span>
                  </div>
                </div>
              </WpLink>
            );
          })}
        </div>
      )}
    </div>
  );
}
