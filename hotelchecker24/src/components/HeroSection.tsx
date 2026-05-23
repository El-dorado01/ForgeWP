import React from "react";
import { Search, MapPin, Sparkles, Navigation, ArrowRight } from "lucide-react";

export function HeroSection() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("");
  const [selectedCountry, setSelectedCountry] = React.useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Redirect or search trigger locally
    const params = new URLSearchParams();
    if (searchTerm) params.append("s", searchTerm);
    if (selectedCategory) params.append("category", selectedCategory);
    if (selectedCountry) params.append("country", selectedCountry);
    window.location.href = `/hotels?${params.toString()}`;
  };

  return (
    <section className="relative w-full overflow-hidden bg-slate-50 selection:bg-primary selection:text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
      {/* Editorial Magma/Steel Blue Blob Gradients */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(109,155,174,0.15)_0%,transparent_70%)] blur-3xl pointer-events-none z-0" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(146,159,93,0.1)_0%,transparent_70%)] blur-3xl pointer-events-none z-0" />

      <div className="relative max-w-5xl mx-auto text-center z-10">
        
        {/* Subtle Pill Tag */}
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-3.5 py-1.5 rounded-full mb-6 animate-fade-in">
          <Sparkles className="w-3.5 h-3.5 text-accent fill-accent" />
          <span className="font-sans text-xs font-bold text-primary tracking-wide uppercase">
            Exklusive Hotel-Empfehlungen
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-sans font-black tracking-tight text-slate-800 leading-[1.1] mb-6 max-w-4xl mx-auto uppercase">
          Entdecke handverlesene <br />
          <span className="bg-linear-to-r from-primary via-slate-700 to-accent bg-clip-text text-transparent">
            Boutique & Luxushotels
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-slate-500 text-base sm:text-lg max-w-2xl mx-auto mb-12 font-sans font-normal leading-relaxed">
          Hotelchecker24 ist deine unabhängige, zweisprachige Magazin-Plattform für außergewöhnliche Aufenthalte. Entdecke kuratierte Empfehlungen und fundierte Reviews.
        </p>

        {/* Search & Filter Card (Shadcn-inspired Editorial Board) */}
        <form 
          onSubmit={handleSearchSubmit}
          className="w-full max-w-4xl mx-auto bg-white border border-slate-100/80 shadow-xl shadow-slate-200/40 p-4 sm:p-5 rounded-3xl grid grid-cols-1 md:grid-cols-12 gap-4 items-center"
        >
          
          {/* SEARCH INPUT */}
          <div className="md:col-span-4 relative flex items-center h-12 px-3 border border-slate-100 rounded-2xl hover:border-slate-200 focus-within:border-primary/60 transition-colors">
            <Search className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
            <input
              type="text"
              placeholder="Hotelname oder Ort suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-full text-slate-800 text-sm font-medium bg-transparent focus:outline-none placeholder-slate-400"
            />
          </div>

          {/* CATEGORY FILTER */}
          <div className="md:col-span-3 relative flex items-center h-12 px-3 border border-slate-100 rounded-2xl hover:border-slate-200 focus-within:border-primary/60 transition-colors">
            <Navigation className="w-4 h-4 text-slate-400 shrink-0 mr-3" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-full text-slate-700 text-sm font-semibold bg-transparent focus:outline-none cursor-pointer appearance-none"
            >
              <option value="">Kategorie (Alle)</option>
              <option value="boutique">Boutique Hotels</option>
              <option value="wellness">Wellness & Spa</option>
              <option value="family">Familienhotels</option>
              <option value="adults-only">Adults Only</option>
              <option value="business">Business & Work</option>
            </select>
            <div className="absolute right-3 pointer-events-none text-slate-400 text-xs">▼</div>
          </div>

          {/* COUNTRY FILTER */}
          <div className="md:col-span-3 relative flex items-center h-12 px-3 border border-slate-100 rounded-2xl hover:border-slate-200 focus-within:border-primary/60 transition-colors">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0 mr-3" />
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full h-full text-slate-700 text-sm font-semibold bg-transparent focus:outline-none cursor-pointer appearance-none"
            >
              <option value="">Land (Alle)</option>
              <option value="austria">🇦🇹 Österreich</option>
              <option value="germany">🇩🇪 Deutschland</option>
              <option value="switzerland">🇨🇭 Schweiz</option>
              <option value="italy">🇮🇹 Italien</option>
            </select>
            <div className="absolute right-3 pointer-events-none text-slate-400 text-xs">▼</div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-sans font-semibold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all duration-300 transform active:scale-95 group cursor-pointer"
            >
              <span>Suchen</span>
              <ArrowRight className="w-4 h-4 text-accent group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </form>

        {/* Quick Category Anchors */}
        <div className="mt-8 flex flex-wrap justify-center gap-2.5">
          {["Wellness", "Boutique", "Design", "Alpen", "Luxus"].map((tag) => (
            <button
              key={tag}
              onClick={() => {
                setSelectedCategory(tag.toLowerCase());
              }}
              className="text-xs font-semibold text-slate-500 hover:text-primary hover:border-primary/40 border border-slate-200 bg-white py-1.5 px-3 rounded-full cursor-pointer transition-colors"
            >
              #{tag}
            </button>
          ))}
        </div>

      </div>
    </section>
  );
}
