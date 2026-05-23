import { WpHead } from "../.forgewp/wordpress";
import { Hydrate } from "@forgewp/react";
import { MiniHeader } from "../components/MiniHeader";
import { Navbar } from "../components/Navbar";
import { HeroSection } from "../components/HeroSection";
import { Star, MapPin } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen w-full bg-slate-50 font-sans selection:bg-primary selection:text-white">
      <WpHead
        title="Hotelchecker24 — Premium Hotel Directory & Listicles"
        description="Discover curated boutique and luxury hotels across Austria, Germany, Switzerland, and Italy."
        ogType="website"
      />

      {/* MINI TOP HEADER (Static, scrolls out) */}
      <MiniHeader />

      {/* NAVBAR (Sticky, Hydrated) */}
      <Hydrate trigger="load" className="sticky top-0 z-50 w-full">
        <Navbar />
      </Hydrate>

      {/* HERO SECTION */}
      <Hydrate trigger="visible">
        <HeroSection />
      </Hydrate>

      {/* Editorial Content Placeholder Section for visually stunning feedback */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-[#929f5d] bg-[#929f5d]/10 px-3 py-1 rounded-full">
            Demnächst Verfügbar
          </span>
          <h2 className="text-3xl font-sans font-black text-slate-800 uppercase tracking-tight mt-3">
            Aktuelle Hotel-Listicles & Empfehlungen
          </h2>
          <p className="text-slate-500 text-sm max-w-xl mx-auto mt-2">
            Unsere Redakteure reisen durch ganz Europa, um außergewöhnliche Übernachtungsorte für dich zu bewerten und zusammenzustellen.
          </p>
        </div>

        {/* Feature Grid placeholders (editorial style cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Die 10 besten Boutique-Hotels in Wien",
              country: "Österreich",
              image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80",
              category: "Boutique",
              rating: "4.9",
            },
            {
              title: "Luxuriöse Spa-Resorts in Südtirol",
              country: "Italien",
              image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
              category: "Wellness",
              rating: "4.8",
            },
            {
              title: "Außergewöhnliche Berg-Chalets in Zermatt",
              country: "Schweiz",
              image: "https://images.unsplash.com/photo-1502784444187-359ac186c5bb?auto=format&fit=crop&w=600&q=80",
              category: "Chalets",
              rating: "5.0",
            },
          ].map((item, idx) => (
            <div 
              key={idx} 
              className="bg-white border border-slate-100/80 rounded-3xl overflow-hidden shadow-md shadow-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group"
            >
              <div className="relative h-60 w-full overflow-hidden">
                <img 
                  src={item.image} 
                  alt={item.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-bold text-slate-800 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-primary" />
                  <span>{item.country}</span>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-md">
                    {item.category}
                  </span>
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                    {item.rating}
                  </span>
                </div>
                <h3 className="font-sans font-bold text-lg text-slate-800 hover:text-primary transition-colors leading-snug">
                  {item.title}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer minimal signature */}
      <footer className="bg-white border-t border-slate-100/80 py-8 px-4 sm:px-6 lg:px-8 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center">
            <img 
              src="/Logo/hotelchecker24-logo_farbe.svg" 
              className="h-8 w-auto opacity-70" 
              alt="Hotelchecker24" 
            />
          </div>
          <span className="text-slate-400 font-mono text-[10px] uppercase tracking-widest">
            © {new Date().getFullYear()} Hotelchecker24. Alle Rechte vorbehalten.
          </span>
        </div>
      </footer>
    </div>
  );
}
