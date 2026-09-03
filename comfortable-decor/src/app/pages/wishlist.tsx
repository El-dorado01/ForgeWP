import * as React from 'react';
import { Link } from '@/components/ui/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  ShoppingBag,
  Share2,
  Check,
  ArrowRight,
  LayoutGrid,
  List,
} from 'lucide-react';
import { WpHead, WpImage } from '@forgewp/react';
import { useWishlist } from '@/context/wishlist-context';
import { useCart } from '@/context/cart-context';
import { products } from '@/data/products';
import { ProductCard } from '@/components/product/product-card';
import { Price } from '@/components/commerce/price';
import { QuickViewModal } from '@/components/product/quick-view-modal';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';

export default function WishlistPage() {
  const { ids, remove, clear } = useWishlist();
  const { addItem, openCart } = useCart();
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  const [copiedShare, setCopiedShare] = React.useState(false);
  const [addedAll, setAddedAll] = React.useState(false);
  const [quickViewProduct, setQuickViewProduct] = React.useState<Product | null>(null);

  // Match wishlisted IDs with products data
  const wishlistedProducts = React.useMemo(() => {
    return products.filter((p) => ids.includes(p.id));
  }, [ids]);

  // Recommended curated pieces if wishlist has few/no items
  const recommendedProducts = React.useMemo(() => {
    return products.filter((p) => !ids.includes(p.id)).slice(0, 4);
  }, [ids]);

  // Handle Share Moodboard
  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2200);
    }
  };

  // Handle Move All to Cart
  const handleAddAllToCart = () => {
    if (wishlistedProducts.length === 0) return;
    wishlistedProducts.forEach((product) => {
      addItem(product, 1);
    });
    setAddedAll(true);
    setTimeout(() => {
      setAddedAll(false);
      openCart();
    }, 800);
  };

  return (
    <>
      <WpHead
        title="Saved Moodboard & Wishlist — Comfortable Decor"
        description="Your curated objects and design pieces saved for your space."
      />

      <main className="bg-background min-h-screen py-6 sm:py-10 md:py-16 select-none">
        <div className="container-wide">
          {/* Editorial Header */}
          <div className="border-b border-border/70 pb-6 sm:pb-8 mb-6 sm:mb-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-ink-muted mb-1.5">
                  Personal Curation
                </p>
                <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-ink">
                  Saved Objects
                </h1>
                <p className="mt-1.5 sm:mt-2 text-sm sm:text-base text-ink-muted font-light max-w-xl">
                  {wishlistedProducts.length > 0
                    ? `You have preserved ${wishlistedProducts.length} ${
                        wishlistedProducts.length === 1 ? 'sculptural piece' : 'sculptural pieces'
                      } for your interior aesthetic.`
                    : 'Your personal collection is currently empty. Explore our architectural designs below.'}
                </p>
              </div>

              {/* Action Toolbar */}
              {wishlistedProducts.length > 0 && (
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Grid / List Switcher */}
                  <div className="flex items-center rounded-full border border-border/80 bg-stone/40 p-1 mr-1">
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full transition-colors cursor-pointer',
                        viewMode === 'grid'
                          ? 'bg-ink text-cream shadow-2xs'
                          : 'text-ink-muted hover:text-ink',
                      )}
                      aria-label="Grid layout"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full transition-colors cursor-pointer',
                        viewMode === 'list'
                          ? 'bg-ink text-cream shadow-2xs'
                          : 'text-ink-muted hover:text-ink',
                      )}
                      aria-label="List layout"
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Share Button */}
                  <button
                    type="button"
                    onClick={handleShare}
                    className="rounded-full border border-border/80 bg-white hover:bg-stone px-4 py-2.5 font-heading text-xs uppercase tracking-wider font-semibold text-ink transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    {copiedShare ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Link Copied</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="h-3.5 w-3.5" />
                        <span>Share Moodboard</span>
                      </>
                    )}
                  </button>

                  {/* Move All to Cart */}
                  <button
                    type="button"
                    onClick={handleAddAllToCart}
                    className="rounded-full bg-ink hover:bg-sage-deep px-5 py-2.5 font-heading text-xs uppercase tracking-wider font-semibold text-cream transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    {addedAll ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Adding to Cart...</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="h-3.5 w-3.5" />
                        <span>Add All to Cart</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ============================================================ */}
          {/* ACTIVE WISHLIST ITEMS */}
          {/* ============================================================ */}
          {wishlistedProducts.length > 0 ? (
            <div>
              {viewMode === 'grid' ? (
                /* GRID VIEW */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                  <AnimatePresence mode="popLayout">
                    {wishlistedProducts.map((product) => (
                      <motion.div
                        key={product.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                        className="h-full"
                      >
                        <ProductCard
                          product={product}
                          onQuickView={(p) => setQuickViewProduct(p)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                /* LIST VIEW */
                <div className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {wishlistedProducts.map((product) => (
                      <motion.div
                        key={product.id}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                        className="rounded-3xl border border-border/80 bg-white p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5"
                      >
                        {/* Image & Main Info */}
                        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                          <Link href={`/product/${product.slug}`} className="shrink-0">
                            <WpImage
                              src={product.images[0]}
                              alt={product.name}
                              className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover border border-border/60 bg-stone/40 shadow-2xs"
                            />
                          </Link>

                          <div className="min-w-0">
                            <span className="font-mono text-[10px] uppercase tracking-wider font-bold text-sage-deep">
                              {product.category}
                            </span>
                            <Link href={`/product/${product.slug}`}>
                              <h3 className="font-heading text-base sm:text-lg font-bold text-ink hover:text-sage-deep transition-colors truncate">
                                {product.name}
                              </h3>
                            </Link>
                            <p className="font-mono text-xs text-ink-muted mt-0.5 truncate">
                              {product.materials?.join(' · ') || product.shortDescription}
                            </p>
                            <div className="mt-2">
                              <Price price={product.price} compareAtPrice={product.compareAtPrice} />
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => remove(product.id)}
                            className="font-mono text-xs text-ink-muted hover:text-terracotta underline cursor-pointer px-2"
                          >
                            Remove
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              addItem(product, 1);
                              openCart();
                            }}
                            className="rounded-full bg-ink hover:bg-sage-deep px-5 py-2.5 font-heading text-xs uppercase tracking-wider font-semibold text-cream transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                          >
                            <ShoppingBag className="h-3.5 w-3.5" />
                            <span>Add to Cart</span>
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* Bottom Quick Clear Action */}
              <div className="mt-12 pt-6 border-t border-border/60 flex items-center justify-between">
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 font-heading text-xs uppercase tracking-wider font-semibold text-ink hover:text-sage-deep transition-colors"
                >
                  <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                  <span>Continue Browsing Collection</span>
                </Link>

                <button
                  type="button"
                  onClick={clear}
                  className="font-mono text-xs text-ink-muted hover:text-terracotta underline cursor-pointer transition-colors"
                >
                  Clear Wishlist
                </button>
              </div>
            </div>
          ) : (
            /* ============================================================ */
            /* EMPTY STATE (SEAMLESS ON PAGE CANVAS - NO CARD BG) */
            /* ============================================================ */
            <div className="space-y-16">
              <div className="py-10 md:py-16 text-center max-w-lg mx-auto">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-stone/70 text-ink/80 mb-4 border border-border/60">
                  <Heart className="h-6 w-6" />
                </div>

                <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-ink tracking-tight">
                  Your Moodboard is Waiting
                </h2>

                <p className="mt-3 text-sm sm:text-base text-ink-muted leading-relaxed font-light">
                  Save pieces while you explore our collections to build a cohesive interior palette and spatial layout.
                </p>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/shop"
                    className="rounded-full bg-ink hover:bg-sage-deep px-6 py-3 font-heading text-xs uppercase tracking-wider font-semibold text-cream transition-all cursor-pointer shadow-md"
                  >
                    Browse All Pieces
                  </Link>
                  <Link
                    href="/categories"
                    className="rounded-full border border-border bg-white hover:bg-stone px-6 py-3 font-heading text-xs uppercase tracking-wider font-semibold text-ink transition-colors cursor-pointer shadow-2xs"
                  >
                    Explore Departments
                  </Link>
                </div>
              </div>

              {/* Curated Recommendations Section (Full Container Width) */}
              <div className="pt-8 border-t border-border/70">
                <div className="flex items-center justify-between pb-6 mb-2">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-widest text-ink-muted mb-1">
                      Curated Inspiration
                    </p>
                    <h3 className="font-heading text-xl sm:text-2xl font-bold text-ink">
                      Popular Objects to Begin Your Board
                    </h3>
                  </div>
                  <Link
                    href="/shop"
                    className="hidden sm:inline-flex items-center gap-1.5 font-heading text-xs uppercase tracking-wider font-semibold text-ink hover:text-sage-deep transition-colors"
                  >
                    <span>View Catalog</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 items-stretch">
                  {recommendedProducts.map((prod) => (
                    <div key={prod.id} className="h-full">
                      <ProductCard
                        product={prod}
                        onQuickView={(p) => setQuickViewProduct(p)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Quick View Modal */}
      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
        />
      )}
    </>
  );
}
