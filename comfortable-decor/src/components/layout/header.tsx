import * as React from 'react';
import { Link } from '@/components/ui/link';
import { Heart, Search, ShoppingBag, User } from 'lucide-react';
import { useWpMenu, useLocation } from '@forgewp/react';
import { useCart } from '@/context/cart-context';
import { useWishlist } from '@/context/wishlist-context';
import { useWpCurrency } from '@forgewp/woocommerce';
import { cn } from '@/lib/utils';
import { motion } from '@/components/motion/reveal';
import { FullScreenMenu } from './full-screen-menu';
import { SearchModal } from './search-modal';

const defaultQuickNav = [
  { title: 'Shop', href: '/shop' },
  { title: 'Studio', href: '/studio' },
  { title: 'Journal', href: '/blog' },
  { title: 'About', href: '/about' },
];

export function Header() {
  const [location] = useLocation();
  const { formatPrice } = useWpCurrency();
  const { items: wpUtilityItems } = useWpMenu('utility');
  const quickNav = wpUtilityItems && wpUtilityItems.length > 0
    ? wpUtilityItems.map((item) => ({ title: item.title, href: item.url }))
    : defaultQuickNav;
  const { itemCount, subtotal, openCart } = useCart();
  const { ids: wishlistIds } = useWishlist();
  const [fullMenuOpen, setFullMenuOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    setFullMenuOpen(false);
    setSearchOpen(false);
  }, [location]);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-40 transition-all duration-300',
          isScrolled
            ? 'border-b border-border/70 bg-cream/80 backdrop-blur-2xl supports-[backdrop-filter]:bg-cream/70 shadow-xs'
            : 'border-b border-transparent bg-cream/40 backdrop-blur-md supports-[backdrop-filter]:bg-cream/30 shadow-none',
        )}
      >
        <div className="container-wide">
          <div className="flex h-14 md:h-16 items-center justify-between gap-4">
            {/* Left: Menu Bar Trigger + Brand Logo */}
            <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
              <button
                type="button"
                onClick={() => setFullMenuOpen(true)}
                className="group flex items-center gap-2 p-2 -ml-2 text-ink hover:text-sage-deep transition-colors cursor-pointer min-h-[44px] touch-manipulation"
                aria-label="Open full menu"
              >
                <div className="flex flex-col justify-center gap-1.5 w-5 h-5">
                  <span className="h-0.5 w-5 bg-ink transition-transform group-hover:scale-x-110 origin-left" />
                  <span className="h-0.5 w-3.5 bg-ink transition-transform group-hover:scale-x-125 origin-left" />
                  <span className="h-0.5 w-5 bg-ink transition-transform group-hover:scale-x-110 origin-left" />
                </div>
                <span className="font-mono text-xs uppercase tracking-wider font-semibold text-ink/80 group-hover:text-ink">
                  Menu
                </span>
              </button>

              <div className="h-4 w-px bg-border/80 hidden sm:block" />

              <Link
                href="/"
                className="font-heading text-sm sm:text-base md:text-lg font-semibold tracking-tight text-ink hover:text-sage-deep transition-colors truncate"
              >
                Comfortable Decor
              </Link>
            </div>

            {/* Desktop Center: Streamlined Quick Links */}
            <nav className="hidden md:flex items-center gap-8" aria-label="Primary">
              {quickNav.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className={cn(
                    'group inline-flex items-center text-[15px] font-medium text-ink/75 hover:text-ink transition-colors py-2 relative',
                    location === item.href && 'text-ink font-semibold',
                  )}
                >
                  {item.title}
                  <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-ink transition-all duration-300 group-hover:w-full" />
                </Link>
              ))}
            </nav>

            {/* Right: Generously Spaced Action Icons */}
            <div className="flex items-center gap-1 sm:gap-3 md:gap-4.5 shrink-0">
              <button
                type="button"
                className="group/btn p-2 text-ink hover:text-sage-deep transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
                aria-label="Search catalog"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="h-[18px] w-[18px] transition-transform duration-300 group-hover/btn:-rotate-12" />
              </button>
              <Link
                href="/account"
                className="hidden sm:inline-flex p-2 text-ink hover:text-sage-deep transition-colors min-h-[44px] min-w-[44px] items-center justify-center touch-manipulation"
                aria-label="Account"
              >
                <User className="h-[18px] w-[18px]" />
              </Link>
              <Link
                id="header-wishlist-btn"
                href="/wishlist"
                className="relative hidden sm:inline-flex p-2 text-ink hover:text-sage-deep transition-colors min-h-[44px] min-w-[44px] items-center justify-center touch-manipulation"
                aria-label="Wishlist"
              >
                <Heart className="h-[18px] w-[18px]" />
                {wishlistIds.length > 0 && (
                  <motion.span
                    key={wishlistIds.length}
                    initial={{ scale: 0.6 }}
                    animate={{ scale: [1.3, 1] }}
                    transition={{ duration: 0.3 }}
                    className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-terracotta px-1 text-[10px] font-semibold text-white shadow-xs"
                  >
                    {wishlistIds.length}
                  </motion.span>
                )}
              </Link>
              <button
                type="button"
                className="group/btn relative flex items-center gap-2 pl-2 pr-1 py-2 text-ink hover:text-sage-deep transition-colors cursor-pointer min-h-[44px] touch-manipulation"
                aria-label={`Cart, ${itemCount} items`}
                onClick={openCart}
              >
                <span className="hidden md:inline font-mono text-xs font-medium tabular-nums">
                  {formatPrice(subtotal)}
                </span>
                <div className="relative">
                  <ShoppingBag className="h-[18px] w-[18px] transition-transform duration-300 group-hover/btn:-translate-y-0.5" />
                  {itemCount > 0 && (
                    <motion.span
                      key={itemCount}
                      initial={{ scale: 0.6 }}
                      animate={{ scale: [1.3, 1] }}
                      transition={{ duration: 0.3 }}
                      className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[10px] font-semibold text-cream"
                    >
                      {itemCount}
                    </motion.span>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 100vh Full-Screen Sliding Menu Page Cover */}
      <FullScreenMenu isOpen={fullMenuOpen} onClose={() => setFullMenuOpen(false)} />

      {/* Editorial Luxury Search Modal */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
