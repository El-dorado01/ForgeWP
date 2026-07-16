import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Plus } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';

import accentsImg from '../assets/category_accents.png';
import lightingImg from '../assets/category_lighting.png';
import seatingImg from '../assets/category_seating.png';
import textilesImg from '../assets/category_textiles.png';

interface Product {
  id: string;
  name: string;
  price: string;
  category: 'Seating' | 'Lighting' | 'Textiles' | 'Accents';
  image: string;
  subtitle: string;
}

const PRODUCTS: Product[] = [
  { id: 'p1', name: 'Linen Lounge Chair', price: '$820', category: 'Seating', image: seatingImg, subtitle: 'Organic Linen & Solid Ash' },
  { id: 'p2', name: 'Sculptural Floor Lamp', price: '$480', category: 'Lighting', image: lightingImg, subtitle: 'Brushed Brass & Marble' },
  { id: 'p3', name: 'Waffle Knit Wool Throw', price: '$180', category: 'Textiles', image: textilesImg, subtitle: '100% Merino Wool' },
  { id: 'p4', name: 'Matte Stoneware Vase Set', price: '$140', category: 'Accents', image: accentsImg, subtitle: 'Set of 3 Textured Clay' },
  { id: 'p5', name: 'Minimalist Oak Stool', price: '$290', category: 'Seating', image: seatingImg, subtitle: 'Tapered Solid Oak Frame' },
  { id: 'p6', name: 'Pleated Table Lamp', price: '$220', category: 'Lighting', image: lightingImg, subtitle: 'Ceramic Base & Pleated Linen' },
  { id: 'p7', name: 'Organic Linen Cushion Cover', price: '$85', category: 'Textiles', image: textilesImg, subtitle: 'Tactile Linen with Zipper' },
  { id: 'p8', name: 'Hand-Formed Ceramic Tray', price: '$95', category: 'Accents', image: accentsImg, subtitle: 'Matte Ceramic Accent Tray' },
];

export default function ProductShowroom() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start', dragFree: true });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isTrackHovered, setIsTrackHovered] = useState(false);
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  // Autoplay with pause-on-hover
  useEffect(() => {
    if (isTrackHovered) {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
      return;
    }
    autoplayRef.current = setInterval(() => {
      emblaApi?.scrollNext();
    }, 4000);
    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    };
  }, [emblaApi, isTrackHovered]);

  // Compute flex-basis for each card based on hover state
  const getBasis = (id: string) => {
    if (!hoveredId) return '24%';       // default: 4 visible at a time
    if (id === hoveredId) return '30%'; // hovered card expands
    return '22%';                       // others compress slightly
  };

  return (
    <section id='catalog' className='w-full bg-[#FAF9F6] py-24 px-6 md:px-12 border-t border-zinc-100/40 relative overflow-hidden'>
      {/* Background Glow */}
      <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#4A5D4E]/3 rounded-full blur-3xl pointer-events-none' />

      <div className='max-w-[1400px] mx-auto'>
        {/* Section Header + Controls */}
        <motion.div
          className='grid grid-cols-1 md:grid-cols-12 gap-x-8 md:gap-x-16 gap-y-4 md:gap-y-6 items-start mb-16'
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 1.2, ease: [0.215, 0.61, 0.355, 1] }}
        >
          {/* Row 1: Label */}
          <div className='md:col-span-6 text-left'>
            <span className='font-heading font-black tracking-widest text-xs uppercase text-brand/80 block select-none'>
              The Showroom / Curated Objects
            </span>
          </div>
          {/* Row 1 Right: Placeholder */}
          <div className='md:col-span-6 hidden md:block' />

          {/* Row 2: Title & Description */}
          <div className='md:col-span-6 text-left'>
            <h2 className='font-serif font-normal text-3xl md:text-4xl lg:text-5xl text-zinc-950 leading-tight tracking-tight'>
              Signature Pieces.
            </h2>
          </div>
          <div className='md:col-span-6 text-left md:pt-3'>
            <p className='font-sans text-zinc-500 font-medium leading-relaxed text-sm md:text-base'>
              A collection of minimal home goods, hand-loomed textiles, and custom ambient lighting designed to turn your space into a peaceful sanctuary.
            </p>
          </div>

          {/* Row 3: Controls & Shop All Link */}
          <div className='md:col-span-6 text-left flex items-center h-full'>
            <div className='flex items-center gap-3'>
              <button
                onClick={scrollPrev}
                className='p-3 border border-zinc-200 rounded-full hover:bg-zinc-900 hover:text-[#FAF9F6] hover:border-zinc-900 transition-all duration-300 cursor-pointer text-zinc-600'
                aria-label='Previous products'
              >
                <ArrowLeft className='w-4 h-4 stroke-2' />
              </button>
              <button
                onClick={scrollNext}
                className='p-3 border border-zinc-200 rounded-full hover:bg-zinc-900 hover:text-[#FAF9F6] hover:border-zinc-900 transition-all duration-300 cursor-pointer text-zinc-600'
                aria-label='Next products'
              >
                <ArrowRight className='w-4 h-4 stroke-2' />
              </button>
            </div>
          </div>
          <div className='md:col-span-6 text-left flex items-center h-full'>
            <div>
              <a
                href='#'
                onClick={(e) => e.preventDefault()}
                className='inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-brand hover:text-zinc-950 transition-colors duration-300 select-none cursor-pointer group/link'
              >
                Shop All
                <ArrowRight className='w-3.5 h-3.5 transform group-hover/link:translate-x-1 transition-transform duration-300' />
              </a>
            </div>
          </div>
        </motion.div>

        {/* Embla Carousel Track */}
        <motion.div
          initial={{ opacity: 0, y: 70 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 1.5, delay: 0.1, ease: [0.215, 0.61, 0.355, 1] }}
          className='w-full relative z-10 overflow-hidden -mr-20 pr-10'
          ref={emblaRef}
          onMouseEnter={() => setIsTrackHovered(true)}
          onMouseLeave={() => { setIsTrackHovered(false); setHoveredId(null); }}
        >
          <div className='flex gap-3'>
            {PRODUCTS.map((product) => (
              <div
                key={product.id}
                onMouseEnter={() => setHoveredId(product.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  flexShrink: 0,
                  flexBasis: getBasis(product.id),
                  minWidth: '220px',
                  transition: 'flex-basis 0.45s cubic-bezier(0.215, 0.61, 0.355, 1)',
                }}
                className='group flex flex-col justify-between h-[450px] bg-[#FAF9F6] border border-zinc-200/20 rounded-2xl p-2 hover:border-zinc-200/60 transition-colors duration-300 hover:shadow-xl hover:shadow-stone-200/30'
              >
                {/* Visual Card Frame */}
                <div className='relative h-[290px] w-full overflow-hidden rounded-xl bg-zinc-50 mb-5 border border-zinc-200/20'>
                  <img
                    src={product.image}
                    alt={product.name}
                    className='w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105 select-none'
                    draggable={false}
                  />

                  {/* Floating Category Tag */}
                  <span className='absolute top-3 left-3 bg-[#FAF9F6]/85 backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] font-bold text-zinc-800 uppercase tracking-widest border border-zinc-200/10 shadow-sm select-none'>
                    {product.category}
                  </span>

                  {/* Hover Action Button */}
                  <div className='absolute bottom-3 right-3 translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 z-10'>
                    <button
                      className='p-3 bg-zinc-950 text-[#FAF9F6] rounded-full hover:bg-brand transition-colors duration-300 shadow-md cursor-pointer'
                      aria-label={`View ${product.name}`}
                    >
                      <Plus className='w-4 h-4 stroke-2' />
                    </button>
                  </div>
                </div>

                {/* Info Details */}
                <div className='px-1 flex flex-col grow text-left justify-between'>
                  <div>
                    <h3 className='font-serif font-normal text-xl text-zinc-950 mb-1 group-hover:text-brand transition-colors duration-300 tracking-tight'>
                      {product.name}
                    </h3>
                    <p className='font-sans text-zinc-400 text-xs font-medium leading-relaxed mb-3'>
                      {product.subtitle}
                    </p>
                  </div>
                  <div className='flex items-center justify-between pt-3 border-t border-zinc-100/60 mt-auto'>
                    <span className='text-[10px] font-heading font-black uppercase tracking-wider text-zinc-400'>
                      Price
                    </span>
                    <span className='text-sm font-semibold text-zinc-950 font-mono'>
                      {product.price}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
