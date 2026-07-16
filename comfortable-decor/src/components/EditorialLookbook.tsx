import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, MoveRight } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from './ui/carousel';

import accentsImg from '../assets/category_accents.png';
import lightingImg from '../assets/category_lighting.png';
import seatingImg from '../assets/category_seating.png';
import textilesImg from '../assets/category_textiles.png';

interface Product {
  name: string;
  price: string;
  category: string;
}

interface LookbookSlide {
  id: string;
  title: string;
  category: string;
  description: string;
  image: string;
  products: Product[];
}

const LOOKBOOK_SLIDES: LookbookSlide[] = [
  {
    id: '01',
    title: 'The Reading Alcove',
    category: 'Seating',
    description: 'An ergonomic minimalist chair upholstered in organic linen, paired with warm lighting to create a quiet, tactile reading corner.',
    image: seatingImg,
    products: [
      { name: 'Ergonomic Linen Armchair', price: '$820', category: 'Seating' },
      { name: 'Solid Oak Side Table', price: '$290', category: 'Tables' }
    ]
  },
  {
    id: '02',
    title: 'Architectural Glow',
    category: 'Lighting',
    description: 'A sculptural brass floor lamp casting warm, indirect light against textured plaster walls, creating depth and quiet harmony.',
    image: lightingImg,
    products: [
      { name: 'Sculptural Brass Floor Lamp', price: '$480', category: 'Lighting' },
      { name: 'Ceramic Matte Table Lamp', price: '$220', category: 'Lighting' }
    ]
  },
  {
    id: '03',
    title: 'Tactile Layers',
    category: 'Textiles',
    description: 'Handcrafted organic wool throws and cushions with subtle variations in texture, bringing warmth and comfort to neutral spaces.',
    image: textilesImg,
    products: [
      { name: 'Waffle Knit Wool Throw', price: '$180', category: 'Textiles' },
      { name: 'Bouclé Linen Cushion Cover', price: '$85', category: 'Cushions' }
    ]
  },
  {
    id: '04',
    title: 'Quiet Curations',
    category: 'Accents',
    description: 'A collection of matte organic stoneware and hand-formed ceramic vessels arranged in an asymmetrical, sculptural balance.',
    image: accentsImg,
    products: [
      { name: 'Matte Stoneware Vase Set', price: '$140', category: 'Ceramics' },
      { name: 'Hand-formed Accent Tray', price: '$95', category: 'Accessories' }
    ]
  }
];

export default function EditorialLookbook() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(1);
  const [count, setCount] = useState(LOOKBOOK_SLIDES.length);
  const [isHovered, setIsHovered] = useState(false);

  // Sync scroll selections with left-pane state indicators
  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  // Autoplay hook with pause-on-hover logic
  useEffect(() => {
    if (!api || isHovered) return;

    const interval = setInterval(() => {
      api.scrollNext();
    }, 5000);

    return () => clearInterval(interval);
  }, [api, isHovered]);

  return (
    <section id='lookbook' className='w-full bg-[#FAF9F6] py-24 px-6 md:px-12 border-t border-zinc-100/40 relative overflow-hidden'>
      {/* Dynamic Background Accents */}
      <div className='absolute -top-40 -left-40 w-96 h-96 bg-[#4A5D4E]/5 rounded-full blur-3xl pointer-events-none' />
      <div className='absolute -bottom-40 -right-40 w-96 h-96 bg-brand/5 rounded-full blur-3xl pointer-events-none' />

      <div className='max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start'>
        {/* ── LEFT PANE: Sticky Editorial Intro & Custom Controls (4 cols) ── */}
        <motion.div
          className='lg:col-span-4 flex flex-col justify-between h-auto lg:h-[460px] lg:sticky lg:top-32 z-10'
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 1.6, ease: [0.215, 0.61, 0.355, 1] }}
        >
          <div>
            <span className='font-heading font-black tracking-widest text-xs uppercase text-brand/80 block mb-3 select-none'>
              Lookbook / Collection 01
            </span>
            <h2 className='font-serif font-normal text-3xl md:text-4xl lg:text-5xl text-zinc-950 leading-tight tracking-tight'>
              Quiet Spaces,<br />Pure Forms.
            </h2>
            <p className='font-sans text-zinc-500 font-medium leading-relaxed max-w-sm text-sm md:text-base mt-5'>
              A visual essay on modern comfort, exploring the interface between raw architectural structures and refined, tactile interior accents.
            </p>
          </div>

          {/* Navigation controls & Progress bar */}
          <div className='mt-10 lg:mt-0 flex flex-col gap-6'>
            {/* Slide Index Counter & Indicators */}
            <div className='flex items-center gap-6'>
              <div className='font-heading font-bold text-sm tracking-widest text-zinc-800 flex items-baseline gap-1 select-none'>
                <span className='text-lg font-black text-brand'>0{current}</span>
                <span className='text-zinc-400'>/</span>
                <span className='text-zinc-400 text-xs'>0{count}</span>
              </div>

              {/* Progress Line */}
              <div className='w-32 h-[2px] bg-zinc-200/60 relative overflow-hidden rounded-full'>
                <motion.div
                  className='absolute top-0 left-0 h-full bg-brand rounded-full'
                  initial={{ width: '25%' }}
                  animate={{ width: `${(current / count) * 100}%` }}
                  transition={{ duration: 0.5, ease: [0.215, 0.61, 0.355, 1] }}
                />
              </div>
            </div>

            {/* Custom Minimalist Navigation Buttons */}
            <div className='flex items-center gap-3'>
              <button
                onClick={() => api?.scrollPrev()}
                className='p-3 border border-zinc-200 rounded-full hover:bg-zinc-900 hover:text-[#FAF9F6] hover:border-zinc-900 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 disabled:hover:border-zinc-200 transition-all duration-300 cursor-pointer text-zinc-600'
                aria-label='Previous slide'
              >
                <ArrowLeft className='w-4 h-4 stroke-2' />
              </button>
              <button
                onClick={() => api?.scrollNext()}
                className='p-3 border border-zinc-200 rounded-full hover:bg-zinc-900 hover:text-[#FAF9F6] hover:border-zinc-900 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 disabled:hover:border-zinc-200 transition-all duration-300 cursor-pointer text-zinc-600'
                aria-label='Next slide'
              >
                <ArrowRight className='w-4 h-4 stroke-2' />
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── RIGHT PANE: Horizontal Embla Carousel (8 cols) ── */}
        <motion.div
          className='lg:col-span-8 w-full'
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 1.6, delay: 0.3, ease: [0.215, 0.61, 0.355, 1] }}
        >
          <Carousel
            setApi={setApi}
            opts={{ loop: true, align: 'start' }}
            className='w-full'
          >
            <CarouselContent className='-ml-6 md:-ml-8'>
              {LOOKBOOK_SLIDES.map((slide) => (
                <CarouselItem
                  key={slide.id}
                  className='pl-6 md:pl-8 basis-full sm:basis-[85%] md:basis-[72%]'
                >
                  <div className='flex flex-col group'>
                    {/* Visual Card Frame */}
                    <div className='relative aspect-4/3 w-full overflow-hidden rounded-2xl bg-zinc-100 shadow-sm border border-zinc-200/30 cursor-grab active:cursor-grabbing mb-6'>
                      <img
                        src={slide.image}
                        alt={slide.title}
                        className='w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105 select-none'
                        draggable={false}
                      />
                      {/* Floating Category Tag */}
                      <span className='absolute top-4 left-4 bg-[#FAF9F6]/85 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-zinc-800 uppercase tracking-widest border border-zinc-200/20 shadow-sm select-none'>
                        {slide.category}
                      </span>
                    </div>

                    {/* Editorial Details & Content */}
                    <div className='px-1'>
                      <span className='font-heading font-black tracking-widest text-[10px] uppercase text-brand block mb-2 select-none'>
                        Scene 0{slide.id} — Curation
                      </span>
                      <h3 className='font-serif font-normal text-2xl text-zinc-950 mb-3 tracking-tight'>
                        {slide.title}
                      </h3>
                      <p className='font-sans text-zinc-500 text-sm leading-relaxed max-w-xl mb-4'>
                        {slide.description}
                      </p>
                      <a
                        href='#'
                        onClick={(e) => e.preventDefault()}
                        className='inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-brand hover:text-zinc-950 transition-colors duration-300 mb-6 select-none cursor-pointer group/link'
                      >
                        Shop {slide.category} Collection
                        <MoveRight className='w-3.5 h-3.5 transform group-hover/link:translate-x-1 transition-transform duration-300' />
                      </a>

                      {/* Featured Objects Underline Grid */}
                      <div className='border-t border-zinc-200/60 pt-4'>
                        <span className='font-heading font-bold tracking-widest text-[9px] uppercase text-zinc-400 block mb-3 select-none'>
                          Featured Objects
                        </span>
                        <div className='flex flex-col sm:flex-row gap-4 sm:gap-8'>
                          {slide.products.map((prod, index) => (
                            <div
                              key={index}
                              className='flex items-center justify-between sm:justify-start gap-4 flex-1 pb-3 sm:pb-0 border-b border-zinc-100/50 sm:border-none'
                            >
                              <div className='flex flex-col'>
                                <span className='text-xs font-heading font-medium text-zinc-800 hover:text-brand transition-colors duration-300 cursor-pointer'>
                                  {prod.name}
                                </span>
                                <span className='text-[10px] text-zinc-400 font-mono mt-0.5'>
                                  {prod.category}
                                </span>
                              </div>
                              <span className='text-xs font-semibold text-zinc-950 font-mono'>
                                {prod.price}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </motion.div>
      </div>
    </section>
  );
}
