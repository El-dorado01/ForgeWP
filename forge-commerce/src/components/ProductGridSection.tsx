import { useRef, useState } from 'react';
import { WpImage } from '@forgewp/react';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, ChevronRight } from 'lucide-react';

interface ProductItem {
  id: string;
  title: string;
  categories: string;
  price: string;
  image: string;
  badge?: string;
  colors: string[];
}

const PRODUCTS: ProductItem[] = [
  {
    id: '1',
    title: 'Minimalist Wool Blazer',
    categories: 'Outerwear, Tailoring',
    price: '$285.00',
    image: '/wool_blazer_beige.jpg',
    colors: ['#D6C7B2', '#2B2B2A', '#5A6251'],
  },
  {
    id: '2',
    title: 'Classic Trench Coat',
    categories: 'Outerwear, Coats',
    price: '$340.00 – $420.00',
    image: '/trench_camel_khaki.jpg',
    badge: 'Sale',
    colors: ['#CBB49A', '#ECE9E2'],
  },
  {
    id: '3',
    title: 'Cashmere Ribbed Turtleneck',
    categories: 'Knitwear, Sweaters',
    price: '$195.00',
    image: '/turtleneck_alabaster.jpg',
    colors: ['#EDEAE4', '#5C4033'],
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 35 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
  },
};

/** Interactive 3D Tilt Card Wrapper with true inline CSS perspective foreshortening */
function TiltCard({
  children,
  className = '',
  variants,
}: {
  children: React.ReactNode;
  className?: string;
  variants?: any;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, active: false });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    // Subtle tilt backwards on X (positive rx) and to the right on Y (positive ry) + gentle mouse follow
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
    <motion.div variants={variants} style={{ perspective: '1000px' }} className='h-full'>
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
        style={{ transformStyle: 'preserve-3d' }}
        className={className}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export default function ProductGridSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: '-10% 0px' });

  return (
    <section
      ref={sectionRef}
      className='w-full bg-[#fafafa] py-16 md:py-24 px-6 md:px-12 max-w-7xl mx-auto border-t border-slate-100 select-none'
    >
      {/* ── Section Header ── */}
      <div className='flex items-end justify-between mb-8 md:mb-12'>
        <div>
          <span className='font-mono text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2'>
            Curated Selection
          </span>
          <h2 className='text-3xl md:text-4xl font-sans font-normal tracking-wide text-slate-900 lowercase'>
            explore our new products
          </h2>
        </div>

        {/* Optional header link */}
        <a
          href='#storefront'
          className='hidden sm:inline-flex items-center gap-1.5 font-heading text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-primary transition-colors cursor-pointer group'
        >
          View All Products
          <ChevronRight className='w-4 h-4 group-hover:translate-x-1 transition-transform' />
        </a>
      </div>

      {/* ── 4-Column Grid (CTA Card 1st on Left + 3 Product Cards) ── */}
      <motion.div
        variants={containerVariants}
        initial='hidden'
        animate={inView ? 'visible' : 'hidden'}
        className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch'
      >
        {/* ── CARD 1 (LEFTMOST): Customizer / CTA Feature Card ── */}
        <TiltCard
          variants={cardVariants}
          className='relative flex flex-col justify-between p-7 md:p-8 rounded-3xl bg-[#F5F1ED] overflow-hidden min-h-105 shadow-md group cursor-pointer'
        >
          {/* Background image — always visible on mobile (no hover there); hidden until hovered upon from md: up */}
          <div className='absolute inset-0 z-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-500 ease-out overflow-hidden pointer-events-none'>
            <WpImage
              src='/bg-image.png'
              alt='Customizer preview'
              className='w-full h-full object-cover scale-100 md:scale-105 md:group-hover:scale-100 transition-transform duration-700 ease-out'
            />
            {/* Dark gradient overlay for text readability when image is revealed */}
            <div className='absolute inset-0 bg-linear-to-t from-slate-950/85 via-slate-950/40 to-slate-950/20' />
          </div>

          {/* Subtle background ambient shine */}
          <span className='pointer-events-none absolute -right-16 -bottom-16 w-48 h-48 rounded-full bg-white/10 blur-2xl z-10' />

          <div className='relative z-10 pt-4'>
            {/* Headline */}
            <h3 className='font-heading font-black text-2xl md:text-3xl uppercase tracking-tight text-white md:text-[#7C6A58] md:group-hover:text-white leading-[1.1] mb-4 max-w-50 transition-colors duration-300'>
              Create your perfect look
            </h3>

            {/* Subtitle / Description */}
            <p className='font-sans text-xs md:text-sm text-slate-200 md:text-[#7C6A58] md:group-hover:text-slate-200 leading-relaxed max-w-55 transition-colors duration-300'>
              Choose from endless models, materials, and colors to configure
              your custom wardrobe.
            </p>
          </div>

          {/* Bottom Action Button with 3D text roll + looping arrow animation */}
          <div className='relative z-10 mt-8'>
            <motion.a
              href='#storefront'
              whileTap={{ scale: 0.98 }}
              className='group/btn relative overflow-hidden inline-flex items-center justify-between w-full bg-white text-slate-900 md:bg-[#7C6A58] md:text-white md:group-hover:bg-white md:group-hover:text-slate-900 hover:bg-[#605143] font-heading font-bold text-xs uppercase tracking-wider px-6 py-4 rounded-full shadow-md transition-all duration-300 cursor-pointer'
            >
              {/* Rolling 3D-flip text box */}
              <div className='relative overflow-hidden h-[1.15em] flex flex-col justify-start'>
                <span className='block transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/btn:-translate-y-full'>
                  Start building
                </span>
                <span className='block transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/btn:-translate-y-full text-[#C3B19F] group-hover:text-slate-900'>
                  Start building
                </span>
              </div>

              {/* Icon loop-through animation: moves away to the right & enters from left */}
              <div className='relative w-4 h-4 overflow-hidden shrink-0 ml-2'>
                <ArrowRight className='w-4 h-4 absolute inset-0 transition-all duration-300 ease-in-out group-hover/btn:translate-x-full group-hover/btn:opacity-0' />
                <ArrowRight className='w-4 h-4 absolute inset-0 -translate-x-full opacity-0 transition-all duration-300 ease-in-out group-hover/btn:translate-x-0 group-hover/btn:opacity-100 text-[#C3B19F] group-hover:text-slate-900' />
              </div>
            </motion.a>
          </div>
        </TiltCard>

        {/* ── CARDS 2, 3, 4: Product Cards with Pure White Glass Overlay & 3D Tilt ── */}
        {PRODUCTS.map((product) => (
          <TiltCard
            key={product.id}
            variants={cardVariants}
            className='relative flex flex-col justify-between rounded-3xl min-h-105 overflow-hidden shadow-xs hover:shadow-xl transition-shadow duration-300 group cursor-pointer bg-slate-100'
          >
            {/* Full Card Background Image */}
            <WpImage
              src={product.image}
              alt={product.title}
              className='absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out z-0'
            />

            {/* Full Card Hover Shimmer Sweep */}
            <span className='pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-3xl'>
              <span className='absolute top-0 h-full w-1/2 -translate-x-full bg-linear-to-r from-transparent via-white/50 to-transparent -skew-x-12 group-hover:translate-x-[300%] transition-transform duration-900 ease-[cubic-bezier(0.16,1,0.3,1)]' />
            </span>

            {/* Top Badge Container */}
            <div className='relative z-20 flex justify-between items-start p-6 md:p-7'>
              {product.badge ? (
                <span className='font-mono text-[9px] font-bold uppercase tracking-widest bg-slate-900 text-white px-3 py-1 rounded-full shadow-xs'>
                  {product.badge}
                </span>
              ) : (
                <span />
              )}
            </div>

            {/* Bottom Full-Width Pure White Glassy Overlay Description & Details — hidden until hover, slides up from bottom */}
            <div className='absolute bottom-0 left-0 right-0 z-20 w-full overflow-hidden backdrop-blur-md bg-white/80 p-6 text-slate-900 border-t border-white/50 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]'>
              {/* Hover Shimmer Sweep */}
              <span className='pointer-events-none absolute top-0 h-full w-1/2 -translate-x-full bg-linear-to-r from-transparent via-white/70 to-transparent -skew-x-12 group-hover:translate-x-[250%] transition-transform duration-700 delay-150 ease-[cubic-bezier(0.16,1,0.3,1)] z-10' />

              <h4 className='font-heading font-bold text-lg md:text-xl tracking-tight text-slate-900 group-hover:text-primary transition-colors leading-snug line-clamp-1'>
                {product.title}
              </h4>
              <p className='font-sans text-xs text-slate-600 mt-1'>
                {product.categories}
              </p>
              <div className='font-mono text-xs font-bold text-slate-900 mt-2'>
                {product.price}
              </div>

              {/* Color Swatch Dots */}
              <div className='flex items-center gap-2 mt-3.5 pt-3 border-t border-slate-900/10 relative z-20'>
                {product.colors.map((color, idx) => (
                  <span
                    key={idx}
                    className='w-3.5 h-3.5 rounded-full border border-slate-900/15 shadow-2xs block'
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </TiltCard>
        ))}
      </motion.div>
    </section>
  );
}
