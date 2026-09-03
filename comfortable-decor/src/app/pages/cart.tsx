import * as React from 'react';
import { Link } from '@/components/ui/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Truck,
  Check,
  Tag,
  Lock,
  Minus,
  Plus,
} from 'lucide-react';
import { WpHead, WpImage } from '@forgewp/react';
import { useCart } from '@/context/cart-context';
import { products, formatPrice } from '@/data/products';
import { ProductCard } from '@/components/product/product-card';
import { Price } from '@/components/commerce/price';
import { QuickViewModal } from '@/components/product/quick-view-modal';
import type { Product } from '@/types';

const FREE_SHIPPING_THRESHOLD = 500;

export default function CartPage() {
  const { items, itemCount, subtotal, removeItem, updateQuantity, clearCart } = useCart();
  const [couponCode, setCouponCode] = React.useState('');
  const [appliedCoupon, setAppliedCoupon] = React.useState<string | null>(null);
  const [couponError, setCouponError] = React.useState<string | null>(null);
  const [giftNote, setGiftNote] = React.useState('');
  const [showGiftInput, setShowGiftInput] = React.useState(false);
  const [whiteGloveService, setWhiteGloveService] = React.useState(false);
  const [quickViewProduct, setQuickViewProduct] = React.useState<Product | null>(null);

  // Calculate discounts
  const discountAmount = appliedCoupon ? subtotal * 0.1 : 0; // 10% off
  const whiteGloveFee = whiteGloveService ? 65 : 0;
  const isFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
  const shippingFee = isFreeShipping ? 0 : 45;
  const finalTotal = Math.max(0, subtotal - discountAmount + whiteGloveFee + (isFreeShipping ? 0 : shippingFee));

  const amountToFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const freeShippingProgress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  // Handle coupon
  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    const clean = couponCode.trim().toUpperCase();

    if (clean === 'NORDIC10' || clean === 'COMFORT10' || clean === 'FORGE10') {
      setAppliedCoupon(clean);
      setCouponCode('');
    } else {
      setCouponError('Invalid coupon code. Try "NORDIC10" for 10% off.');
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
  };

  // Recommended products for empty state and cart cross-sells
  const cartProductIds = items.map((i) => i.productId);
  const recommendedProducts = React.useMemo(() => {
    return products.filter((p) => !cartProductIds.includes(p.id)).slice(0, 4);
  }, [cartProductIds]);

  return (
    <>
      <WpHead
        title={`Shopping Bag (${itemCount}) — Comfortable Decor`}
        description="Review your curated design pieces, apply promo codes, and proceed to secure checkout."
      />

      <main className="bg-background min-h-screen py-6 sm:py-10 md:py-16 select-none">
        <div className="container-wide">
          {/* Header */}
          <div className="border-b border-border/70 pb-5 sm:pb-6 mb-6 sm:mb-8 md:mb-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-ink-muted mb-1.5">
                  Order Review
                </p>
                <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-ink">
                  Shopping Bag
                </h1>
              </div>

              {items.length > 0 && (
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 text-xs font-mono text-ink-muted">
                  <span>
                    {itemCount} {itemCount === 1 ? 'piece' : 'pieces'} selected
                  </span>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={clearCart}
                    className="hover:text-terracotta underline transition-colors cursor-pointer"
                  >
                    Clear Bag
                  </button>
                </div>
              )}
            </div>
          </div>

          {items.length > 0 ? (
            /* ============================================================ */
            /* ACTIVE CART (2-COLUMN EDITORIAL SPLIT) */
            /* ============================================================ */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              {/* Left Column: Cart Line Items & Delivery Perks (7 Cols) */}
              <div className="lg:col-span-7 space-y-6">
                {/* Free Shipping Progress Indicator Bar */}
                <div className="rounded-2xl border border-border/80 bg-white p-4 sm:p-5 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2 text-ink">
                      <Truck className="h-4 w-4 text-sage-deep" />
                      {isFreeShipping ? (
                        <span className="font-bold text-emerald-700">
                          You unlocked Complimentary Worldwide White-Glove Delivery!
                        </span>
                      ) : (
                        <span>
                          Add <strong className="font-bold text-ink">{formatPrice(amountToFreeShipping)}</strong> more to qualify for Free Shipping
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-ink-muted">{Math.round(freeShippingProgress)}%</span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-stone">
                    <div
                      className="h-full bg-sage-deep transition-all duration-500 ease-out rounded-full"
                      style={{ width: `${freeShippingProgress}%` }}
                    />
                  </div>
                </div>

                {/* Line Items List */}
                <div className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {items.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                        className="rounded-3xl border border-border/80 bg-white p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5"
                      >
                        {/* Thumbnail & Description */}
                        <div className="flex items-center gap-4 sm:gap-5 min-w-0">
                          <Link href={`/product/${item.slug}`} className="shrink-0">
                            <WpImage
                              src={item.image}
                              alt={item.name}
                              className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover border border-border/60 bg-stone/40 shadow-2xs"
                            />
                          </Link>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 font-mono text-[10px] font-bold uppercase">
                                In Stock
                              </span>
                            </div>

                            <Link href={`/product/${item.slug}`}>
                              <h3 className="font-heading text-base sm:text-lg font-bold text-ink hover:text-sage-deep transition-colors truncate">
                                {item.name}
                              </h3>
                            </Link>

                            {item.variantLabel && (
                              <p className="font-mono text-xs text-ink-muted mt-0.5">
                                Variant: {item.variantLabel}
                              </p>
                            )}

                            <div className="mt-1">
                              <Price price={item.price} compareAtPrice={item.compareAtPrice} />
                            </div>
                          </div>
                        </div>

                        {/* Controls: Quantity Stepper, Subtotal & Remove */}
                        <div className="flex items-center justify-between sm:justify-end gap-5 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/60 shrink-0">
                          {/* Stepper */}
                          <div className="flex items-center border border-border bg-stone/30 rounded-xl overflow-hidden shadow-2xs">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              aria-label="Decrease quantity"
                              className="flex h-9 w-9 items-center justify-center text-ink hover:bg-stone transition-colors cursor-pointer"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="font-mono text-xs font-semibold w-8 text-center tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              aria-label="Increase quantity"
                              className="flex h-9 w-9 items-center justify-center text-ink hover:bg-stone transition-colors cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Line Total */}
                          <span className="font-mono text-sm sm:text-base font-bold text-ink min-w-[70px] text-right">
                            {formatPrice(item.price * item.quantity)}
                          </span>

                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            aria-label={`Remove ${item.name}`}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted hover:text-terracotta hover:bg-terracotta/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Additional Client Options (White-Glove & Gift Note) */}
                <div className="rounded-3xl border border-border/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
                  <h4 className="font-heading text-sm font-bold uppercase tracking-wider text-ink">
                    Bespoke Delivery Options
                  </h4>

                  {/* White Glove Checkbox */}
                  <label className="flex items-start gap-3.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={whiteGloveService}
                      onChange={(e) => setWhiteGloveService(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-border text-ink focus:ring-ink"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading text-sm font-bold text-ink">
                          White-Glove In-Room Assembly & Packaging Removal
                        </span>
                        <span className="font-mono text-xs font-semibold text-sage-deep">
                          +$65.00
                        </span>
                      </div>
                      <p className="text-xs text-ink-muted mt-0.5">
                        Our specialized furniture team will place, inspect, and assemble pieces in your chosen room.
                      </p>
                    </div>
                  </label>

                  {/* Gift Message Toggle */}
                  <div className="pt-3 border-t border-border/60">
                    <button
                      type="button"
                      onClick={() => setShowGiftInput(!showGiftInput)}
                      className="font-mono text-xs font-semibold text-ink hover:text-sage-deep underline cursor-pointer"
                    >
                      {showGiftInput ? '— Remove Handwritten Gift Note' : '+ Add Complimentary Handwritten Gift Note'}
                    </button>

                    {showGiftInput && (
                      <div className="mt-3">
                        <textarea
                          value={giftNote}
                          onChange={(e) => setGiftNote(e.target.value)}
                          placeholder="Enter your personal gift note message for the recipient..."
                          rows={3}
                          className="w-full rounded-2xl border border-border bg-stone/20 p-3.5 text-xs font-sans focus:outline-none focus:ring-2 focus:ring-ink"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Back to Catalog Link */}
                <div className="pt-2">
                  <Link
                    href="/shop"
                    className="inline-flex items-center gap-2 font-heading text-xs uppercase tracking-wider font-semibold text-ink hover:text-sage-deep transition-colors"
                  >
                    <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                    <span>Continue Exploring Pieces</span>
                  </Link>
                </div>
              </div>

              {/* Right Column: Sticky Order Summary & Checkout (5 Cols) */}
              <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
                <div className="rounded-3xl border border-border/80 bg-white p-6 sm:p-8 shadow-sm space-y-6">
                  <h3 className="font-heading text-xl font-bold text-ink border-b border-border/60 pb-4">
                    Order Summary
                  </h3>

                  {/* Pricing Breakdown */}
                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex justify-between text-ink-muted">
                      <span>Bag Subtotal ({itemCount} items)</span>
                      <span className="font-semibold text-ink">{formatPrice(subtotal)}</span>
                    </div>

                    {appliedCoupon && (
                      <div className="flex justify-between text-emerald-700">
                        <div className="flex items-center gap-1.5">
                          <Tag className="h-3.5 w-3.5" />
                          <span>Promo Code ({appliedCoupon})</span>
                        </div>
                        <span className="font-bold">-{formatPrice(discountAmount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-ink-muted">
                      <span>Standard Delivery</span>
                      {isFreeShipping ? (
                        <span className="text-emerald-700 font-bold">Complimentary ($0.00)</span>
                      ) : (
                        <span className="font-semibold text-ink">{formatPrice(shippingFee)}</span>
                      )}
                    </div>

                    {whiteGloveService && (
                      <div className="flex justify-between text-ink-muted">
                        <span>White-Glove Assembly</span>
                        <span className="font-semibold text-ink">+$65.00</span>
                      </div>
                    )}

                    <div className="flex justify-between items-baseline text-base sm:text-lg font-bold text-ink pt-4 border-t border-border/60">
                      <span className="font-heading">Estimated Total</span>
                      <span className="font-mono text-xl">{formatPrice(finalTotal)}</span>
                    </div>

                    <p className="text-[11px] text-ink-muted/80">
                      Taxes, VAT, and local customs duties calculated at checkout.
                    </p>
                  </div>

                  {/* Promo Code Input */}
                  <div className="pt-2 border-t border-border/60">
                    {!appliedCoupon ? (
                      <form onSubmit={handleApplyCoupon} className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value)}
                            placeholder="Promo Code (e.g. NORDIC10)"
                            className="flex-1 rounded-2xl border border-border bg-stone/20 px-3.5 py-2.5 text-xs font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-ink"
                          />
                          <button
                            type="submit"
                            className="rounded-2xl border border-border bg-stone hover:bg-ink hover:text-cream px-4 py-2.5 font-heading text-xs uppercase tracking-wider font-semibold text-ink transition-colors cursor-pointer"
                          >
                            Apply
                          </button>
                        </div>
                        {couponError && (
                          <p className="font-mono text-[11px] text-terracotta">{couponError}</p>
                        )}
                      </form>
                    ) : (
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                        <div className="flex items-center gap-2 text-xs font-mono text-emerald-800">
                          <Check className="h-4 w-4 text-emerald-600" />
                          <span>Code <strong>{appliedCoupon}</strong> active</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="font-mono text-xs text-ink-muted hover:text-terracotta underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Checkout CTA */}
                  <div className="space-y-3 pt-2">
                    <Link
                      href="/checkout"
                      className="w-full rounded-full bg-ink hover:bg-sage-deep px-6 py-4 font-heading text-xs uppercase tracking-widest font-semibold text-cream transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>Proceed to Checkout</span>
                    </Link>

                    <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-ink-muted">
                      <ShieldCheck className="h-3.5 w-3.5 text-sage-deep" />
                      <span>256-Bit SSL Encrypted & Insured Transit</span>
                    </div>
                  </div>

                  {/* Trust Signals & Payment Icons */}
                  <div className="border-t border-border/60 pt-4 text-center space-y-2">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                      Guaranteed Safe Checkout
                    </p>
                    <div className="flex items-center justify-center gap-3 text-xs font-mono text-ink font-semibold">
                      <span className="rounded-lg bg-stone/60 px-2.5 py-1">Apple Pay</span>
                      <span className="rounded-lg bg-stone/60 px-2.5 py-1">Google Pay</span>
                      <span className="rounded-lg bg-stone/60 px-2.5 py-1">Visa / MC</span>
                      <span className="rounded-lg bg-stone/60 px-2.5 py-1">Klarna</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ============================================================ */
            /* EMPTY STATE (SEAMLESS CANVAS ON PAGE) */
            /* ============================================================ */
            <div className="space-y-16">
              <div className="py-12 md:py-20 text-center max-w-lg mx-auto">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-stone/70 text-ink/80 mb-4 border border-border/60">
                  <ShoppingBag className="h-6 w-6" />
                </div>

                <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-ink tracking-tight">
                  Your Shopping Bag is Empty
                </h2>

                <p className="mt-3 text-sm sm:text-base text-ink-muted leading-relaxed font-light">
                  Discover our architectural Scandinavian furniture, refined lighting, and handcrafted objects for your home.
                </p>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/shop"
                    className="rounded-full bg-ink hover:bg-sage-deep px-6 py-3 font-heading text-xs uppercase tracking-wider font-semibold text-cream transition-all cursor-pointer shadow-md"
                  >
                    Browse Collection
                  </Link>
                  <Link
                    href="/categories"
                    className="rounded-full border border-border bg-white hover:bg-stone px-6 py-3 font-heading text-xs uppercase tracking-wider font-semibold text-ink transition-colors cursor-pointer shadow-2xs"
                  >
                    Explore Departments
                  </Link>
                </div>
              </div>

              {/* Curated Recommendations for Empty Cart */}
              <div className="pt-8 border-t border-border/70">
                <div className="flex items-center justify-between pb-6 mb-2">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-widest text-ink-muted mb-1">
                      Featured Collection
                    </p>
                    <h3 className="font-heading text-xl sm:text-2xl font-bold text-ink">
                      Popular Objects to Furnish Your Space
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
