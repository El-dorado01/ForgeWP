import React from 'react';
import { WpHead, useWpSearch, useWpLocation, useWpQuery } from '../../.forgewp/wordpress';
import { HotelsGrid } from '../../components/HotelsGrid';
import { Search, SlidersHorizontal, MapPin, Tag, ChevronRight } from 'lucide-react';
import { WpLink } from '../../.forgewp/wordpress';

export function HotelsPage() {
  const searchString = useWpSearch();
  const [, setLocation] = useWpLocation();
  const params = React.useMemo(() => new URLSearchParams(searchString), [searchString]);

  const keyword = params.get('s') || '';
  const country = params.get('country') || '';
  const category = params.get('category') || '';

  const [searchInput, setSearchInput] = React.useState(keyword);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  // Collect unique countries and categories from hotels data
  const { posts: allHotels } = useWpQuery({ postType: 'hotel', postsPerPage: 100 });

  const countries = React.useMemo(() => {
    const set = new Map<string, string>();
    allHotels.forEach((h) => {
      const terms = (h as any)._terms?.country || [];
      terms.forEach((t: any) => set.set(t.slug, t.name));
    });
    return Array.from(set.entries()).map(([slug, name]) => ({ slug, name }));
  }, [allHotels]);

  const categories = React.useMemo(() => {
    const set = new Map<string, string>();
    allHotels.forEach((h) => {
      const terms = (h as any)._terms?.category || [];
      terms.forEach((t: any) => set.set(t.slug, t.name));
    });
    return Array.from(set.entries()).map(([slug, name]) => ({ slug, name }));
  }, [allHotels]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchString);
    if (searchInput.trim()) {
      newParams.set('s', searchInput.trim());
    } else {
      newParams.delete('s');
    }
    const qs = newParams.toString();
    setLocation(qs ? `/hotels?${qs}` : '/hotels');
    setSearchInput('');
  };

  const setFilter = (key: 'country' | 'category', value: string) => {
    const newParams = new URLSearchParams(searchString);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    const qs = newParams.toString();
    setLocation(qs ? `/hotels?${qs}` : '/hotels');
  };

  return (
    <main className="min-h-screen bg-[#fafaf8] font-sans select-none">
      <WpHead
        title="Hotels — Hotelchecker24"
        description="Entdecken Sie unsere kuratierte Auswahl an Luxushotels, Boutique-Resorts und exklusiven Unterkünften weltweit."
      />

      {/* Page Hero — compact light editorial */}
      <div className="relative overflow-hidden bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(109,155,174,0.13)_0%,transparent_70%)] blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(146,159,93,0.09)_0%,transparent_70%)] blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto z-10">
          <nav className="flex items-center gap-2 text-sm font-semibold text-slate-400 mb-4">
            <WpLink href="/" className="hover:text-primary transition-colors">Startseite</WpLink>
            <ChevronRight className="w-4 h-4" />
            <span className="text-slate-700">Hotels</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase leading-none text-slate-900 mb-2">
            Hotel<span className="text-primary">verzeichnis</span>
          </h1>
          <p className="text-slate-500 text-sm max-w-2xl">
            Kuratierte Auswahl an Luxushotels, Boutique-Resorts und Stadthotels in den schönsten Reisezielen der Welt.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="mt-5 flex gap-2 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Hotel suchen…"
                className="w-full bg-white text-slate-800 placeholder:text-slate-400 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/30 transition-all"
              />
            </div>
            <button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 shadow-xs"
            >
              Suchen
            </button>
          </form>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Mobile Filter Toggle Button */}
        <div className="lg:hidden flex items-center justify-between gap-4 mb-6">
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-slate-50 active:scale-95 transition-all shadow-xs cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            {filtersOpen ? 'Filter ausblenden' : 'Filter einblenden'}
          </button>
          {(country || category) && (
            <button
              onClick={() => {
                setFilter('country', '');
                setFilter('category', '');
              }}
              className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Filter zurücksetzen
            </button>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">

          {/* Sidebar Filters */}
          <aside className={`lg:w-60 shrink-0 space-y-5 ${filtersOpen ? 'block' : 'hidden'} lg:block`}>
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                <SlidersHorizontal className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-slate-700">Filter</span>
              </div>

              {/* Country filter */}
              {countries.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-500">Land</span>
                  </div>
                  <div className="space-y-1">
                    <button
                      onClick={() => setFilter('country', '')}
                      className={`w-full text-left text-sm px-3 py-2 rounded-lg font-semibold transition-colors ${!country ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      Alle Länder
                    </button>
                    {countries.map((c) => (
                      <button
                        key={c.slug}
                        onClick={() => setFilter('country', c.slug)}
                        className={`w-full text-left text-xs px-3 py-2 rounded-lg font-bold transition-colors ${country === c.slug ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category filter */}
              {categories.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Kategorie</span>
                  </div>
                  <div className="space-y-1">
                    <button
                      onClick={() => setFilter('category', '')}
                      className={`w-full text-left text-xs px-3 py-2 rounded-lg font-bold transition-colors ${!category ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      Alle Kategorien
                    </button>
                    {categories.map((c) => (
                      <button
                        key={c.slug}
                        onClick={() => setFilter('category', c.slug)}
                        className={`w-full text-left text-xs px-3 py-2 rounded-lg font-bold transition-colors ${category === c.slug ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Hotels Grid */}
          <div className="flex-1 min-w-0">
            <HotelsGrid />
          </div>
        </div>
      </div>
    </main>
  );
}
