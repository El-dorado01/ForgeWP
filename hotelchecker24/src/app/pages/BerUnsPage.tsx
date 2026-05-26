import { WpHead, WpLink, useWpQuery } from '../../.forgewp/wordpress';
import {
  ChevronRight, Award, Globe, Users, Shield, Star,
  ArrowRight, BookOpen, MapPin,
} from 'lucide-react';

const TEAM = [
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
];

const VALUES = [
  {
    icon: Award,
    title: 'Unabhängige Bewertung',
    description: 'Alle Hotels werden anonym von unseren Redakteuren besucht — keine bezahlten Platzierungen.',
    color: 'text-primary bg-primary/10 border-primary/20',
  },
  {
    icon: Shield,
    title: 'Vertrauen & Transparenz',
    description: 'Unsere Kriterien sind öffentlich einsehbar. Wir legen offen, nach welchen Maßstäben wir urteilen.',
    color: 'text-blue-600 bg-blue-50 border-blue-100',
  },
  {
    icon: Globe,
    title: 'Globale Reichweite',
    description: 'Über 500 Hotels in 40 Ländern bewertet — von Stadthotels bis zu abgelegenen Luxusresorts.',
    color: 'text-[#929f5d] bg-[#929f5d]/10 border-[#929f5d]/20',
  },
  {
    icon: Users,
    title: 'Community-First',
    description: 'Mehr als 80.000 monatliche Leser vertrauen unseren Empfehlungen für ihre Reiseentscheidungen.',
    color: 'text-amber-600 bg-amber-50 border-amber-100',
  },
];

export function BerUnsPage() {
  const { posts: latestListicles } = useWpQuery({ postType: 'listicle', postsPerPage: 3 });

  return (
    <main className="min-h-screen bg-[#fafaf8] font-sans select-none">
      <WpHead
        title="Über uns — Hotelchecker24"
        description="Erfahren Sie mehr über Hotelchecker24: das unabhängige Magazin für Luxushotels, Reiseziele und kuratierte Reiseberichte."
      />

      {/* Hero — compact light editorial */}
      <div className="relative overflow-hidden bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(109,155,174,0.13)_0%,transparent_70%)] blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(146,159,93,0.09)_0%,transparent_70%)] blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto z-10">
          <nav className="flex items-center gap-2 text-sm font-semibold text-slate-400 mb-4">
            <WpLink href="/" className="hover:text-primary transition-colors">Startseite</WpLink>
            <ChevronRight className="w-4 h-4" />
            <span className="text-slate-700">Über uns</span>
          </nav>
          
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-center">
            {/* Left Column — Text & CTAs */}
            <div className="lg:col-span-3 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full mb-4">
                <Star className="w-3.5 h-3.5 fill-primary" />
                Seit 2019 — Das unabhängige Luxushotel-Magazin
              </span>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase leading-none text-slate-900 mb-4">
                Wir kuratieren<br />
                <span className="text-primary">Ihr Reiseerlebnis</span>
              </h1>
              <p className="text-slate-500 text-sm sm:text-base leading-relaxed mb-6">
                Hotelchecker24 ist Österreichs führendes unabhängiges Magazin für Luxus- und Boutique-Hotels.
                Unser Redaktionsteam bereist die Welt, bewertet Hotels nach strengen Kriterien und teilt
                ehrliche, fundierte Empfehlungen.
              </p>
              <div className="flex flex-wrap gap-3">
                {/* Discover Hotels Button with premium expand-bubble animation */}
                <WpLink
                  href="/hotels"
                  className="relative overflow-hidden inline-flex items-center justify-center border border-primary text-primary font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl transition-colors duration-500 group hover:text-white select-none bg-transparent hover:bg-transparent shadow-none cursor-pointer active:scale-95 shrink-0"
                >
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 bg-primary rounded-full transition-all duration-750 ease-out group-hover:w-[320px] group-hover:h-[320px] group-hover:bottom-[-100px] z-0" />
                  <span className="relative z-10 flex items-center gap-2">
                    Hotels entdecken
                    <ArrowRight className="w-4 h-4 text-primary group-hover:text-white transition-colors duration-500" />
                  </span>
                </WpLink>
                <WpLink
                  href="/kontakt"
                  className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                >
                  Kontakt aufnehmen
                </WpLink>
              </div>
            </div>

            {/* Right Column — Editorial Photo Stack */}
            <div className="lg:col-span-2 relative hidden lg:flex items-center justify-center h-[340px] select-none">
              {/* Back Card */}
              <div className="absolute top-4 right-10 w-64 h-72 rounded-2xl overflow-hidden shadow-lg border-4 border-white rotate-6 hover:rotate-2 transition-transform duration-500 ease-out">
                <img 
                  src="https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=500&q=80" 
                  alt="Resort Pool" 
                  className="w-full h-full object-cover select-none pointer-events-none"
                />
              </div>
              {/* Front Card */}
              <div className="absolute bottom-4 left-6 w-60 h-64 rounded-2xl overflow-hidden shadow-2xl border-4 border-white -rotate-6 hover:rotate-0 transition-transform duration-500 ease-out z-10">
                <img 
                  src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80" 
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
            {[
              { value: '500+', label: 'Hotels bewertet' },
              { value: '40', label: 'Länder' },
              { value: '80k', label: 'Leser / Monat' },
              { value: '6', label: 'Jahre Erfahrung' },
            ].map(({ value, label }) => (
              <div key={label} className="space-y-1">
                <div className="text-2xl font-black text-slate-900 tracking-tight">{value}</div>
                <div className="text-xs font-semibold text-slate-400">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mission */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-primary mb-3 block">Unsere Mission</span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight uppercase text-slate-900 leading-tight mb-5">
              Ehrliche Empfehlungen.<br />Keine Kompromisse.
            </h2>
            <div className="space-y-4 text-slate-600 text-sm sm:text-base leading-relaxed">
              <p>
                Hotelchecker24 wurde 2019 in Wien gegründet, mit einem einfachen Versprechen: Hotels so zu bewerten,
                wie es eine gute Freundin mit Insider-Wissen tun würde — offen, ehrlich und ohne Werbeauftrag.
              </p>
              <p>
                Wir lehnen bezahlte Platzierungen und gesponserte Inhalte konsequent ab. Jedes Hotel,
                das wir empfehlen, hat unsere Redakteure persönlich überzeugt. Dafür nehmen wir uns die Zeit,
                die andere nicht aufwenden.
              </p>
              <p>
                Das Ergebnis: Eine kuratierte Auswahl an Unterkünften, der Sie vertrauen können —
                ob Stadtreise, Alpenerholung oder fernöstliches Abenteuer.
              </p>
            </div>
            <WpLink
              href="/listicles"
              className="inline-flex items-center gap-2 mt-6 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all cursor-pointer group"
            >
              <BookOpen className="w-4 h-4" />
              Unsere Berichte lesen
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </WpLink>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {VALUES.map(({ icon: Icon, title, description, color }) => (
              <div key={title} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-3 ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-slate-900 mb-1.5 leading-snug">{title}</h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team */}
      <div className="bg-white border-t border-b border-slate-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary mb-2 block">Das Team</span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight uppercase text-slate-900">
              Unsere Redaktion
            </h2>
            <p className="text-slate-400 text-sm mt-2 max-w-xl mx-auto">
              Ein kleines, leidenschaftliches Team von Reiseexperten, Journalisten und Hotelbewertungsprofis.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TEAM.map((member) => (
              <div
                key={member.name}
                className="bg-slate-50/70 border border-slate-100/90 rounded-3xl p-6 text-center hover:shadow-xl hover:-translate-y-1.5 hover:bg-white hover:border-primary/20 transition-all duration-300 group relative overflow-hidden flex flex-col items-center"
              >
                {/* Accent hover background blob */}
                <div className="absolute top-0 right-0 w-28 h-28 bg-[radial-gradient(circle,rgba(146,159,93,0.08)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                {/* Avatar Frame with custom borders */}
                <div className="w-24 h-24 rounded-2xl overflow-hidden mb-4 p-1 border border-slate-200 group-hover:border-primary transition-colors duration-300 shadow-xs relative">
                  <img src={member.avatar} alt={member.name} className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-500" />
                </div>
                
                <h3 className="font-black text-slate-900 text-base uppercase tracking-tight group-hover:text-primary transition-colors duration-200">{member.name}</h3>
                <p className="text-xs font-mono font-bold uppercase tracking-wider text-primary mt-0.5 mb-3">{member.role}</p>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-[200px]">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Latest articles teaser */}
      {latestListicles.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-primary mb-1 block">Aus der Redaktion</span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight uppercase text-slate-900">Aktuelle Berichte</h2>
            </div>
            <WpLink
              href="/listicles"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-primary transition-colors group"
            >
              Alle anzeigen <ArrowRight className="w-3.5 h-3.5 group-hover:-rotate-45 transition-transform duration-300" />
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
                  href={listicle.permalink || `/listicle/${listicle.id}`}
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
                      <span>{readTime} Min.</span>
                    </div>
                  </div>
                  
                  {/* Card Content */}
                  <div className="p-5 flex flex-col grow">
                    <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors text-sm leading-snug line-clamp-2 grow mb-4">
                      {listicle.title}
                    </h3>
                    <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-primary">Artikel lesen</span>
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
              href="/listicles"
              className="inline-flex items-center gap-2 bg-slate-950 text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl"
            >
              Alle Berichte <ArrowRight className="w-4 h-4" />
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
            Ihr nächstes <span className="text-primary">Traumhotel</span><br />wartet auf Sie
          </h2>
          <p className="text-[#b3b8bc] text-sm mb-8 max-w-xl mx-auto">
            Entdecken Sie unsere kuratierte Auswahl an Luxushotels, Boutique-Resorts und einzigartigen Unterkünften weltweit.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <WpLink
              href="/hotels"
              className="relative overflow-hidden inline-flex items-center justify-center border border-primary text-primary font-bold text-sm uppercase tracking-wider px-8 py-4 rounded-xl transition-colors duration-500 group hover:text-white select-none bg-transparent hover:bg-transparent shadow-none cursor-pointer active:scale-95 shrink-0"
            >
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 bg-primary rounded-full transition-all duration-750 ease-out group-hover:w-[320px] group-hover:h-[320px] group-hover:bottom-[-100px] z-0" />
              <span className="relative z-10 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary group-hover:text-white transition-colors duration-500" />
                Hotels entdecken
              </span>
            </WpLink>
            <WpLink
              href="/kontakt"
              className="inline-flex items-center gap-2 bg-white/8 hover:bg-white/15 text-white border border-white/12 font-bold text-sm uppercase tracking-wider px-8 py-4 rounded-xl transition-all cursor-pointer"
            >
              Kontakt aufnehmen
            </WpLink>
          </div>
        </div>
      </div>
    </main>
  );
}
