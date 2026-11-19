import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Heart,
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { WpHead, useWpTitle, WpImage } from '@forgewp/react';

interface ShopProduct {
  id: string;
  title: string;
  categories: string;
  price: string;
  originalPrice?: string;
  image: string;
  images: string[];
  badge?: string;
  colors: string[];
}

const SHOP_PRODUCTS: ShopProduct[] = [
  {
    id: '1',
    title: 'Minimalist Wool Blazer',
    categories: 'Outerwear, Tailoring',
    price: '$285.00',
    image: '/wool_blazer_beige.jpg',
    images: [
      '/wool_blazer_beige.jpg',
      '/wool_blazer_matte_noir.jpg',
      '/wool_blazer_olive_sage.jpg',
    ],
    colors: ['#D6C7B2', '#2B2B2A', '#5A6251'],
  },
  {
    id: '2',
    title: 'Classic Trench Coat',
    categories: 'Outerwear, Coats',
    price: '$340.00',
    originalPrice: '$420.00',
    image: '/trench_camel_khaki.jpg',
    images: ['/trench_camel_khaki.jpg', '/trench_bone_white.jpg'],
    badge: 'Sale',
    colors: ['#CBB49A', '#ECE9E2'],
  },
  {
    id: '3',
    title: 'Cashmere Ribbed Turtleneck',
    categories: 'Knitwear, Sweaters',
    price: '$195.00',
    image: '/turtleneck_alabaster.jpg',
    images: ['/turtleneck_alabaster.jpg', '/turtleneck_cocoa.jpg'],
    colors: ['#EDEAE4', '#5C4033'],
  },
  {
    id: '4',
    title: 'Oversized Wool Cardigan',
    categories: 'Knitwear, Sweaters',
    price: '$225.00',
    image: '/cardigan_cedar.jpg',
    images: ['/cardigan_cedar.jpg', '/cardigan_grey.jpg'],
    badge: 'New',
    colors: ['#7C6A58', '#2C2A29'],
  },
  {
    id: '5',
    title: 'Moss Melange Crewneck',
    categories: 'Knitwear, Tops',
    price: '$180.00',
    image: '/sweater_moss_melange.jpg',
    images: [
      '/sweater_moss_melange.jpg',
      '/sweater_earth_brown.jpg',
      '/sweater_vanilla_cream.jpg',
    ],
    colors: ['#5A6251', '#5C4033', '#EDEAE4'],
  },
  {
    id: '6',
    title: 'Structured Charcoal Overcoat',
    categories: 'Outerwear, Coats',
    price: '$360.00',
    image: '/wool_coat_charcoal.jpg',
    images: [
      '/wool_coat_charcoal.jpg',
      '/wool_coat_desert_taupe.jpg',
      '/wool_coat_oatmeal.jpg',
    ],
    badge: 'Best Seller',
    colors: ['#2C2A29', '#A38E7A', '#EDEAE4'],
  },
  {
    id: '7',
    title: 'Classic Ribbed Beanie',
    categories: 'Accessories, Knitwear',
    price: '$65.00',
    image: '/beanie_charcoal.jpg',
    images: [
      '/beanie_charcoal.jpg',
      '/beanie_forest_sage.jpg',
      '/beanie_oatmeal.jpg',
    ],
    badge: 'Essential',
    colors: ['#2C2A29', '#5A6251', '#E8E2D9'],
  },
  {
    id: '8',
    title: 'Chunky Fringe Scarf',
    categories: 'Accessories, Knitwear',
    price: '$95.00',
    image: '/scarf_desert_sand.jpg',
    images: ['/scarf_desert_sand.jpg', '/scarf_moss_green.jpg'],
    badge: 'Popular',
    colors: ['#D6C7B2', '#5A6251'],
  },
  {
    id: '9',
    title: 'Saddle Leather Gloves',
    categories: 'Accessories, Leather',
    price: '$120.00',
    image: '/leather_gloves_saddle_tan.jpg',
    images: [
      '/leather_gloves_saddle_tan.jpg',
      '/leather_gloves_matte_black.jpg',
    ],
    colors: ['#A3734C', '#1E1E1E'],
  },
];

const CATEGORIES = ['All', 'Outerwear', 'Knitwear', 'Tailoring', 'Accessories'];

/** Interactive 3D Tilt Card Component */
function TiltCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, active: false });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    setTilt({
      rx: 5 + y * -4,
      ry: 5 + x * 4,
      active: true,
    });
  };

  const handleMouseEnter = () => {
    setTilt({ rx: 5, ry: 5, active: true });
  };

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0, active: false });
  };

  return (
    <div
      style={{ perspective: '1000px' }}
      className='h-full'
    >
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        animate={{
          rotateX: tilt.rx,
          rotateY: tilt.ry,
          y: tilt.active ? -4 : 0,
        }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className={`h-full ${className}`}
      >
        {children}
      </motion.div>
    </div>
  );
}

const getBadgeStyle = (badge?: string) => {
  if (!badge) return '';
  switch (badge.toLowerCase()) {
    case 'sale':
      return 'bg-rose-950/85 text-rose-200 border border-rose-500/30 shadow-xs backdrop-blur-md';
    case 'new':
      return 'bg-emerald-950/85 text-emerald-200 border border-emerald-500/30 shadow-xs backdrop-blur-md';
    case 'best seller':
      return 'bg-[#7C6A58] text-white border border-white/25 shadow-xs backdrop-blur-md';
    default:
      return 'bg-slate-900/85 text-amber-200/90 border border-amber-400/30 shadow-xs backdrop-blur-md';
  }
};

/**
 * ⚡ ForgeWP Custom Page Template — "ShopPage"
 */
interface FlyingHeart {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export function ShopPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('Featured');
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [flyingHearts, setFlyingHearts] = useState<FlyingHeart[]>([]);
  const [activeImageIndexes, setActiveImageIndexes] = useState<
    Record<string, number>
  >({});

  const toggleWishlist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isAdding = !wishlist.includes(id);

    if (isAdding) {
      const rect = e.currentTarget.getBoundingClientRect();
      const startX = rect.left + rect.width / 2;
      const startY = rect.top + rect.height / 2;

      const navBtn = document.getElementById('navbar-wishlist-btn');
      let endX = window.innerWidth - 120;
      let endY = 40;
      if (navBtn) {
        const navRect = navBtn.getBoundingClientRect();
        endX = navRect.left + navRect.width / 2;
        endY = navRect.top + navRect.height / 2;
      }

      setFlyingHearts((prev) => [
        ...prev,
        { id: Date.now() + Math.random(), startX, startY, endX, endY },
      ]);
    }

    setWishlist((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleNextVariant = (
    productId: string,
    total: number,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setActiveImageIndexes((prev) => {
      const current = prev[productId] || 0;
      return { ...prev, [productId]: (current + 1) % total };
    });
  };

  const handlePrevVariant = (
    productId: string,
    total: number,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setActiveImageIndexes((prev) => {
      const current = prev[productId] || 0;
      const prevIdx = current === 0 ? total - 1 : current - 1;
      return { ...prev, [productId]: prevIdx };
    });
  };

  const filteredProducts =
    selectedCategory === 'All'
      ? SHOP_PRODUCTS
      : SHOP_PRODUCTS.filter((product) =>
          product.categories
            .toLowerCase()
            .includes(selectedCategory.toLowerCase()),
        );

  return (
    <div className='w-full min-h-screen bg-[#fafafa] font-sans text-slate-900 select-none'>
      <WpHead
        title={useWpTitle() || 'Shop Collection'}
        description='Browse our curated selection of artisanal wool outerwear, knitwear, and tailoring.'
      />

      {/* ── Flying Heart Love Bubble Animations ── */}
      <AnimatePresence>
        {flyingHearts.map((heart) => (
          <motion.div
            key={heart.id}
            initial={{
              x: heart.startX - 14,
              y: heart.startY - 14,
              scale: 0.8,
              opacity: 1,
            }}
            animate={{
              x: [
                heart.startX - 14,
                (heart.startX + heart.endX) / 2 + (heart.startX < heart.endX ? -30 : 30),
                heart.endX - 12,
              ],
              y: [
                heart.startY - 14,
                Math.min(heart.startY, heart.endY) - 50,
                heart.endY - 12,
              ],
              scale: [0.8, 1.4, 0.4],
              opacity: [1, 1, 0.9],
            }}
            transition={{
              duration: 0.75,
              ease: [0.16, 1, 0.3, 1],
            }}
            onAnimationComplete={() => {
              setFlyingHearts((prev) => prev.filter((h) => h.id !== heart.id));
            }}
            className='fixed top-0 left-0 z-50 pointer-events-none p-2 rounded-full bg-[#7C6A58] text-white shadow-xl flex items-center justify-center'
          >
            <Heart className='w-4 h-4 fill-white text-white' />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* ── Centrally Placed Title "Shop" ── */}
      <header className='max-w-7xl mx-auto px-6 md:px-12 pt-24 md:pt-32 pb-4 text-center'>
        <h1 className='text-4xl md:text-6xl font-sans font-normal tracking-wide text-slate-900 select-none'>
          Shop
        </h1>
      </header>

      {/* ── Filter & Sorting Control Bar ── */}
      <section className='shop-filter-section max-w-7xl mx-auto px-6 md:px-12 pt-4 pb-6'>
        <div className='flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-5 border-b border-slate-200/80 pb-5'>
          {/* Category Filter Pills — Smooth Horizontal Scroll with clean page margins */}
          <div className='flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0 scrollbar-none touch-pan-x snap-x px-1'>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`font-heading text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-full transition-all duration-300 cursor-pointer shrink-0 snap-start ${
                  selectedCategory === cat
                    ? 'bg-[#7C6A58] text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-[#7C6A58] hover:text-[#7C6A58]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Right Controls: Sort Dropdown & Product Counter */}
          <div className='flex items-center justify-between lg:justify-end gap-4 w-full lg:w-auto text-xs'>
            <span className='font-mono text-slate-400 font-medium'>
              Showing{' '}
              <strong className='text-slate-900'>
                {filteredProducts.length}
              </strong>{' '}
              of {SHOP_PRODUCTS.length} products
            </span>

            <div className='relative inline-flex items-center bg-white border border-slate-200 rounded-full px-4 py-2 text-slate-700 shadow-2xs'>
              <SlidersHorizontal className='w-3.5 h-3.5 mr-2 text-slate-400' />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label='Sort products'
                className='bg-transparent text-xs font-heading font-bold uppercase tracking-wider text-slate-800 focus:outline-none cursor-pointer pr-4 appearance-none'
              >
                <option value='Featured'>Sort: Featured</option>
                <option value='PriceLow'>Price: Low to High</option>
                <option value='PriceHigh'>Price: High to Low</option>
              </select>
              <ChevronDown className='w-3.5 h-3.5 text-slate-400 absolute right-3 pointer-events-none' />
            </div>
          </div>
        </div>
      </section>

      {/* ── 3-Column Responsive Product Grid (Compact & Sleek) ── */}
      <section className='max-w-7xl mx-auto px-6 md:px-12 pt-4'>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch'>
          {filteredProducts.map((product) => {
            const activeIdx = activeImageIndexes[product.id] ?? 0;
            const currentImg = product.images[activeIdx] || product.image;

            return (
              <TiltCard key={product.id}>
                {/* Outer wrapper — no overflow-hidden, arrows live here */}
                <div className='relative h-full group'>
                  {/* Variant Navigation Arrows — siblings to the card, not inside overflow-hidden */}
                  {product.images.length > 1 && (
                    <>
                      <button
                        type='button'
                        onClick={(e) =>
                          handlePrevVariant(
                            product.id,
                            product.images.length,
                            e,
                          )
                        }
                        aria-label='Previous variant'
                        className='absolute left-2.5 sm:left-3 top-[40%] -translate-y-1/2 z-50 p-2 sm:p-2.5 rounded-full bg-white/90 hover:bg-white text-slate-900 backdrop-blur-md shadow-md opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 cursor-pointer border border-slate-200/60'
                      >
                        <ChevronLeft className='w-4 h-4 pointer-events-none' />
                      </button>
                      <button
                        type='button'
                        onClick={(e) =>
                          handleNextVariant(
                            product.id,
                            product.images.length,
                            e,
                          )
                        }
                        aria-label='Next variant'
                        className='absolute right-2.5 sm:right-3 top-[40%] -translate-y-1/2 z-50 p-2 sm:p-2.5 rounded-full bg-white/90 hover:bg-white text-slate-900 backdrop-blur-md shadow-md opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 cursor-pointer border border-slate-200/60'
                      >
                        <ChevronRight className='w-4 h-4 pointer-events-none' />
                      </button>
                    </>
                  )}

                  {/* Inner card — overflow-hidden for image/glass effects */}
                  <div className='relative flex flex-col justify-between rounded-3xl min-h-96 md:min-h-98 overflow-hidden shadow-xs group-hover:shadow-xl transition-shadow duration-500 cursor-pointer bg-slate-100 h-full border border-slate-200/60'>
                    {/* Full Card Background Image */}
                    <WpImage
                      src={currentImg}
                      alt={product.title}
                      className='absolute inset-0 w-full h-full object-cover z-0'
                    />

                    {/* Full Card Hover Shimmer Sweep */}
                    <span className='pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-3xl'>
                      <span className='absolute top-0 h-full w-1/2 -translate-x-full bg-linear-to-r from-transparent via-white/50 to-transparent -skew-x-12 group-hover:translate-x-[300%] transition-transform duration-900 ease-[cubic-bezier(0.16,1,0.3,1)]' />
                    </span>

                    {/* Top Badges & Wishlist Button (Heart hidden by default until hover) */}
                    <div className='relative z-20 flex justify-between items-start p-5'>
                      {product.badge ? (
                        <span
                          className={`font-mono text-[9px] font-bold uppercase tracking-widest px-3.5 py-1 rounded-full ${getBadgeStyle(product.badge)}`}
                        >
                          {product.badge}
                        </span>
                      ) : (
                        <span />
                      )}

                      <button
                        type='button'
                        onClick={(e) => toggleWishlist(product.id, e)}
                        aria-label={`Save ${product.title} to wishlist`}
                        className={`p-2.5 rounded-full backdrop-blur-md transition-all duration-300 cursor-pointer shadow-sm ${
                          wishlist.includes(product.id)
                            ? 'bg-[#7C6A58] text-white opacity-100 scale-105'
                            : 'bg-white/80 hover:bg-white text-slate-700 hover:text-[#7C6A58] opacity-100 md:opacity-0 md:group-hover:opacity-100'
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 transition-all duration-300 ${
                            wishlist.includes(product.id)
                              ? 'fill-white text-white'
                              : ''
                          }`}
                        />
                      </button>
                    </div>

                    {/* Bottom Full-Width Pure White Glassy Overlay Description — hidden until hover/tap, slides up from bottom */}
                    <div className='absolute bottom-0 left-0 right-0 z-20 w-full overflow-hidden backdrop-blur-xl bg-white/65 p-4 sm:p-5 text-slate-900 border-t border-white/50 translate-y-0 opacity-100 md:translate-y-full md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]'>
                      {/* Hover Shimmer Sweep */}
                      <span className='pointer-events-none absolute top-0 h-full w-1/2 -translate-x-full bg-linear-to-r from-transparent via-white/80 to-transparent -skew-x-12 group-hover:translate-x-[250%] transition-transform duration-700 delay-150 ease-[cubic-bezier(0.16,1,0.3,1)] z-10' />

                      <div className='flex items-start justify-between gap-2'>
                        <div>
                          <h3 className='font-heading font-bold text-base md:text-lg tracking-tight text-slate-900 group-hover:text-[#7C6A58] transition-colors leading-snug line-clamp-1'>
                            {product.title}
                          </h3>
                          <p className='font-sans text-[11px] text-slate-500 mt-0.5'>
                            {product.categories}
                          </p>
                        </div>

                        <div className='text-right shrink-0'>
                          <div className='font-mono text-sm font-bold text-slate-900'>
                            {product.price}
                          </div>
                          {product.originalPrice && (
                            <div className='font-mono text-[10px] text-slate-400 line-through mt-0.5'>
                              {product.originalPrice}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Swatches & Animated Quick Add Button Bar */}
                      <div className='flex items-center justify-between gap-4 mt-3 pt-3 border-t border-slate-900/10 relative z-20'>
                        {/* Color Swatches (Click to switch variant image) */}
                        <div className='flex items-center gap-1.5'>
                          {product.colors.map((color, idx) => (
                            <button
                              type='button'
                              key={idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveImageIndexes((prev) => ({
                                  ...prev,
                                  [product.id]: idx,
                                }));
                              }}
                              className={`w-3.5 h-3.5 rounded-full border shadow-2xs block cursor-pointer transition-transform ${
                                activeIdx === idx
                                  ? 'border-slate-900 scale-125 ring-1 ring-slate-900/20'
                                  : 'border-slate-900/20 hover:scale-110'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>

                        {/* Animated Quick Add Button */}
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          type='button'
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          className='group/addbtn relative overflow-hidden inline-flex items-center justify-between bg-slate-900 hover:bg-[#7C6A58] text-white font-heading font-bold text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-full transition-colors duration-300 shadow-xs cursor-pointer shrink-0'
                        >
                          <div className='relative overflow-hidden h-[1.15em] flex flex-col justify-start'>
                            <span className='block transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/addbtn:-translate-y-full'>
                              Quick Add
                            </span>
                            <span className='block transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/addbtn:-translate-y-full text-[#E8E2D9]'>
                              Quick Add
                            </span>
                          </div>
                          <div className='relative w-3 h-3 overflow-hidden shrink-0 ml-1.5'>
                            <ShoppingBag className='w-3 h-3 absolute inset-0 transition-all duration-300 ease-in-out group-hover/addbtn:translate-x-full group-hover/addbtn:opacity-0' />
                            <ShoppingBag className='w-3 h-3 absolute inset-0 -translate-x-full opacity-0 transition-all duration-300 ease-in-out group-hover/addbtn:translate-x-0 group-hover/addbtn:opacity-100 text-[#E8E2D9]' />
                          </div>
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </div>
              </TiltCard>
            );
          })}
        </div>
      </section>

      {/* ── Bottom Customizer Banner ── */}
      <section className='max-w-7xl mx-auto px-6 md:px-12 mt-20'>
        <div className='relative rounded-3xl bg-[#7C6A58] text-white p-8 md:p-12 overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 shadow-md'>
          <span className='pointer-events-none absolute -right-20 -bottom-20 w-64 h-64 rounded-full bg-white/10 blur-3xl' />

          <div className='relative z-10 max-w-xl text-left'>
            <span className='font-mono text-[10px] font-bold uppercase tracking-widest text-[#E8E2D9] block mb-2'>
              Forge Studio Customizer
            </span>
            <h2 className='text-2xl md:text-3xl font-heading font-black uppercase tracking-tight leading-tight'>
              Looking for bespoke tailoring?
            </h2>
            <p className='text-xs md:text-sm text-[#E8E2D9] font-sans mt-2 leading-relaxed'>
              Select your own fabrics, buttons, linings, and customized
              silhouettes with our interactive wardrobe studio.
            </p>
          </div>

          <div className='relative z-10 shrink-0 w-full md:w-auto'>
            <a
              href='#storefront'
              className='inline-flex items-center justify-center gap-2 w-full md:w-auto bg-white hover:bg-slate-100 text-slate-900 font-heading font-bold text-xs uppercase tracking-widest px-8 py-4 rounded-full shadow-md transition-colors duration-300 cursor-pointer'
            >
              Configure Outfit
              <ArrowRight className='w-4 h-4 text-[#7C6A58]' />
            </a>
          </div>
        </div>
      </section>

      </div>
    );
}
