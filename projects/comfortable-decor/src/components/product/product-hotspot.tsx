import * as React from 'react';
import { Link } from '@/components/ui/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowRight, ShoppingBag, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/data/products';
import { useCart } from '@/context/cart-context';
import type { Product } from '@/types';
import { WpImage } from '@forgewp/react';

interface ProductHotspotProps {
  product: Product;
  top: string; // e.g. "72%"
  left: string; // e.g. "82%"
  mobileTop?: string; // e.g. "60%"
  mobileLeft?: string; // e.g. "50%"
  label?: string;
  defaultOpen?: boolean;
  className?: string;
}

export function ProductHotspot({
  product,
  top,
  left,
  mobileTop,
  mobileLeft,
  label = 'Featured',
  defaultOpen = false,
  className,
}: ProductHotspotProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const { addItem } = useCart();
  const reduce = useReducedMotion();

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1);
  };

  return (
    <div
      style={{
        '--top': top,
        '--left': left,
        '--mobile-top': mobileTop || top,
        '--mobile-left': mobileLeft || left,
      } as React.CSSProperties}
      className={cn(
        'absolute z-20 top-[var(--mobile-top)] left-[var(--mobile-left)] sm:top-[var(--top)] sm:left-[var(--left)] -translate-x-1/2 -translate-y-1/2 select-none',
        className
      )}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Pulsing radar hotspot button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="group relative flex h-9 w-9 items-center justify-center rounded-full bg-cream/95 text-ink shadow-lg backdrop-blur-md transition-transform duration-300 hover:scale-110 focus:outline-none cursor-pointer"
        aria-label={isOpen ? `Close ${product.name} preview` : `View ${product.name}`}
      >
        {/* Calm, continuous radar pulse rings (reduced frequency, active even when open) */}
        {!reduce && (
          <>
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full bg-cream/80 pointer-events-none"
              animate={{
                scale: [1, 1.7, 2.1],
                opacity: [0.7, 0.3, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full bg-cream/60 pointer-events-none"
              animate={{
                scale: [1, 1.45, 1.85],
                opacity: [0.55, 0.2, 0],
              }}
              transition={{
                duration: 3,
                delay: 1.2,
                repeat: Infinity,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          </>
        )}
        <span
          className={cn(
            "relative flex h-3.5 w-3.5 items-center justify-center rounded-full bg-ink text-cream transition-transform duration-300",
            isOpen ? "rotate-45 bg-ink text-cream" : "group-hover:rotate-45"
          )}
        >
          <Plus className="h-2.5 w-2.5 stroke-3" />
        </span>
      </button>

      {/* Floating Glassmorphism Tag Card */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={reduce ? undefined : { opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-full left-1/2 mb-3 -translate-x-1/2 w-[min(17rem,calc(100vw-2.5rem))] rounded-none border border-border/80 bg-cream/95 p-3 sm:p-3.5 shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden bg-stone">
                <WpImage
                  src={product.images[0]}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                  {label}
                </p>
                <Link
                  href={`/product/${product.slug}`}
                  className="block truncate font-heading text-sm font-medium text-ink hover:underline"
                >
                  {product.name}
                </Link>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  from {formatPrice(product.price, product.currency)}
                </p>
              </div>

              <div className="flex flex-col gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleQuickAdd}
                  title="Quick add to cart"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-stone text-ink transition-colors hover:bg-ink hover:text-cream"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                </button>
                <Link
                  href={`/product/${product.slug}`}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-cream transition-transform hover:scale-105"
                  aria-label={`Go to ${product.name}`}
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
