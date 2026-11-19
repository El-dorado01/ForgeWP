import * as React from 'react';
import { Link } from '@/components/ui/link';
import { ShoppingBag, Heart, Eye } from 'lucide-react';
import type { Product } from '@/types';
import { cn } from '@/lib/utils';
import { Price } from '@/components/commerce/price';
import { Rating } from '@/components/commerce/rating';
import { ProductBadge } from '@/components/product/product-badge';
import { useCart } from '@/context/cart-context';
import { useWishlist } from '@/context/wishlist-context';
import { WpImage } from '@forgewp/react';

type ProductCardProps = {
  product: Product;
  className?: string;
  onQuickView?: (product: Product) => void;
};

export function ProductCard({ product, className, onQuickView }: ProductCardProps) {
  const [activeImage, setActiveImage] = React.useState(product.images[0]);
  const [activeOptionId, setActiveOptionId] = React.useState<string | null>(
    product.variants?.[0]?.options?.[0]?.id || null,
  );
  const { addItem } = useCart();
  const { isWishlisted, toggle } = useWishlist();

  const isFavorite = isWishlisted(product.id);
  const secondaryImage = product.images[1];

  const handleSwatchHover = (option: { id: string; image?: string }) => {
    setActiveOptionId(option.id);
    if (option.image) {
      setActiveImage(option.image);
    }
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1);
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(product.id, e);
  };

  return (
    <article className={cn('group relative flex h-full flex-col select-none', className)}>
      {/* Product Image Area with Hover Zoom & Action Overlay */}
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#f4f2ee] mb-4 block border border-border/50 shadow-2xs">
        <Link href={`/product/${product.slug}`} className="block h-full w-full relative">
          <WpImage
            src={activeImage}
            alt={product.name}
            className={cn(
              'h-full w-full object-cover transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform',
              'group-hover:scale-105',
              secondaryImage && activeImage === product.images[0] && 'group-hover:opacity-0',
            )}
            loading="lazy"
          />
          {secondaryImage && activeImage === product.images[0] && (
            <WpImage
              src={secondaryImage}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105 group-hover:opacity-100"
              loading="lazy"
            />
          )}
        </Link>

        {/* Badges in Top Left */}
        {product.badge && (
          <div className="absolute left-3 top-3 z-10 pointer-events-none">
            <ProductBadge badge={product.badge} />
          </div>
        )}

        {/* Wishlist Button in Top Right */}
        <button
          type="button"
          onClick={handleWishlistToggle}
          aria-label={isFavorite ? 'Remove from wishlist' : 'Add to wishlist'}
          className={cn(
            'absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-cream/90 text-ink shadow-sm backdrop-blur-sm transition-all duration-300',
            'opacity-0 group-hover:opacity-100 hover:scale-110 hover:bg-cream',
            isFavorite && 'opacity-100 text-terracotta bg-cream',
          )}
        >
          <Heart
            className={cn('h-4 w-4', isFavorite && 'fill-terracotta text-terracotta')}
          />
        </button>

        {/* Quick Add / Select Options Action Bar */}
        <div className="absolute inset-x-3 bottom-3 z-10 flex items-center gap-2 opacity-0 translate-y-2 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-100 group-hover:translate-y-0">
          <button
            type="button"
            onClick={handleQuickAdd}
            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-ink text-cream font-heading text-xs uppercase tracking-wider font-semibold shadow-md transition-all hover:bg-sage-deep active:scale-98"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>{product.variants?.length ? 'Select Options' : 'Add to Cart'}</span>
          </button>

          {onQuickView && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onQuickView(product);
              }}
              title="Quick view"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cream/95 text-ink shadow-md backdrop-blur-sm transition-all hover:bg-white hover:scale-105"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Out of Stock Overlay */}
        {!product.inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-cream/70 backdrop-blur-[2px] rounded-2xl">
            <span className="font-heading text-xs uppercase tracking-widest text-ink font-semibold">
              Out of stock
            </span>
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="flex flex-1 flex-col">
        {/* Category breadcrumb */}
        {product.categories && product.categories.length > 0 && (
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-mono mb-1.5">
            {product.categories.slice(0, 2).join(' · ')}
          </p>
        )}

        {/* Product Title */}
        <h3 className="font-heading text-base md:text-[1.0625rem] font-medium leading-snug">
          <Link
            href={`/product/${product.slug}`}
            className="text-ink transition-colors hover:text-sage-deep"
          >
            {product.name}
          </Link>
        </h3>

        {/* Star Rating */}
        {product.rating != null && (
          <div className="mt-1">
            <Rating rating={product.rating} reviewCount={product.reviewCount} />
          </div>
        )}

        {/* Price Row */}
        <Price
          price={product.price}
          compareAtPrice={product.compareAtPrice}
          currency={product.currency}
          size="md"
          className="mt-2 pt-0.5 font-semibold"
        />

        {/* Interactive Color Swatches */}
        {product.variants?.[0]?.options && product.variants[0].options.length > 1 && (
          <div className="mt-2.5 flex items-center gap-1.5">
            {product.variants[0].options.map((opt) => {
              const isSelected = activeOptionId === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  title={opt.label}
                  onClick={() => handleSwatchHover(opt)}
                  onMouseEnter={() => handleSwatchHover(opt)}
                  className={cn(
                    'relative h-3.5 w-3.5 rounded-full border transition-all duration-200 focus:outline-none',
                    isSelected
                      ? 'ring-2 ring-ink ring-offset-1 scale-110 border-transparent'
                      : 'border-border/80 hover:scale-115',
                  )}
                  style={{ backgroundColor: opt.color || '#ccc' }}
                  aria-label={`Select ${opt.label} color`}
                />
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
}
