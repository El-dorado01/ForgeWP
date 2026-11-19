import { Link } from '@/components/ui/link';
import { Minus, Plus, Trash2, ArrowRight, ShoppingBag, Truck, Tag } from 'lucide-react';
import { useCart } from '@/context/cart-context';
import { useWpCurrency } from '@forgewp/woocommerce';
import { Button, ButtonLabel } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import * as React from 'react';
import { WpImage } from '@forgewp/react';

const FREE_SHIPPING_THRESHOLD = 150;

export function CartDrawer() {
  const {
    items,
    isOpen,
    closeCart,
    subtotal,
    updateQuantity,
    removeItem,
  } = useCart();

  const { formatPrice } = useWpCurrency();
  const [couponInput, setCouponInput] = React.useState('');
  const [appliedCoupon, setAppliedCoupon] = React.useState<string | null>(null);
  const [discountPercent, setDiscountPercent] = React.useState(0);
  const [couponError, setCouponError] = React.useState<string | null>(null);

  const discountAmount = appliedCoupon ? (subtotal * discountPercent) / 100 : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    if (code === 'BRUTAL5' || code === 'WELCOME10' || code === 'FORGEWP') {
      setAppliedCoupon(code);
      setDiscountPercent(code === 'WELCOME10' ? 10 : 5);
      setCouponInput('');
    } else {
      setCouponError('Invalid coupon code.');
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountPercent(0);
  };

  const totalCount = items.reduce((n, i) => n + i.quantity, 0);
  const amountToFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const freeShippingProgress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  // Lock background page scrolling completely when CartDrawer is open
  React.useEffect(() => {
    if (isOpen) {
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
  }, [isOpen]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeCart()}>
      <SheetContent side="right" className="flex flex-col p-0 w-full sm:max-w-md bg-cream">
        {/* Drawer Header */}
        <SheetHeader className="border-b border-border/80 px-6 py-5">
          <div className="flex items-center justify-between">
            <SheetTitle className="font-heading text-lg font-bold text-ink">
              Your Cart ({totalCount})
            </SheetTitle>
          </div>

          {/* Free Shipping Progress Indicator */}
          <div className="mt-3 pt-3 border-t border-border/60">
            <div className="flex items-center gap-2 text-xs font-mono text-ink-muted mb-2">
              <Truck className="h-3.5 w-3.5 text-sage-deep" />
              {amountToFreeShipping > 0 ? (
                <span>
                  Add <strong className="text-ink font-semibold">{formatPrice(amountToFreeShipping)}</strong> more for free EU shipping
                </span>
              ) : (
                <span className="text-sage-deep font-semibold">
                  You unlocked Free Worldwide Delivery!
                </span>
              )}
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone">
              <div
                className="h-full bg-sage-deep transition-all duration-500 ease-out rounded-full"
                style={{ width: `${freeShippingProgress}%` }}
              />
            </div>
          </div>
        </SheetHeader>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-stone/80 text-ink-muted mb-2">
                <ShoppingBag className="h-7 w-7 stroke-1" />
              </div>
              <h3 className="font-heading text-base font-medium text-ink">
                Your cart is empty
              </h3>
              <p className="text-xs text-ink-muted max-w-xs font-light leading-relaxed">
                Discover pieces crafted for warm, modern living made to last a lifetime.
              </p>
              <Button asChild shape="pill" size="lg" className="mt-4 bg-ink text-cream hover:bg-ink/90" onClick={closeCart}>
                <Link href="/shop">Explore Collection</Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {items.map((item) => (
                <li key={item.id} className="flex gap-4 py-5 first:pt-0">
                  <Link
                    href={`/product/${item.slug}`}
                    onClick={closeCart}
                    className="h-24 w-20 shrink-0 overflow-hidden bg-stone"
                  >
                    <WpImage
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-cover transition-transform hover:scale-105"
                    />
                  </Link>

                  <div className="flex flex-1 flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/product/${item.slug}`}
                          onClick={closeCart}
                          className="font-heading text-xs uppercase tracking-wider font-semibold text-ink hover:text-sage-deep transition-colors line-clamp-1"
                        >
                          {item.name}
                        </Link>
                        <button
                          type="button"
                          className="text-ink-muted hover:text-red-600 transition-colors p-0.5 cursor-pointer"
                          aria-label="Remove item"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {item.variantLabel && (
                        <p className="text-[11px] font-mono text-ink-muted mt-0.5">
                          {item.variantLabel}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-border bg-white rounded-md">
                        <button
                          type="button"
                          className="p-1 text-ink hover:bg-stone transition-colors cursor-pointer"
                          aria-label="Decrease quantity"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-2 text-xs font-mono tabular-nums text-ink">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          className="p-1 text-ink hover:bg-stone transition-colors cursor-pointer"
                          aria-label="Increase quantity"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <p className="font-heading text-sm font-semibold tabular-nums text-ink">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Drawer Footer with Checkout */}
        {items.length > 0 && (
          <SheetFooter className="border-t border-border/80 bg-[#f4f1ea] p-6 flex flex-col gap-3">
            {/* Coupon Code Section */}
            <div className="border-b border-border/60 pb-3">
              {appliedCoupon ? (
                <div className="flex items-center justify-between text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-xl">
                  <span className="flex items-center gap-1.5 font-mono">
                    <Tag className="h-3.5 w-3.5" />
                    <span>Coupon: <strong>{appliedCoupon}</strong> (-{discountPercent}%)</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-red-500 hover:text-red-700 font-bold ml-2 cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Coupon code (e.g. BRUTAL5)"
                    className="flex-1 px-3 py-1.5 bg-white border border-border rounded-xl text-xs uppercase font-mono focus:outline-none focus:border-ink"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-ink text-cream hover:bg-sage-deep font-heading text-xs uppercase font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Apply
                  </button>
                </form>
              )}
              {couponError && (
                <p className="text-[11px] text-red-600 font-mono mt-1">{couponError}</p>
              )}
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-heading font-medium text-ink">Subtotal</span>
                <span className="font-heading text-sm font-semibold tabular-nums text-ink">
                  {formatPrice(subtotal)}
                </span>
              </div>
              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-emerald-700">
                  <span>Discount</span>
                  <span className="font-mono tabular-nums">-{formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-base font-bold pt-1 border-t border-border/40">
                <span className="font-heading text-ink">Total</span>
                <span className="font-heading tabular-nums text-ink">
                  {formatPrice(finalTotal)}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-ink-muted font-light">
              Taxes and shipping calculated at checkout.
            </p>

            <div className="mt-2 flex flex-col gap-2">
              <Button asChild size="xl" shape="pill" className="w-full bg-ink text-cream hover:bg-ink/90 shadow-lg" onClick={closeCart}>
                <Link href="/checkout" className="group/btn flex items-center justify-center gap-2.5">
                  <ButtonLabel mode="slide">Proceed to Checkout</ButtonLabel>
                  <span className="relative flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden">
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-5" />
                    <ArrowRight className="absolute inset-0 h-4 w-4 -translate-x-5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-0" />
                  </span>
                </Link>
              </Button>

              <Button asChild variant="outline" size="lg" shape="pill" className="w-full border-ink/30 text-ink hover:bg-cream" onClick={closeCart}>
                <Link href="/cart" className="group/btn">
                  <ButtonLabel mode="slide">View Shopping Bag</ButtonLabel>
                </Link>
              </Button>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
