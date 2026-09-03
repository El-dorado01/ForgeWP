import * as React from 'react';
import { useParams, WpImage } from '@forgewp/react';
import { Link } from '@/components/ui/link';
import {
  Heart,
  Star,
  Maximize2,
  Play,
  ArrowLeft,
  ArrowRight,
  Check,
  Facebook,
  Share2,
  Download,
  FileText,
  ExternalLink,
  ShoppingBag,
  Lock,
  Trash2,
  Edit3,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Quote,
  Sparkles,
} from 'lucide-react';
import { ProductCard } from '@/components/product/product-card';
import { QuickViewModal } from '@/components/product/quick-view-modal';
import { useCart } from '@/context/cart-context';
import { useWishlist } from '@/context/wishlist-context';
import { useWpProductReviews } from '@forgewp/woocommerce';
import { useWpUser } from '@forgewp/auth';
import { getProductBySlug, getRelatedProducts, getAllProducts, formatPrice } from '@/data/products';
import type { Product, ProductType } from '@/types';
import { WpHead } from '@forgewp/react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type ActiveTab = 'shipping' | 'size' | 'reviews';

function getAvatarInfo(name: string) {
  const cleanName = (name || 'Customer').trim();
  const initials =
    cleanName
      .split(' ')
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'C';

  const colorPalettes = [
    { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    { bg: 'bg-amber-50 text-amber-900 border-amber-200' },
    { bg: 'bg-rose-50 text-rose-800 border-rose-200' },
    { bg: 'bg-sky-50 text-sky-800 border-sky-200' },
    { bg: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
    { bg: 'bg-stone-100 text-stone-800 border-stone-300' },
  ];
  const charCodeSum = cleanName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const palette = colorPalettes[charCodeSum % colorPalettes.length];

  return { initials, palette };
}

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const product = getProductBySlug(slug || '');
  const allProducts = React.useMemo(() => getAllProducts(), []);
  const { addItem, openCart } = useCart();
  const { isWishlisted, toggle } = useWishlist();

  // Determine effective product type
  const productType: ProductType = React.useMemo(() => {
    if (!product) return 'standard';
    if (product.type) return product.type;
    if (product.downloadableFiles && product.downloadableFiles.length > 0) return 'downloadable';
    if (product.groupedItems && product.groupedItems.length > 0) return 'grouped';
    if (product.variants && product.variants.length > 0 && product.variants[0].options.length > 1)
      return 'variable';
    if (product.externalUrl) return 'external';
    return 'standard';
  }, [product]);

  // State
  const [selectedVariantId, setSelectedVariantId] = React.useState<string>('');
  const [variantQuantities, setVariantQuantities] = React.useState<Record<string, number>>({});
  const [primaryQuantity, setPrimaryQuantity] = React.useState<number>(1);
  const [added, setAdded] = React.useState(false);
  const [floatingAdded, setFloatingAdded] = React.useState(false);
  const [lightboxImage, setLightboxImage] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<ActiveTab>('shipping');
  const [quickViewProduct, setQuickViewProduct] = React.useState<Product | null>(null);
  const [videoModalOpen, setVideoModalOpen] = React.useState(false);
  const [scrolledPastAddToCart, setScrolledPastAddToCart] = React.useState(false);
  const [newRating, setNewRating] = React.useState(5);
  const [reviewSuccess, setReviewSuccess] = React.useState(false);
  const [isEditingInline, setIsEditingInline] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const currentUser = useWpUser();

  // WooCommerce Reviews Hook
  const {
    reviews: liveReviews,
    userReview,
    otherReviews,
    ratingBreakdown,
    ratingCount: liveRatingCount,
    averageRating: liveAverageRating,
    sort: reviewSort,
    setSort: setReviewSort,
    totalPages: reviewTotalPages,
    totalReviews: reviewTotalOtherReviews,
    hasMore: reviewHasMore,
    loadMore: reviewLoadMore,
    isLoadingMore: reviewIsLoadingMore,
    isEditing,
    isSubmitting: isSubmittingReview,
    isDeleting: isDeletingReview,
    loading: reviewLoading,
    submitReview,
    deleteReview,
    error: reviewError,
  } = useWpProductReviews(product?.id || 0, { perPage: 6 });

  React.useEffect(() => {
    if (userReview?.rating) {
      setNewRating(userReview.rating);
    }
  }, [userReview]);

  const effectiveReviewCount = liveRatingCount > 0 ? liveRatingCount : (product?.reviews?.length || 0);
  const effectiveAvgRating = liveRatingCount > 0 ? liveAverageRating : (product?.rating ? Number(product.rating).toFixed(2) : (product?.reviews?.length ? (product.reviews.reduce((s: number, r) => s + (r.rating || 5), 0) / product.reviews.length).toFixed(2) : '0.00'));

  // References
  const imageRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const addToCartSectionRef = React.useRef<HTMLDivElement>(null);

  // Next Product for the floating card
  const nextProduct = React.useMemo(() => {
    if (!product || allProducts.length <= 1) return null;
    const curIdx = allProducts.findIndex((p) => p.id === product.id);
    return allProducts[(curIdx + 1) % allProducts.length];
  }, [product, allProducts]);

  // Observer to check if user scrolled past the main Add to Cart action section
  React.useEffect(() => {
    const checkScroll = () => {
      if (addToCartSectionRef.current) {
        const rect = addToCartSectionRef.current.getBoundingClientRect();
        setScrolledPastAddToCart(rect.bottom < 80);
      }
    };

    window.addEventListener('scroll', checkScroll, { passive: true });
    checkScroll();

    return () => window.removeEventListener('scroll', checkScroll);
  }, [product]);

  // Sync state on product change
  React.useEffect(() => {
    if (product) {
      const initialVariant = product.variants?.[0]?.options?.[0]?.id || 'default';
      setSelectedVariantId(initialVariant);
      setPrimaryQuantity(1);

      if (product.groupedItems) {
        const initialGrouped: Record<string, number> = {};
        product.groupedItems.forEach((item, idx) => {
          initialGrouped[item.id] = idx === 0 ? 1 : 0;
        });
        setVariantQuantities(initialGrouped);
      } else {
        setVariantQuantities({ [initialVariant]: 1 });
      }

      setAdded(false);
      setFloatingAdded(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [product]);

  if (!product) {
    return (
      <div className="container-wide py-24 text-center">
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-ink">Piece Not Found</h1>
        <p className="mt-2 text-base text-ink-muted">The requested design piece is not available in our current catalog.</p>
        <Link
          href="/shop"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 font-heading text-xs uppercase tracking-wider font-semibold text-cream"
        >
          Explore All Pieces
        </Link>
      </div>
    );
  }

  const isFav = isWishlisted(product.id);
  const relatedProducts = getRelatedProducts(product, 3);
  const currentVariant = product.variants?.[0]?.options?.find((o) => o.id === selectedVariantId);
  const currentPrice = product.price;

  const handleGroupedQtyChange = (itemId: string, delta: number) => {
    setVariantQuantities((prev) => {
      const cur = prev[itemId] || 0;
      return { ...prev, [itemId]: Math.max(0, cur + delta) };
    });
  };

  const handleAddToCart = () => {
    if (productType === 'grouped' && product.groupedItems) {
      let anyAdded = false;
      product.groupedItems.forEach((item) => {
        const qty = variantQuantities[item.id] || 0;
        if (qty > 0) {
          addItem(
            {
              ...product,
              id: Number(item.id.replace(/\D/g, '')) || product.id,
              name: `${product.name} — ${item.name}`,
              price: item.price,
            },
            qty,
          );
          anyAdded = true;
        }
      });
      if (!anyAdded) {
        addItem(product, 1);
      }
    } else {
      addItem(product, primaryQuantity);
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  };

  const handleFloatingAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1);
    setFloatingAdded(true);
    setTimeout(() => setFloatingAdded(false), 2000);
  };

  const handleDownload = () => {
    alert(`Downloading digital spatial package: ${product.name} (CAD & 3D Assets)...`);
  };

  const scrollToImage = (index: number) => {
    imageRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <>
      <WpHead
        title={`${product.name} — Comfortable Decor`}
        description={product.shortDescription || product.description}
      />

      {/* Main Page Container */}
      <div className="bg-background select-none w-full relative">
        {/* Top Breadcrumbs & Back Bar */}
        <div className="container-wide py-5 md:py-6 border-b border-border/60">
          <div className="flex items-center gap-4">
            <Link
              href="/shop"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border/80 text-ink hover:border-ink hover:bg-stone transition-all duration-200 cursor-pointer shadow-2xs hover:scale-105"
              aria-label="Back to shop"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <nav className="flex flex-wrap items-center gap-2 font-mono text-xs uppercase tracking-widest text-ink-muted" aria-label="Breadcrumb">
              <Link href="/shop" className="hover:text-ink transition-colors">
                Shop
              </Link>
              <span>›</span>
              <Link href={`/category/${product.categorySlug}`} className="hover:text-ink transition-colors">
                {product.category}
              </Link>
              <span>›</span>
              <span className="text-ink font-semibold truncate max-w-50 sm:max-w-none">
                {product.name}
              </span>
            </nav>
          </div>
        </div>

        {/* Main Product Showcase Section */}
        <div className="container-wide py-10 md:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start relative">
            {/* Left Column: Vertical Stacked Product Image Stream */}
            <div className="lg:col-span-7 flex gap-4 md:gap-6 min-w-0">
              {/* Floating Vertical Thumbnail Strip (Desktop) */}
              {product.images.length > 1 && (
                <div className="hidden sm:flex flex-col gap-3 sticky top-24 self-start z-10 shrink-0">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => scrollToImage(idx)}
                      className="relative h-16 w-16 overflow-hidden rounded-2xl border border-border/80 bg-stone transition-all duration-200 hover:border-ink cursor-pointer focus:ring-2 focus:ring-ink shadow-2xs hover:scale-105"
                    >
                      <WpImage src={img} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Vertically Stacked Image Gallery */}
              <div className="flex-1 space-y-8 min-w-0">
                {product.images.map((img, idx) => (
                  <div
                    key={idx}
                    ref={(el) => {
                      imageRefs.current[idx] = el;
                    }}
                    className="relative aspect-square w-full overflow-hidden rounded-3xl bg-[#f8f7f4] border border-border/70 group shadow-sm"
                  >
                    <WpImage
                      src={img}
                      alt={`${product.name} - Angle ${idx + 1}`}
                      className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                      loading={idx === 0 ? 'eager' : 'lazy'}
                    />

                    {/* Social Share Box (First image only) */}
                    {idx === 0 && (
                      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2.5 rounded-2xl bg-white/90 p-2.5 shadow-md backdrop-blur-md border border-border/50">
                        <button
                          type="button"
                          className="text-ink/75 hover:text-ink transition-colors cursor-pointer hover:scale-110"
                          aria-label="Share on Facebook"
                          onClick={() =>
                            window.open(
                              `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
                              '_blank',
                            )
                          }
                        >
                          <Facebook className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="text-ink/75 hover:text-ink transition-colors cursor-pointer hover:scale-110"
                          aria-label="Share"
                          onClick={() => {
                            if (navigator.clipboard) {
                              navigator.clipboard.writeText(window.location.href);
                            }
                          }}
                        >
                          <Share2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {/* Lightbox Trigger Button */}
                    <button
                      type="button"
                      onClick={() => setLightboxImage(img)}
                      className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-2xl bg-white/90 text-ink shadow-md backdrop-blur-md transition-all duration-200 hover:bg-ink hover:text-cream hover:scale-105 cursor-pointer"
                      title="Expand full resolution"
                      aria-label="Expand image"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Sticky Dynamic Purchase Panel */}
            <div className="lg:col-span-5 min-w-0 lg:sticky lg:top-24 self-start">
              <div className="space-y-6">
                {/* Badges & Meta */}
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-border bg-stone px-3.5 py-1 font-heading text-xs uppercase tracking-wider font-semibold text-ink">
                    {productType === 'downloadable' ? 'Digital Download' : 'In Stock'}
                  </span>
                  {product.compareAtPrice && (
                    <span className="rounded-full bg-terracotta px-3.5 py-1 font-heading text-xs uppercase tracking-wider font-semibold text-white">
                      Sale
                    </span>
                  )}
                  {productType === 'grouped' && (
                    <span className="rounded-full bg-sage-deep px-3.5 py-1 font-heading text-xs uppercase tracking-wider font-semibold text-white">
                      Grouped Set
                    </span>
                  )}
                </div>

                {/* Title & Tagline */}
                <div>
                  <h1 className="font-heading text-2xl sm:text-3xl lg:text-[2.15rem] font-bold tracking-tight text-ink leading-tight">
                    {product.name}
                  </h1>
                  <p className="font-mono text-[11px] sm:text-xs uppercase tracking-widest text-ink-muted mt-1.5">
                    {product.category} · Everyday Architectural Living
                  </p>
                </div>

                {/* Price Display */}
                <div className="flex items-baseline gap-3 pt-0.5">
                  <span className="font-mono text-xl sm:text-2xl font-bold text-ink">
                    {formatPrice(currentPrice)}
                  </span>
                  {product.compareAtPrice && (
                    <span className="font-mono text-base sm:text-lg text-ink-muted line-through">
                      {formatPrice(product.compareAtPrice)}
                    </span>
                  )}
                </div>

                {/* Rating Summary */}
                {effectiveReviewCount > 0 ? (
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex items-center text-ink">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'h-3.5 w-3.5',
                            i < Math.round(Number(effectiveAvgRating))
                              ? 'fill-current text-ink'
                              : 'text-border fill-none',
                          )}
                        />
                      ))}
                    </div>
                    <span className="font-mono text-[11px] text-ink-muted">
                      ({effectiveAvgRating} · {effectiveReviewCount} Verified{' '}
                      {effectiveReviewCount === 1 ? 'Review' : 'Reviews'})
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-[11px] text-ink-muted">No reviews yet</span>
                  </div>
                )}

                {/* Local Availability & Warranty Callouts */}
                <div className="space-y-2 rounded-2xl border border-border/70 bg-stone/30 p-3.5 text-xs font-mono text-ink-muted">
                  <p className="text-ink font-medium">
                    {productType === 'downloadable' ? (
                      <span className="text-emerald-700 font-bold">Instant Delivery — Files available immediately</span>
                    ) : (
                      <>
                        <span className="text-emerald-700 font-bold">48 in stock</span> in Central Hub & Copenhagen Showroom
                      </>
                    )}
                  </p>
                  <p className="text-ink/80 font-light leading-relaxed">
                    The correct product may have a{' '}
                    <span className="text-terracotta underline font-normal cursor-pointer">
                      Manufacturer's Warranty
                    </span>
                    . 28/77% success in repairs under manufacturer's warranty.
                  </p>
                </div>

                {/* --- DYNAMIC SECTION BY PRODUCT TYPE --- */}
                <div ref={addToCartSectionRef}>
                  {/* 1. VARIABLE PRODUCT TYPE: Swatches & Options */}
                  {productType === 'variable' && product.variants?.[0]?.options && (
                    <div className="space-y-5">
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <label className="font-mono text-xs uppercase tracking-wider text-ink font-semibold">
                            Finish / Material:{' '}
                            <span className="text-sage-deep font-bold">
                              {currentVariant?.label || ''}
                            </span>
                          </label>
                          <span className="font-mono text-xs text-ink-muted">
                            {product.variants[0].options.length} options
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                          {product.variants[0].options.map((opt) => {
                            const isSelected = selectedVariantId === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  setSelectedVariantId(opt.id);
                                  if (opt.image) {
                                    const imgIdx = product.images.findIndex((img) => img === opt.image);
                                    if (imgIdx >= 0) scrollToImage(imgIdx);
                                  }
                                }}
                                className={cn(
                                  'group flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-heading font-semibold uppercase tracking-wider transition-all cursor-pointer',
                                  isSelected
                                    ? 'border-ink bg-ink text-cream shadow-xs'
                                    : 'border-border bg-white text-ink/80 hover:border-ink hover:text-ink',
                                )}
                              >
                                <span
                                  className="h-3.5 w-3.5 rounded-full border border-black/20 shrink-0"
                                  style={{ backgroundColor: opt.color || '#ccc' }}
                                />
                                <span>{opt.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Quantity Stepper & Action Row */}
                      <div className="flex items-center gap-3 pt-1">
                        <div className="flex items-center border border-border bg-white h-12 px-3 rounded-2xl shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setPrimaryQuantity((q) => Math.max(1, q - 1))}
                            className="px-2 text-ink hover:text-sage-deep font-bold text-base cursor-pointer"
                          >
                            -
                          </button>
                          <span className="px-2 font-mono text-sm font-semibold w-8 text-center">
                            {primaryQuantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPrimaryQuantity((q) => q + 1)}
                            className="px-2 text-ink hover:text-sage-deep font-bold text-base cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={handleAddToCart}
                          className="flex-1 h-12 bg-ink text-cream hover:bg-sage-deep font-heading text-xs uppercase tracking-wider font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-md rounded-2xl"
                        >
                          {added ? (
                            <>
                              <Check className="h-4 w-4" />
                              <span>Added to Cart</span>
                            </>
                          ) : (
                            <span>Add to cart · {formatPrice(currentPrice * primaryQuantity)}</span>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => toggle(product.id, e)}
                          className={cn(
                            'h-12 w-12 shrink-0 flex items-center justify-center border border-border bg-white hover:border-ink transition-colors cursor-pointer rounded-2xl shadow-2xs',
                            isFav && 'text-terracotta border-terracotta',
                          )}
                          aria-label="Wishlist"
                        >
                          <Heart className={cn('h-5 w-5', isFav && 'fill-terracotta')} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 2. GROUPED PRODUCT TYPE: Bundle Matrix Table */}
                  {productType === 'grouped' && (
                    <div className="space-y-4">
                      <p className="font-mono text-xs uppercase tracking-wider text-ink font-semibold">
                        Set Components & Quantities:
                      </p>
                      <div className="space-y-2.5">
                        {(
                          product.groupedItems || [
                            { id: '1', name: `${product.name} Main Shell`, price: product.price, inStock: true },
                            { id: '2', name: 'Matching Lumbar Cushion', price: 65, inStock: true },
                            { id: '3', name: 'Felt Floor Glide Protectors (Set of 4)', price: 24, inStock: true },
                          ]
                        ).map((item) => {
                          const qty = variantQuantities[item.id] || 0;
                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-3.5 rounded-2xl border border-border bg-white shadow-2xs"
                            >
                              <div className="flex items-center border border-border bg-stone rounded-xl h-9 px-2">
                                <button
                                  type="button"
                                  onClick={() => handleGroupedQtyChange(item.id, -1)}
                                  className="px-2 text-ink hover:text-sage-deep font-bold text-sm cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="px-1.5 font-mono text-xs font-semibold w-5 text-center">
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleGroupedQtyChange(item.id, 1)}
                                  className="px-2 text-ink hover:text-sage-deep font-bold text-sm cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                              <span className="font-heading text-xs md:text-sm uppercase tracking-wider font-semibold text-ink px-2 truncate">
                                {item.name}
                              </span>
                              <span className="font-mono text-xs md:text-sm font-bold text-ink shrink-0">
                                {formatPrice(item.price)}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={handleAddToCart}
                        className="w-full h-12 bg-ink text-cream hover:bg-sage-deep font-heading text-xs uppercase tracking-wider font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-md rounded-2xl mt-3"
                      >
                        {added ? (
                          <>
                            <Check className="h-4 w-4" />
                            <span>Added to Cart</span>
                          </>
                        ) : (
                          <span>Add Grouped Items to Cart</span>
                        )}
                      </button>
                    </div>
                  )}

                  {/* 3. DOWNLOADABLE / DIGITAL PRODUCT TYPE */}
                  {productType === 'downloadable' && (
                    <div className="space-y-4 border border-border/80 bg-stone/40 p-6 rounded-3xl shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-cream shadow-sm">
                          <Download className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-heading text-xs uppercase tracking-wider font-semibold text-ink">
                            Architectural Digital Spatial Package
                          </p>
                          <p className="font-mono text-xs text-ink-muted">
                            Format: .OBJ, .3DS, .DWG (CAD) · 142 MB
                          </p>
                        </div>
                      </div>

                      <div className="text-xs text-ink/80 space-y-1.5 font-mono">
                        <p className="flex items-center gap-1.5">
                          <FileText className="h-4 w-4 text-sage-deep" />
                          <span>Includes Commercial Rendering & BIM License</span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Check className="h-4 w-4 text-emerald-600" />
                          <span>Instant Download link emailed upon confirmation</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handleDownload}
                          className="flex-1 h-12 bg-ink text-cream hover:bg-sage-deep font-heading text-xs uppercase tracking-wider font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-md rounded-2xl"
                        >
                          <Download className="h-4 w-4" />
                          <span>Download Spatial Assets · {formatPrice(product.price)}</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => toggle(product.id, e)}
                          className={cn(
                            'h-12 w-12 shrink-0 flex items-center justify-center border border-border bg-white hover:border-ink transition-colors cursor-pointer rounded-2xl shadow-2xs',
                            isFav && 'text-terracotta border-terracotta',
                          )}
                          aria-label="Wishlist"
                        >
                          <Heart className={cn('h-5 w-5', isFav && 'fill-terracotta')} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 4. EXTERNAL / AFFILIATE PRODUCT TYPE */}
                  {productType === 'external' && (
                    <div className="space-y-4">
                      <p className="text-sm text-ink-muted font-light leading-relaxed">
                        This design piece is fulfilled through our accredited European studio partner network.
                      </p>
                      <a
                        href={product.externalUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full h-12 bg-ink text-cream hover:bg-sage-deep font-heading text-xs uppercase tracking-wider font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-md rounded-2xl"
                      >
                        <span>Buy on Studio Partner Site</span>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  )}

                  {/* 5. STANDARD SIMPLE PRODUCT TYPE */}
                  {productType === 'standard' && (
                    <div className="space-y-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center border border-border bg-white h-12 px-3 rounded-2xl shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setPrimaryQuantity((q) => Math.max(1, q - 1))}
                            className="px-2 text-ink hover:text-sage-deep font-bold text-base cursor-pointer"
                          >
                            -
                          </button>
                          <span className="px-2 font-mono text-sm font-semibold w-8 text-center">
                            {primaryQuantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPrimaryQuantity((q) => q + 1)}
                            className="px-2 text-ink hover:text-sage-deep font-bold text-base cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={handleAddToCart}
                          className="flex-1 h-12 bg-ink text-cream hover:bg-sage-deep font-heading text-xs uppercase tracking-wider font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-md rounded-2xl"
                        >
                          {added ? (
                            <>
                              <Check className="h-4 w-4" />
                              <span>Added to Cart</span>
                            </>
                          ) : (
                            <span>Add to cart · {formatPrice(product.price * primaryQuantity)}</span>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => toggle(product.id, e)}
                          className={cn(
                            'h-12 w-12 shrink-0 flex items-center justify-center border border-border bg-white hover:border-ink transition-colors cursor-pointer rounded-2xl shadow-2xs',
                            isFav && 'text-terracotta border-terracotta',
                          )}
                          aria-label="Wishlist"
                        >
                          <Heart className={cn('h-5 w-5', isFav && 'fill-terracotta')} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          addItem(product, primaryQuantity);
                          openCart();
                        }}
                        className="w-full h-11 border border-ink bg-stone/40 hover:bg-stone text-ink font-heading text-xs uppercase tracking-wider font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer rounded-2xl"
                      >
                        <ShoppingBag className="h-4 w-4" />
                        <span>Express Buy Now</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Horizontal Tab Navigation Strip */}
        <div className="container-wide mt-16 border-t border-border/70 pt-10">
          <div className="flex items-center gap-8 border-b border-border/70 overflow-x-auto overflow-y-hidden no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('shipping')}
              className={cn(
                'font-heading text-xs md:text-sm uppercase tracking-wider font-semibold transition-colors py-3 relative cursor-pointer whitespace-nowrap',
                activeTab === 'shipping' ? 'text-ink font-bold' : 'text-ink-muted hover:text-ink',
              )}
            >
              Shipping & Returns
              {activeTab === 'shipping' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ink" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('size')}
              className={cn(
                'font-heading text-xs md:text-sm uppercase tracking-wider font-semibold transition-colors py-3 relative cursor-pointer whitespace-nowrap',
                activeTab === 'size' ? 'text-ink font-bold' : 'text-ink-muted hover:text-ink',
              )}
            >
              Size & Weight
              {activeTab === 'size' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ink" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={cn(
                'font-heading text-xs md:text-sm uppercase tracking-wider font-semibold transition-colors py-3 relative cursor-pointer whitespace-nowrap',
                activeTab === 'reviews' ? 'text-ink font-bold' : 'text-ink-muted hover:text-ink',
              )}
            >
              Reviews ({effectiveReviewCount})
              {activeTab === 'reviews' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ink" />
              )}
            </button>
          </div>

          {/* Tab Content Panel (2 Columns) */}
          <div className="py-12">
            {activeTab === 'shipping' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                {/* Left Side: Policies & Speed Blocks */}
                <div className="lg:col-span-7 space-y-6">
                  <div>
                    <h3 className="font-heading text-xl md:text-2xl font-bold text-ink">
                      Online Returns & Exchange Policy
                    </h3>
                    <p className="mt-2 text-sm md:text-base text-ink/80 font-light leading-relaxed">
                      If you aren't completely satisfied with your purchase, return it to us for an
                      exchange or full refund, subject to the following terms.{' '}
                      <span className="text-terracotta underline font-medium cursor-pointer">
                        Return policies & procedures
                      </span>
                    </p>
                  </div>

                  <div>
                    <h4 className="font-heading text-base font-bold text-ink">
                      Shipping & Handling
                    </h4>
                    <p className="mt-1 text-sm text-ink/75 font-light leading-relaxed">
                      For all orders containing only{' '}
                      <span className="text-terracotta font-medium">Comfortable Decor Goods</span>, standard
                      shipping costs will apply. All Oversize items qualify for complimentary
                      white-glove inside delivery across EU & US hubs.
                    </p>
                  </div>

                  {/* Delivery Location Estimates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="border border-border/70 p-5 bg-stone/30 rounded-2xl shadow-2xs">
                      <p className="font-mono text-xs font-bold text-ink uppercase tracking-widest">
                        USA
                      </p>
                      <p className="mt-1 text-xs font-mono text-ink-muted">
                        12 January – 16:00pm
                      </p>
                      <p className="text-xs text-ink/80 font-light mt-1">
                        allow 2-4 working days for delivery
                      </p>
                    </div>

                    <div className="border border-border/70 p-5 bg-stone/30 rounded-2xl shadow-2xs">
                      <p className="font-mono text-xs font-bold text-ink uppercase tracking-widest">
                        EU / UK
                      </p>
                      <p className="mt-1 text-xs font-mono text-ink-muted">
                        14 January – 18:00pm
                      </p>
                      <p className="text-xs text-ink/80 font-light mt-1">
                        allow 3-5 working days for delivery
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="rounded-full border border-ink/30 px-6 py-2.5 font-heading text-xs uppercase tracking-wider font-semibold text-ink hover:bg-ink hover:text-cream transition-colors cursor-pointer shadow-2xs"
                  >
                    Read full terms
                  </button>
                </div>

                {/* Right Side: Lifestyle Video Frame with Play Button */}
                <div className="lg:col-span-5">
                  <div
                    onClick={() => setVideoModalOpen(true)}
                    className="relative aspect-4/3 w-full overflow-hidden rounded-3xl bg-stone border border-border/70 group shadow-md cursor-pointer"
                  >
                    <WpImage
                      src="https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=1000&q=85"
                      alt="Product lifestyle setting"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-ink/20 flex items-center justify-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-ink shadow-lg backdrop-blur-sm transition-transform duration-300 group-hover:scale-115">
                        <Play className="h-6 w-6 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'size' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-7 space-y-4">
                  <h3 className="font-heading text-xl md:text-2xl font-bold text-ink">
                    Dimensions & Ergonomic Fit
                  </h3>
                  <div className="space-y-2.5 text-xs sm:text-sm font-mono text-ink-muted">
                    <p>
                      <span className="text-ink font-semibold">Dimensions:</span>{' '}
                      {typeof product.dimensions === 'object' && product.dimensions !== null
                        ? `${[product.dimensions.length, product.dimensions.width, product.dimensions.height].filter(Boolean).join(' × ')} ${product.dimensions.unit || 'cm'}`
                        : (product.dimensions || '59 × 52 × 79 cm')}
                    </p>
                    <p>
                      <span className="text-ink font-semibold">Seat Height:</span> 46 cm
                    </p>
                    <p>
                      <span className="text-ink font-semibold">Net Weight:</span> 6.8 kg
                    </p>
                    <p>
                      <span className="text-ink font-semibold">Boxed Dimensions:</span> 65 × 60 × 85 cm (9.2 kg)
                    </p>
                    <p>
                      <span className="text-ink font-semibold">Assembly:</span> Legs attach via 4 included hex bolts (Allen key provided)
                    </p>
                  </div>
                </div>
                <div className="lg:col-span-5 p-6 bg-stone/40 border border-border/70 rounded-2xl flex flex-col justify-center shadow-2xs">
                  <p className="font-heading text-base font-semibold text-ink">Spatial Fit Guarantee</p>
                  <p className="text-xs sm:text-sm text-ink/75 font-light mt-1.5 leading-relaxed">
                    Designed to nest neatly under standard 74–76cm dining surfaces and studio desks.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-12">
                {/* Top Section: Histogram & (Review Form OR Your Review Card) Side by Side on Desktop */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left Column: Rating Overview & Histogram */}
                  <div className="lg:col-span-5 bg-stone/20 border border-border/70 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-6">
                    <div className="flex items-center gap-4 border-b border-border/60 pb-6">
                      <span className="font-heading text-4xl sm:text-5xl font-bold text-ink">
                        {effectiveAvgRating}
                      </span>
                      <div className="flex flex-col items-start space-y-1">
                        <div className="flex text-amber-500">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={cn(
                                'h-4 w-4',
                                star <= Math.round(Number(effectiveAvgRating))
                                  ? 'fill-current text-amber-500'
                                  : 'text-zinc-300'
                              )}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-mono text-ink-muted">
                          Based on {effectiveReviewCount} {effectiveReviewCount === 1 ? 'review' : 'reviews'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {([5, 4, 3, 2, 1] as const).map((star) => {
                        const count = ratingBreakdown[star] || 0;
                        const pct = effectiveReviewCount > 0 ? Math.round((count / effectiveReviewCount) * 100) : 0;
                        return (
                          <div key={star} className="flex items-center gap-3 text-xs font-mono">
                            <span className="w-6 text-right font-semibold text-ink">{star}★</span>
                            <div className="flex-1 h-2 bg-stone/70 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-14 text-ink-muted text-right text-[11px] tabular-nums">
                              {count} ({pct}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: User Review Card OR Leave a Review Form */}
                  <div className="lg:col-span-7">
                    {userReview ? (() => {
                      const authAvatar = getAvatarInfo(currentUser?.displayName || currentUser?.username || 'You');
                      return (
                        <div className="border border-border/80 bg-white rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
                            <div className="flex items-center gap-3.5">
                              <div
                                className={cn(
                                  'h-11 w-11 rounded-2xl flex items-center justify-center font-heading font-bold text-sm border shadow-2xs shrink-0',
                                  authAvatar.palette.bg
                                )}
                              >
                                {authAvatar.initials}
                              </div>
                              <div>
                                <h4 className="font-heading text-base font-bold text-ink">
                                  {currentUser?.displayName || currentUser?.username || 'You'}
                                </h4>
                                <span className="text-xs font-mono text-ink-muted block mt-0.5">
                                  {userReview.date}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsEditingInline(!isEditingInline);
                                  setShowDeleteConfirm(false);
                                }}
                                className="inline-flex items-center gap-1.5 h-9 px-4 bg-stone/50 hover:bg-stone text-ink border border-border rounded-xl text-xs font-mono font-semibold transition-colors cursor-pointer"
                              >
                                <Edit3 className="h-3.5 w-3.5 text-ink-muted" />
                                {isEditingInline ? 'Cancel' : 'Edit Review'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                                className="inline-flex items-center gap-1.5 h-9 px-4 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-mono font-semibold transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </div>
                          </div>

                          {showDeleteConfirm ? (
                            <div className="p-5 bg-red-50/80 border border-red-200 rounded-2xl space-y-3">
                              <p className="text-xs font-mono text-red-900 font-semibold">
                                Are you sure you want to permanently delete your review?
                              </p>
                              <div className="flex flex-wrap gap-2.5">
                                <button
                                  type="button"
                                  disabled={isDeletingReview}
                                  onClick={async () => {
                                    const ok = await deleteReview();
                                    if (ok) {
                                      setShowDeleteConfirm(false);
                                      setIsEditingInline(false);
                                    }
                                  }}
                                  className="inline-flex items-center gap-2 h-9 px-5 bg-red-600 hover:bg-red-700 text-white text-xs font-mono font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  {isDeletingReview && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                  <span>{isDeletingReview ? 'Deleting...' : 'Yes, Delete'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowDeleteConfirm(false)}
                                  className="h-9 px-4 bg-white border border-border text-ink text-xs font-mono rounded-xl hover:bg-stone cursor-pointer"
                                >
                                  Keep Review
                                </button>
                              </div>
                            </div>
                          ) : isEditingInline ? (
                            <form
                              onSubmit={async (e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const content = formData.get('content') as string;
                                if (!content) return;
                                const ok = await submitReview({
                                  author: currentUser?.displayName || currentUser?.username || 'Customer',
                                  email: currentUser?.email,
                                  content,
                                  rating: newRating,
                                });
                                if (ok) {
                                  setIsEditingInline(false);
                                  setReviewSuccess(true);
                                }
                              }}
                              className="space-y-4 pt-1"
                            >
                              {reviewError && (
                                <p className="text-xs text-red-600 font-mono">{reviewError}</p>
                              )}
                              <div>
                                <label className="block text-xs font-mono uppercase text-ink-muted mb-1.5 font-semibold">
                                  Update Star Rating
                                </label>
                                <div className="flex gap-2 text-amber-400">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                      key={star}
                                      type="button"
                                      onClick={() => setNewRating(star)}
                                      className="cursor-pointer p-1 focus:outline-none"
                                    >
                                      <Star
                                        className={cn(
                                          'h-6 w-6 sm:h-5 sm:w-5',
                                          star <= newRating ? 'fill-current text-amber-500' : 'text-zinc-200'
                                        )}
                                      />
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-mono uppercase text-ink-muted mb-1.5 font-semibold">
                                  Review Content
                                </label>
                                <textarea
                                  name="content"
                                  required
                                  rows={3}
                                  defaultValue={userReview.content}
                                  placeholder="Update your review details..."
                                  className="w-full p-3.5 border border-border rounded-xl text-xs bg-stone/20 focus:bg-white focus:border-ink focus:outline-none transition-colors"
                                />
                              </div>

                              <div className="flex gap-2.5">
                                <button
                                  type="submit"
                                  disabled={isSubmittingReview}
                                  className="inline-flex items-center gap-2 h-10 px-6 bg-ink text-cream hover:bg-sage-deep font-heading text-xs uppercase tracking-wider font-semibold rounded-full transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  {isSubmittingReview && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                  <span>{isSubmittingReview ? 'Saving Changes...' : 'Save Updates'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIsEditingInline(false)}
                                  className="h-10 px-5 border border-border text-ink hover:bg-stone font-heading text-xs uppercase tracking-wider font-semibold rounded-full transition-colors cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          ) : (
                            <div className="space-y-3 pt-1">
                              <div className="flex text-amber-500">
                                {[...Array(userReview.rating || 5)].map((_, idx) => (
                                  <Star key={idx} className="h-4 w-4 fill-current" />
                                ))}
                              </div>
                              <p className="text-sm text-ink/90 font-light leading-relaxed">
                                {userReview.content}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })() : (
                      <div className="border border-border/80 bg-white rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xs">
                        {!currentUser ? (
                          <div className="py-8 px-6 border border-dashed border-border/80 bg-stone/30 rounded-2xl text-center space-y-3">
                            <div className="flex justify-center text-ink/40">
                              <Lock className="h-6 w-6" />
                            </div>
                            <h4 className="font-heading text-base font-bold text-ink">Sign In to Leave a Review</h4>
                            <p className="text-xs text-ink-muted max-w-sm mx-auto font-light leading-relaxed">
                              Only verified members can share customer reviews. Sign in to your account to review this design piece.
                            </p>
                            <div className="pt-2">
                              <Link
                                href="/account"
                                className="inline-flex h-10 px-6 bg-ink text-cream hover:bg-sage-deep font-heading text-xs uppercase tracking-wider font-semibold rounded-full items-center justify-center transition-colors"
                              >
                                Sign In / Register
                              </Link>
                            </div>
                          </div>
                        ) : (
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              const formData = new FormData(e.currentTarget);
                              const content = formData.get('content') as string;
                              if (!content) return;
                              const ok = await submitReview({
                                author: currentUser.displayName || currentUser.username || 'Customer',
                                email: currentUser.email,
                                content,
                                rating: newRating,
                              });
                              if (ok) {
                                setReviewSuccess(true);
                              }
                            }}
                            className="space-y-4"
                          >
                            <div className="flex items-center justify-between">
                              <h4 className="font-heading text-lg font-bold text-ink">Leave a Review</h4>
                            </div>

                            {reviewError && (
                              <p className="text-xs text-red-600 font-mono">{reviewError}</p>
                            )}

                            <div>
                              <label className="block text-xs font-mono uppercase text-ink-muted mb-1.5 font-semibold">
                                Rating
                              </label>
                              <div className="flex gap-2 text-amber-400">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => setNewRating(star)}
                                    className="cursor-pointer p-1 focus:outline-none"
                                  >
                                    <Star
                                      className={cn(
                                        'h-6 w-6 sm:h-5 sm:w-5',
                                        star <= newRating ? 'fill-current text-amber-500' : 'text-zinc-200'
                                      )}
                                    />
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="p-3.5 bg-stone/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between text-xs border border-border/50 gap-1.5">
                              <span className="text-ink-muted font-mono">Reviewing as:</span>
                              <span className="font-bold text-ink truncate max-w-full sm:max-w-60">
                                {currentUser.displayName || currentUser.username} ({currentUser.email})
                              </span>
                            </div>

                            <div>
                              <label className="block text-xs font-mono uppercase text-ink-muted mb-1.5 font-semibold">
                                Review Content *
                              </label>
                              <textarea
                                name="content"
                                required
                                rows={3}
                                placeholder="Share details about the quality, finish, or comfort..."
                                className="w-full p-3.5 border border-border rounded-xl text-xs focus:border-ink focus:outline-none"
                              />
                            </div>

                            <button
                              type="submit"
                              disabled={isSubmittingReview}
                              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto h-11 px-8 bg-ink text-cream hover:bg-sage-deep font-heading text-xs uppercase tracking-wider font-semibold rounded-full transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {isSubmittingReview && <Loader2 className="h-4 w-4 animate-spin" />}
                              <span>{isSubmittingReview ? 'Submitting Review...' : 'Submit Review'}</span>
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Section: Customer Reviews List */}
                <div className="space-y-6 pt-6 border-t border-border/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
                    <h3 className="font-heading text-lg sm:text-xl font-bold text-ink">
                      Customer Reviews ({otherReviews.length > 0 ? (reviewTotalOtherReviews || otherReviews.length) : otherReviews.length})
                    </h3>

                    {/* Sorting Controls */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0 max-w-full">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-ink-muted shrink-0" />
                      <span className="text-xs font-mono text-ink-muted shrink-0">Sort:</span>
                      <div className="flex items-center bg-stone/40 p-1 rounded-xl border border-border/60 shrink-0">
                        {(
                          [
                            { id: 'newest', label: 'Most Recent' },
                            { id: 'highest', label: 'Highest' },
                            { id: 'lowest', label: 'Lowest' },
                            { id: 'oldest', label: 'Oldest' },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setReviewSort(opt.id)}
                            className={cn(
                              'px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap',
                              reviewSort === opt.id
                                ? 'bg-white font-bold text-ink shadow-2xs'
                                : 'text-ink-muted hover:text-ink'
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Other Reviews Grid with Avatars */}
                  {otherReviews.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {otherReviews.map((rev) => {
                        const avatar = getAvatarInfo(rev.author);
                        return (
                          <div
                            key={rev.id}
                            className="p-6 border border-border/80 bg-white/90 rounded-3xl space-y-4 shadow-2xs flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={cn(
                                      'h-10 w-10 rounded-xl flex items-center justify-center font-heading font-bold text-xs border shadow-2xs shrink-0',
                                      avatar.palette.bg
                                    )}
                                  >
                                    {avatar.initials}
                                  </div>
                                  <div>
                                    <h5 className="font-heading text-sm font-bold text-ink truncate max-w-35">
                                      {rev.author}
                                    </h5>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <div className="flex text-amber-500">
                                    {[...Array(rev.rating || 5)].map((_, idx) => (
                                      <Star key={idx} className="h-3.5 w-3.5 fill-current" />
                                    ))}
                                  </div>
                                  {rev.date && (
                                    <span className="text-[10px] font-mono text-ink-muted">{rev.date}</span>
                                  )}
                                </div>
                              </div>

                              <p className="text-xs sm:text-sm text-ink/80 font-light leading-relaxed">
                                {rev.content}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 px-6 border border-dashed border-border/80 bg-stone/20 rounded-3xl text-center space-y-2">
                      <p className="text-xs font-mono text-ink-muted">
                        {userReview ? 'No other customer reviews yet.' : 'No customer reviews yet for this piece.'}
                      </p>
                    </div>
                  )}

                  {/* Unified Load More Pagination with Spinner */}
                  {reviewTotalPages > 1 && (
                    <div className="flex flex-col items-center gap-3.5 pt-8">
                      {reviewHasMore ? (
                        <button
                          type="button"
                          disabled={reviewIsLoadingMore}
                          onClick={reviewLoadMore}
                          className="inline-flex items-center justify-center gap-2.5 h-12 px-8 bg-ink text-cream hover:bg-sage-deep font-heading text-xs uppercase tracking-widest font-semibold rounded-full transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50 min-w-55"
                        >
                          {reviewIsLoadingMore ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin text-cream" />
                              <span>Loading Reviews...</span>
                            </>
                          ) : (
                            <span>Load More Reviews</span>
                          )}
                        </button>
                      ) : (
                        <span className="text-xs font-mono text-ink-muted bg-stone/50 px-4 py-1.5 rounded-full border border-border">
                          All {reviewTotalOtherReviews || otherReviews.length} customer reviews loaded
                        </span>
                      )}

                      <span className="text-[11px] font-mono text-ink-muted">
                        Showing {otherReviews.length} of {reviewTotalOtherReviews || otherReviews.length} customer reviews
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div className="container-wide mt-12 border-t border-border/70 pt-12 pb-16">
            <h3 className="font-heading text-2xl md:text-3xl font-bold text-ink mb-8">
              Related products
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {relatedProducts.map((rel) => (
                <div key={rel.id} className="h-full">
                  <ProductCard product={rel} onQuickView={(p) => setQuickViewProduct(p)} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* --- DYNAMIC CORNER FLOATING CARD (Next Product <-> Current Product Sticky Bar) --- */}
      <AnimatePresence mode="wait">
        {!scrolledPastAddToCart && nextProduct ? (
          /* STATE 1: Next Product Floating Card (When near top) - Positioned bottom-right */
          <motion.div
            key="floating-next-product"
            initial={{ opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.92 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-3 sm:bottom-6 right-3 sm:right-6 z-40 max-w-[calc(100vw-1.5rem)] sm:max-w-sm"
          >
            <Link
              href={`/product/${nextProduct.slug}`}
              className="group flex items-center gap-3 rounded-2xl border border-border/80 bg-white/95 p-2 sm:p-2.5 pr-3.5 sm:pr-4 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.18)] backdrop-blur-2xl transition-all duration-300 hover:border-ink hover:shadow-[0_20px_50px_-8px_rgba(0,0,0,0.25)] hover:-translate-y-0.5 cursor-pointer"
            >
              <div className="relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 overflow-hidden rounded-xl border border-border/80 bg-stone">
                <WpImage
                  src={nextProduct.images[0]}
                  alt={nextProduct.name}
                  className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-sage-deep font-bold">
                  <span>Next in Collection</span>
                  <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
                <p className="font-heading text-xs sm:text-sm font-bold text-ink truncate group-hover:text-sage-deep transition-colors">
                  {nextProduct.name}
                </p>
                <p className="font-mono text-xs font-semibold text-ink-muted">
                  {formatPrice(nextProduct.price)}
                </p>
              </div>

              <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full border border-border bg-stone/50 text-ink transition-all duration-300 group-hover:bg-ink group-hover:text-cream group-hover:border-ink">
                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          </motion.div>
        ) : (
          /* STATE 2: Current Product Floating Sticky Bar (When scrolled past Add to Cart) - Positioned bottom-right */
          <motion.div
            key="floating-current-product"
            initial={{ opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.92 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-3 sm:bottom-6 right-3 sm:right-6 z-40 max-w-[calc(100vw-1.5rem)] sm:max-w-md"
          >
            <div className="flex items-center gap-2.5 sm:gap-3.5 rounded-2xl border border-border/90 bg-white/95 p-2 sm:p-2.5 pr-2.5 sm:pr-3 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.2)] backdrop-blur-2xl">
              <div className="relative h-13 w-13 shrink-0 overflow-hidden rounded-xl border border-border/80 bg-stone">
                <WpImage
                  src={product.images[0]}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
                <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-heading text-xs sm:text-sm font-bold text-ink truncate">
                  {product.name}
                </p>
                <p className="font-mono text-xs font-bold text-ink">
                  {formatPrice(currentPrice)}
                </p>
              </div>

              <button
                type="button"
                onClick={handleFloatingAddToCart}
                className="h-10 px-4 rounded-xl bg-ink text-cream hover:bg-sage-deep font-heading text-xs uppercase tracking-wider font-semibold flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
              >
                {floatingAdded ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Added</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-3.5 w-3.5" />
                    <span>Add to Cart</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={(e) => toggle(product.id, e)}
                className={cn(
                  'h-10 w-10 shrink-0 flex items-center justify-center rounded-xl border border-border/80 bg-stone/40 hover:border-ink hover:bg-white transition-colors cursor-pointer',
                  isFav && 'text-terracotta border-terracotta bg-white',
                )}
                aria-label="Wishlist"
              >
                <Heart className={cn('h-4 w-4', isFav && 'fill-terracotta')} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Lightbox Image */}
      <AnimatePresence>
        {lightboxImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/90 backdrop-blur-md cursor-pointer"
            onClick={() => setLightboxImage(null)}
          >
            <WpImage
              src={lightboxImage}
              alt=""
              className="max-h-[85vh] max-w-[90vw] object-contain shadow-2xl rounded-3xl"
            />
          </div>
        )}
      </AnimatePresence>

      {/* Video Modal */}
      <AnimatePresence>
        {videoModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/90 backdrop-blur-md"
            onClick={() => setVideoModalOpen(false)}
          >
            <div
              className="relative w-full max-w-3xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <iframe
                className="w-full h-full"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
                title="Product video preview"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
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
