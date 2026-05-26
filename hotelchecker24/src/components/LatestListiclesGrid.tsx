import { useWpQuery, WpLink, useWpI18n } from '../.forgewp/wordpress';
import { ArrowRight, User, BookOpen, Newspaper, PenLine } from 'lucide-react';

export function LatestListiclesGrid() {
  const { __ } = useWpI18n();
  const { posts: listicles, loading } = useWpQuery({
    postType: 'listicle',
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
            <div className='h-48 bg-slate-100' />
            <div className='p-6 space-y-3'>
              <div className='h-3 bg-slate-100 rounded w-1/4' />
              <div className='h-5 bg-slate-100 rounded w-full' />
              <div className='h-3 bg-slate-100 rounded w-2/3' />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (listicles.length === 0) {
    return (
      <div className='relative overflow-hidden rounded-3xl border-2 border-dashed border-slate-200 bg-linear-to-br from-slate-50 via-white to-[#929f5d]/5 py-16 px-8 text-center'>
        {/* Decorative background blobs */}
        <div className='pointer-events-none absolute -top-10 -left-10 w-36 h-36 rounded-full bg-[#929f5d]/6 blur-2xl' />
        <div className='pointer-events-none absolute -bottom-10 -right-10 w-28 h-28 rounded-full bg-blue-50/80 blur-2xl' />

        <div className='relative z-10 flex flex-col items-center gap-4'>
          {/* Animated icon */}
          <div className='relative w-20 h-20 flex items-center justify-center'>
            <div className='absolute inset-0 rounded-2xl bg-[#929f5d]/10 animate-pulse' />
            <div className='absolute inset-2 rounded-xl bg-[#929f5d]/15' />
            <Newspaper className='w-8 h-8 text-[#929f5d] relative z-10' />
            <PenLine className='absolute -top-1 -right-1 w-4 h-4 text-[#929f5d]/70 animate-bounce' />
          </div>

          {/* Bilingual badge */}
          <span className='inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#929f5d] bg-[#929f5d]/10 border border-[#929f5d]/20 px-3 py-1 rounded-full'>
            Magazin · Editorial
          </span>

          <div>
            <h3 className='text-xl font-black uppercase tracking-tight text-slate-800 font-sans mt-1'>
              {__('Keine Listicles gefunden')}
            </h3>
            <p className='text-slate-400 text-sm mt-2 max-w-xs mx-auto leading-relaxed'>
              {__('Unsere Redaktion arbeitet an neuen Artikeln für Sie.')}{' '}
              <span className='text-slate-300'>·</span>{' '}
              <span className='italic'>Our editors are crafting new articles soon.</span>
            </p>
          </div>

          {/* Divider dots */}
          <div className='flex items-center gap-1.5 my-1'>
            {[0,1,2].map(i => (
              <span key={i} className='w-1 h-1 rounded-full bg-slate-200' />
            ))}
          </div>

          <WpLink
            href='/listicles'
            className='inline-flex items-center gap-2 bg-[#929f5d] hover:bg-[#929f5d]/90 text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-full transition-all duration-300 active:scale-95 shadow-lg shadow-[#929f5d]/20'
          >
            {__('Alle Artikel entdecken')} <ArrowRight className='w-3.5 h-3.5' />
          </WpLink>
        </div>
      </div>
    );
  }

  return (
    <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
      {listicles.map((listicle) => {
        const readTime = listicle.customFields?.read_time || '5';
        const imageUrl =
          typeof listicle.featuredImage === 'object' && listicle.featuredImage !== null
            ? (listicle.featuredImage as any).url || ''
            : String(listicle.featuredImage || '');

        return (
          <WpLink
            key={listicle.id}
            href={listicle.permalink || `/listicle/${listicle.id}`}
            className='group bg-white border border-slate-200/50 rounded-3xl overflow-hidden shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-500 flex flex-col'
          >
            <div className='relative h-48 w-full overflow-hidden bg-slate-100'>
              <img
                src={imageUrl}
                alt={listicle.title}
                className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-700'
                loading='lazy'
              />
              <div className='absolute top-4 left-4'>
                <span className='text-[9px] font-mono font-bold uppercase tracking-wider bg-white/95 text-slate-800 px-2.5 py-1 shadow-xs border border-slate-100/30 rounded-md'>
                  {__('Redaktion')}
                </span>
              </div>
            </div>
            <div className='p-6 flex flex-col grow'>
              <div className='flex items-center gap-4 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-3'>
                <span className='flex items-center gap-1'>
                  <User className='w-3 h-3 text-[#929f5d]' />
                  {listicle.author}
                </span>
                <span className='flex items-center gap-1'>
                  <BookOpen className='w-3 h-3' />
                  {readTime} {__('Min.')}
                </span>
              </div>
              <h3 className='font-bold text-slate-900 leading-snug group-hover:text-primary transition-colors line-clamp-2 grow'>
                {listicle.title}
              </h3>
              <div className='mt-4 flex items-center justify-between border-t border-slate-100 pt-4'>
                <span className='text-[#929f5d] font-mono font-black uppercase text-[10px] tracking-widest'>
                  {__('Artikel lesen')}
                </span>
                <div className='w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-300'>
                  <ArrowRight className='w-3 h-3' />
                </div>
              </div>
            </div>
          </WpLink>
        );
      })}
    </div>
  );
}
