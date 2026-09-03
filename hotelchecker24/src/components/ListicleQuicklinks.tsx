import React from 'react';
import { useWpQuery, useWpCustomField, useWpI18n } from '@forgewp/react';
import { Building, ChevronRight } from 'lucide-react';

interface ListicleQuicklinksProps {
  listicleId: number | string;
}

export function ListicleQuicklinks({ listicleId }: ListicleQuicklinksProps) {
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

  if (featuredHotels.length === 0) return null;

  return (
    <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 mb-8">
      <h3 className="text-xs font-mono font-black uppercase tracking-widest text-slate-500 mb-3.5 flex items-center gap-2">
        <Building className="w-4 h-4 text-primary" />
        {__('In diesem Beitrag vorgestellt')}
      </h3>
      <div className="flex flex-col gap-3">
        {featuredHotels.map((h, index) => {
          const rating = h.customFields?.rating || '4.8';
          const city = h.customFields?.city || '';
          const hotelLink = h.permalink || `/hotel/${h.id}`;
          return (
            <a
              key={h.id}
              href={hotelLink}
              className="flex items-center justify-between p-3 bg-white border border-slate-100 hover:border-primary rounded-xl transition-all duration-300 group shadow-2xs hover:shadow-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary border border-primary/15 flex items-center justify-center text-xs font-black shrink-0">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-slate-800 uppercase tracking-tight group-hover:text-primary transition-colors truncate">
                    {h.title}
                  </span>
                  <span className="block text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                    {city}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <span className="text-[10px] font-black text-slate-700 bg-slate-100 border border-slate-200/50 px-1.5 py-0.5 rounded-md">
                  {rating}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

export default ListicleQuicklinks;
