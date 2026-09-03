import * as React from 'react';
import { useLocation, WpImage } from '@forgewp/react';
import { Link } from '@/components/ui/link';
import { Search, X, ArrowRight, Sparkles, TrendingUp, ArrowUpRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWpCurrency, useWpProducts } from '@forgewp/woocommerce';
import { getAllProducts } from '@/data/products';
import { categories } from '@/data/categories';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const trendingSearches = [
  'Solid Nordic Oak',
  'Wool Bouclé Armchair',
  'Roman Travertine',
  'Alabaster Pendant',
  'Modular Sideboard',
  'FSC Dining Table',
  'Ceramic Table Lamp',
  'Organic Wool Rug',
];

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [, setLocation] = useLocation();
  const { formatPrice } = useWpCurrency();
  const [query, setQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);
  const allProducts = React.useMemo(() => getAllProducts(), []);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 180);
    return () => clearTimeout(timer);
  }, [query]);

  const { products: serverProducts, loading: isSearching } = useWpProducts(
    debouncedQuery ? { search: debouncedQuery, perPage: 12 } : undefined
  );

  // Strict full-page background scroll lock & ESC key listener
  React.useEffect(() => {
    if (isOpen) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      const originalTouchAction = document.body.style.touchAction;

      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';

      setTimeout(() => inputRef.current?.focus(), 60);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.style.touchAction = originalTouchAction;
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      setQuery('');
    }
  }, [isOpen, onClose]);

  // Live matching search results
  const liveResults = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    if (serverProducts && serverProducts.length > 0) {
      return serverProducts.map((sp: any) => ({
        id: String(sp.id),
        name: sp.name || sp.title || '',
        slug: sp.slug || '',
        category: sp.category || 'Furniture',
        price: typeof sp.price === 'number' ? sp.price : parseFloat(String(sp.price || '0')),
        images: Array.isArray(sp.images) && sp.images.length > 0
          ? sp.images.map((i: any) => typeof i === 'string' ? i : (i?.url || i?.src || ''))
          : (sp.featuredImage || sp.image ? [sp.featuredImage || sp.image] : []),
      }));
    }
    return allProducts.filter((p) => {
      const matchName = p.name.toLowerCase().includes(q);
      const matchCat = p.category.toLowerCase().includes(q);
      const matchCats = p.categories?.some((c) => c.toLowerCase().includes(q));
      const matchDesc = p.description.toLowerCase().includes(q);
      const matchMaterial = p.materials?.some((m) => m.toLowerCase().includes(q));
      const matchTags = p.tags?.some((t) => t.toLowerCase().includes(q));
      return matchName || matchCat || matchCats || matchDesc || matchMaterial || matchTags;
    });
  }, [query, allProducts, serverProducts]);

  const trendingProducts = React.useMemo(() => {
    return allProducts.filter((p) => p.featured || p.badge === 'bestseller').slice(0, 4);
  }, [allProducts]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    onClose();
    setLocation(`/shop?search=${encodeURIComponent(q)}`);
  };

  const handleSuggestionClick = (term: string) => {
    setQuery(term);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-50 h-dvh w-screen flex flex-col overflow-y-auto overscroll-contain bg-[#faf8f5]/98 backdrop-blur-3xl text-ink select-none"
        >
          {/* Top Navigation Bar inside Search Cover */}
          <div className="container-wide py-4 md:py-5 flex items-center justify-between border-b border-border/70 sticky top-0 bg-[#faf8f5]/95 backdrop-blur-xl z-20 shrink-0">
            <div className="flex items-center gap-6">
              <Link
                href="/"
                onClick={onClose}
                className="font-heading text-lg md:text-xl font-semibold tracking-tight text-ink"
              >
                Comfortable Decor
              </Link>
              <span className="hidden sm:inline-block font-mono text-xs uppercase tracking-widest text-ink-muted">
                // Global Spatial Search
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="group/close flex items-center gap-2 rounded-full border border-ink/20 px-4 py-2 font-mono text-xs uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-cream cursor-pointer"
              aria-label="Close search"
            >
              <span>Close</span>
              <X className="h-4 w-4 transition-transform duration-300 group-hover/close:rotate-90" />
            </button>
          </div>

          {/* Hero Search Input Section */}
          <div className="border-b border-border/60 bg-cream py-8 md:py-12 shrink-0">
            <div className="container-wide">
              <form onSubmit={handleSubmit} className="relative">
                <div className="flex items-center gap-4 border-b-2 border-ink pb-4">
                  <Search className="h-6 w-6 md:h-8 md:w-8 text-ink/70 shrink-0" />
                  <input
                    ref={inputRef}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search furniture, lighting, bouclé armchairs, travertine..."
                    className="w-full bg-transparent font-heading text-xl sm:text-2xl md:text-3.5xl font-medium text-ink placeholder:text-ink/30 outline-none border-none"
                  />
                  {isSearching && Boolean(query.trim()) && (
                    <Loader2 className="h-5 w-5 text-ink-muted animate-spin shrink-0" />
                  )}
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="p-2 text-ink-muted hover:text-ink transition-colors cursor-pointer"
                      aria-label="Clear search"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                  <button
                    type="submit"
                    className="hidden sm:inline-flex items-center gap-2 rounded-full bg-ink px-6 py-2.5 font-heading text-xs uppercase tracking-wider font-semibold text-cream hover:bg-ink/90 transition-colors shrink-0 cursor-pointer shadow-md"
                  >
                    <span>Search</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Main Search Body */}
          <div className="container-wide flex-1 py-8 md:py-12">
            {/* State 1: Live Results while typing */}
            {query.trim().length > 0 ? (
              <div>
                <div className="flex items-center justify-between border-b border-border/60 pb-4 mb-6">
                  <div>
                    <span className="font-mono text-xs uppercase tracking-widest text-sage-deep font-semibold">
                      Live Search Results
                    </span>
                    <h3 className="font-heading text-2xl font-semibold text-ink">
                      {liveResults.length} {liveResults.length === 1 ? 'Piece' : 'Pieces'} Found for "{query}"
                    </h3>
                  </div>
                  {liveResults.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      className="group/all inline-flex items-center gap-1.5 font-heading text-xs uppercase tracking-wider font-semibold text-ink hover:text-sage-deep transition-colors cursor-pointer"
                    >
                      <span>Explore all in shop</span>
                      <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover/all:translate-x-0.5 group-hover/all:-translate-y-0.5" />
                    </button>
                  )}
                </div>

                {liveResults.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                    {liveResults.map((product) => (
                      <Link
                        key={product.id}
                        href={`/product/${product.slug}`}
                        onClick={onClose}
                        className="group flex gap-4 p-4 bg-white/70 hover:bg-white border border-border/60 rounded-2xl transition-all shadow-xs hover:shadow-md"
                      >
                        <div className="relative aspect-square w-24 shrink-0 overflow-hidden bg-stone rounded-xl border border-border/40">
                          <WpImage
                            src={product.images[0]}
                            alt={product.name}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                        <div className="flex flex-col justify-between py-1 min-w-0">
                          <div>
                            <span className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                              {product.category}
                            </span>
                            <h4 className="font-heading text-sm md:text-base font-semibold text-ink group-hover:text-sage-deep transition-colors truncate">
                              {product.name}
                            </h4>
                          </div>
                          <p className="font-mono text-sm font-bold text-ink">
                            {formatPrice(product.price)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  /* Zero Results State */
                  <div className="py-16 text-center max-w-md mx-auto border border-dashed border-border/80 p-8 rounded-3xl bg-stone/20">
                    <Sparkles className="h-7 w-7 text-sage-deep mx-auto mb-3" />
                    <h4 className="font-heading text-xl font-semibold text-ink">
                      No pieces found for "{query}"
                    </h4>
                    <p className="mt-2 text-sm text-ink-muted font-light leading-relaxed">
                      Check your spelling or try exploring curated categories like "Solid Oak", "Bouclé", or "Travertine".
                    </p>
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 font-heading text-xs uppercase tracking-wider font-semibold text-cream hover:bg-ink/90 transition-colors"
                    >
                      Clear Search Query
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* State 2: Default suggestions & curated spotlight */
              <div className="space-y-10">
                {/* 1. Curated Trending Search Queries */}
                <div>
                  <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-ink-muted mb-3.5">
                    <TrendingUp className="h-4 w-4 text-sage-deep" />
                    <span>Trending Search Queries</span>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {trendingSearches.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => handleSuggestionClick(term)}
                        className="rounded-full bg-stone/80 hover:bg-ink hover:text-cream px-4 py-2 font-heading text-xs md:text-sm font-medium text-ink transition-all cursor-pointer shadow-2xs"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Popular Department Categories with Small Category Images */}
                <div>
                  <p className="font-mono text-xs uppercase tracking-widest text-ink-muted mb-3.5">
                    Explore Departments
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    {categories.map((cat) => (
                      <Link
                        key={cat.slug}
                        href={`/category/${cat.slug}`}
                        onClick={onClose}
                        className="group flex items-center gap-3.5 p-3 bg-white/70 hover:bg-ink hover:text-cream border border-border/70 rounded-2xl transition-all text-left shadow-2xs cursor-pointer"
                      >
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-stone border border-border/40">
                          <WpImage
                            src={cat.image}
                            alt={cat.name}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-heading text-xs md:text-sm uppercase tracking-wider font-semibold group-hover:text-cream truncate">
                            {cat.name}
                          </p>
                          <p className="font-mono text-[11px] text-ink-muted group-hover:text-cream/70 mt-0.5">
                            {cat.productCount || 6} pieces
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* 3. Curator Highlights Grid */}
                <div>
                  <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
                    <p className="font-mono text-xs uppercase tracking-widest text-ink-muted flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-sage-deep" />
                      <span>Curator Highlights</span>
                    </p>
                    <Link
                      href="/shop"
                      onClick={onClose}
                      className="font-heading text-xs uppercase tracking-wider font-semibold text-ink hover:text-sage-deep transition-colors"
                    >
                      Browse full catalog →
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {trendingProducts.map((p) => (
                      <Link
                        key={p.id}
                        href={`/product/${p.slug}`}
                        onClick={onClose}
                        className="group flex flex-col p-2.5 bg-white/60 hover:bg-white border border-border/60 rounded-2xl transition-all shadow-2xs hover:shadow-sm"
                      >
                        <div className="relative aspect-square w-full overflow-hidden bg-stone rounded-xl mb-2">
                          <WpImage
                            src={p.images[0]}
                            alt={p.name}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                          {p.category}
                        </p>
                        <p className="font-heading text-sm font-semibold text-ink truncate group-hover:text-sage-deep mt-0.5">
                          {p.name}
                        </p>
                        <p className="font-mono text-xs font-bold text-ink mt-1">
                          {formatPrice(p.price)}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Info Bar inside Search Cover */}
          <div className="border-t border-border/60 bg-stone/50 px-5 md:px-7 py-3.5 flex items-center justify-between text-xs font-mono text-ink-muted shrink-0">
            <span>Press ESC or click Close to return</span>
            <Link
              href="/shop"
              onClick={onClose}
              className="hover:text-ink font-sans text-xs underline font-medium"
            >
              View all 24 curated pieces in catalog →
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
