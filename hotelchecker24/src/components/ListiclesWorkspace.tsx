import React from 'react';
import { useWpSearch, useWpLocation, useWpI18n, useWpQuery, WpLink, useWpTerms, useWpPagePath } from '../.forgewp/wordpress';
import { Search, BookOpen, ArrowRight, User, Calendar, Tag, Newspaper, Loader2 } from 'lucide-react';
import { Button } from './ui/button';

export function ListiclesWorkspace() {
  const { __ } = useWpI18n();
  const searchString = useWpSearch();
  const [, setLocation] = useWpLocation();
  const params = React.useMemo(() => new URLSearchParams(searchString), [searchString]);
  const keyword = params.get('q') || params.get('s') || '';
  const activeCategory = params.get('category') || '';

  const [searchInput, setSearchInput] = React.useState(keyword);

  // Sync keyword changes into the searchInput state when filters are cleared/updated
  React.useEffect(() => {
    setSearchInput(keyword);
  }, [keyword]);

  // Get the real WordPress page URL (works regardless of what slug the admin set)
  const listiclesPath = useWpPagePath('listicles-page', '/hotelvergleiche');

  const { posts: listicles, loading, hasMore, loadMore } = useWpQuery({
    postType: 'listicle',
    postsPerPage: 21,
    s: keyword,
  });

  // Collect unique categories directly from WordPress taxonomy terms
  const { terms: categoryTerms } = useWpTerms('category');

  const categories = React.useMemo(() => {
    return categoryTerms.map((t) => ({ slug: t.slug, name: t.name }));
  }, [categoryTerms]);

  // Client-side filter by category slug
  const filtered = React.useMemo(() => {
    if (!activeCategory) return listicles;
    return listicles.filter((l) => {
      const terms: any[] = (l as any)._terms?.category || [];
      return terms.some((t) => t.slug === activeCategory);
    });
  }, [listicles, activeCategory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchString);
    if (searchInput.trim()) {
      newParams.set('q', searchInput.trim());
    } else {
      newParams.delete('q');
    }
    newParams.delete('s');
    const qs = newParams.toString();
    setLocation(qs ? `${listiclesPath}?${qs}` : listiclesPath);
  };

  const setCategory = (slug: string) => {
    const newParams = new URLSearchParams(searchString);
    if (slug) {
      newParams.set('category', slug);
    } else {
      newParams.delete('category');
    }
    const qs = newParams.toString();
    setLocation(qs ? `${listiclesPath}?${qs}` : listiclesPath);
  };

  return (
    <div className="space-y-8">

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-lg">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={__('Artikel suchen…')}
            className="w-full bg-white text-slate-800 placeholder:text-slate-400 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/30 transition-all"
          />
        </div>
        <button
          type="submit"
          className="bg-primary hover:bg-primary/90 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all cursor-pointer active:scale-95 shadow-xs"
        >
          {__('Suchen')}
        </button>
      </form>

      {/* Category chips */}
      {categories.length > 0 && (
        <div className="border border-slate-200 bg-white sticky top-0 z-20 shadow-xs rounded-xl">
          <div className="px-4 py-3 flex items-center gap-2 overflow-x-auto scrollbar-none">
            <span className="text-xs font-semibold text-slate-400 shrink-0 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" /> {__('Themen:')}
            </span>
            <button
              onClick={() => setCategory('')}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                !activeCategory
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {__('Alle')}
            </button>
            {categories.map((c) => (
              <button
                key={c.slug}
                onClick={() => setCategory(c.slug)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activeCategory === c.slug
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Articles Grid */}
      <div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-slate-100 animate-pulse">
                <div className="h-52 bg-slate-100" />
                <div className="p-6 space-y-3">
                  <div className="h-3 bg-slate-100 rounded w-1/4" />
                  <div className="h-5 bg-slate-100 rounded w-full" />
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-slate-200/60 rounded-3xl p-12 max-w-md mx-auto shadow-xs text-center flex flex-col items-center justify-center my-12 select-none">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 text-primary">
              <Newspaper className="w-7 h-7" />
            </div>
            <h3 className="text-slate-900 font-black text-lg uppercase tracking-tight mb-1">{__('Keine Artikel gefunden')}</h3>
            <p className="text-slate-400 text-xs leading-relaxed max-w-xs">
              {__('Es wurden keine Beiträge für Ihre Auswahl gefunden. Passen Sie Ihre Suchbegriffe oder den Themenfilter an.')}
            </p>
            <button
              onClick={() => { setCategory(''); setSearchInput(''); setLocation(listiclesPath); }}
              className="mt-6 bg-primary hover:bg-primary/95 text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl cursor-pointer hover:shadow-md hover:shadow-primary/20 active:scale-95 transition-all"
            >
              {__('Filter zurücksetzen')}
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold text-slate-400 mb-6">
              {filtered.length} {__('Artikel')}{activeCategory ? ` in "${categories.find(c => c.slug === activeCategory)?.name}"` : ''}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((listicle) => {
                const readTime = listicle.customFields?.read_time || '5';
                const imageUrl =
                  typeof listicle.featuredImage === 'object' && listicle.featuredImage !== null
                    ? (listicle.featuredImage as any).url || ''
                    : String(listicle.featuredImage || '');
                const catTerms: any[] = (listicle as any)._terms?.category || [];

                return (
                  <WpLink
                    key={listicle.id}
                    href={listicle.permalink || `/hotelvergleich/${listicle.id}`}
                    className="group bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1.5 hover:border-primary/20 transition-all duration-300 ease-out flex flex-col"
                  >
                    {/* Image */}
                    <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                      <img
                        src={imageUrl}
                        alt={listicle.title}
                        className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
                        loading="lazy"
                      />
                      {/* Gradient overlay on hover */}
                      <div className="absolute inset-0 bg-linear-to-t from-slate-950/50 via-slate-950/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      {/* Category badges */}
                      {catTerms.length > 0 && (
                        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                          {catTerms.slice(0, 2).map((t) => (
                            <span
                              key={t.slug}
                              className="text-[10px] font-semibold bg-white/95 backdrop-blur-xs text-slate-700 px-2 py-0.5 rounded-md shadow-xs"
                            >
                              {t.name}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Read time badge top-right */}
                      <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/95 backdrop-blur-xs text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-xs">
                        <BookOpen className="w-3 h-3" />
                        <span>{readTime} {__('Min.')}</span>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-5 flex flex-col grow">
                      {/* Meta row */}
                      <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-primary shrink-0" />
                          {listicle.author}
                        </span>
                        <span className="text-slate-200">·</span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          {listicle.modified || listicle.date}
                        </span>
                      </div>

                      {/* Title */}
                      <h2
                        className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors duration-200 leading-snug line-clamp-2 grow mb-2"
                      >
                        {listicle.title}
                      </h2>

                      {/* Excerpt */}
                      <p
                        className="text-xs text-slate-400 line-clamp-2 leading-relaxed"
                      >
                        {listicle.excerpt}
                      </p>

                      {/* Footer CTA */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-primary">{__('Artikel lesen')}</span>
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-200">
                          <ArrowRight className="w-3.5 h-3.5 group-hover:-rotate-45 transition-transform duration-200" />
                        </div>
                      </div>
                    </div>
                  </WpLink>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Load More */}
      {hasMore && !loading && (
        <div className="flex justify-center mt-8">
          <Button
            onClick={loadMore}
            disabled={loading}
            className="bg-primary hover:bg-primary/95 text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl cursor-pointer hover:shadow-md hover:shadow-primary/20 active:scale-95 transition-all border-none"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> {__('Lade...')}
              </span>
            ) : (
              __('Mehr laden')
            )}
          </Button>
        </div>
      )}
      {loading && listicles.length > 0 && (
        <div className="flex justify-center mt-8">
          <span className="flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> {__('Lade...')}
          </span>
        </div>
      )}
    </div>
  );
}

export default ListiclesWorkspace;
