import React from 'react';
import { useWpQuery, useWpCustomField, useWpI18n, WpLink, decodeHtmlEntities } from '../.forgewp/wordpress';
import { Award, Star, MapPin, ExternalLink } from 'lucide-react';

interface ListicleRankedHotelsProps {
  listicleId: number | string;
}

export function ListicleRankedHotels({ listicleId }: ListicleRankedHotelsProps) {
  const { __ } = useWpI18n();

  // Local development mock query for single listicle to find related_hotels fallback
  const { posts: allListicles } = useWpQuery({
    postType: 'listicle',
    postsPerPage: 100,
  });

  const activeListicleId = React.useMemo(() => {
    if (listicleId) return Number(listicleId);
    if (typeof window !== 'undefined') {
      return (window as any).forgeWpHydration?.post?.id || 0;
    }
    return 0;
  }, [listicleId]);

  const devPost = allListicles.find((p) => p.id === activeListicleId);

  // ACF custom relationship field
  const relatedHotelsField = useWpCustomField('related_hotels');

  // Collect unique hotels
  const { posts: allHotels } = useWpQuery({ postType: 'hotel', postsPerPage: 100 });

  const relatedHotelsIds = React.useMemo(() => {
    const fieldVal = relatedHotelsField || devPost?.customFields?.related_hotels;
    if (!fieldVal) return [];
    if (Array.isArray(fieldVal)) {
      return fieldVal.map((item: any) => {
        if (typeof item === 'object' && item !== null) {
          return Number(item.ID || item.id);
        }
        return Number(item);
      });
    }
    // Handle comma-separated or JSON-encoded string from ACF/meta
    if (typeof fieldVal === 'string') {
      try {
        const parsed = JSON.parse(fieldVal);
        if (Array.isArray(parsed)) return parsed.map(Number);
      } catch {}
      return fieldVal.split(',').map((s: string) => Number(s.trim())).filter(Boolean);
    }
    return [];
  }, [relatedHotelsField, devPost]);

  const featuredHotels = React.useMemo(() => {
    return relatedHotelsIds
      .map((hid) => allHotels.find((h) => Number(h.id) === hid))
      .filter(Boolean) as any[];
  }, [relatedHotelsIds, allHotels]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('[ForgeWP] ListicleRankedHotels island initialized:', {
        listicleId,
        relatedHotelsIds,
        allHotelsCount: allHotels.length,
        featuredHotelsCount: featuredHotels.length
      });
    }
  }, [listicleId, relatedHotelsIds, allHotels, featuredHotels]);

  if (featuredHotels.length === 0) return null;

  return (
    <div className="space-y-8 mt-12 pt-10 border-t border-slate-100">
      <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
        <Award className="w-5 h-5 text-primary" />
        {__('Rangliste der vorgestellten Hotels')}
      </h2>
      {featuredHotels.map((h, index) => {
        try {
          const rating = h.customFields?.rating || '4.8';
          const address = h.customFields?.location || '';
          const starsVal = h.customFields?.stars || '5';
          let stars = parseInt(starsVal, 10) || 5;
          if (isNaN(stars) || stars < 1 || stars > 5) {
            stars = 5;
          }
          const website = h.customFields?.website || '';
          const city = h.customFields?.city || '';
          const hotelExcerpt = typeof h.excerpt === 'string' ? h.excerpt : '';
          const rawContent = typeof h.content === 'string' ? h.content : '';
          const cleanContentText = rawContent.replace(/<[^>]*>/g, '') || '';
          const postAny = h as any;
          const categoryTerms = postAny?._terms?.category || [];
          const categoryName = (Array.isArray(categoryTerms) && categoryTerms.length > 0 && categoryTerms[0] && typeof categoryTerms[0].name === 'string')
            ? decodeHtmlEntities(categoryTerms[0].name)
            : 'Boutique';

          const hImage =
            typeof h.featuredImage === 'object' && h.featuredImage !== null
              ? h.featuredImage.url || ''
              : String(h.featuredImage || '');
          const imageSrc = hImage || 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80';

          const hotelLink = h.permalink || `/hotel/${h.id}`;

          return (
            <div
              key={h.id}
              id={`hotel-card-${h.id}`}
              className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-xs hover:shadow-sm transition-all duration-300 scroll-mt-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                {/* Hotel Photo Panel */}
                <WpLink
                  href={hotelLink}
                  className="md:col-span-2 relative aspect-16/10 md:aspect-auto min-h-48 md:min-h-full block overflow-hidden group/img"
                >
                  <img
                    src={imageSrc}
                    alt={h.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500 pointer-events-none"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-slate-950/50 via-transparent to-transparent md:hidden" />
                  {/* Floating Premium Rank Badge */}
                  <div className="absolute top-4 left-4 w-10 h-10 rounded-xl bg-slate-950/90 text-white border border-white/10 flex flex-col items-center justify-center shadow-lg font-sans">
                    <span className="text-[8px] font-mono uppercase tracking-widest text-slate-400 font-bold leading-none mb-0.5">RANK</span>
                    <span className="text-sm font-black leading-none">{index + 1}</span>
                  </div>
                </WpLink>

                {/* Hotel Info Panel */}
                <div className="md:col-span-3 p-5 sm:p-6 flex flex-col justify-between">
                  <div className="space-y-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {Array.from({ length: stars }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      ))}
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-md shrink-0">
                        {categoryName}
                      </span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 leading-none">
                      <WpLink href={hotelLink} className="hover:text-primary transition-colors">
                        {h.title}
                      </WpLink>
                    </h3>

                    <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase tracking-wider leading-none">
                      <MapPin className="w-4 h-4 text-primary shrink-0" />
                      <span>{city || address}</span>
                    </div>

                    {/* Specs indicators */}
                    <div className="flex items-center gap-4 pt-1.5">
                      <div className="flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-[#929f5d]" />
                        <span className="text-xs font-mono font-bold text-slate-600">{rating} / 5.0</span>
                      </div>
                    </div>

                    <p className="text-slate-500 text-xs leading-relaxed font-sans pt-1 border-t border-slate-100/60 line-clamp-3">
                      {hotelExcerpt || cleanContentText || ''}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-slate-100">
                    <WpLink
                      href={hotelLink}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-950 text-white font-bold text-[10px] uppercase tracking-wider px-4 py-3 rounded-xl transition-all cursor-pointer active:scale-95 text-center shrink-0"
                    >
                      {__('Review ansehen')}
                    </WpLink>
                    {website && (
                      <a
                        href={website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-2 border border-slate-200 hover:border-slate-800 text-slate-700 hover:text-slate-900 font-mono font-bold uppercase text-[9px] tracking-wider px-4 py-3 rounded-xl transition-all cursor-pointer bg-white text-center shrink-0"
                      >
                        {__('Website')}
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        } catch (err) {
          console.error('[ForgeWP Error] ListicleRankedHotels crash rendering card for hotel:', h?.id, err);
          return null;
        }
      })}
    </div>
  );
}

export default ListicleRankedHotels;
