import { useRoute } from 'wouter';
import {
  WpHead,
  WpLink,
  useWpQuery,
  useWpTitle,
  useWpContent,
  useWpExcerpt,
  useWpFeaturedImage,
  useWpCustomField,
} from '../../.forgewp/wordpress';
import {
  ChevronRight,
  MapPin,
  Star,
  ArrowLeft,
  User,
  DollarSign,
  Award,
  Globe,
  Mail,
  BookOpen,
} from 'lucide-react';

export function SingleHotelPage() {
  const [, params] = useRoute('/hotel/:id');
  const routeParam = params?.id;

  // In production, forgeWpHydration.currentPostId holds the real WP numeric ID
  const hydrationId =
    typeof window !== 'undefined'
      ? (window as any).forgeWpHydration?.currentPostId || 0
      : 0;
  const id = hydrationId || routeParam;

  // Local development mock query for single hotel
  const { posts } = useWpQuery({
    postType: 'hotel',
    postsPerPage: 100,
  });

  const devPost = posts.find(
    (p) => p.id === Number(id) || p.id === Number(hydrationId),
  );
  const postAny = devPost as any;

  // Isomorphic dynamic mapping (compiles directly to WP loops in production)
  const title = useWpTitle() || devPost?.title || 'Luxushotel';
  const content =
    useWpContent() || devPost?.content || '<p>Lade Hoteldetails...</p>';
  const excerpt = useWpExcerpt() || devPost?.excerpt || '';
  
  const rawImage = useWpFeaturedImage();
  const hydrationImage =
    typeof window !== 'undefined' && !(window as any)._forgeWpCompileTime
      ? (window as any).forgeWpHydration?.currentFeaturedImage || ''
      : '';
  const restImage =
    typeof devPost?.featuredImage === 'object' && devPost?.featuredImage !== null
      ? (devPost.featuredImage as any).url || ''
      : String(devPost?.featuredImage || '');
  const featuredImage =
    restImage ||
    hydrationImage ||
    rawImage ||
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80';

  // ACF Custom Fields
  const rating =
    useWpCustomField('rating') ||
    String(devPost?.customFields?.rating || '4.8');
  const priceRange =
    useWpCustomField('price_range') ||
    String(devPost?.customFields?.price_range || '$$$');
  const address =
    useWpCustomField('location') ||
    String(devPost?.customFields?.location || '');
  const starsVal =
    useWpCustomField('stars') || String(devPost?.customFields?.stars || '5');
  const stars = parseInt(starsVal, 10) || 5;


  // Extended ACF coordinates
  const website =
    useWpCustomField('website') || String(devPost?.customFields?.website || '');
  const email =
    useWpCustomField('contact_email') ||
    String(devPost?.customFields?.contact_email || '');

  // Terms mapping
  const categoryTerms = postAny?._terms?.category || [];
  const categoryName =
    categoryTerms.length > 0 ? categoryTerms[0].name : 'Boutique Hotel';

  // Relational Loop: Fetch all listicles and filter to those referencing this hotel
  const { posts: allListicles, loading: listiclesLoading } = useWpQuery({
    postType: 'listicle',
    postsPerPage: 100,
  });

  const matchingListicles = allListicles.filter((l: any) => {
    const related = l.customFields?.related_hotels;
    if (Array.isArray(related)) {
      return related.map(Number).includes(Number(id));
    }
    return false;
  });

  return (
    <main className="min-h-screen bg-[#fafaf8] selection:bg-primary selection:text-white font-sans select-none pb-24">
      <WpHead 
        title={title} 
        description={excerpt} 
      />
      
      <section className="relative h-[60vh] min-h-100 w-full overflow-hidden bg-slate-900 flex items-end">
        <img 
          src={featuredImage} 
          alt={title} 
          className="absolute inset-0 w-full h-full object-cover opacity-75 object-center pointer-events-none scale-105"
        />
        <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-900/40 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-24 bg-linear-to-b from-slate-950/40 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-12 relative z-10">
          <nav className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300 mb-6 bg-slate-950/20 backdrop-blur-xs py-2 px-4 rounded-full w-fit border border-white/5">
            <WpLink href="/" className="hover:text-primary transition-colors">Startseite</WpLink>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <WpLink href="/hotels" className="hover:text-primary transition-colors">Hotels</WpLink>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="text-slate-200 line-clamp-1">{title}</span>
          </nav>
          
          <div className="space-y-4 max-w-4xl">
            <div className="flex gap-1">
              {Array.from({ length: stars }).map((_, i) => (
                <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400 filter drop-shadow-md" />
              ))}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white uppercase leading-none">
              {title}
            </h1>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-widest pl-0.5">
              <MapPin className="w-4 h-4 text-[#929f5d] shrink-0" />
              <span>{address}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            <article className="bg-white border border-slate-200/50 shadow-xs rounded-2xl p-5 sm:p-7 overflow-hidden">
              <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-slate-950 mb-4 border-l-4 border-primary pl-4">
                Redaktionelle Bewertung
              </h3>
              <div 
                className="prose prose-slate prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-a:text-primary hover:prose-a:underline max-w-none text-slate-600 leading-relaxed font-sans text-sm"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </article>

            <section className="bg-white border border-slate-200/50 shadow-xs rounded-2xl p-5 sm:p-7">
              <h3 className="text-lg font-black uppercase tracking-tight text-slate-950 mb-1 pl-3 border-l-4 border-[#929f5d]">
                In Listicles erwähnt
              </h3>
              <p className="text-slate-400 text-[10px] font-mono font-bold uppercase tracking-wider mb-4 pl-3">
                Kuration &amp; Expertentipps
              </p>
              
              {listiclesLoading ? (
                <div className="py-8 text-center text-slate-400 text-sm">Lade Listicles...</div>
              ) : matchingListicles.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {matchingListicles.map((l: any) => (
                    <WpLink 
                      key={l.id}
                      href={`/listicle/${l.id}`}
                      className="flex items-center justify-between p-4 border border-slate-100 hover:border-slate-800 rounded-xl transition-all duration-300 group hover:shadow-xs cursor-pointer bg-slate-50/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all">
                          <BookOpen className="w-3.5 h-3.5 text-slate-500 group-hover:text-white" />
                        </div>
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-tight line-clamp-1">{l.title}</span>
                      </div>
                      <span className="text-slate-300 group-hover:text-slate-800 font-mono text-xs group-hover:translate-x-0.5 transition-transform">→</span>
                    </WpLink>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-sm font-sans border border-dashed border-slate-200 rounded-2xl">
                  Dieses Hotel wird aktuell in keinem unserer Listicles aufgeführt.
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-slate-200/50 shadow-xs rounded-2xl p-5 space-y-4 text-slate-800">
              <h4 className="text-[10px] font-mono font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">
                Hotel Spezifikationen
              </h4>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#929f5d]/10 flex items-center justify-center border border-[#929f5d]/20 shrink-0 text-primary">
                  <Award className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 leading-none">Expertenscore</div>
                  <div className="text-base font-black text-slate-900 mt-1 flex items-baseline gap-1 leading-none">
                    <span>{rating}</span>
                    <span className="text-[10px] text-slate-400">/ 5.0</span>
                  </div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-[#929f5d] mt-1 font-mono leading-none">Hervorragend</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shrink-0 text-amber-600">
                  <DollarSign className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 leading-none">Preiskategorie</div>
                  <div className="text-base font-black text-slate-900 mt-1 leading-none">{priceRange}</div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1 font-mono leading-none">Luxusstufe</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0 text-slate-700">
                  <User className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 leading-none">Kategorie</div>
                  <div className="text-sm font-black text-slate-900 mt-1 leading-none uppercase truncate max-w-32.5">{categoryName}</div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1 font-mono leading-none">Klassifizierung</div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200/50 shadow-xs rounded-2xl p-5 space-y-4">
              <h4 className="text-[10px] font-mono font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">
                Kontakt &amp; Buchung
              </h4>
              <div className="space-y-1">
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 leading-none">Hausanschrift</span>
                <p className="text-xs font-bold text-slate-800 leading-snug">{address}</p>
              </div>
              <div className="space-y-2 pt-1">
                {website && (
                  <a href={website} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between w-full p-3 border border-slate-100 hover:border-slate-800 rounded-xl transition-all duration-300 group hover:shadow-xs cursor-pointer bg-slate-50/20">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all">
                        <Globe className="w-3.5 h-3.5 text-slate-500 group-hover:text-white" />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">Website besuchen</span>
                    </div>
                    <span className="text-slate-300 group-hover:text-slate-800 font-mono text-xs group-hover:translate-x-0.5 transition-transform">→</span>
                  </a>
                )}
                {email && (
                  <a href={`mailto:${email}`} className="flex items-center justify-between w-full p-3 border border-slate-100 hover:border-slate-800 rounded-xl transition-all duration-300 group hover:shadow-xs cursor-pointer bg-slate-50/20">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all">
                        <Mail className="w-3.5 h-3.5 text-slate-500 group-hover:text-white" />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">Direktanfrage senden</span>
                    </div>
                    <span className="text-slate-300 group-hover:text-slate-800 font-mono text-xs group-hover:translate-x-0.5 transition-transform">→</span>
                  </a>
                )}
              </div>
              <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 h-9 px-4 w-full bg-primary hover:bg-primary/95 text-white font-bold text-[10px] uppercase tracking-wider py-4 rounded-xl cursor-pointer shadow-xs transition-all duration-300 active:scale-95 mt-2">
                Jetzt Aufenthalt anfragen
              </button>
            </div>

            <div className="pt-1">
              <WpLink 
                href="/hotels" 
                className="inline-flex items-center justify-center gap-2 w-full px-5 py-3.5 border border-slate-200 hover:border-slate-800 text-slate-700 hover:text-slate-900 font-mono font-bold uppercase text-[10px] tracking-wider rounded-xl transition-all duration-300 group cursor-pointer bg-white"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                Zurück zum Verzeichnis
              </WpLink>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}