import * as React from 'react';
import { Link } from '@/components/ui/link';
import { ArrowUp } from 'lucide-react';
import { useWpMenu } from '@forgewp/react';
import { Reveal } from '@/components/motion/reveal';
import { motion, AnimatePresence } from 'framer-motion';

const defaultFooterNav = {
  shop: [
    { title: 'All Products', href: '/shop' },
    { title: 'Furniture', href: '/category/furniture' },
    { title: 'Lighting', href: '/category/lighting' },
    { title: 'Decor', href: '/category/decor' },
    { title: 'Eco-Friendly', href: '/category/eco-friendly' },
    { title: 'New Arrivals', href: '/shop?sort=newest' },
    { title: 'Sale & Outlet', href: '/shop?sort=sale' },
  ],
  help: [
    { title: 'Contact Studio', href: '/contact' },
    { title: 'FAQ & Help', href: '/faq' },
    { title: 'Shipping & Delivery', href: '/shipping' },
    { title: 'Returns & Warranty', href: '/returns' },
    { title: 'Track Order', href: '/account/orders' },
  ],
  company: [
    { title: 'About Our Craft', href: '/about' },
    { title: 'Spatial Studio', href: '/studio' },
    { title: 'Architectural Journal', href: '/blog' },
    { title: 'Sustainability Manifesto', href: '/about' },
    { title: 'Privacy Policy', href: '/privacy' },
    { title: 'Terms of Service', href: '/terms' },
  ],
  account: [
    { title: 'My Account', href: '/account' },
    { title: 'Order History', href: '/account/orders' },
    { title: 'Saved Wishlist', href: '/wishlist' },
    { title: 'Shopping Cart', href: '/cart' },
  ],
};

export function Footer() {
  const { items: wpShopItems } = useWpMenu('footer_shop');
  const { items: wpCompanyItems } = useWpMenu('footer_company');
  const { items: wpHelpItems } = useWpMenu('footer_help');
  const { items: wpAccountItems } = useWpMenu('footer_account');

  const shopLinks = wpShopItems && wpShopItems.length > 0
    ? wpShopItems.map((i) => ({ title: i.title, href: i.url }))
    : defaultFooterNav.shop;

  const companyLinks = wpCompanyItems && wpCompanyItems.length > 0
    ? wpCompanyItems.map((i) => ({ title: i.title, href: i.url }))
    : defaultFooterNav.company;

  const helpLinks = wpHelpItems && wpHelpItems.length > 0
    ? wpHelpItems.map((i) => ({ title: i.title, href: i.url }))
    : defaultFooterNav.help;

  const accountLinks = wpAccountItems && wpAccountItems.length > 0
    ? wpAccountItems.map((i) => ({ title: i.title, href: i.url }))
    : defaultFooterNav.account;
  const [showFloating, setShowFloating] = React.useState(false);
  const [atBottom, setAtBottom] = React.useState(false);
  const footerRef = React.useRef<HTMLElement>(null);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  React.useEffect(() => {
    const handleScroll = () => {
      setShowFloating(window.scrollY > 300);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        setAtBottom(entry.isIntersecting);
      },
      { threshold: 0.15 }
    );

    if (footerRef.current) {
      observer.observe(footerRef.current);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <footer ref={footerRef} className="border-t border-border/80 bg-[#f4f1ea] mt-auto select-none">
        {/* Main Footer Content */}
        <Reveal className="container-wide py-14 md:py-16">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            {/* Brand & Secure Payment Icons */}
            <div className="lg:col-span-4">
              <Link
                href="/"
                className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-ink"
              >
                Comfortable Decor
              </Link>
              <p className="mt-4 max-w-sm text-sm md:text-base leading-relaxed text-ink-muted font-light">
                Premium furniture, lighting, and décor curated for warm, modern
                homes. Designed with material honesty and crafted to last a lifetime.
              </p>

              <div className="mt-6">
                <p className="font-heading text-xs uppercase tracking-wider font-semibold text-ink mb-2">
                  Secure and easy payments
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-ink-muted">
                  <span className="rounded border border-border bg-white px-2 py-1 font-semibold text-blue-700">
                    VISA
                  </span>
                  <span className="rounded border border-border bg-white px-2 py-1 font-semibold text-orange-600">
                    Mastercard
                  </span>
                  <span className="rounded border border-border bg-white px-2 py-1 font-semibold text-sky-600">
                    AMEX
                  </span>
                  <span className="rounded border border-border bg-white px-2 py-1 font-semibold text-black">
                    Apple Pay
                  </span>
                  <span className="rounded border border-border bg-white px-2 py-1 font-semibold text-blue-600">
                    PayPal
                  </span>
                  <span className="rounded border border-border bg-white px-2 py-1 font-semibold text-neutral-800">
                    G Pay
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Columns */}
            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
              <FooterColumn title="Products" links={shopLinks} />
              <FooterColumn title="Company" links={companyLinks} />
              <FooterColumn title="Get Help" links={helpLinks} />
              <FooterColumn title="Contact Us" links={accountLinks} />
            </div>
          </div>

          {/* Bottom Bar with Docked Scroll-to-Top and Copyright */}
          <div className="mt-14 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-border/70 pt-8">
            <button
              type="button"
              onClick={scrollToTop}
              className="group flex items-center gap-2 font-heading text-sm uppercase tracking-wider text-ink font-semibold hover:text-sage-deep transition-colors cursor-pointer"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/20 bg-white transition-transform group-hover:-translate-y-0.5">
                <ArrowUp className="h-4 w-4" />
              </span>
              <span>Scroll to top</span>
            </button>

            <p className="text-xs md:text-sm text-ink-muted font-light">
              © {new Date().getFullYear()} Comfortable Decor. All rights reserved.
            </p>

            <div className="flex items-center gap-4 text-xs md:text-sm text-ink-muted font-light">
              <Link href="/privacy" className="hover:text-ink transition-colors">
                Privacy Policy
              </Link>
              <span>·</span>
              <Link href="/terms" className="hover:text-ink transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </Reveal>
      </footer>

      {/* Floating Scroll-to-Top (Active while scrolling, hides when scrolled to bottom) */}
      <AnimatePresence>
        {showFloating && !atBottom && (
          <motion.button
            key="floating-scroll-to-top"
            onClick={scrollToTop}
            initial={{ opacity: 0, y: 16, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.85 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-22 sm:bottom-6 left-4 sm:left-6 z-40 flex items-center gap-2 rounded-full border border-ink/20 bg-cream/95 px-3.5 py-2 sm:px-4 sm:py-2.5 text-ink shadow-2xl backdrop-blur-2xl transition-all hover:bg-ink hover:text-cream cursor-pointer group"
            aria-label="Scroll to top"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-ink/20 bg-white text-ink transition-transform group-hover:-translate-y-0.5 group-hover:bg-cream group-hover:text-ink">
              <ArrowUp className="h-3.5 w-3.5" />
            </span>
            <span className="font-heading text-xs uppercase tracking-wider font-semibold pr-1">
              Top
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { title: string; href: string }[];
}) {
  return (
    <div>
      <p className="font-heading text-base font-semibold tracking-wide text-ink">
        {title}
      </p>
      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={link.title}>
            <Link
              href={link.href}
              className="text-sm md:text-[0.9375rem] text-ink-muted hover:text-ink transition-colors font-light"
            >
              {link.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
