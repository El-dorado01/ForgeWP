import * as React from 'react';
import { useSearch } from '@forgewp/react';
import { Link } from '@/components/ui/link';
import {
  SlidersHorizontal,
  ChevronDown,
  X,
  Grid3X3,
  LayoutGrid,
  RotateCcw,
  Check,
} from 'lucide-react';
import { ProductCard } from '@/components/product/product-card';
import { QuickViewModal } from '@/components/product/quick-view-modal';
import { useWpProductCategories } from '@forgewp/woocommerce';
import { getAllProducts } from '@/data/products';
import { getAllCategories } from '@/data/categories';
import type { Product } from '@/types';
import { WpHead } from '@forgewp/react';
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

const materialOptions = [
  'Solid Oak',
  'Wool Bouclé',
  'Travertine',
  'Alabaster',
  'Brass',
  'Linen',
  'Walnut',
];

export default function ShopPage() {
  const allProducts = getAllProducts();
  const fallbackCategories = getAllCategories();
  const wpCategories = useWpProductCategories();
  const categories = wpCategories && wpCategories.length > 0
    ? wpCategories.map((c) => ({
        id: String(c.id),
        name: c.name,
        slug: c.slug,
        description: c.description || '',
        image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
        productCount: c.count || 0,
      }))
    : fallbackCategories;
  const searchParams = new URLSearchParams(useSearch());

  // URL state initialization
  const initialCategory = searchParams.get('category') || 'all';
  const initialSort = (searchParams.get('sort') as SortOption) || 'featured';
  const initialSearch = searchParams.get('search') || searchParams.get('s') || searchParams.get('q') || '';

  // Filter States
  const [searchQuery, setSearchQuery] = React.useState<string>(initialSearch);
  const [selectedCategory, setSelectedCategory] = React.useState<string>(initialCategory);
  const [selectedSort, setSelectedSort] = React.useState<SortOption>(initialSort);
  const [selectedPrice, setSelectedPrice] = React.useState<PriceRange>('all');
  const [selectedMaterial, setSelectedMaterial] = React.useState<string>('all');
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

  // Sync state if URL search query changes
  React.useEffect(() => {
    const q = searchParams.get('search') || searchParams.get('s') || searchParams.get('q');
    if (q !== null) setSearchQuery(q);
    const cat = searchParams.get('category');
    if (cat) setSelectedCategory(cat);
    const srt = searchParams.get('sort') as SortOption;
    if (srt && sortLabels[srt]) setSelectedSort(srt);
    if (searchParams.get('sale') === 'true') setOnSaleOnly(true);
  }, [useSearch()]);

  // Filter and Sort Logic
  const filteredProducts = React.useMemo(() => {
    let list = [...allProducts];

    // 0. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.categories?.some((c) => c.toLowerCase().includes(q)) ||
          p.description.toLowerCase().includes(q) ||
          p.materials?.some((m) => m.toLowerCase().includes(q)) ||
          p.tags?.some((t) => t.toLowerCase().includes(q)),
      );
    }

    // 1. Category Filter
    if (selectedCategory !== 'all') {
      list = list.filter(
        (p) =>
          p.categorySlug === selectedCategory ||
          p.category.toLowerCase() === selectedCategory.toLowerCase() ||
          p.categories?.some((c) => c.toLowerCase() === selectedCategory.toLowerCase()),
      );
    }

    // 2. Price Filter
    if (selectedPrice !== 'all') {
      const range = priceRanges.find((r) => r.id === selectedPrice);
      if (range) {
        list = list.filter((p) => p.price >= range.min && p.price <= range.max);
      }
    }

    // 3. Material Filter
    if (selectedMaterial !== 'all') {
      list = list.filter((p) =>
        p.materials?.some((m) => m.toLowerCase().includes(selectedMaterial.toLowerCase())),
      );
    }

    // 4. In Stock Filter
    if (inStockOnly) {
      list = list.filter((p) => p.inStock);
    }

    // 5. On Sale Filter
    if (onSaleOnly) {
      list = list.filter((p) => p.compareAtPrice != null && p.compareAtPrice > p.price);
    }

    // 6. Sorting
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
  }, [
    allProducts,
    selectedCategory,
    selectedSort,
    selectedPrice,
    selectedMaterial,
    inStockOnly,
    onSaleOnly,
  ]);

  const activeFilterCount =
    (searchQuery.trim() ? 1 : 0) +
    (selectedCategory !== 'all' ? 1 : 0) +
    (selectedPrice !== 'all' ? 1 : 0) +
    (selectedMaterial !== 'all' ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (onSaleOnly ? 1 : 0);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedPrice('all');
    setSelectedMaterial('all');
    setInStockOnly(false);
    setOnSaleOnly(false);
    setSelectedSort('featured');
  };

  return (
    <>
      <WpHead
        title="Curated Catalog — Furniture, Lighting & Decor | Comfortable Decor"
        description="Explore the complete collection of minimalist furniture, sculptural lighting, sustainable decor, and architectural home objects."
      />

      <div className="bg-cream border-b border-border/60">
        <div className="container-wide py-6 sm:py-8 md:py-12">
          {/* Breadcrumbs */}
          <nav className="flex flex-wrap items-center gap-1.5 sm:gap-2 font-mono text-[11px] sm:text-xs uppercase tracking-wider text-ink-muted mb-4 sm:mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ink transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-ink font-semibold">Shop Catalog</span>
          </nav>

          {/* Editorial Section Header */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 sm:gap-6 border-b border-border/70 pb-5 md:pb-6">
            <div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 font-mono text-[11px] sm:text-xs uppercase tracking-wider sm:tracking-widest text-ink-muted mb-1.5 sm:mb-2">
                <span>(01) // Curated Catalog</span>
                <span>·</span>
                <span className="text-sage-deep font-semibold">Architectural Pieces</span>
              </div>
              <h1 className="font-heading font-semibold text-ink text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-tight leading-tight">
                Shop All Collections
              </h1>
              <p className="mt-1.5 sm:mt-2 text-sm sm:text-base md:text-[1.0625rem] text-ink/80 max-w-xl font-light leading-relaxed">
                Handcrafted solid hardwoods, Italian wool bouclé upholstery, and circular
                minerals crafted for decades of daily living.
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-ink-muted self-start md:self-auto">
              <span className="rounded-full bg-stone px-3.5 py-1 font-semibold text-ink">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'Piece' : 'Pieces'} Found
              </span>
            </div>
          </div>

          {/* Category Tabs Strip */}
          <div className="flex items-center gap-2 overflow-x-auto pt-4 sm:pt-6 pb-2 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden whitespace-nowrap">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={cn(
                'px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full font-heading text-xs md:text-sm uppercase tracking-wider font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0',
                selectedCategory === 'all'
                  ? 'bg-ink text-cream shadow-sm'
                  : 'bg-stone/70 text-ink/75 hover:bg-stone hover:text-ink',
              )}
            >
              All Pieces ({allProducts.length})
            </button>
            {categories.map((cat) => {
              const count = allProducts.filter(
                (p) => p.categorySlug === cat.slug || p.category.toLowerCase() === cat.slug.toLowerCase(),
              ).length;
              const isActive = selectedCategory === cat.slug;
              return (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={cn(
                    'px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full font-heading text-xs md:text-sm uppercase tracking-wider font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0',
                    isActive
                      ? 'bg-ink text-cream shadow-sm'
                      : 'bg-stone/70 text-ink/75 hover:bg-stone hover:text-ink',
                  )}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Catalog Body with Filter Controls & Product Grid */}
      <div className="container-wide py-8 md:py-12">
        {/* Controls Toolbar: Filters, Sorting, and Grid Mode */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-5 mb-8">
          {/* Left: Filter Controls (Desktop & Mobile trigger) */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Mobile Filter Button */}
            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden flex items-center gap-2 rounded-full border border-ink/20 bg-cream px-4 py-2 text-xs font-mono uppercase tracking-wider text-ink hover:bg-ink hover:text-cream transition-colors"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filters {activeFilterCount > 0 && `(${activeFilterCount})`}</span>
            </button>

            {/* Desktop Quick Filter Dropdowns */}
            <div className="hidden lg:flex items-center gap-3">
              {/* Price Filter Dropdown */}
              <div className="relative group">
                <select
                  value={selectedPrice}
                  onChange={(e) => setSelectedPrice(e.target.value as PriceRange)}
                  aria-label="Filter by price range"
                  className="appearance-none rounded-full border border-border bg-card px-4 py-2 pr-8 font-heading text-xs md:text-sm font-medium text-ink focus:outline-none focus:ring-1 focus:ring-ink cursor-pointer"
                >
                  {priceRanges.map((range) => (
                    <option key={range.id} value={range.id}>
                      {range.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none text-ink-muted" />
              </div>

              {/* Material Filter Dropdown */}
              <div className="relative group">
                <select
                  value={selectedMaterial}
                  onChange={(e) => setSelectedMaterial(e.target.value)}
                  aria-label="Filter by material"
                  className="appearance-none rounded-full border border-border bg-card px-4 py-2 pr-8 font-heading text-xs md:text-sm font-medium text-ink focus:outline-none focus:ring-1 focus:ring-ink cursor-pointer"
                >
                  <option value="all">All Materials</option>
                  {materialOptions.map((mat) => (
                    <option key={mat} value={mat}>
                      {mat}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none text-ink-muted" />
              </div>

              {/* In Stock Toggle */}
              <button
                type="button"
                onClick={() => setInStockOnly(!inStockOnly)}
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
                onClick={() => setOnSaleOnly(!onSaleOnly)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-4 py-2 font-heading text-xs md:text-sm font-medium transition-colors cursor-pointer',
                  onSaleOnly
                    ? 'border-terracotta bg-terracotta text-white'
                    : 'border-border bg-card text-ink/80 hover:border-terracotta hover:text-terracotta',
                )}
              >
                {onSaleOnly && <Check className="h-3 w-3" />}
                <span>Sale Pieces</span>
              </button>
            </div>
          </div>

          {/* Right: Sort Options & Grid Layout Mode */}
          <div className="flex items-center gap-4 ml-auto">
            {/* Sort Selector */}
            <div className="relative">
              <label htmlFor="shop-sort-select" className="sr-only">
                Sort catalog products
              </label>
              <select
                id="shop-sort-select"
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value as SortOption)}
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

            {/* Grid Density Switcher (Desktop) */}
            <div className="hidden sm:flex items-center border border-border rounded-full p-0.5 bg-card">
              <button
                type="button"
                onClick={() => setGridColumns(3)}
                className={cn(
                  'p-1.5 rounded-full transition-colors cursor-pointer',
                  gridColumns === 3 ? 'bg-ink text-cream' : 'text-ink/60 hover:text-ink',
                )}
                title="3 columns (large cards)"
                aria-label="3 columns layout"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setGridColumns(4)}
                className={cn(
                  'p-1.5 rounded-full transition-colors cursor-pointer',
                  gridColumns === 4 ? 'bg-ink text-cream' : 'text-ink/60 hover:text-ink',
                )}
                title="4 columns (compact masonry)"
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

            {searchQuery.trim() && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="inline-flex items-center gap-1.5 rounded-full bg-ink text-cream px-3.5 py-1.5 text-xs font-medium hover:bg-ink/80 transition-colors shadow-2xs cursor-pointer"
              >
                <span>Search: "{searchQuery}"</span>
                <X className="h-3 w-3 text-cream/70" />
              </button>
            )}

            {selectedCategory !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className="inline-flex items-center gap-1.5 rounded-full bg-white border border-border px-3.5 py-1.5 text-xs font-medium text-ink hover:bg-stone transition-colors shadow-2xs cursor-pointer"
              >
                <span>Category: {categories.find((c) => c.slug === selectedCategory)?.name || selectedCategory}</span>
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

            {selectedMaterial !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedMaterial('all')}
                className="inline-flex items-center gap-1.5 rounded-full bg-white border border-border px-3.5 py-1.5 text-xs font-medium text-ink hover:bg-stone transition-colors shadow-2xs cursor-pointer"
              >
                <span>Material: {selectedMaterial}</span>
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

        {/* Product Grid or Empty State */}
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
          /* Curated Empty State (Seamless on Canvas) */
          <div className="py-16 md:py-24 text-center max-w-md mx-auto">
            <h3 className="font-heading text-2xl sm:text-3xl font-semibold text-ink">
              No matching pieces found
            </h3>
            <p className="mt-2 text-sm sm:text-base text-ink-muted font-light leading-relaxed">
              We couldn't find any products matching your current filters. Try adjusting or clearing your criteria.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 font-heading text-xs uppercase tracking-wider font-semibold text-cream hover:bg-sage-deep transition-all shadow-md cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset All Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Mobile Filters Drawer */}
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
                  <h3 className="font-heading text-xl font-semibold text-ink">Filter Catalog</h3>
                  <button
                    type="button"
                    onClick={() => setMobileFilterOpen(false)}
                    aria-label="Close filters"
                    className="p-1 text-ink"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Mobile Categories */}
                <div className="space-y-4 mb-6 border-b border-border pb-6">
                  <p className="font-mono text-xs uppercase tracking-widest text-ink font-semibold">
                    Category
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('all')}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-semibold uppercase',
                        selectedCategory === 'all'
                          ? 'bg-ink text-cream'
                          : 'bg-stone text-ink/75',
                      )}
                    >
                      All
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.slug}
                        type="button"
                        onClick={() => setSelectedCategory(cat.slug)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs font-semibold uppercase',
                          selectedCategory === cat.slug
                            ? 'bg-ink text-cream'
                            : 'bg-stone text-ink/75',
                        )}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mobile Price Filter */}
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

                {/* Mobile Availability */}
                <div className="space-y-3 mb-6">
                  <p className="font-mono text-xs uppercase tracking-widest text-ink font-semibold">
                    Status
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

              {/* Apply & Reset Buttons */}
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
                  View Results ({filteredProducts.length})
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
