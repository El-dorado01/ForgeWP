import { useState, useEffect, useRef } from 'react';
import { WpMenu, useWpMenu } from '../../.forgewp/wordpress';
import { Search, User, ShoppingBag, Menu, X } from 'lucide-react';
import SearchOverlay from './SearchOverlay';
import DesktopDropdown from './DesktopDropdown';
import MobileDrawer from './MobileDrawer';
import { CATEGORY_DATA } from './navigation-data';

export default function Navbar() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeMobileCategory, setActiveMobileCategory] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const menuContainerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<any>(null);

  const { items: primaryMenuItems } = useWpMenu('primary');

  const clearCloseTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const startCloseTimeout = () => {
    clearCloseTimeout();
    timeoutRef.current = setTimeout(() => {
      setActiveMenu(null);
    }, 150);
  };

  // Prevent background scrolling when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Dynamic Scroll Listener for sticky styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    // Initialize values on mount
    handleScroll();

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearCloseTimeout();
    };
  }, []);

  // Event Delegation for hover menus on WpMenu links (Desktop only)
  useEffect(() => {
    const container = menuContainerRef.current;
    if (!container) return;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');

      if (anchor && container.contains(anchor)) {
        const text = anchor.textContent?.trim().toLowerCase();
        if (text && CATEGORY_DATA[text]) {
          clearCloseTimeout();
          setActiveMenu(text);
        }
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');

      if (anchor && container.contains(anchor)) {
        startCloseTimeout();
      }
    };

    container.addEventListener('mouseover', handleMouseOver);
    container.addEventListener('mouseout', handleMouseOut);
    return () => {
      container.removeEventListener('mouseover', handleMouseOver);
      container.removeEventListener('mouseout', handleMouseOut);
      clearCloseTimeout();
    };
  }, []);

  const activeCategoryData = activeMenu ? CATEGORY_DATA[activeMenu] : null;
  const activeMobileCategoryData = activeMobileCategory ? CATEGORY_DATA[activeMobileCategory] : null;

  return (
    <>
      {/* HEADER & HOVER CONTAINER */}
      <div
        className='fixed top-0 left-0 right-0 z-50 w-full'
        onMouseLeave={startCloseTimeout}
      >
        <header
          className={`w-full px-6 py-5 md:px-12 flex justify-between items-center transition-all duration-500 ${
            isScrolled || activeMenu || mobileMenuOpen
              ? 'bg-[#FAF9F6]/95 backdrop-blur-md border-b border-zinc-200/40 shadow-sm'
              : 'bg-transparent border-b border-transparent'
          }`}
        >
          {/* Logo (Left) */}
          <div className='flex-1 flex justify-start items-center'>
            <a
              href='/parallax'
              className='font-heading font-black text-2xl tracking-tighter flex items-center gap-0.5 select-none hover:opacity-95 transition-all duration-500 text-zinc-900'
            >
              CD<span className='text-brand'>.</span>
            </a>
          </div>

          {/* Grouped Navigation Menus (Center) */}
          <div
            ref={menuContainerRef}
            className='hidden md:flex justify-center items-center py-2'
          >
            <WpMenu
              location='primary'
              className='flex items-center gap-9'
              linkClassName='font-heading font-medium text-sm tracking-wide uppercase transition-colors duration-500 relative py-1 after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-500 after:origin-left text-zinc-500 hover:text-zinc-900 after:bg-brand'
            />
          </div>

          {/* Cart, Search, and User Icons (Right) */}
          <div className='flex-1 flex justify-end items-center gap-5 transition-colors duration-500 text-zinc-600'>
            {/* Search Toggle */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className='p-1.5 hover:text-brand hover:scale-105 transition-all duration-300 cursor-pointer'
              aria-label='Search items'
            >
              <Search className='w-5 h-5 stroke-[1.5]' />
            </button>

            {/* User Account */}
            <a
              href='#account'
              className='p-1.5 hover:text-brand hover:scale-105 transition-all duration-300 hidden sm:inline-block'
              aria-label='User Account'
            >
              <User className='w-5 h-5 stroke-[1.5]' />
            </a>

            {/* Shopping Cart with Badge */}
            <a
              href='#cart'
              className='p-1.5 hover:text-brand hover:scale-105 transition-all duration-300 relative'
              aria-label='Cart'
            >
              <ShoppingBag className='w-5 h-5 stroke-[1.5]' />
              <span className='absolute -top-0.5 -right-0.5 bg-brand text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-sm'>
                3
              </span>
            </a>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => {
                setMobileMenuOpen(!mobileMenuOpen);
                setActiveMobileCategory(null);
              }}
              className='p-1.5 md:hidden hover:text-brand transition-colors cursor-pointer'
              aria-label='Toggle mobile menu'
            >
              {mobileMenuOpen ? (
                <X className='w-6 h-6 stroke-[1.5]' />
              ) : (
                <Menu className='w-6 h-6 stroke-[1.5]' />
              )}
            </button>
          </div>
        </header>

        {/* FULL PAGE HOVER DROPDOWN PANEL */}
        <DesktopDropdown
          activeMenu={activeMenu}
          categoryData={activeCategoryData}
          onMouseEnter={clearCloseTimeout}
          onMouseLeave={startCloseTimeout}
        />
      </div>

      {/* SEARCH OVERLAY */}
      <SearchOverlay
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />

      {/* MOBILE NAVIGATION DRAWER */}
      <MobileDrawer
        isOpen={mobileMenuOpen}
        activeCategory={activeMobileCategory}
        categoryData={activeMobileCategoryData}
        primaryMenuItems={primaryMenuItems}
        onBack={() => setActiveMobileCategory(null)}
        onSelectCategory={(category) => setActiveMobileCategory(category)}
        onLinkClick={() => {
          setMobileMenuOpen(false);
          setActiveMobileCategory(null);
        }}
      />
    </>
  );
}
