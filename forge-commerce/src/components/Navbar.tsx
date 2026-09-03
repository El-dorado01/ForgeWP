import { useState, useEffect, useRef } from 'react';
import { WpImage } from '@forgewp/react';
import { useWpCart } from '@forgewp/woocommerce';
import {
  User,
  ShoppingBagIcon,
  Heart,
  Plus,
  ChevronLeft,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface MenuItem {
  name: string;
  href: string;
  children?: {
    category: string;
    links: { name: string; href: string }[];
  }[];
  media?: {
    image: string;
    title: string;
    subtitle: string;
    href: string;
  };
}

export const NAVIGATION_MENU: MenuItem[] = [
  {
    name: 'Shop',
    href: '/shop',
    children: [
      {
        category: 'Outerwear',
        links: [
          { name: 'Minimalist Wool Coat', href: '/shop' },
          { name: 'Structured Wool Blazer', href: '/shop' },
          { name: 'Classic Trench', href: '/shop' },
          { name: 'Overcoats', href: '/shop' },
        ],
      },
      {
        category: 'Knitwear',
        links: [
          { name: 'Ribbed Crewneck', href: '/shop' },
          { name: 'Oversized Cardigan', href: '/shop' },
          { name: 'Cashmere Turtleneck', href: '/shop' },
          { name: 'Knit Vests', href: '/shop' },
        ],
      },
      {
        category: 'Accessories',
        links: [
          { name: 'Classic Ribbed Beanie', href: '/shop' },
          { name: 'Chunky Knit Scarf', href: '/shop' },
          { name: 'Leather Gloves', href: '/shop' },
        ],
      },
    ],
    media: {
      image: '/bg-image.png',
      title: 'New Season Arrivals',
      subtitle: 'Shop Outerwear & Accessories',
      href: '/shop',
    },
  },
  {
    name: 'Collections',
    href: '/#',
    children: [
      {
        category: 'Curated Edits',
        links: [
          { name: "A/W '26 Collection", href: '/shop' },
          { name: 'Minimalist Essentials', href: '/shop' },
          { name: 'Organic Wool Series', href: '/shop' },
          { name: 'Loungewear', href: '/shop' },
        ],
      },
      {
        category: 'Lookbooks',
        links: [
          { name: 'Vol. 1: Urban Nomad', href: '/#' },
          { name: 'Vol. 2: Alpine Escape', href: '/#' },
          { name: 'Creative Process', href: '/#' },
        ],
      },
    ],
    media: {
      image: '/bg-image.png',
      title: 'The Editorial',
      subtitle: "Winter '26 Campaign",
      href: '/#',
    },
  },
  {
    name: 'Journal',
    href: '/#',
  },
  {
    name: 'About',
    href: '/#',
  },
];

interface NavbarProps {
  solidBackground?: boolean;
  fixed?: boolean;
  transparentUntilSelector?: string;
  wishlistCount?: number;
}

export default function Navbar({
  solidBackground = false,
  fixed = false,
  transparentUntilSelector,
  wishlistCount = 0,
}: NavbarProps) {
  const { cart } = useWpCart();
  const cartItemCount =
    cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;
  const cartTotal = cart?.totals?.total || '$0.00';

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeMegaMenu, setActiveMegaMenu] = useState<string | null>(null);
  const [activeMobileCategory, setActiveMobileCategory] =
    useState<MenuItem | null>(null);
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnterLink = (itemName: string, hasChildren: boolean) => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    if (hasChildren) {
      setActiveMegaMenu(itemName);
    } else {
      setActiveMegaMenu(null);
    }
  };

  const handleMouseLeaveLink = () => {
    leaveTimeoutRef.current = setTimeout(() => {
      setActiveMegaMenu(null);
    }, 250);
  };

  const handleMouseEnterMenu = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
  };

  const handleMouseLeaveMenu = () => {
    setActiveMegaMenu(null);
  };

  useEffect(() => {
    if (!fixed && !transparentUntilSelector) return;

    let targetEl = transparentUntilSelector
      ? document.querySelector<HTMLElement>(transparentUntilSelector)
      : (document.querySelector<HTMLElement>('.campaign-slider-section') ??
        document.querySelector<HTMLElement>('main'));

    let observer: IntersectionObserver | null = null;

    const checkScroll = () => {
      const el =
        targetEl && targetEl.isConnected
          ? targetEl
          : transparentUntilSelector
            ? document.querySelector<HTMLElement>(transparentUntilSelector)
            : (document.querySelector<HTMLElement>(
                '.campaign-slider-section',
              ) ?? document.querySelector<HTMLElement>('main'));

      if (!el || !el.isConnected) return;

      if (el !== targetEl) {
        if (observer && targetEl) {
          observer.unobserve(targetEl);
        }
        targetEl = el;
        if (observer) {
          observer.observe(targetEl);
        }
      }

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      // If transparentUntilSelector is provided, activate background when target top reaches navbar height (~80px)
      if (transparentUntilSelector) {
        setScrolledPastHero(rect.top <= 96);
      } else {
        setScrolledPastHero(rect.bottom <= 0);
      }
    };

    checkScroll();
    observer = new IntersectionObserver(checkScroll, {
      threshold: [0, 0.1, 0.5],
    });
    if (targetEl) {
      observer.observe(targetEl);
    }

    window.addEventListener('scroll', checkScroll, { passive: true });
    return () => {
      observer?.disconnect();
      window.removeEventListener('scroll', checkScroll);
    };
  }, [fixed, transparentUntilSelector]);

  useEffect(() => {
    const isMenuOpen = isMobileMenuOpen || activeMegaMenu !== null;
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen, activeMegaMenu]);

  const isFixed = fixed || Boolean(transparentUntilSelector);

  return (
    <>
      <div
        className={`z-50 transition-all duration-300 ${
          isFixed
            ? `w-auto fixed top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 z-50 rounded-full md:top-0 md:left-0 md:right-0 md:w-full md:rounded-none ${
                scrolledPastHero
                  ? 'bg-white/70 backdrop-blur-md border border-slate-200/40 md:border-0 md:border-b md:border-slate-200/40 shadow-xs'
                  : 'bg-transparent border-transparent md:border-transparent'
              }`
            : solidBackground
              ? 'w-full bg-white/70 backdrop-blur-md border-b border-slate-200/50 sticky top-0'
              : 'w-full relative'
        }`}
      >
        {/* Mobile-only shimmer — clipped inside the pill when fixed */}
        {fixed && (
          <span className='pointer-events-none absolute inset-0 rounded-full overflow-hidden z-0 md:hidden'>
            <span className='absolute top-0 h-full w-[40%] bg-linear-to-r from-transparent via-white/40 to-transparent animate-[shimmer-sweep_3s_infinite_ease-in-out]' />
          </span>
        )}
        {/* ── HEADER NAVBAR ── */}
        <header className='relative w-full max-w-7xl mx-auto px-3 sm:px-6 md:px-12 h-16 md:h-24 flex items-center justify-between z-50 shrink-0 select-none'>
          {/* Left: Logo with Mobile Hamburger */}
          <div className='flex items-center gap-1.5 sm:gap-3'>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className='md:hidden text-slate-700 hover:text-primary transition-colors p-1 cursor-pointer z-50 flex items-center justify-center'
              aria-label='Toggle Menu'
            >
              <div className='flex flex-col gap-1 w-5 sm:w-6 items-start'>
                <span
                  className={`h-0.5 bg-slate-700 transition-all duration-300 origin-center ${
                    isMobileMenuOpen
                      ? 'w-5 sm:w-6 translate-y-0.75 rotate-45'
                      : 'w-5 sm:w-6'
                  }`}
                />
                <span
                  className={`h-0.5 bg-slate-700 transition-all duration-300 origin-center ${
                    isMobileMenuOpen
                      ? 'w-5 sm:w-6 -translate-y-0.75 -rotate-45'
                      : 'w-3.5 sm:w-4'
                  }`}
                />
              </div>
            </button>
            <a
              href='/'
              className='font-sans text-2xl sm:text-3xl md:text-4xl font-normal tracking-wide text-slate-900 lowercase select-none'
            >
              forge<span className='text-primary font-bold'>.</span>
            </a>
          </div>

          {/* Center: Nav links in glassmorphism pill with hover mega menus */}
          <nav className='hidden md:flex items-center gap-1 bg-white/40 backdrop-blur-md border border-white/60 px-6 py-2 rounded-full shadow-xs relative overflow-hidden'>
            <span className='pointer-events-none absolute top-0 h-full w-[40%] bg-linear-to-r from-transparent via-white/40 to-transparent animate-[shimmer-sweep_3s_infinite_ease-in-out] z-10' />
            {NAVIGATION_MENU.map((item) => (
              <a
                key={item.name}
                href={item.href}
                onMouseEnter={() =>
                  handleMouseEnterLink(item.name, !!item.children)
                }
                onMouseLeave={handleMouseLeaveLink}
                className={`font-heading font-bold uppercase text-xs md:text-sm tracking-[0.18em] transition-all px-5 py-2 rounded-full hover:bg-white/40 cursor-pointer flex items-center gap-1.5 ${
                  activeMegaMenu === item.name
                    ? 'bg-white/40 text-primary'
                    : 'text-slate-700 hover:text-primary'
                }`}
              >
                <span>{item.name}</span>
                {item.children && (
                  <ChevronDown
                    className={`w-3.5 h-3.5 opacity-70 transition-transform duration-300 ${
                      activeMegaMenu === item.name ? 'rotate-180' : 'rotate-0'
                    }`}
                  />
                )}
              </a>
            ))}
          </nav>

          {/* Right: User, Wishlist & Cart Icons */}
          <div className='flex items-center gap-2 sm:gap-3.5 md:gap-6 shrink-0'>
            <button className='hidden md:inline-block text-slate-600 hover:text-primary transition-colors p-1.5 cursor-pointer'>
              <User className='w-5 h-5' />
            </button>
            <button
              id='navbar-wishlist-btn'
              className='relative inline-block text-slate-600 hover:text-primary transition-colors p-1 cursor-pointer group shrink-0'
              aria-label={`Wishlist (${wishlistCount} items)`}
            >
              <Heart
                className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-300 ${
                  wishlistCount > 0
                    ? 'fill-[#7C6A58] text-[#7C6A58] group-hover:fill-primary group-hover:text-primary'
                    : 'text-slate-600 group-hover:text-primary'
                }`}
              />
              {wishlistCount > 0 && (
                <span className='absolute -top-1 -right-1 bg-[#7C6A58] group-hover:bg-primary text-white text-[9px] font-mono font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs animate-fade-in transition-colors'>
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Cart Icon with badge and price */}
            <div className='flex items-center gap-1.5 sm:gap-3 border-l border-slate-200/80 pl-2 sm:pl-4 shrink-0'>
              <button className='relative bg-white border border-slate-200/80 hover:border-primary/50 text-slate-700 hover:text-primary p-2 sm:p-2.5 md:p-3 rounded-full shadow-xs transition-all cursor-pointer shrink-0'>
                <ShoppingBagIcon className='w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5' />
                {cartItemCount > 0 && (
                  <span className='absolute -top-1 -right-1 bg-primary text-white text-[9px] font-mono font-bold w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center animate-fade-in shadow-xs'>
                    {cartItemCount}
                  </span>
                )}
              </button>
              <span className='inline-block font-mono text-[10px] sm:text-xs md:text-sm font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap shrink-0'>
                ${cartTotal}
              </span>
            </div>
          </div>
        </header>

        {/* Desktop Mega Menu Dropdown */}
        <AnimatePresence>
          {activeMegaMenu &&
            NAVIGATION_MENU.find((m) => m.name === activeMegaMenu)
              ?.children && (
              <motion.div
                key='mega-menu'
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className='absolute top-24 left-0 w-full bg-white/98 backdrop-blur-xl border-t border-slate-200/50 shadow-2xl z-40 flex justify-center py-16 px-12 min-h-112.5'
                onMouseEnter={handleMouseEnterMenu}
                onMouseLeave={handleMouseLeaveMenu}
              >
                <div className='w-full max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-4 gap-12'>
                  <div className='col-span-3 grid grid-cols-3 gap-8'>
                    {(() => {
                      const children =
                        NAVIGATION_MENU.find((m) => m.name === activeMegaMenu)
                          ?.children || [];
                      return children.map((group, index) => (
                        <motion.div
                          key={group.category}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.5,
                            ease: 'easeOut',
                            delay: index * 0.06,
                          }}
                          className='flex flex-col gap-6 text-left'
                        >
                          <span className='font-mono text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 w-fit pr-8'>
                            {group.category}
                          </span>
                          <div className='flex flex-col gap-3.5 items-start'>
                            {group.links.map((link) => (
                              <a
                                key={link.name}
                                href={link.href}
                                onClick={() => setActiveMegaMenu(null)}
                                className='font-heading font-bold text-sm text-slate-600 hover:text-primary transition-colors tracking-wide'
                              >
                                {link.name}
                              </a>
                            ))}
                          </div>
                        </motion.div>
                      ));
                    })()}
                  </div>

                  {NAVIGATION_MENU.find((m) => m.name === activeMegaMenu)
                    ?.media && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.5,
                        ease: 'easeOut',
                        delay: 0.2,
                      }}
                      className='col-span-1 border-l border-slate-200/60 pl-8 flex flex-col justify-between text-left'
                    >
                      {(() => {
                        const media = NAVIGATION_MENU.find(
                          (m) => m.name === activeMegaMenu,
                        )!.media!;
                        return (
                          <a
                            href={media.href}
                            onClick={() => setActiveMegaMenu(null)}
                            className='group block relative aspect-3/4 w-full bg-slate-50 overflow-hidden shadow-md hover:shadow-lg transition-all duration-300'
                          >
                            <WpImage
                              src={media.image}
                              alt={media.title}
                              className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-700'
                            />
                            <div className='absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/30 transition-colors duration-300 flex flex-col justify-end p-6'>
                              <span className='text-[10px] font-mono font-bold text-white uppercase tracking-widest mb-1.5 opacity-90'>
                                {media.subtitle}
                              </span>
                              <h4 className='text-lg font-heading font-black text-white uppercase tracking-widest leading-tight'>
                                {media.title}
                              </h4>
                            </div>
                          </a>
                        );
                      })()}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
        </AnimatePresence>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className='fixed inset-0 w-full h-screen bg-white/98 backdrop-blur-xl z-40 flex flex-col pt-28 pb-8 px-8 md:hidden'
          >
            <nav className='flex-1 overflow-y-auto w-full max-w-md pl-2 mx-auto flex flex-col justify-start gap-8 pr-2 py-4'>
              <AnimatePresence mode='wait'>
                {activeMobileCategory ? (
                  <motion.div
                    key={activeMobileCategory.name}
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    transition={{ duration: 0.35 }}
                    className='w-full text-left'
                  >
                    <button
                      onClick={() => setActiveMobileCategory(null)}
                      className='flex items-center gap-2 font-heading font-bold uppercase text-xs tracking-widest text-slate-500 py-2 cursor-pointer mb-2'
                    >
                      <ChevronLeft className='w-4 h-4' />
                      Back to main menu
                    </button>
                    <h3 className='font-heading font-black uppercase text-2xl tracking-widest text-slate-900 border-b border-slate-200/60 pb-3 w-full text-left'>
                      {activeMobileCategory.name}
                    </h3>
                    <div className='flex flex-col gap-8 w-full mt-4'>
                      {activeMobileCategory.children?.map((group, index) => (
                        <motion.div
                          key={group.category}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: index * 0.05 }}
                          className='flex flex-col gap-3 text-left w-full'
                        >
                          <span className='font-mono text-[10px] font-bold text-slate-400 uppercase tracking-widest'>
                            {group.category}
                          </span>
                          <div className='flex flex-col gap-3.5 pl-2 items-start'>
                            {group.links.map((link) => (
                              <a
                                key={link.name}
                                href={link.href}
                                onClick={() => {
                                  setIsMobileMenuOpen(false);
                                  setActiveMobileCategory(null);
                                }}
                                className='font-heading font-bold text-sm text-slate-700 hover:text-primary transition-all'
                              >
                                {link.name}
                              </a>
                            ))}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key='main-menu'
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 15 }}
                    transition={{ duration: 0.35 }}
                    className='w-full flex flex-col gap-6'
                  >
                    {NAVIGATION_MENU.map((item, index) => (
                      <motion.div
                        key={item.name}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.05 }}
                        className='w-full'
                      >
                        {item.children ? (
                          <button
                            onClick={() => setActiveMobileCategory(item)}
                            className='flex items-center justify-between w-full font-heading font-black uppercase text-xl tracking-widest text-slate-800 py-2 cursor-pointer'
                          >
                            <span>{item.name}</span>
                            <Plus className='w-5 h-5 text-slate-500' />
                          </button>
                        ) : (
                          <a
                            href={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className='block text-left font-heading font-black uppercase text-xl tracking-widest text-slate-800 py-2 w-full'
                          >
                            {item.name}
                          </a>
                        )}
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </nav>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className='flex flex-col items-start gap-6 border-t border-slate-200/80 pt-6 w-full max-w-md pl-2 mx-auto shrink-0'
            >
              <span className='font-mono text-[10px] font-bold text-slate-400 uppercase tracking-widest'>
                Your Space
              </span>
              <div className='flex items-center gap-8'>
                <button className='flex items-center gap-2 text-slate-700 hover:text-primary transition-colors p-2.5 cursor-pointer bg-slate-100 hover:bg-slate-200 rounded-full'>
                  <User className='w-5 h-5' />
                </button>
                <button className='flex items-center gap-2 text-slate-700 hover:text-primary transition-colors p-2.5 cursor-pointer bg-slate-100 hover:bg-slate-200 rounded-full'>
                  <Heart className='w-5 h-5' />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
