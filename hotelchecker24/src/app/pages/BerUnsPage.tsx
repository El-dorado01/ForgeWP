import { WpHead, WpLink, useWpQuery, useWpI18n, useWpMeta, useWpPageLink, useWpLanguage, defineEditable, text, richText, BlockArea, image, repeater, WpRepeater, WpIcon } from '../../.forgewp/wordpress';
import {
  ChevronRight, Star,
  ArrowRight, BookOpen, MapPin,
} from 'lucide-react';

interface StatItem {
  value: string;
  label: string;
}

interface ValueItem {
  icon: string;
  title: string;
  description: string;
  color?: string;
}

interface TeamMember {
  name: string;
  role: string;
  bio: string;
  avatar: string | { url: string };
}

const getImageUrl = (imageVal: any) => {
  if (!imageVal) return '';
  if (typeof imageVal === 'string') return imageVal;
  return imageVal.url || '';
};

export function BerUnsPage() {
  const { __ } = useWpI18n();
  const { homeUrl } = useWpLanguage();
  const homeHref = homeUrl;
  const contactHref = useWpPageLink('kontakt-page', '/contact');
  const hotelsHref = useWpPageLink('hotels-page', '/hotels');
  const { posts: latestListicles } = useWpQuery({ postType: 'listicle', postsPerPage: 3 });

  // Hero Section
  const heroTitle = useWpMeta('hero_title', __('Wir kuratieren Ihr Reiseerlebnis'));
  const heroSubtitle = useWpMeta('hero_subtitle', __('Hotelchecker24 ist Österreichs führendes unabhängiges Magazin für Luxus- und Boutique-Hotels. Unser Redaktionsteam bereist die Welt, bewertet Hotels nach strengen Kriterien und teilt ehrliche, fundierte Empfehlungen.'));
  const heroImage1 = useWpMeta('hero_image_1', 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=500&q=80');
  const heroImage2 = useWpMeta('hero_image_2', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80');
  const heroBadge = useWpMeta('hero_badge', __('Seit 2019 — Das unabhängige Luxushotel-Magazin'));

  // Mission Section
  const missionBadge = useWpMeta('mission_badge', __('Unsere Mission'));
  const missionTitle = useWpMeta('mission_title', __('Ehrliche Empfehlungen.\nKeine Kompromisse.'));
  const missionContent = useWpMeta('mission_content', `<p>${__('Hotelchecker24 wurde 2019 in Wien gegründet, mit einem einfachen Versprechen: Hotels so zu bewerten, wie es eine gute Freundin mit Insider-Wissen tun würde — offen, ehrlich und ohne Werbeauftrag.')}</p><p>${__('Wir lehnen bezahlte Platzierungen und gesponserte Inhalte konsequent ab. Jedes Hotel, das wir empfehlen, hat unsere Redakteure persönlich überzeugt. Dafür nehmen wir uns die Zeit, die andere nicht aufwenden.')}</p><p>${__('Das Ergebnis: Eine kuratierte Auswahl an Unterkünften, der Sie vertrauen können — ob Stadtreise, Alpenerholung oder fernöstliches Abenteuer.')}</p>`);

  // Team Section
  const teamBadge = useWpMeta('team_badge', __('Das Team'));
  const teamTitle = useWpMeta('team_title', __('Unsere Redaktion'));
  const teamSubtitle = useWpMeta('team_subtitle', __('Ein kleines, leidenschaftliches Team von Reiseexperten, Journalisten und Hotelbewertungsprofis.'));

  return (
    <main className="min-h-screen bg-[#fafaf8] font-sans select-none">
      <WpHead
        title={__('Über uns — Hotelchecker24')}
        description={__('Erfahren Sie mehr über Hotelchecker24: das unabhängige Magazin für Luxushotels, Reiseziele und kuratierte Reiseberichte.')}
      />

      {/* Hero — compact light editorial */}
      <div className="relative overflow-hidden bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(109,155,174,0.13)_0%,transparent_70%)] blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(146,159,93,0.09)_0%,transparent_70%)] blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto z-10">
          <nav className="flex items-center gap-2 text-sm font-semibold text-slate-400 mb-4">
            <WpLink href={homeHref} className="hover:text-primary transition-colors">{__('Startseite')}</WpLink>
            <ChevronRight className="w-4 h-4" />
            <span className="text-slate-700">{__('Über uns')}</span>
          </nav>
          
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-center">
            {/* Left Column — Text & CTAs */}
            <div className="lg:col-span-3 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full mb-4">
                <Star className="w-3.5 h-3.5 fill-primary" />
                {heroBadge}
              </span>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase leading-none text-slate-900 mb-4 whitespace-pre-line">
                {heroTitle}
              </h1>
              <div 
                className="text-slate-500 text-sm sm:text-base leading-relaxed mb-6"
                dangerouslySetInnerHTML={{ __html: heroSubtitle }}
              />
              <div className="flex flex-wrap gap-3">
                {/* Discover Hotels Button with premium expand-bubble animation */}
                <WpLink
                  href={hotelsHref}
                  className="relative overflow-hidden inline-flex items-center justify-center border border-primary text-primary font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl transition-colors duration-500 group hover:text-white select-none bg-transparent hover:bg-transparent shadow-none cursor-pointer active:scale-95 shrink-0"
                >
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 bg-primary rounded-full transition-all duration-750 ease-out group-hover:w-[320px] group-hover:h-[320px] group-hover:bottom-[-100px] z-0" />
                  <span className="relative z-10 flex items-center gap-2">
                    {__('Hotels entdecken')}
                    <ArrowRight className="w-4 h-4 text-primary group-hover:text-white transition-colors duration-500" />
                  </span>
                </WpLink>
                <WpLink
                  href={contactHref}
                  className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                >
                  {__('Kontakt aufnehmen')}
                </WpLink>
              </div>
            </div>

            {/* Right Column — Editorial Photo Stack */}
            <div className="lg:col-span-2 relative hidden lg:flex items-center justify-center h-[340px] select-none">
              {/* Back Card */}
              <div className="absolute top-4 right-10 w-64 h-72 rounded-2xl overflow-hidden shadow-lg border-4 border-white rotate-6 hover:rotate-2 transition-transform duration-500 ease-out">
                <img 
                  src={getImageUrl(heroImage1)} 
                  alt="Resort Pool" 
                  className="w-full h-full object-cover select-none pointer-events-none"
                />
              </div>
              {/* Front Card */}
              <div className="absolute bottom-4 left-6 w-60 h-64 rounded-2xl overflow-hidden shadow-2xl border-4 border-white -rotate-6 hover:rotate-0 transition-transform duration-500 ease-out z-10">
                <img 
                  src={getImageUrl(heroImage2)} 
                  alt="Luxury Suite" 
                  className="w-full h-full object-cover select-none pointer-events-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            <WpRepeater
              name="stats"
              defaultValue={[
                { value: '500+', label: __('Hotels bewertet') },
                { value: '40', label: __('Länder') },
                { value: '80k', label: __('Leser / Monat') },
                { value: '6', label: __('Jahre Erfahrung') },
              ]}
            >
              {(row: StatItem, index) => (
                <div key={index} className="space-y-1">
                  <div className="text-2xl font-black text-slate-900 tracking-tight">{row.value}</div>
                  <div className="text-xs font-semibold text-slate-400">{row.label}</div>
                </div>
              )}
            </WpRepeater>
          </div>
        </div>
      </div>

      {/* Mission */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-primary mb-3 block">{missionBadge}</span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight uppercase text-slate-900 leading-tight mb-5 whitespace-pre-line">
              {missionTitle}
            </h2>
            <div 
              className="space-y-4 text-slate-600 text-sm sm:text-base leading-relaxed"
              dangerouslySetInnerHTML={{ __html: missionContent }}
            />

            <BlockArea name="about-editorial-story" />
            <WpLink
              href="/hotelvergleiche"
              className="inline-flex items-center gap-2 mt-6 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all cursor-pointer group"
            >
              <BookOpen className="w-4 h-4" />
              {__('Unsere Berichte lesen')}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </WpLink>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <WpRepeater
              name="values"
              defaultValue={[
                {
                  icon: 'award',
                  title: __('Unabhängige Bewertung'),
                  description: __('Alle Hotels werden anonym von unseren Redakteuren besucht — keine bezahlten Platzierungen.'),
                  color: 'text-primary bg-primary/10 border-primary/20',
                },
                {
                  icon: 'shield',
                  title: __('Vertrauen & Transparenz'),
                  description: __('Unsere Kriterien sind öffentlich einsehbar. Wir legen offen, nach welchen Maßstäben wir urteilen.'),
                  color: 'text-blue-600 bg-blue-50 border-blue-100',
                },
                {
                  icon: 'globe',
                  title: __('Globale Reichweite'),
                  description: __('Über 500 Hotels in 40 Ländern bewertet — von Stadthotels bis zu abgelegenen Luxusresorts.'),
                  color: 'text-[#929f5d] bg-[#929f5d]/10 border-[#929f5d]/20',
                },
                {
                  icon: 'users',
                  title: __('Community-First'),
                  description: __('Mehr als 80.000 monatliche Leser vertrauen unseren Empfehlungen für ihre Reiseentscheidungen.'),
                  color: 'text-amber-600 bg-amber-50 border-amber-100',
                },
              ]}
            >
              {(row: ValueItem, index) => (
                <div key={index} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-3 ${row.color || 'text-primary bg-primary/10 border-primary/20'}`}>
                    <WpIcon name={row.icon} className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-slate-900 mb-1.5 leading-snug">{row.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">{row.description}</p>
                </div>
              )}
            </WpRepeater>
          </div>
        </div>
      </div>

      {/* Team */}
      <div className="bg-white border-t border-b border-slate-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary mb-2 block">{teamBadge}</span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight uppercase text-slate-900">
              {teamTitle}
            </h2>
            <p className="text-slate-400 text-sm mt-2 max-w-xl mx-auto">
              {teamSubtitle}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <WpRepeater
              name="team_members"
              defaultValue={[
                {
                  name: 'Isabella von Habsburg',
                  role: __('Chefredakteurin'),
                  bio: __('Über 15 Jahre Erfahrung in der Luxushotellerie. Spezialisiert auf alpinen Wellness-Tourismus.'),
                  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
                },
                {
                  name: 'Matteo Bianchi',
                  role: __('Reiseredakteur'),
                  bio: __('Kenner des mediterranen Raums. Hat über 200 Hotels in Italien, Griechenland und Spanien bewertet.'),
                  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
                },
                {
                  name: 'Sophie Lehmann',
                  role: __('Destinations-Expertin'),
                  bio: __('Spezialistin für City-Hotels und Boutique-Unterkünfte im deutschsprachigen Raum.'),
                  avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80',
                },
                {
                  name: 'Lars Eriksson',
                  role: __('Nordeuropa-Korrespondent'),
                  bio: __('Reist für uns durch Skandinavien und berichtet über Design-Hotels und Naturresorts.'),
                  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
                },
              ]}
            >
              {(row: TeamMember, index) => (
                <div
                  key={index}
                  className="bg-slate-50/70 border border-slate-100/90 rounded-3xl p-6 text-center hover:shadow-xl hover:-translate-y-1.5 hover:bg-white hover:border-primary/20 transition-all duration-300 group relative overflow-hidden flex flex-col items-center"
                >
                  {/* Accent hover background blob */}
                  <div className="absolute top-0 right-0 w-28 h-28 bg-[radial-gradient(circle,rgba(146,159,93,0.08)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  
                  {/* Avatar Frame with custom borders */}
                  <div className="w-24 h-24 rounded-2xl overflow-hidden mb-4 p-1 border border-slate-200 group-hover:border-primary transition-colors duration-300 shadow-xs relative">
                    <img src={getImageUrl(row.avatar)} alt={row.name} className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  
                  <h3 className="font-black text-slate-900 text-base uppercase tracking-tight group-hover:text-primary transition-colors duration-200">{row.name}</h3>
                  <p className="text-xs font-mono font-bold uppercase tracking-wider text-primary mt-0.5 mb-3">{row.role}</p>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-[200px]">{row.bio}</p>
                </div>
              )}
            </WpRepeater>
          </div>
        </div>
      </div>

      {/* Latest articles teaser */}
      {latestListicles.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-primary mb-1 block">{__('Aus der Redaktion')}</span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight uppercase text-slate-900">{__('Aktuelle Berichte')}</h2>
            </div>
            <WpLink
              href="/hotelvergleiche"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-primary transition-colors group"
            >
              {__('Alle anzeigen')} <ArrowRight className="w-3.5 h-3.5 group-hover:-rotate-45 transition-transform duration-300" />
            </WpLink>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {latestListicles.map((listicle) => {
              const imageUrl =
                typeof listicle.featuredImage === 'object' && listicle.featuredImage !== null
                  ? (listicle.featuredImage as any).url || ''
                  : String(listicle.featuredImage || '');
              const readTime = listicle.customFields?.read_time || '5';
              const catTerms: any[] = (listicle as any)._terms?.category || [];

              return (
                <WpLink
                  key={listicle.id}
                  href={listicle.permalink || `/hotelvergleich/${listicle.id}`}
                  className="group bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1.5 hover:border-primary/20 transition-all duration-300 flex flex-col"
                >
                  {/* Image wrapper */}
                  <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                    <img
                      src={imageUrl}
                      alt={listicle.title}
                      className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
                      loading="lazy"
                    />
                    {/* Gradient overlay on hover */}
                    <div className="absolute inset-0 bg-linear-to-t from-slate-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Category badges */}
                    {catTerms.length > 0 && (
                      <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap z-10">
                        {catTerms.slice(0, 1).map((t) => (
                          <span
                            key={t.slug}
                            className="text-[10px] font-semibold bg-white/95 backdrop-blur-xs text-slate-700 px-2 py-0.5 rounded-md shadow-xs"
                          >
                            {t.name}
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Read time badge */}
                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/95 backdrop-blur-xs text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-xs z-10">
                      <BookOpen className="w-3 h-3 text-slate-400" />
                      <span>{readTime} {__('Min.')}</span>
                    </div>
                  </div>
                  
                  {/* Card Content */}
                  <div className="p-5 flex flex-col grow">
                    <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors text-sm leading-snug line-clamp-2 grow mb-4">
                      {listicle.title}
                    </h3>
                    <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-primary">{__('Artikel lesen')}</span>
                      <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-300">
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:-rotate-45 transition-transform duration-300" />
                      </div>
                    </div>
                  </div>
                </WpLink>
              );
            })}
          </div>
          <div className="text-center mt-6 sm:hidden">
            <WpLink
              href="/hotelvergleiche"
              className="inline-flex items-center gap-2 bg-slate-950 text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl"
            >
              {__('Alle Berichte')} <ArrowRight className="w-4 h-4" />
            </WpLink>
          </div>
        </div>
      )}

      {/* CTA Strip — brand-authentic dark using bg-[#121416] with radial blobs, matching SiteFooter */}
      <div className="relative overflow-hidden bg-[#121416] text-white py-14 px-4 sm:px-6 lg:px-8">
        {/* Radial ambient glows */}
        <div className="absolute -bottom-20 -right-20 w-[450px] h-[450px] bg-[radial-gradient(circle,rgba(109,155,174,0.20)_0%,transparent_70%)] blur-[100px] pointer-events-none" />
        <div className="absolute -top-20 -left-20 w-[350px] h-[350px] bg-[radial-gradient(circle,rgba(146,159,93,0.16)_0%,transparent_70%)] blur-[80px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center z-10">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight uppercase mb-3">
            {__('Ihr nächstes')} <span className="text-primary">{__('Traumhotel')}</span><br />{__('wartet auf Sie')}
          </h2>
          <p className="text-[#b3b8bc] text-sm mb-8 max-w-xl mx-auto">
            {__('Entdecken Sie unsere kuratierte Auswahl an Luxushotels, Boutique-Resorts und einzigartigen Unterkünften weltweit.')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <WpLink
              href={hotelsHref}
              className="relative overflow-hidden inline-flex items-center justify-center border border-primary text-primary font-bold text-sm uppercase tracking-wider px-8 py-4 rounded-xl transition-colors duration-500 group hover:text-white select-none bg-transparent hover:bg-transparent shadow-none cursor-pointer active:scale-95 shrink-0"
            >
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 bg-primary rounded-full transition-all duration-750 ease-out group-hover:w-[320px] group-hover:h-[320px] group-hover:bottom-[-100px] z-0" />
              <span className="relative z-10 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary group-hover:text-white transition-colors duration-500" />
                {__('Hotels entdecken')}
              </span>
            </WpLink>
            <WpLink
              href={contactHref}
              className="inline-flex items-center gap-2 bg-white/8 hover:bg-white/15 text-white border border-white/12 font-bold text-sm uppercase tracking-wider px-8 py-4 rounded-xl transition-all cursor-pointer"
            >
              {__('Kontakt aufnehmen')}
            </WpLink>
          </div>
        </div>
      </div>
    </main>
  );
}

export const editable = defineEditable({
  hero_badge: text({
    label: 'Hero Badge',
    default: 'Seit 2019 — Das unabhängige Luxushotel-Magazin',
  }),
  hero_title: text({
    label: 'Hero Title',
    default: 'Wir kuratieren Ihr Reiseerlebnis',
  }),
  hero_subtitle: richText({
    label: 'Hero Subtitle',
    default: 'Hotelchecker24 ist Österreichs führendes unabhängiges Magazin für Luxus- und Boutique-Hotels. Unser Redaktionsteam bereist die Welt, bewertet Hotels nach strengen Kriterien und teilt ehrliche, fundierte Empfehlungen.',
  }),
  hero_image_1: image({
    label: 'Hero Image 1 (Back)',
    default: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=500&q=80',
  }),
  hero_image_2: image({
    label: 'Hero Image 2 (Front)',
    default: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80',
  }),
  stats: repeater({
    label: 'Stats',
    fields: {
      value: text({ label: 'Value' }),
      label: text({ label: 'Label' }),
    },
    default: [
      { value: '500+', label: 'Hotels bewertet' },
      { value: '40', label: 'Länder' },
      { value: '80k', label: 'Leser / Monat' },
      { value: '6', label: 'Jahre Erfahrung' },
    ],
  }),
  mission_badge: text({
    label: 'Mission Badge',
    default: 'Unsere Mission',
  }),
  mission_title: text({
    label: 'Mission Title',
    default: 'Ehrliche Empfehlungen.\nKeine Kompromisse.',
  }),
  mission_content: richText({
    label: 'Mission Content',
    default: '<p>Hotelchecker24 wurde 2019 in Wien gegründet, mit einem einfachen Versprechen: Hotels so zu bewerten, wie es eine gute Freundin mit Insider-Wissen tun würde — offen, ehrlich und ohne Werbeauftrag.</p><p>Wir lehnen bezahlte Platzierungen und gesponserte Inhalte konsequent ab. Jedes Hotel, das wir empfehlen, hat unsere Redakteure persönlich überzeugt. Dafür nehmen wir uns die Zeit, die andere nicht aufwenden.</p><p>Das Ergebnis: Eine kuratierte Auswahl an Unterkünften, der Sie vertrauen können — ob Stadtreise, Alpenerholung oder fernöstliches Abenteuer.</p>',
  }),
  values: repeater({
    label: 'Values',
    fields: {
      icon: text({ label: 'Icon (award, shield, globe, users)' }),
      title: text({ label: 'Title' }),
      description: text({ label: 'Description' }),
      color: text({ label: 'Color Classes' }),
    },
    default: [
      {
        icon: 'award',
        title: 'Unabhängige Bewertung',
        description: 'Alle Hotels werden anonym von unseren Redakteuren besucht — keine bezahlten Platzierungen.',
        color: 'text-primary bg-primary/10 border-primary/20',
      },
      {
        icon: 'shield',
        title: 'Vertrauen & Transparenz',
        description: 'Unsere Kriterien sind öffentlich einsehbar. Wir legen offen, nach welchen Maßstäben wir urteilen.',
        color: 'text-blue-600 bg-blue-50 border-blue-100',
      },
      {
        icon: 'globe',
        title: 'Globale Reichweite',
        description: 'Über 500 Hotels in 40 Ländern bewertet — von Stadthotels bis zu abgelegenen Luxusresorts.',
        color: 'text-[#929f5d] bg-[#929f5d]/10 border-[#929f5d]/20',
      },
      {
        icon: 'users',
        title: 'Community-First',
        description: 'Mehr als 80.000 monatliche Leser vertrauen unseren Empfehlungen für ihre Reiseentscheidungen.',
        color: 'text-amber-600 bg-amber-50 border-amber-100',
      },
    ],
  }),
  team_badge: text({
    label: 'Team Badge',
    default: 'Das Team',
  }),
  team_title: text({
    label: 'Team Title',
    default: 'Unsere Redaktion',
  }),
  team_subtitle: text({
    label: 'Team Subtitle',
    default: 'Ein kleines, leidenschaftliches Team von Reiseexperten, Journalisten und Hotelbewertungsprofis.',
  }),
  team_members: repeater({
    label: 'Team Members',
    fields: {
      name: text({ label: 'Name' }),
      role: text({ label: 'Role' }),
      bio: text({ label: 'Biography' }),
      avatar: image({ label: 'Avatar Image' }),
    },
    default: [
      {
        name: 'Isabella von Habsburg',
        role: 'Chefredakteurin',
        bio: 'Über 15 Jahre Erfahrung in der Luxushotellerie. Spezialisiert auf alpinen Wellness-Tourismus.',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
      },
      {
        name: 'Matteo Bianchi',
        role: 'Reiseredakteur',
        bio: 'Kenner des mediterranen Raums. Hat über 200 Hotels in Italien, Griechenland und Spanien bewertet.',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      },
      {
        name: 'Sophie Lehmann',
        role: 'Destinations-Expertin',
        bio: 'Spezialistin für City-Hotels und Boutique-Unterkünfte im deutschsprachigen Raum.',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80',
      },
      {
        name: 'Lars Eriksson',
        role: 'Nordeuropa-Korrespondent',
        bio: 'Reist für uns durch Skandinavien und berichtet über Design-Hotels und Naturresorts.',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
      },
    ],
  }),
});
