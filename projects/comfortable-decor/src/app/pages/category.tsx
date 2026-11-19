import * as React from 'react';
import { useParams, WpHead, WpImage } from '@forgewp/react';
import { Link } from '@/components/ui/link';
import {
  SlidersHorizontal,
  ChevronDown,
  LayoutGrid,
  Grid3X3,
  Check,
  X,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';
import { ProductCard } from '@/components/product/product-card';
import { QuickViewModal } from '@/components/product/quick-view-modal';
import { getCategoryBySlug, getAllCategories } from '@/data/categories';
import { getProductsByCategory } from '@/data/products';
import type { Product } from '@/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'newest' | 'rating';
type PriceRange = 'all' | 'under-150' | '150-400' | '400-800' | 'over-800';

const sortLabels: Record<SortOption, string> = {
  featured: 'Curated Featured',
  'price-asc': 'Price: Low to High',
  'price-desc': 'Price: High to Low',
  newest: 'Newest Arrivals',
  rating: 'Highest Rated',
};

const priceRanges: { id: PriceRange; label: string; min: number; max: number }[] = [
  { id: 'all', label: 'All Prices', min: 0, max: Infinity },
  { id: 'under-150', label: 'Under $150', min: 0, max: 150 },
  { id: '150-400', label: '$150 – $400', min: 150, max: 400 },
  { id: '400-800', label: '$400 – $800', min: 400, max: 800 },
  { id: 'over-800', label: '$800+', min: 800, max: Infinity },
];

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const category = getCategoryBySlug(slug || '');
  const allCategories = getAllCategories();

  // If slug is not matched directly, fallback to category with similar name or all
  const categoryProducts = React.useMemo(() => {
    if (!slug) return [];
    return getProductsByCategory(slug);
  }, [slug]);

  // Filter States
  const [selectedSort, setSelectedSort] = React.useState<SortOption>('featured');
  const [selectedPrice, setSelectedPrice] = React.useState<PriceRange>('all');
  const [selectedSubcategory, setSelectedSubcategory] = React.useState<string>('all');
  const [inStockOnly, setInStockOnly] = React.useState<boolean>(false);
  const [onSaleOnly, setOnSaleOnly] = React.useState<boolean>(false);
  const [gridColumns, setGridColumns] = React.useState<3 | 4>(3);
  const [mobileFilterOpen, setMobileFilterOpen] = React.useState<boolean>(false);
  const [quickViewProduct, setQuickViewProduct] = React.useState<Product | null>(null);

  // Lock background page scrolling when mobile filter drawer is open
  React.useEffect(() => {
    if (mobileFilterOpen) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      const originalTouchAction = document.body.style.touchAction;

      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';

      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.style.touchAction = originalTouchAction;
      };
    }
  }, [mobileFilterOpen]);

  // Extract available subcategories / tags for this category
  const subcategories = React.useMemo(() => {
    const set = new Set<string>();
    categoryProducts.forEach((p) => {
      p.categories?.forEach((c) => {
        if (c.toLowerCase() !== category?.name.toLowerCase() && c.toLowerCase() !== slug?.toLowerCase()) {
          set.add(c);
        }
      });
    });
    return Array.from(set);
  }, [categoryProducts, category, slug]);

  // Filtering & Sorting
  const filteredProducts = React.useMemo(() => {
    let list = [...categoryProducts];

    // 1. Subcategory filter
    if (selectedSubcategory !== 'all') {
      list = list.filter((p) =>
        p.categories?.some((c) => c.toLowerCase() === selectedSubcategory.toLowerCase()),
      );
    }

    // 2. Price filter
    if (selectedPrice !== 'all') {
      const range = priceRanges.find((r) => r.id === selectedPrice);
      if (range) {
        list = list.filter((p) => p.price >= range.min && p.price <= range.max);
      }
    }

    // 3. In stock
    if (inStockOnly) {
      list = list.filter((p) => p.inStock);
    }

    // 4. On sale
    if (onSaleOnly) {
      list = list.filter((p) => p.compareAtPrice != null && p.compareAtPrice > p.price);
    }

    // 5. Sorting
    switch (selectedSort) {
      case 'price-asc':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'newest':
        list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
        break;
      case 'featured':
      default:
        list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        break;
    }

    return list;
  }, [categoryProducts, selectedSubcategory, selectedPrice, inStockOnly, onSaleOnly, selectedSort]);

  const activeFilterCount =
    (selectedSubcategory !== 'all' ? 1 : 0) +
    (selectedPrice !== 'all' ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (onSaleOnly ? 1 : 0);

  const resetFilters = () => {
    setSelectedSubcategory('all');
    setSelectedPrice('all');
    setInStockOnly(false);
    setOnSaleOnly(false);
    setSelectedSort('featured');
  };

  const siblingCategories = allCategories.filter((c) => c.slug !== slug).slice(0, 3);

  if (!category) {
    return (
      <div className="container-wide py-20 text-center">
        <h1 className="font-heading text-3xl font-bold text-ink">Category Not Found</h1>
        <p className="mt-2 text-ink-muted">The requested collection could not be found.</p>
        <Link
          href="/categories"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-2.5 text-xs uppercase font-semibold text-cream"
        >
          Explore All Categories
        </Link>
      </div>
    );
  }

  return (
    <>
      <WpHead
        title={`${category.name} Collection — Comfortable Decor`}
        description={category.description}
      />

      {/* Category Hero Banner */}
      <div className="relative border-b border-border/60 bg-cream overflow-hidden">
        <div className="container-wide py-6 sm:py-8 md:py-12">
          {/* Breadcrumbs */}
          <nav className="flex flex-wrap items-center gap-1.5 sm:gap-2 font-mono text-[11px] sm:text-xs uppercase tracking-wider text-ink-muted mb-4 sm:mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ink transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link href="/categories" className="hover:text-ink transition-colors">
              Categories
            </Link>
            <span>/</span>
            <span className="text-ink font-semibold">{category.name}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
            {/* Left: Editorial Information */}
            <div className="lg:col-span-7 space-y-3 sm:space-y-4">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 font-mono text-[11px] sm:text-xs uppercase tracking-wider sm:tracking-widest text-ink-muted">
                <span>Department (0{category.id})</span>
                <span>·</span>
                <span className="text-sage-deep font-semibold">{filteredProducts.length} Curated Pieces</span>
              </div>

              <h1 className="font-heading font-semibold text-ink text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-tight leading-tight">
                {category.name}
              </h1>

              <p className="text-sm sm:text-base md:text-lg text-ink/80 leading-relaxed font-light max-w-xl">
                {category.description}
              </p>

              {/* Subcategories Pill Bar */}
              {subcategories.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pt-2 pb-1 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => setSelectedSubcategory('all')}
                    className={cn(
                      'rounded-full px-3.5 py-1.5 sm:px-4 sm:py-1.5 font-heading text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer shrink-0',
                      selectedSubcategory === 'all'
                        ? 'bg-ink text-cream shadow-xs'
                        : 'bg-stone/80 text-ink/75 hover:bg-stone hover:text-ink',
                    )}
                  >
                    All {category.name}
                  </button>
                  {subcategories.map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setSelectedSubcategory(sub)}
                      className={cn(
                        'rounded-full px-3.5 py-1.5 sm:px-4 sm:py-1.5 font-heading text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer shrink-0',
                        selectedSubcategory === sub
                          ? 'bg-ink text-cream shadow-xs'
                          : 'bg-stone/80 text-ink/75 hover:bg-stone hover:text-ink',
                      )}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: High-Res Category Moodboard Photo */}
            <div className="lg:col-span-5">
              <div className="relative aspect-16/9 sm:aspect-4/3 w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-border/70 shadow-md bg-stone">
                <WpImage
                  src={category.image}
                  alt={category.name}
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Catalog Grid Section */}
      <div className="container-wide py-8 md:py-12">
        {/* Toolbar: Filters & Sorting */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-5 mb-8">
          {/* Left: Quick Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Mobile Filter Drawer Button */}
            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden flex items-center gap-2 rounded-full border border-ink/20 bg-cream px-4 py-2 text-xs font-mono uppercase tracking-wider text-ink hover:bg-ink hover:text-cream transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filters {activeFilterCount > 0 && `(${activeFilterCount})`}</span>
            </button>

            {/* Price Filter Dropdown */}
            <div className="hidden lg:flex items-center gap-3">
              <div className="relative group">
                <select
                  value={selectedPrice}
                  onChange={(e) => setSelectedPrice(e.target.value as PriceRange)}
                  aria-label="Filter by price range"
                  className="appearance-none rounded-full border border-border bg-card px-4 py-2 pr-8 font-heading text-xs md:text-sm font-medium text-ink focus:outline-none focus:ring-1 focus:ring-ink cursor-pointer"
                >
                  {priceRanges.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none text-ink-muted" />
              </div>

              {/* In Stock Toggle */}
              <button
                type="button"
                onClick={() => setInStockOnly((v) => !v)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-4 py-2 font-heading text-xs md:text-sm font-medium transition-colors cursor-pointer',
                  inStockOnly
                    ? 'border-ink bg-ink text-cream'
                    : 'border-border bg-card text-ink/80 hover:border-ink hover:text-ink',
                )}
              >
                {inStockOnly && <Check className="h-3 w-3" />}
                <span>In Stock Only</span>
              </button>

              {/* On Sale Toggle */}
              <button
                type="button"
                onClick={() => setOnSaleOnly((v) => !v)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-4 py-2 font-heading text-xs md:text-sm font-medium transition-colors cursor-pointer',
                  onSaleOnly
                    ? 'border-ink bg-ink text-cream'
                    : 'border-border bg-card text-ink/80 hover:border-ink hover:text-ink',
                )}
              >
                {onSaleOnly && <Check className="h-3 w-3" />}
                <span>On Sale</span>
              </button>
            </div>
          </div>

          {/* Right: Sorting & Grid Switches */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <select
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value as SortOption)}
                aria-label="Sort products"
                className="appearance-none rounded-full border border-border bg-card px-4 py-2 pr-8 font-heading text-xs md:text-sm font-medium text-ink focus:outline-none focus:ring-1 focus:ring-ink cursor-pointer"
              >
                {Object.entries(sortLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none text-ink-muted" />
            </div>

            <div className="hidden sm:flex items-center border border-border rounded-full p-1 bg-card">
              <button
                type="button"
                onClick={() => setGridColumns(3)}
                className={cn(
                  'p-1.5 rounded-full transition-colors',
                  gridColumns === 3 ? 'bg-ink text-cream' : 'text-ink/60 hover:text-ink',
                )}
                title="3 columns"
                aria-label="3 columns layout"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setGridColumns(4)}
                className={cn(
                  'p-1.5 rounded-full transition-colors',
                  gridColumns === 4 ? 'bg-ink text-cream' : 'text-ink/60 hover:text-ink',
                )}
                title="4 columns"
                aria-label="4 columns layout"
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filters Tag Bar */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-8 p-4 bg-stone/50 border border-border/60 rounded-2xl shadow-2xs">
            <span className="font-mono text-xs uppercase tracking-wider text-ink font-semibold mr-1">
              Active Filters:
            </span>

            {selectedSubcategory !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedSubcategory('all')}
                className="inline-flex items-center gap-1.5 rounded-full bg-white border border-border px-3.5 py-1.5 text-xs font-medium text-ink hover:bg-stone transition-colors shadow-2xs cursor-pointer"
              >
                <span>Subcategory: {selectedSubcategory}</span>
                <X className="h-3 w-3 text-ink-muted" />
              </button>
            )}

            {selectedPrice !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedPrice('all')}
                className="inline-flex items-center gap-1.5 rounded-full bg-white border border-border px-3.5 py-1.5 text-xs font-medium text-ink hover:bg-stone transition-colors shadow-2xs cursor-pointer"
              >
                <span>Price: {priceRanges.find((r) => r.id === selectedPrice)?.label}</span>
                <X className="h-3 w-3 text-ink-muted" />
              </button>
            )}

            {inStockOnly && (
              <button
                type="button"
                onClick={() => setInStockOnly(false)}
                className="inline-flex items-center gap-1.5 rounded-full bg-white border border-border px-3.5 py-1.5 text-xs font-medium text-ink hover:bg-stone transition-colors shadow-2xs cursor-pointer"
              >
                <span>In Stock Only</span>
                <X className="h-3 w-3 text-ink-muted" />
              </button>
            )}

            {onSaleOnly && (
              <button
                type="button"
                onClick={() => setOnSaleOnly(false)}
                className="inline-flex items-center gap-1.5 rounded-full bg-white border border-border px-3.5 py-1.5 text-xs font-medium text-ink hover:bg-stone transition-colors shadow-2xs cursor-pointer"
              >
                <span>On Sale</span>
                <X className="h-3 w-3 text-ink-muted" />
              </button>
            )}

            <button
              type="button"
              onClick={resetFilters}
              className="ml-auto inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink transition-colors underline cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Clear All</span>
            </button>
          </div>
        )}

        {/* Product Grid */}
        {filteredProducts.length > 0 ? (
          <div
            className={cn(
              'grid gap-6 md:gap-8 items-stretch',
              gridColumns === 3
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
            )}
          >
            {filteredProducts.map((product) => (
              <div key={product.id} className="h-full">
                <ProductCard
                  product={product}
                  onQuickView={(p) => setQuickViewProduct(p)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center max-w-md mx-auto">
            <h3 className="font-heading text-2xl font-semibold text-ink">No matching pieces found</h3>
            <p className="mt-2 text-sm text-ink-muted">
              Try resetting your filters to explore all pieces in this collection.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-2.5 font-heading text-xs uppercase tracking-wider font-semibold text-cream hover:bg-sage-deep transition-all cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Sibling Categories Strip */}
      {siblingCategories.length > 0 && (
        <section className="border-t border-border/80 bg-stone/40 py-12 md:py-16">
          <div className="container-wide">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-ink-muted mb-1">
                  Explore Further
                </p>
                <h3 className="font-heading text-2xl font-semibold text-ink">
                  Related Collections
                </h3>
              </div>
              <Link
                href="/categories"
                className="hidden sm:inline-flex items-center gap-1.5 font-heading text-xs uppercase tracking-wider text-ink hover:text-sage-deep transition-colors font-semibold"
              >
                <span>All Departments</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {siblingCategories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/category/${c.slug}`}
                  className="group block relative overflow-hidden rounded-2xl border border-border/60 bg-cream p-6 transition-all hover:shadow-md"
                >
                  <div className="aspect-16/10 overflow-hidden rounded-xl bg-stone mb-4">
                    <WpImage
                      src={c.image}
                      alt={c.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <h4 className="font-heading text-lg font-semibold text-ink group-hover:text-sage-deep transition-colors">
                    {c.name}
                  </h4>
                  <p className="mt-1 text-xs text-ink-muted line-clamp-2">{c.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Mobile Filter Drawer */}
      <AnimatePresence>
        {mobileFilterOpen && (
          <div className="fixed inset-0 z-50 flex justify-end lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileFilterOpen(false)}
              className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 h-full w-full sm:max-w-md bg-cream p-6 overflow-y-auto shadow-2xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
                  <h3 className="font-heading text-xl font-semibold text-ink">Filter Collection</h3>
                  <button
                    type="button"
                    onClick={() => setMobileFilterOpen(false)}
                    aria-label="Close filters"
                    className="p-1 text-ink"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Subcategories */}
                {subcategories.length > 0 && (
                  <div className="space-y-4 mb-6 border-b border-border pb-6">
                    <p className="font-mono text-xs uppercase tracking-widest text-ink font-semibold">
                      Subcategory
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedSubcategory('all')}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs font-semibold uppercase',
                          selectedSubcategory === 'all'
                            ? 'bg-ink text-cream'
                            : 'bg-stone text-ink/75',
                        )}
                      >
                        All
                      </button>
                      {subcategories.map((sub) => (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setSelectedSubcategory(sub)}
                          className={cn(
                            'px-3 py-1.5 rounded-full text-xs font-semibold uppercase',
                            selectedSubcategory === sub
                              ? 'bg-ink text-cream'
                              : 'bg-stone text-ink/75',
                          )}
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Price Radios */}
                <div className="space-y-4 mb-6 border-b border-border pb-6">
                  <p className="font-mono text-xs uppercase tracking-widest text-ink font-semibold">
                    Price Range
                  </p>
                  <div className="space-y-2">
                    {priceRanges.map((r) => (
                      <label key={r.id} className="flex items-center gap-2.5 text-sm text-ink cursor-pointer">
                        <input
                          type="radio"
                          name="mobile-price"
                          checked={selectedPrice === r.id}
                          onChange={() => setSelectedPrice(r.id)}
                          className="accent-ink"
                        />
                        <span>{r.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Status Checkboxes */}
                <div className="space-y-3 mb-6">
                  <p className="font-mono text-xs uppercase tracking-widest text-ink font-semibold">
                    Availability
                  </p>
                  <label className="flex items-center gap-2.5 text-sm text-ink cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inStockOnly}
                      onChange={(e) => setInStockOnly(e.target.checked)}
                      className="accent-ink"
                    />
                    <span>In Stock Only</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-sm text-ink cursor-pointer">
                    <input
                      type="checkbox"
                      checked={onSaleOnly}
                      onChange={(e) => setOnSaleOnly(e.target.checked)}
                      className="accent-ink"
                    />
                    <span>On Sale Only</span>
                  </label>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-6 border-t border-border flex items-center gap-3">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="flex-1 py-3 text-center border border-border text-xs font-heading uppercase tracking-wider font-semibold text-ink"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="flex-1 py-3 text-center bg-ink text-cream text-xs font-heading uppercase tracking-wider font-semibold"
                >
                  View ({filteredProducts.length})
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quick View Modal */}
      <QuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </>
  );
}
