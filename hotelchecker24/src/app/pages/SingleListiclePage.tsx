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
  useWpModifiedDate,
  useWpI18n,
  useWpLanguage,
  useWpPageLink,
  useWpOption,
  defineEditable,
  text,
} from '../../.forgewp/wordpress';
import { useRoute } from 'wouter';

import { ChevronRight, User, Calendar, BookOpen, ArrowLeft } from 'lucide-react';
import ListicleQuicklinks from '../../components/ListicleQuicklinks';
import ListicleRankedHotels from '../../components/ListicleRankedHotels';

export function SingleListiclePage() {
  const { __ } = useWpI18n();
  const { homeUrl } = useWpLanguage();
  const homeHref = homeUrl;
  const listiclesHref = useWpPageLink('listicles-page', '/hotelvergleiche');

  const badgeLabel = useWpOption('single_listicle_badge_label', __('Redaktioneller Beitrag'));
  const backLabel = useWpOption('single_listicle_back_label', __('Zurück zur Übersicht'));
  const [, params1] = useRoute('/hotelvergleich/:id');
  const [, params2] = useRoute('/listicle/:id');
  const routeParam = params1?.id || params2?.id;

  // In production, forgeWpHydration.post.id holds the real WP numeric ID
  const hydrationId =
    typeof window !== 'undefined'
      ? (window as any).forgeWpHydration?.post?.id || 0
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
  const title = useWpTitle() || devPost?.title || __('Kuratierter Hotelvergleich');
  const content = useWpContent() || devPost?.content || `<p>${__('Lade Inhalt...')}</p>`;
  const excerpt = useWpExcerpt() || devPost?.excerpt || '';
  const date = useWpModifiedDate() || devPost?.modified || devPost?.date || '24. Mai 2026';
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
      <div className="max-w-7xl mx-auto animate-fade-in duration-500">
        {/* Navigation Breadcrumbs */}
        <div className="max-w-5xl mx-auto w-full">
          <nav className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-slate-400 mb-8 w-full min-w-0">
            <WpLink href={homeHref} className="hover:text-primary transition-colors whitespace-nowrap shrink-0">{__('Startseite')}</WpLink>
            <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
            <WpLink href={listiclesHref} className="hover:text-primary transition-colors whitespace-nowrap shrink-0">{__('Hotelvergleiche')}</WpLink>
            <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
            <span className="text-slate-500 truncate min-w-0">{title}</span>
          </nav>
        </div>

        {/* Header section (stretches to max-w-5xl) */}
        <header className="text-center mb-8 max-w-5xl mx-auto">
          <span className="inline-block bg-[#929f5d]/10 text-[#929f5d] border border-[#929f5d]/15 text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-md mb-3">
            {badgeLabel}
          </span>
          <h1 className="text-2xl sm:text-3xl lg:text-5xl font-black tracking-tight text-slate-900 leading-tight mb-4 uppercase">
            {title}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-6 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 border-t border-b border-slate-100 py-2.5 max-w-2xl mx-auto">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#929f5d]" />
              <span className="text-slate-700">{author}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{__('Zuletzt aktualisiert:')} {date}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              <span>{readTime} {__('Min. Lesezeit')}</span>
            </div>
          </div>
        </header>

        {/* Hero image stretches to max-w-5xl */}
        <div className="w-full max-w-5xl mx-auto aspect-21/9 max-h-96 rounded-2xl overflow-hidden border border-slate-200/50 shadow-md mb-8">
          <img 
            src={featuredImage} 
            alt={title} 
            className="w-full h-full object-cover pointer-events-none"
          />
        </div>

        {/* Two column layout: Left (Article content), Right (Sticky Sidebar Quicklinks) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-5xl mx-auto items-start">
          {/* Main content area */}
          <article className="lg:col-span-8 space-y-6">
            <div className="bg-white border border-slate-200/50 shadow-xs rounded-2xl p-5 sm:p-8 overflow-hidden">
              {introText && (
                <div className="mb-6 p-4 sm:p-5 bg-[#929f5d]/5 border-l-4 border-primary rounded-r-2xl">
                  <p className="text-[#121416]/80 italic text-xs sm:text-sm font-medium leading-relaxed font-sans">
                    “{introText}”
                  </p>
                </div>
              )}

              {/* Mobile-only Quicklinks block shown under intro quote */}
              <div className="lg:hidden mb-6">
                <ListicleQuicklinks listicleId={id} />
              </div>

              <div 
                className="prose prose-slate prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-a:text-primary hover:prose-a:underline max-w-none text-slate-600 leading-relaxed font-sans text-sm"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </div>
          </article>

          {/* Sidebar Area with Sticky Quicklinks */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-6">
            <ListicleQuicklinks listicleId={id} />
          </aside>
        </div>

        {/* Standalone Ranked Hotels Section */}
        <div className="max-w-5xl mx-auto mt-12 pt-8">
          <ListicleRankedHotels listicleId={id} />
        </div>

        {/* Back Button */}
        <div className="max-w-5xl mx-auto pt-4 border-t border-slate-300/60 mt-12 flex justify-end">
          <WpLink 
            href={listiclesHref} 
            className="inline-flex items-center gap-2 px-6 py-3.5 border border-slate-200 hover:border-slate-800 text-slate-700 hover:text-slate-900 font-mono font-bold uppercase text-xs tracking-wider rounded-xl transition-all duration-300 group cursor-pointer bg-white"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            {backLabel}
          </WpLink>
        </div>
      </div>
    </main>
  );
}

export const editable = defineEditable({
  read_time: text({
    label: 'Read Time',
    default: '5',
  }),
  intro_text: text({
    label: 'Intro Text',
    default: 'Die Alpen beherbergen einige der spektakulärsten Spa-Oasen der Welt...',
  }),
  related_hotels: text({
    label: 'Related Hotels',
    default: '2,3,4,5',
    customType: 'relationship',
    postTypes: ['hotel'],
  }),
});


