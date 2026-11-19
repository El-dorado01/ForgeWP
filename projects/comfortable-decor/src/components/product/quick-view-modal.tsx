import * as React from 'react';
import { X, Star, ShoppingBag, Heart, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Product } from '@/types';
import { Price } from '@/components/commerce/price';
import { useCart } from '@/context/cart-context';
import { useWishlist } from '@/context/wishlist-context';
import { ProductBadge } from '@/components/product/product-badge';
import { Link } from '@/components/ui/link';
import { cn } from '@/lib/utils';
import { WpImage } from '@forgewp/react';

interface QuickViewModalProps {
  product: Product | null;
  onClose: () => void;
}

export function QuickViewModal({ product, onClose }: QuickViewModalProps) {
  const { addItem } = useCart();
  const { isWishlisted, toggle } = useWishlist();
  const [selectedImage, setSelectedImage] = React.useState<string>('');
  const [selectedVariant, setSelectedVariant] = React.useState<string>('');
  const [quantity, setQuantity] = React.useState<number>(1);
  const [added, setAdded] = React.useState(false);

  React.useEffect(() => {
    if (product) {
      setSelectedImage(product.images[0]);
      setSelectedVariant(product.variants?.[0]?.options?.[0]?.id || '');
      setQuantity(1);
      setAdded(false);
      document.body.style.overflow = 'hidden';
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', onKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', onKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [product, onClose]);

  if (!product) return null;

  const isFav = isWishlisted(product.id);

  const handleAddToCart = () => {
    addItem(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-8 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-ink/60 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl bg-card border border-border/80 shadow-2xl overflow-hidden"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute right-3.5 top-3.5 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-border/80 bg-white/90 text-ink backdrop-blur-sm transition-all hover:bg-ink hover:text-cream hover:scale-105 cursor-pointer shadow-2xs"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-7 p-5 sm:p-6 md:p-7 w-full min-w-0">
            {/* Gallery Column */}
            <div className="md:col-span-6 space-y-3 min-w-0">
              <div className="relative aspect-square overflow-hidden bg-stone rounded-2xl border border-border/60 shadow-2xs">
                <WpImage
                  src={selectedImage || product.images[0]}
                  alt={product.name}
                  className="h-full w-full object-cover transition-all duration-500"
                />
                {product.badge && (
                  <div className="absolute top-2.5 left-2.5">
                    <ProductBadge badge={product.badge} />
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {product.images.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {product.images.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedImage(img)}
                      className={cn(
                        'relative h-14 w-14 shrink-0 overflow-hidden border rounded-xl transition-all cursor-pointer shadow-2xs',
                        selectedImage === img
                          ? 'border-ink ring-2 ring-ink'
                          : 'border-border/60 opacity-70 hover:opacity-100',
                      )}
                    >
                      <WpImage src={img} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info Column */}
            <div className="md:col-span-6 flex flex-col justify-between space-y-3 min-w-0">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-ink-muted mb-1">
                  {product.category} · {product.sku || 'CD-ARCHIVE'}
                </p>

                <h2 className="font-heading text-xl md:text-2xl font-semibold text-ink leading-snug">
                  {product.name}
                </h2>

                {/* Rating */}
                {product.rating && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex items-center text-[#00b67a]">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'h-3.5 w-3.5',
                            i < Math.floor(product.rating || 5)
                              ? 'fill-current'
                              : 'text-border fill-transparent',
                          )}
                        />
                      ))}
                    </div>
                    <span className="font-mono text-xs text-ink/75">
                      {product.rating.toFixed(1)} ({product.reviewCount || 12} reviews)
                    </span>
                  </div>
                )}

                {/* Price */}
                <div className="mt-2.5">
                  <Price
                    price={product.price}
                    compareAtPrice={product.compareAtPrice}
                    currency={product.currency}
                    size="lg"
                  />
                </div>

                <p className="mt-2 text-xs md:text-sm text-ink/80 leading-relaxed font-light line-clamp-3">
                  {product.shortDescription || product.description}
                </p>

                {/* Swatches / Color Option */}
                {product.variants?.[0]?.options && product.variants[0].options.length > 1 && (
                  <div className="mt-3 space-y-1.5">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                      {product.variants[0].name}:{' '}
                      <span className="text-ink font-semibold">
                        {product.variants[0].options.find((o) => o.id === selectedVariant)?.label || ''}
                      </span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      {product.variants[0].options.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setSelectedVariant(opt.id);
                            if (opt.image) setSelectedImage(opt.image);
                          }}
                          className={cn(
                            'h-6 w-6 rounded-full border-2 transition-all p-0.5 cursor-pointer',
                            selectedVariant === opt.id
                              ? 'border-ink scale-110'
                              : 'border-transparent opacity-80 hover:opacity-100',
                          )}
                          style={{ backgroundColor: opt.color || '#ccc' }}
                          title={opt.label}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Dimensions & Materials */}
                {product.dimensions && (
                  <div className="mt-3 pt-2.5 border-t border-border/60 text-xs font-mono text-ink-muted space-y-0.5">
                    <p>
                      <span className="text-ink font-semibold">Dimensions:</span>{' '}
                      {typeof product.dimensions === 'object' && product.dimensions !== null
                        ? `${[product.dimensions.length, product.dimensions.width, product.dimensions.height].filter(Boolean).join(' × ')} ${product.dimensions.unit || 'cm'}`
                        : String(product.dimensions)}
                    </p>
                    {product.materials && (
                      <p>
                        <span className="text-ink font-semibold">Materials:</span>{' '}
                        {product.materials.join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Actions: Quantity + Add to Cart + Full Details Link */}
              <div className="space-y-2.5 pt-3 border-t border-border/60">
                <div className="flex items-center gap-2.5">
                  {/* Quantity selector */}
                  <div className="flex items-center border border-border bg-white h-10 px-2 rounded-xl shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="px-2 text-ink hover:text-sage-deep font-semibold cursor-pointer"
                    >
                      -
                    </button>
                    <span className="px-1.5 font-mono text-xs font-medium w-6 text-center">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                      className="px-2 text-ink hover:text-sage-deep font-semibold cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  {/* Clean, perfectly-spaced Add to Cart button */}
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="flex-1 bg-ink text-cream hover:bg-sage-deep active:scale-[0.99] flex items-center justify-center gap-3 h-10 px-4 font-heading text-xs uppercase tracking-wider font-semibold transition-colors duration-200 rounded-xl shadow-xs cursor-pointer select-none"
                  >
                    {added ? (
                      <span className="inline-flex items-center gap-2.5">
                        <Check className="h-4 w-4 text-emerald-300" />
                        <span>Added to Cart</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2.5">
                        <ShoppingBag className="h-4 w-4 shrink-0" />
                        <span>Add to Cart</span>
                      </span>
                    )}
                  </button>

                  {/* Wishlist toggle */}
                  <button
                    type="button"
                    onClick={(e) => toggle(product.id, e)}
                    className={cn(
                      'h-10 w-10 shrink-0 flex items-center justify-center border border-border bg-white hover:border-ink transition-colors cursor-pointer rounded-xl shadow-2xs',
                      isFav && 'text-terracotta border-terracotta',
                    )}
                    aria-label="Wishlist"
                  >
                    <Heart className={cn('h-4 w-4', isFav && 'fill-terracotta text-terracotta')} />
                  </button>
                </div>

                <Link
                  href={`/product/${product.slug}`}
                  onClick={onClose}
                  className="block text-center font-heading text-xs uppercase tracking-wider font-semibold text-ink-muted hover:text-ink transition-colors py-1 cursor-pointer"
                >
                  View full piece specifications →
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
