import * as React from 'react';
import { Link } from '@/components/ui/link';
import { X, ArrowRight, ArrowUpRight, Sparkles, Mail, Phone, MapPin, ChevronDown, Heart, User } from 'lucide-react';
import { useWpMenu, type WpMenuItem, WpImage } from '@forgewp/react';
import { useWishlist } from '@/context/wishlist-context';
import { motion, AnimatePresence } from 'framer-motion';
import { ButtonLabel } from '@/components/ui/button';

export type MegaMenuColumn = {
  heading: string;
  items: { title: string; href: string; badge?: string }[];
};

export type MegaMenuFeatured = {
  title: string;
  subtitle: string;
  href: string;
  image: string;
  badge?: string;
  ctaText?: string;
};

export type NavItem = {
  title: string;
  href: string;
  isMega?: boolean;
  megaColumns?: MegaMenuColumn[];
  featured?: MegaMenuFeatured;
};

function mapWpMenuItemsToNavItems(items: WpMenuItem[]): NavItem[] {
  return items.map((item) => {
    const hasChildren = Array.isArray(item.children) && item.children.length > 0;
    const hasSubColumns = hasChildren && item.children!.some((c) => Array.isArray(c.children) && c.children.length > 0);

    let megaColumns: MegaMenuColumn[] | undefined = undefined;
    if (hasSubColumns) {
      megaColumns = item.children!.map((col) => ({
        heading: col.title,
        items: (col.children || []).map((sub) => ({
          title: sub.title,
          href: sub.url,
          badge: sub.badge,
        })),
      }));
    } else if (hasChildren) {
      megaColumns = [
        {
          heading: item.title,
          items: item.children!.map((sub) => ({
            title: sub.title,
            href: sub.url,
            badge: sub.badge,
          })),
        },
      ];
    }

    let featured: MegaMenuFeatured | undefined = undefined;
    if (item.image) {
      featured = {
        title: item.attrTitle || `${item.title} Spotlight`,
        subtitle: item.description || `Handcrafted pieces designed for lasting spatial harmony.`,
        href: item.url,
        image: item.image,
        badge: item.badge,
        ctaText: item.attrTitle ? `Explore ${item.title}` : 'Shop Highlight',
      };
    }

    return {
      title: item.title,
      href: item.url,
      isMega: hasChildren,
      megaColumns,
      featured,
    };
  });
}

const defaultEmptyItem: NavItem = {
  title: 'All Products',
  href: '/shop',
};

interface FullScreenMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FullScreenMenu({ isOpen, onClose }: FullScreenMenuProps) {
  const { items: wpMenuItems } = useWpMenu('primary');
  const { ids: wishlistIds } = useWishlist();
  const navItems: NavItem[] = React.useMemo(() => {
    if (wpMenuItems && wpMenuItems.length > 0) {
      return mapWpMenuItemsToNavItems(wpMenuItems);
    }
    return [defaultEmptyItem];
  }, [wpMenuItems]);

  // Desktop active selection state
  const [activeIndex, setActiveIndex] = React.useState(0);
  const activeItem: NavItem = navItems[activeIndex] || navItems[0] || defaultEmptyItem;

  // Mobile accordion expanded state (first category open by default)
  const [mobileExpandedIndex, setMobileExpandedIndex] = React.useState<number | null>(0);

  // Lock background page scrolling completely when open and handle ESC key
  React.useEffect(() => {
    if (isOpen) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      const originalTouchAction = document.body.style.touchAction;

      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.style.touchAction = originalTouchAction;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-50 h-screen h-[100dvh] w-screen flex flex-col overflow-y-auto overscroll-contain bg-[#faf8f5]/98 backdrop-blur-3xl text-ink"
        >
          {/* Top Sticky Bar */}
          <div className="container-wide py-3 sm:py-4 flex items-center justify-between border-b border-border/70 sticky top-0 bg-[#faf8f5]/95 backdrop-blur-xl z-20 shrink-0">
            <div className="flex items-center gap-4 sm:gap-6">
              <Link
                href="/"
                onClick={onClose}
                className="font-heading text-base sm:text-lg font-semibold tracking-tight text-ink"
              >
                Comfortable Decor
              </Link>
              <span className="hidden sm:inline-block font-mono text-xs uppercase tracking-widest text-ink-muted">
                // Catalog & Atelier Directory
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="group/close flex items-center gap-2 rounded-full border border-ink/20 px-3.5 py-1.5 font-mono text-xs uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-cream cursor-pointer min-h-[38px] touch-manipulation"
              aria-label="Close menu"
            >
              <span>Close</span>
              <X className="h-4 w-4 transition-transform duration-300 group-hover/close:rotate-90" />
            </button>
          </div>

          {/* ========================================================================= */}
          {/* 1. MOBILE ACCORDION VIEW (< lg) */}
          {/* ========================================================================= */}
          <div className="block lg:hidden container-wide py-5 flex-1 space-y-5">
            {/* Mobile Personal Atelier & Quick Access Bar */}
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/wishlist"
                onClick={onClose}
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/80 border border-border/80 text-ink hover:border-terracotta/40 transition-all shadow-2xs min-h-[50px] touch-manipulation"
              >
                <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-terracotta/10 text-terracotta shrink-0">
                  <Heart className="h-4 w-4 fill-terracotta/20" />
                  {wishlistIds.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-terracotta px-1 text-[9px] font-bold text-white shadow-2xs">
                      {wishlistIds.length}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <span className="font-heading text-xs font-semibold text-ink block leading-none">
                    Wishlist
                  </span>
                  <span className="font-mono text-[10px] text-ink-muted block mt-1">
                    {wishlistIds.length} {wishlistIds.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
              </Link>

              <Link
                href="/account"
                onClick={onClose}
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/80 border border-border/80 text-ink hover:border-sage-deep/40 transition-all shadow-2xs min-h-[50px] touch-manipulation"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sage-deep/10 text-sage-deep shrink-0">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-heading text-xs font-semibold text-ink block leading-none">
                    Account
                  </span>
                  <span className="font-mono text-[10px] text-ink-muted block mt-1">
                    Client Portal
                  </span>
                </div>
              </Link>
            </div>

            <div className="space-y-3">
              <p className="font-mono text-xs uppercase tracking-widest text-ink-muted px-1">
                Explore Collections
              </p>

              <div className="space-y-2">
                {navItems.map((item, idx) => {
                  const isExpanded = mobileExpandedIndex === idx;
                  const hasSub = item.megaColumns && item.megaColumns.length > 0;

                  return (
                    <div
                      key={item.title}
                      className="border border-border/70 rounded-2xl bg-white/60 overflow-hidden transition-all duration-300"
                    >
                      {/* Accordion Header Row */}
                      <button
                        type="button"
                        onClick={() => setMobileExpandedIndex(isExpanded ? null : idx)}
                        className={`w-full flex items-center justify-between p-4 text-left transition-colors cursor-pointer min-h-[52px] touch-manipulation ${
                          isExpanded ? 'bg-stone/40 text-ink' : 'hover:bg-stone/20 text-ink'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs text-ink-muted">0{idx + 1}.</span>
                          <span className="font-heading text-lg font-semibold tracking-tight">
                            {item.title}
                          </span>
                          {item.featured?.badge && (
                            <span className="rounded-full bg-sage/30 px-2 py-0.5 font-heading text-[10px] font-semibold text-sage-deep uppercase tracking-wider">
                              {item.featured.badge}
                            </span>
                          )}
                        </div>

                        <ChevronDown
                          className={`h-4 w-4 text-ink-muted transition-transform duration-300 ${
                            isExpanded ? 'rotate-180 text-ink' : ''
                          }`}
                        />
                      </button>

                      {/* Accordion Expanded Content */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 pt-1 space-y-4 border-t border-border/40">
                              {/* Direct Collection Link */}
                              <div className="pt-2">
                                <Link
                                  href={item.href}
                                  onClick={onClose}
                                  className="inline-flex items-center gap-2 text-xs font-heading uppercase tracking-wider font-semibold text-sage-deep hover:text-ink transition-colors py-1"
                                >
                                  <span>View all {item.title}</span>
                                  <ArrowUpRight className="h-3.5 w-3.5" />
                                </Link>
                              </div>

                              {/* Subcategories */}
                              {hasSub ? (
                                <div className="space-y-4 pt-1">
                                  {item.megaColumns!.map((col) => (
                                    <div key={col.heading} className="space-y-2">
                                      <h5 className="font-heading text-xs uppercase tracking-wider font-semibold text-ink-muted border-b border-border/40 pb-1">
                                        {col.heading}
                                      </h5>
                                      <div className="grid grid-cols-1 gap-1">
                                        {col.items.map((sub) => (
                                          <Link
                                            key={sub.title}
                                            href={sub.href}
                                            onClick={onClose}
                                            className="flex items-center justify-between py-2 px-2.5 rounded-xl text-sm text-ink/85 hover:bg-stone/50 active:bg-stone transition-colors min-h-[40px] touch-manipulation"
                                          >
                                            <span className="font-light">{sub.title}</span>
                                            {sub.badge && (
                                              <span className="rounded-full bg-sage/40 px-2 py-0.5 font-heading text-[10px] font-semibold text-sage-deep">
                                                {sub.badge}
                                              </span>
                                            )}
                                          </Link>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-ink/75 font-light leading-relaxed">
                                  Explore curated drops and bespoke interior pieces designed for lasting spatial harmony.
                                </p>
                              )}

                              {/* Mobile Compact Featured Card */}
                              {item.featured && (
                                <div className="mt-4 p-3 bg-stone/60 border border-border/70 rounded-xl flex items-center gap-3.5">
                                  <div className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-stone">
                                    <WpImage
                                      src={item.featured.image}
                                      alt={item.featured.title}
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-mono text-[10px] uppercase text-sage-deep font-semibold truncate">
                                      Curator Spotlight
                                    </p>
                                    <h6 className="font-heading text-xs font-semibold text-ink truncate">
                                      {item.featured.title}
                                    </h6>
                                    <Link
                                      href={item.featured.href}
                                      onClick={onClose}
                                      className="inline-flex items-center gap-1 font-heading text-[11px] uppercase font-semibold text-ink hover:text-sage-deep transition-colors mt-1"
                                    >
                                      <span>{item.featured.ctaText || 'Shop Highlight'}</span>
                                      <ArrowRight className="h-3 w-3" />
                                    </Link>
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile Fast Links */}
            <div className="pt-4 border-t border-border/70 space-y-2">
              <p className="font-mono text-xs uppercase tracking-widest text-ink-muted px-1">
                Direct Services
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/studio"
                  onClick={onClose}
                  className="flex items-center justify-center p-3 rounded-xl bg-white/70 border border-border/70 font-mono text-xs text-ink hover:bg-white transition-colors min-h-[44px] touch-manipulation"
                >
                  Bespoke Studio
                </Link>
                <Link
                  href="/about"
                  onClick={onClose}
                  className="flex items-center justify-center p-3 rounded-xl bg-white/70 border border-border/70 font-mono text-xs text-ink hover:bg-white transition-colors min-h-[44px] touch-manipulation"
                >
                  About Atelier
                </Link>
                <Link
                  href="/blog"
                  onClick={onClose}
                  className="flex items-center justify-center p-3 rounded-xl bg-white/70 border border-border/70 font-mono text-xs text-ink hover:bg-white transition-colors min-h-[44px] touch-manipulation"
                >
                  Architectural Journal
                </Link>
                <Link
                  href="/contact"
                  onClick={onClose}
                  className="flex items-center justify-center p-3 rounded-xl bg-white/70 border border-border/70 font-mono text-xs text-ink hover:bg-white transition-colors min-h-[44px] touch-manipulation"
                >
                  Spatial Help & FAQ
                </Link>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. DESKTOP DUAL-COLUMN VIEW (lg:) */}
          {/* ========================================================================= */}
          <div className="hidden lg:block container-wide flex-1 py-8 md:py-10">
            <div className="grid grid-cols-12 gap-8 lg:gap-12 items-start">
              {/* Left Column: Stacked Menu Items */}
              <div className="col-span-4 flex flex-col justify-between border-r border-border/70 pr-8">
                <div className="space-y-1">
                  <p className="font-mono text-xs uppercase tracking-widest text-ink-muted mb-3">
                    Categories
                  </p>
                  {navItems.map((item, idx) => {
                    const isActive = activeIndex === idx;
                    return (
                      <button
                        key={item.title}
                        type="button"
                        onClick={() => setActiveIndex(idx)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`group flex w-full items-center justify-between py-2.5 px-3.5 text-left transition-all rounded-2xl cursor-pointer ${
                          isActive
                            ? 'bg-ink text-cream translate-x-1.5 shadow-xs'
                            : 'hover:translate-x-1 text-ink hover:text-sage-deep hover:bg-stone/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`font-mono text-xs ${
                              isActive ? 'text-cream/70' : 'text-ink-muted'
                            }`}
                          >
                            0{idx + 1}.
                          </span>
                          <span className="font-heading text-lg md:text-xl font-medium tracking-tight">
                            {item.title}
                          </span>
                        </div>
                        <ArrowRight
                          className={`h-3.5 w-3.5 transition-transform duration-200 ${
                            isActive
                              ? 'text-cream opacity-100'
                              : 'opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Secondary Fast Links */}
                <div className="mt-8 pt-5 border-t border-border/60 flex flex-wrap gap-4 text-xs font-mono text-ink-muted">
                  <Link
                    href="/account"
                    onClick={onClose}
                    className="hover:text-ink font-semibold transition-colors"
                  >
                    Client Portal
                  </Link>
                  <span>·</span>
                  <Link
                    href="/about"
                    onClick={onClose}
                    className="hover:text-ink transition-colors"
                  >
                    About Atelier
                  </Link>
                  <span>·</span>
                  <Link
                    href="/blog"
                    onClick={onClose}
                    className="hover:text-ink transition-colors"
                  >
                    Architectural Journal
                  </Link>
                  <span>·</span>
                  <Link
                    href="/contact"
                    onClick={onClose}
                    className="hover:text-ink transition-colors"
                  >
                    Spatial Help
                  </Link>
                </div>
              </div>

              {/* Right Column: Dynamic Expanded Children Content */}
              <div className="col-span-8 flex flex-col justify-between">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeItem.title}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="space-y-6"
                  >
                    {/* Header of Active Selection */}
                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                      <div>
                        <span className="font-mono text-xs uppercase tracking-widest text-sage-deep font-semibold">
                          Active Collection
                        </span>
                        <h3 className="font-heading text-2xl font-semibold text-ink">
                          {activeItem.title}
                        </h3>
                      </div>
                      <Link
                        href={activeItem.href}
                        onClick={onClose}
                        className="group/all inline-flex items-center gap-1.5 font-heading text-xs uppercase tracking-wider font-semibold text-ink hover:text-sage-deep transition-colors"
                      >
                        <span>View all {activeItem.title}</span>
                        <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover/all:translate-x-0.5 group-hover/all:-translate-y-0.5" />
                      </Link>
                    </div>

                    {/* Subcategories Grid */}
                    {activeItem.megaColumns && activeItem.megaColumns.length > 0 ? (
                      <div className="grid grid-cols-3 gap-6">
                        {activeItem.megaColumns.map((column) => (
                          <div key={column.heading} className="space-y-3">
                            <h4 className="font-heading text-sm uppercase tracking-wider font-semibold text-ink border-b border-border/40 pb-1.5">
                              {column.heading}
                            </h4>
                            <ul className="space-y-2">
                              {column.items.map((sub) => (
                                <li key={sub.title}>
                                  <Link
                                    href={sub.href}
                                    onClick={onClose}
                                    className="group/sub flex items-center justify-between text-sm text-ink/80 hover:text-ink font-light transition-colors py-0.5"
                                  >
                                    <span className="group-hover/sub:translate-x-1 transition-transform">
                                      {sub.title}
                                    </span>
                                    {sub.badge && (
                                      <span className="rounded-full bg-sage/40 px-2 py-0.5 font-heading text-[11px] font-semibold text-sage-deep">
                                        {sub.badge}
                                      </span>
                                    )}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-6">
                        <p className="text-base text-ink-muted leading-relaxed font-light">
                          Explore curated drops, limited archival releases, and bespoke interior
                          pieces designed for lasting spatial harmony.
                        </p>
                        <div className="mt-4">
                          <Link
                            href={activeItem.href}
                            onClick={onClose}
                            className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-2.5 font-heading text-xs uppercase tracking-wider font-semibold text-cream hover:bg-ink/90 transition-colors"
                          >
                            Browse {activeItem.title}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* Featured Visual Promo Card */}
                    {activeItem.featured && (
                      <div className="grid grid-cols-12 gap-5 bg-stone/50 p-4 sm:p-5 border border-border/70 rounded-2xl">
                        <div className="col-span-5 relative aspect-[16/10] overflow-hidden bg-stone rounded-xl">
                          <WpImage
                            src={activeItem.featured.image}
                            alt={activeItem.featured.title}
                            className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                          />
                          {activeItem.featured.badge && (
                            <span className="absolute top-2 left-2 rounded-full bg-ink px-2.5 py-0.5 font-mono text-[10px] uppercase font-semibold text-cream">
                              {activeItem.featured.badge}
                            </span>
                          )}
                        </div>
                        <div className="col-span-7 flex flex-col justify-between">
                          <div>
                            <p className="font-mono text-[11px] uppercase tracking-wider text-sage-deep font-semibold mb-1">
                              Curator Spotlight
                            </p>
                            <h5 className="font-heading text-lg font-semibold text-ink leading-tight">
                              {activeItem.featured.title}
                            </h5>
                            <p className="mt-1.5 text-sm text-ink/75 leading-relaxed font-light">
                              {activeItem.featured.subtitle}
                            </p>
                          </div>

                          <div className="mt-3.5 pt-3 border-t border-border/40">
                            <Link
                              href={activeItem.featured.href}
                              onClick={onClose}
                              className="group/btn inline-flex items-center gap-2 font-heading text-xs uppercase tracking-wider font-semibold text-ink hover:text-sage-deep transition-colors"
                            >
                              <ButtonLabel mode="slide">
                                {activeItem.featured.ctaText || 'Shop Highlight'}
                              </ButtonLabel>
                              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover/btn:translate-x-1" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. RESPONSIVE CONCIERGE / CLIENT SUPPORT FOOTER */}
          {/* ========================================================================= */}
          <div className="bg-[#f4f1ea] border-t border-border/80 pt-6 sm:pt-8 md:pt-10 pb-28 sm:pb-12 md:pb-12 shrink-0">
            <div className="container-wide pb-4">
              <div className="mb-4 sm:mb-5 flex items-center justify-between border-b border-border/60 pb-2.5">
                <div className="flex items-center gap-2 font-mono text-[11px] sm:text-xs uppercase tracking-widest text-ink-muted">
                  <span>(09) // Direct Concierge</span>
                  <span className="hidden sm:inline">·</span>
                  <span className="hidden sm:inline text-sage-deep font-semibold">Client Support</span>
                </div>
                <p className="font-mono text-[11px] sm:text-xs text-ink-muted">EU SUPPORT ACTIVE</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                {/* 1. Phone Support */}
                <div className="p-3.5 sm:p-4 bg-white/70 border border-border/60 rounded-xl sm:rounded-xs">
                  <div className="flex items-center gap-2 text-ink font-semibold text-xs sm:text-sm mb-1">
                    <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-sage-deep" />
                    <span>Client Concierge</span>
                  </div>
                  <p className="font-mono text-sm sm:text-base font-semibold text-ink">
                    +330.269.699.230
                  </p>
                  <p className="mt-0.5 text-[11px] sm:text-xs text-ink-muted">
                    Mon – Fri · 09:00 – 18:00 CET
                  </p>
                </div>

                {/* 2. Email Assistance */}
                <div className="p-3.5 sm:p-4 bg-white/70 border border-border/60 rounded-xl sm:rounded-xs">
                  <div className="flex items-center gap-2 text-ink font-semibold text-xs sm:text-sm mb-1">
                    <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-sage-deep" />
                    <span>Digital Inquiries</span>
                  </div>
                  <a
                    href="mailto:concierge@comfortabledecor.com"
                    className="font-mono text-xs sm:text-sm font-semibold text-ink hover:text-sage-deep transition-colors truncate block"
                  >
                    concierge@comfortabledecor.com
                  </a>
                  <p className="mt-0.5 text-[11px] sm:text-xs text-ink-muted">
                    Response time under 3 hours
                  </p>
                </div>

                {/* 3. Showroom & Studio */}
                <div className="p-3.5 sm:p-4 bg-white/70 border border-border/60 rounded-xl sm:rounded-xs">
                  <div className="flex items-center gap-2 text-ink font-semibold text-xs sm:text-sm mb-1">
                    <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-sage-deep" />
                    <span>Munich Flagship</span>
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-ink">
                    Maximilianstraße 42, Munich
                  </p>
                  <p className="mt-0.5 text-[11px] sm:text-xs text-ink-muted">
                    Private consultations available
                  </p>
                </div>

                {/* 4. Delivery & Guarantees */}
                <div className="p-3.5 sm:p-4 bg-white/70 border border-border/60 rounded-xl sm:rounded-xs">
                  <div className="flex items-center gap-2 text-ink font-semibold text-xs sm:text-sm mb-1">
                    <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-sage-deep" />
                    <span>Delivery Guarantee</span>
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-ink">
                    Free EU Delivery &gt; €150
                  </p>
                  <p className="mt-0.5 text-[11px] sm:text-xs text-ink-muted">
                    30-day in-home trial guarantee
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

