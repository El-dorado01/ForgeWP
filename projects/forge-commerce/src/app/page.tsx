import { useState, useEffect, useRef } from 'react';
import { WpImage } from '@forgewp/react';
import {
  ChevronRight,
  Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import HeroSection from '../components/HeroSection';
import ThreeProductViewer from '../components/ThreeProductViewer';
import CampaignSlider from '../components/CampaignSlider';
import CTASection from '../components/CTASection';
import ProductGridSection from '../components/ProductGridSection';

const CAMPAIGN_SLIDES = [
  {
    id: 1,
    image:
      'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=1600&q=80',
    title: 'Minimalist Wool Series',
    subtitle: 'Look 01',
    description: 'Sourced from organic certified farms, woven in Italy.',
  },
  {
    id: 2,
    image:
      'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=1600&q=80',
    title: 'Structured Tailoring',
    subtitle: 'Look 02',
    description: 'Clean cuts and silhouettes designed for daily elegance.',
  },
  {
    id: 3,
    image: '/sweater_moss_melange.jpg',
    title: 'Ribbed Knit Essentials',
    subtitle: 'Look 03',
    description: 'Extra-fine merino wool knitted for structural insulation.',
  },
  {
    id: 4,
    image:
      'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1600&q=80',
    title: 'Alpine Escape',
    subtitle: 'Look 04',
    description:
      'Heavyweight outerwear built for extreme seasonal transitions.',
  },
  {
    id: 5,
    image:
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80',
    title: 'Urban Utility Scarf',
    subtitle: 'Look 05',
    description: 'Thick textured weave in warm earth-toned campaign colorways.',
  },
];

const BEANIE_VARIANTS = {
  oatmeal: {
    name: 'Oatmeal Ribbed Beanie',
    price: '$65.00',
    description:
      'A classic ribbed beanie knitted from ultra-soft organic cashmere. Features a wide fold-over cuff and an insulating ribbed weave designed for seasonal comfort.',
    colorHex: '#EAE6DF',
    image: '/beanie_oatmeal.jpg',
  },
  forest_sage: {
    name: 'Forest Sage Beanie',
    price: '$65.00',
    description:
      'A muted earthy grey-green cashmere beanie. Spun from organic fibers for lightweight warmth and daily style.',
    colorHex: '#8D9688',
    image: '/beanie_forest_sage.jpg',
  },
  charcoal: {
    name: 'Charcoal Ribbed Beanie',
    price: '$68.00',
    description:
      'Deep charcoal melange rib-knit cashmere. Features heavy insulation and classic outdoor durability built for colder climates.',
    colorHex: '#4C4A48',
    image: '/beanie_charcoal.jpg',
  },
};

const BEANIE_COLORWAYS = Object.fromEntries(
  Object.entries(BEANIE_VARIANTS).map(([key, variant]) => [key, variant.image]),
);

export default function HomePage() {
  const [activeColor, setActiveColor] =
    useState<keyof typeof BEANIE_VARIANTS>('oatmeal');
  const activeColorRef = useRef(activeColor);
  useEffect(() => {
    activeColorRef.current = activeColor;
  }, [activeColor]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let ctx: any;
    Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
    ]).then(([gsapModule, scrollTriggerModule]) => {
      const gsap = gsapModule.default || gsapModule;
      const ScrollTrigger = (scrollTriggerModule as any).ScrollTrigger || (scrollTriggerModule as any).default;
      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        // 1. Product of the Week Section Header/Grid entrance
        gsap.fromTo(
          '.pow-section-header',
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: '.product-of-week-section',
              start: 'top 85%',
              toggleActions: 'play none none none',
            },
          },
        );

        gsap.fromTo(
          '.pow-inner-content',
          { opacity: 0, y: 45 },
          {
            opacity: 1,
            y: 0,
            duration: 1.2,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: '.product-of-week-section',
              start: 'top 75%',
              toggleActions: 'play none none none',
            },
          },
        );

        // 3. Footer columns stagger entrance
        gsap.fromTo(
          '.main-footer-col',
          { opacity: 0, y: 35 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.15,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: 'footer',
              start: 'top 85%',
              toggleActions: 'play none none none',
            },
          },
        );

        // 4. Footer watermark letter-by-letter cascade entrance
        gsap.fromTo(
          'footer h2 span',
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.04,
            ease: 'back.out(1.5)',
            scrollTrigger: {
              trigger: 'footer h2',
              start: 'top 95%',
              toggleActions: 'play none none none',
            },
          },
        );

        // 5. Footer copyright/bottom row fade-in
        gsap.fromTo(
          '.footer-bottom',
          { opacity: 0, y: 15 },
          {
            opacity: 1,
            y: 0,
            duration: 1.0,
            scrollTrigger: {
              trigger: 'footer',
              start: 'top 85%',
              toggleActions: 'play none none none',
            },
          },
        );
      });
    });

    return () => ctx?.revert();
  }, []);

  const currentDetails = BEANIE_VARIANTS[activeColor];

  return (
    <div className='w-full bg-[#fafafa] overflow-x-hidden'>
      {/* ── HERO SECTION (Extracted to component) ── */}
      <HeroSection />

      {/* ── ADDITIONAL SECTIONS FOR SCROLL TESTING ── */}
      <div className='relative z-30 bg-[#fafafa]'>
        {/* Campaign Slider: scroll-pinned, image-first / text-overlay lookbook */}
        <CampaignSlider slides={CAMPAIGN_SLIDES} />

        {/* ── PRODUCT OF THE WEEK SECTION ── */}
        <section className='product-of-week-section min-h-screen py-16 md:py-24 px-6 md:px-12 max-w-7xl mx-auto w-full border-t border-slate-100 flex flex-col justify-center select-none relative overflow-hidden'>
          {/* Section Header */}
          <div className='flex flex-col mb-10 md:mb-14 text-left pow-text-item pow-section-header'>
            <span className='font-mono text-[10px] font-bold text-slate-400 uppercase tracking-widest'>
              Weekly Highlight
            </span>
            <h2 className='text-3xl md:text-4xl font-sans font-normal tracking-wide text-slate-900 mt-2 lowercase'>
              product of the week
            </h2>
          </div>

          {/* Grid Layout */}
          <div className='pow-inner-content grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-center w-full'>
            {/* Left Column: Vertical variant thumbnails + Three.js Canvas */}
            <div className='flex flex-col sm:flex-row items-center sm:items-center gap-4 w-full justify-start'>
              {/* Variant image thumbnails: horizontal below image on mobile, vertical left on sm+ */}
              <div className='flex sm:flex-col gap-2.5 sm:gap-3 pow-text-item shrink-0 order-2 sm:order-1'>
                {Object.entries(BEANIE_VARIANTS).map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => setActiveColor(key as any)}
                    className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer ${
                      activeColor === key
                        ? 'border-[#7C6A58] ring-2 ring-[#7C6A58]/25 scale-105 shadow-sm opacity-100'
                        : 'border-slate-200/80 opacity-60 hover:opacity-100 hover:border-slate-400'
                    }`}
                    title={value.name}
                    aria-label={`Select ${value.name}`}
                  >
                    <WpImage
                      src={value.image}
                      alt={value.name}
                      className='w-full h-full object-cover'
                    />
                  </button>
                ))}
              </div>

              {/* Main Product Viewer Canvas */}
              <div className='w-full max-w-85 sm:max-w-95 aspect-square bg-[#fafafa] rounded-3xl border border-slate-200/40 relative overflow-hidden flex items-center justify-center shadow-xs shrink order-1 sm:order-2'>
                <ThreeProductViewer
                  colorways={BEANIE_COLORWAYS}
                  activeColor={activeColor}
                />
              </div>
            </div>

            {/* Right Column: Product Info & Details */}
            <div className='flex flex-col text-left justify-center max-w-xl lg:max-w-none'>
              <div className='pow-text-item'>
                <span className='font-mono text-[9px] uppercase tracking-widest text-[#A38E7A] font-bold bg-[#A38E7A]/10 px-2.5 py-1 rounded-full'>
                  Boutique Collection
                </span>
              </div>
              <div className='pow-text-item relative'>
                <AnimatePresence mode='popLayout'>
                  <motion.div
                    key={activeColor}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -18 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <h3 className='font-sans text-2xl md:text-3.5xl font-normal tracking-wide text-slate-900 mt-3 leading-tight lowercase'>
                      {currentDetails.name}
                    </h3>
                    <div className='font-mono text-sm md:text-base font-bold text-slate-600 mt-2 uppercase tracking-wider'>
                      {currentDetails.price}
                    </div>
                    <p className='text-slate-600 font-sans text-sm leading-relaxed mt-3'>
                      {currentDetails.description}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className='pow-text-item mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4'>
                <div className='flex items-center gap-6 text-xs text-slate-500 font-heading uppercase tracking-widest'>
                  <span>Sustainably Woven</span>
                  <span className='w-1 h-1 bg-slate-300 rounded-full' />
                  <span>100% Organic Wool</span>
                </div>
                <div className='flex items-center gap-6 text-xs text-slate-500 font-heading uppercase tracking-widest mt-1'>
                  <span>Free Global Shipping</span>
                  <span className='w-1 h-1 bg-slate-300 rounded-full' />
                  <span>Easy Returns</span>
                </div>
              </div>

              {/* Add to Cart CTA */}
              <div className='pow-text-item mt-5'>
                <motion.button
                  onClick={() =>
                    alert(`Added ${currentDetails.name} to Space Bag!`)
                  }
                  whileHover={{
                    scale: 1.015,
                    y: -1,
                    boxShadow:
                      '0 10px 25px -5px rgba(124, 106, 88, 0.4), 0 8px 10px -6px rgba(124, 106, 88, 0.4)',
                  }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  className='group relative overflow-hidden w-full md:w-auto inline-flex items-center justify-center bg-[#7C6A58] hover:bg-[#605143] text-white border border-[#7C6A58] hover:border-[#605143] font-heading font-bold text-xs uppercase tracking-widest px-9 py-3.5 transition-all duration-300 rounded-full shadow-md cursor-pointer'
                >
                  <span className='pointer-events-none absolute top-0 h-full w-1/2 -translate-x-full bg-linear-to-r from-transparent via-white/30 to-transparent -skew-x-12 group-hover:translate-x-[250%] transition-transform duration-800 ease-[cubic-bezier(0.16,1,0.3,1)] z-10' />
                  Add to Space Bag
                  <ChevronRight className='w-4 h-4 ml-1 group-hover:translate-x-1.5 transition-transform' />
                </motion.button>
              </div>
            </div>
          </div>
        </section>

        {/* ── NEW PRODUCTS GRID SECTION (CTA Card 1st + Product Cards) ── */}
        <ProductGridSection />
      </div>

      {/* ── CTA SECTION: Video + Text ── */}
      <CTASection />


      {/* Floating Search Action Button */}
      <button
        className='fixed bottom-6 right-6 md:bottom-8 md:right-8 z-30 bg-white/45 backdrop-blur-xl border border-white/60 text-slate-700 hover:text-primary p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center'
        aria-label='Search'
      >
        <Search className='w-6 h-6 group-hover:rotate-12 transition-transform duration-300' />
      </button>
    </div>
  );
}
