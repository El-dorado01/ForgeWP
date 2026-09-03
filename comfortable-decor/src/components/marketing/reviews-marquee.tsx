import * as React from 'react';
import { Link } from '@/components/ui/link';
import { ArrowRight, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Marquee } from '@/components/ui/marquee';
import { ButtonLabel } from '@/components/ui/button';
import { WpImage } from '@forgewp/react';

const testimonials = [
  {
    id: 1,
    quote:
      'The simple, elegant design is an absolute masterpiece — it anchors the room perfectly. Exceptional craftsmanship and a truly curated shopping experience.',
    author: 'Regina Sagana',
    location: 'US • Jan 20, 2025',
    rating: 5,
  },
  {
    id: 2,
    quote:
      'The attention to detail and material honesty in their furniture is extraordinary. The dining set has become the emotional center of our home.',
    author: 'Colin Lucido',
    location: 'FR • Dec 14, 2024',
    rating: 5,
  },
  {
    id: 3,
    quote:
      'Timeless proportions, sustainably sourced oak, and the smoothest delivery logistics. They redefine what modern comfort and longevity feel like.',
    author: 'Matteo Vance',
    location: 'IT • Feb 02, 2025',
    rating: 5,
  },
];

const brandPartners = [
  'Cassina',
  'B&B Italia',
  'Flos',
  'Vitra',
  'Hay',
  'Artek',
  'Muuto',
  'Fritz Hansen',
  'Menu Space',
  'Gubi',
];

export function ReviewsMarquee() {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [direction, setDirection] = React.useState<1 | -1>(1);
  const current = testimonials[currentIndex];

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section className="section-y !pb-0 bg-cream">
      <div className="container-wide mb-14 md:mb-18">
        <div className="mb-8 md:mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/80 pb-5 md:pb-6">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 font-mono text-[11px] sm:text-xs uppercase tracking-wider sm:tracking-widest text-ink-muted mb-2">
              <span>(06) // Accreditations & Trust</span>
              <span className="text-ink/40">·</span>
              <span className="text-sage-deep font-semibold">4.9 / 5.0 Rating</span>
            </div>
            <h2 className="display-section text-ink font-semibold">Client reflections</h2>
          </div>
          <p className="font-mono text-[11px] sm:text-xs text-ink-muted shrink-0">
            TRUSTPILOT VERIFIED REVIEWS
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-stretch">
          {/* Left: Pistachio Testimonial Card */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-[#d2dbcc] p-8 md:p-12 lg:p-14 min-h-[440px]">
            <div>
              {/* Badges & Trustpilot Stars */}
              <div className="flex items-center gap-2 mb-6">
                <span className="rounded-full bg-[#00b67a] px-3 py-1 font-heading text-xs font-semibold text-white">
                  Trustpilot
                </span>
                <span className="rounded-full border border-ink/30 px-3 py-1 font-heading text-xs font-semibold text-ink">
                  Design
                </span>
                <span className="ml-auto font-mono text-xs text-ink/70">
                  {currentIndex + 1} / {testimonials.length}
                </span>
              </div>

              {/* Smooth Animated Review Transition Container */}
              <div className="relative min-h-[220px] overflow-hidden">
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={current.id}
                    custom={direction}
                    initial={{ opacity: 0, x: direction * 28 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: direction * -28 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="flex items-center gap-1.5 text-[#00b67a] mb-5">
                      {[...Array(current.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-current" />
                      ))}
                    </div>

                    <blockquote className="font-heading text-xl md:text-2xl font-medium leading-snug tracking-tight text-ink">
                      “{current.quote}”
                    </blockquote>

                    <footer className="mt-6">
                      <p className="font-heading text-base md:text-lg font-semibold text-ink">
                        {current.author}
                      </p>
                      <p className="text-sm text-ink/75 font-mono mt-0.5">
                        {current.location}
                      </p>
                    </footer>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Carousel Controls & CTA */}
            <div className="mt-8 pt-6 border-t border-ink/15 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/30 text-ink transition-colors hover:bg-ink hover:text-cream active:scale-95"
                  aria-label="Previous review"
                >
                  <ChevronLeft className="h-4.5 w-4.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/30 text-ink transition-colors hover:bg-ink hover:text-cream active:scale-95"
                  aria-label="Next review"
                >
                  <ChevronRight className="h-4.5 w-4.5" />
                </button>
              </div>

              <Link
                href="/about"
                className="group/btn inline-flex items-center gap-2.5 rounded-full bg-ink px-6 py-3 font-heading text-sm uppercase tracking-wider font-semibold text-cream shadow-md transition-colors hover:bg-ink/90"
              >
                <ButtonLabel mode="slide">More reviews</ButtonLabel>
                <span className="relative flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden">
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-5" />
                  <ArrowRight className="absolute inset-0 h-4 w-4 -translate-x-5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-0" />
                </span>
              </Link>
            </div>
          </div>

          {/* Right: Architectural Atmosphere Image */}
          <div className="lg:col-span-7 relative min-h-[380px] lg:min-h-[440px] overflow-hidden bg-stone">
            <WpImage
              src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1400&q=85"
              alt="Comfortable decor architectural living room"
              className="h-full w-full object-cover transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between text-cream">
              <div>
                <p className="font-heading text-sm uppercase tracking-wider font-semibold">
                  Villa Rosa • Lake Como
                </p>
                <p className="font-mono text-xs text-cream/80 mt-0.5">
                  Spatial Project 2025
                </p>
              </div>
              <span className="rounded-full bg-cream/20 px-3.5 py-1 font-mono text-xs font-medium text-cream backdrop-blur-md">
                Verified Space
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Full-width Brand Signature Marquee */}
      <div className="border-y border-border/80 bg-cream/60 py-7">
        <Marquee speed={32} pauseOnHover>
          {brandPartners.map((brand, i) => (
            <span
              key={`${brand}-${i}`}
              className="mx-8 font-heading text-lg md:text-xl font-bold tracking-wider text-ink/35 transition-colors duration-300 hover:text-ink select-none"
            >
              {brand}
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
