import React from 'react';
import { useWpQuery, useWpI18n, WpLink } from '../.forgewp/wordpress';
import { BookOpen, ChevronRight } from 'lucide-react';

interface HotelListiclesProps {
  hotelId: number | string;
}

/**
 * @forgewp-block
 * title: Hotel Listicles
 * category: theme
 * icon: book-alt
 * description: Shows listicles that mention this hotel (single hotel page).
 */
export function HotelListicles({ hotelId }: HotelListiclesProps) {
  const { __ } = useWpI18n();

  // Relational Loop: Fetch all listicles and filter to those referencing this hotel
  const { posts: allListicles, loading: listiclesLoading } = useWpQuery({
    postType: 'listicle',
    postsPerPage: 100,
  });

  const activeHotelId = React.useMemo(() => {
    if (typeof window !== 'undefined') {
      const win = window as any;
      if (win.forgeWpHydration?.post?.id) {
        return Number(win.forgeWpHydration.post.id);
      }
    }
    return hotelId;
  }, [hotelId]);

  const matchingListicles = React.useMemo(() => {
    return allListicles.filter((l: any) => {
      const related = l.customFields?.related_hotels;
      if (!related) return false;

      let ids: number[] = [];
      if (Array.isArray(related)) {
        ids = related.map((item: any) => {
          if (typeof item === 'object' && item !== null) {
            return Number(item.ID || item.id);
          }
          return Number(item);
        });
      } else if (typeof related === 'string') {
        try {
          const parsed = JSON.parse(related);
          if (Array.isArray(parsed)) {
            ids = parsed.map(Number);
          }
        } catch {}
        if (ids.length === 0) {
          ids = related.split(',').map((s: string) => Number(s.trim())).filter(Boolean);
        }
      }

      return ids.includes(Number(activeHotelId));
    });
  }, [allListicles, activeHotelId]);

  return (
    <section className="bg-white border border-slate-200/50 shadow-xs rounded-2xl p-5 sm:p-7">
      <h3 className="text-lg font-black uppercase tracking-tight text-slate-950 mb-1 pl-3 border-l-4 border-[#929f5d]">
        {__('In Hotelvergleichen erwähnt')}
      </h3>
      <p className="text-slate-400 text-[10px] font-mono font-bold uppercase tracking-wider mb-4 pl-3">
        {__('Kuration & Expertentipps')}
      </p>
      
      {listiclesLoading ? (
        <div className="py-8 text-center text-slate-400 text-sm">{__('Lade Hotelvergleiche...')}</div>
      ) : matchingListicles.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {matchingListicles.map((l: any) => (
            <WpLink 
              key={l.id}
              href={l.permalink || `/hotelvergleich/${l.id}`}
              className="flex items-center justify-between p-4 border border-slate-100 hover:border-slate-800 rounded-xl transition-all duration-300 group hover:shadow-xs cursor-pointer bg-slate-50/20"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all shrink-0">
                  <BookOpen className="w-3.5 h-3.5 text-slate-500 group-hover:text-white" />
                </div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-tight truncate min-w-0">{l.title}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-800 group-hover:translate-x-0.5 transition-all shrink-0" />
            </WpLink>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-slate-400 text-sm font-sans border border-dashed border-slate-200 rounded-2xl">
          {__('Dieses Hotel wird aktuell in keinem unserer Hotelvergleiche aufgeführt.')}
        </div>
      )}
    </section>
  );
}

export default HotelListicles;
