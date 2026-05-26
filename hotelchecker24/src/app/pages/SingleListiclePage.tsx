import {
  WpHead,
  WpLink,
  useWpQuery,
  useWpTitle,
  useWpContent,
  useWpExcerpt,
  useWpFeaturedImage,
  useWpCustomField,
  useWpAuthor,
  useWpDate,
  useWpI18n,
} from '../../.forgewp/wordpress';
import { useRoute } from 'wouter';
import { ChevronRight, User, Calendar, BookOpen, ArrowLeft } from 'lucide-react';

export function SingleListiclePage() {
  const { __ } = useWpI18n();
  const [, params] = useRoute('/listicle/:id');
  const routeParam = params?.id;

  // In production, forgeWpHydration.currentPostId holds the real WP numeric ID
  const hydrationId =
    typeof window !== 'undefined'
      ? (window as any).forgeWpHydration?.currentPostId || 0
      : 0;
  const id = hydrationId || routeParam;

  // Local development mock query for single listicle
  const { posts } = useWpQuery({
    postType: 'listicle',
    postsPerPage: 100,
  });

  const devPost = posts.find(
    (p) => p.id === Number(id) || p.id === Number(hydrationId),
  );

  // Isomorphic dynamic mapping (compiles directly to WP loops in production)
  const title = useWpTitle() || devPost?.title || __('Kuratierter Reisebericht');
  const content = useWpContent() || devPost?.content || `<p>${__('Lade Inhalt...')}</p>`;
  const excerpt = useWpExcerpt() || devPost?.excerpt || '';
  const date = useWpDate() || devPost?.date || '24. Mai 2026';
  const author = useWpAuthor() || devPost?.author || __('Hotelchecker24 Redaktion');
  
  const rawImage = useWpFeaturedImage();
  const hydrationImage =
    typeof window !== 'undefined' && !(window as any)._forgeWpCompileTime
      ? (window as any).forgeWpHydration?.currentFeaturedImage || ''
      : '';
  const restImage =
    typeof devPost?.featuredImage === 'object' && devPost?.featuredImage !== null
      ? (devPost.featuredImage as any).url || ''
      : String(devPost?.featuredImage || '');
  const featuredImage = restImage || hydrationImage || rawImage || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80';

  const readTime =
    useWpCustomField('read_time') ||
    String(devPost?.customFields?.read_time || '5');
  const introText =
    useWpCustomField('intro_text') ||
    String(devPost?.customFields?.intro_text || '');

  return (
    <main className="min-h-screen bg-[#fafaf8] selection:bg-primary selection:text-white py-6 pb-24 px-4 sm:px-6 lg:px-8 font-sans select-none">
      <WpHead 
        title={title} 
        description={excerpt} 
      />
      <div className="max-w-7xl mx-auto">
        <nav className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-slate-400 mb-8 w-full">
          <WpLink href="/" className="hover:text-primary transition-colors">{__('Startseite')}</WpLink>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <WpLink href="/listicles" className="hover:text-primary transition-colors">{__('Listicles')}</WpLink>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <span className="text-slate-500 line-clamp-1">{title}</span>
        </nav>
        <div className="space-y-8">
          <article className="bg-white border border-slate-200/50 shadow-xs rounded-2xl p-5 sm:p-8 overflow-hidden max-w-4xl mx-auto">
            <header className="text-center mb-6">
              <span className="inline-block bg-[#929f5d]/10 text-[#929f5d] border border-[#929f5d]/15 text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-md mb-3">
                {__('Redaktioneller Beitrag')}
              </span>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 leading-tight mb-4 uppercase">
                {title}
              </h1>
              <div className="flex flex-wrap items-center justify-center gap-6 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 border-t border-b border-slate-100 py-2.5 max-w-2xl mx-auto">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#929f5d]" />
                  <span className="text-slate-700">{author}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{date}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>{readTime} {__('Min. Lesezeit')}</span>
                </div>
              </div>
            </header>
            <div className="w-full aspect-21/9 max-h-72 rounded-xl overflow-hidden border border-slate-100 shadow-sm mb-6">
              <img 
                src={featuredImage} 
                alt={title} 
                className="w-full h-full object-cover pointer-events-none"
              />
            </div>
            {introText && (
              <div className="mb-6 p-4 sm:p-5 bg-[#929f5d]/5 border-l-4 border-primary rounded-r-2xl">
                <p className="text-[#121416]/80 italic text-xs sm:text-sm font-medium leading-relaxed font-sans">
                  “{introText}”
                </p>
              </div>
            )}
            <div 
              className="prose prose-slate prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-a:text-primary hover:prose-a:underline max-w-none text-slate-600 leading-relaxed font-sans text-sm"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </article>
          <div className="max-w-full mx-auto pt-4 border-t border-slate-300/60 mt-12 flex justify-end">
            <WpLink 
              href="/listicles" 
              className="inline-flex items-center gap-2 px-6 py-3.5 border border-slate-200 hover:border-slate-800 text-slate-700 hover:text-slate-900 font-mono font-bold uppercase text-xs tracking-wider rounded-xl transition-all duration-300 group cursor-pointer bg-white"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              {__('Zurück zur Übersicht')}
            </WpLink>
          </div>
        </div>
      </div>
    </main>
  );
}