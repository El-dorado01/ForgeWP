import { Link } from '@/components/ui/link';
import { ArrowRight } from 'lucide-react';
import type { Product } from '@/types';
import { ProductCard } from '@/components/product/product-card';
import { Reveal } from '@/components/motion/reveal';
import { ButtonLabel } from '@/components/ui/button';
import { TiltCard } from '@/components/motion/tilt-card';
import { WpImage } from '@forgewp/react';

type PickedCollectionProps = {
  products: Product[];
};

export function PickedCollection({ products }: PickedCollectionProps) {
  const row1Products = products.slice(0, 2);
  const row2Products = products.slice(2, 5);

  return (
    <section className="section-y bg-[#f4f1ea] border-y border-border/60">
      <div className="container-wide">
        <Reveal className="mb-8 md:mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/80 pb-5 md:pb-6">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 font-mono text-[11px] sm:text-xs uppercase tracking-wider sm:tracking-widest text-ink-muted mb-2">
              <span>(03) // Curated Living Archive</span>
              <span className="text-ink/40">·</span>
              <span className="text-sage-deep font-semibold">Bespoke Compositions</span>
            </div>
            <h2 className="display-section text-ink font-semibold">Picked up collection</h2>
          </div>
          <p className="font-mono text-[11px] sm:text-xs text-ink-muted shrink-0">
            (08 EDITIONS) · VOL. XIX
          </p>
        </Reveal>

        {/* Row 1: [2-col Wide Moodboard Promo] + [Product Card 1] + [Product Card 2] */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6 mb-6 items-stretch">
          <div className="sm:col-span-2">
            <TiltCard maxTilt={4} className="h-full">
              <Link
                href="/shop"
                className="group relative flex h-full min-h-[400px] md:min-h-[460px] flex-col justify-between overflow-hidden p-7 sm:p-8 md:p-10 bg-stone block"
              >
                <WpImage
                  src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1400&q=85"
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                  loading="lazy"
                />
                {/* High contrast gradient overlay for top and bottom elements */}
                <div className="absolute inset-0 bg-gradient-to-b from-ink/85 via-ink/40 to-ink/90" />

                {/* Top Content: Title and Description */}
                <div className="relative z-10 text-white max-w-md">
                  <h3 className="font-heading text-3xl md:text-4xl font-semibold text-white tracking-tight leading-tight drop-shadow-xs">
                    Explore our
                    <br />
                    new designs
                  </h3>
                  <p className="mt-3.5 text-sm md:text-base text-cream/90 font-normal leading-relaxed">
                    Choose from endless models, materials and colors to configure
                    your perfect seating with our architectural guide.
                  </p>
                </div>

                {/* Bottom Action: CTA button with slide physics ONLY on button hover */}
                <div className="relative z-10 pt-8">
                  <span className="group/btn inline-flex items-center gap-2.5 rounded-full bg-cream text-ink px-6 py-3 font-heading text-sm uppercase tracking-wider font-semibold shadow-md transition-all duration-300 hover:bg-white hover:shadow-lg">
                    <ButtonLabel mode="slide">Explore More</ButtonLabel>
                    <span className="relative flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden">
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-5" />
                      <ArrowRight className="absolute inset-0 h-4 w-4 -translate-x-5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-0" />
                    </span>
                  </span>
                </div>
              </Link>
            </TiltCard>
          </div>

          {row1Products.map((product) => (
            <div key={product.id} className="h-full">
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        {/* Row 2: [Product Card 3] + [Product Card 4] + [Product Card 5] + [1-col Design Plan Promo] */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6 items-stretch">
          {row2Products.map((product) => (
            <div key={product.id} className="h-full">
              <ProductCard product={product} />
            </div>
          ))}

          <div>
            <TiltCard maxTilt={4} className="h-full">
              <Link
                href="/account"
                className="group relative flex h-full min-h-[400px] md:min-h-[460px] flex-col justify-between overflow-hidden p-6 sm:p-7 md:p-8 bg-[#2a2826] block"
              >
                <WpImage
                  src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1000&q=85"
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-60 transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-108"
                  loading="lazy"
                />
                {/* High contrast gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-ink/90 via-ink/50 to-ink/95" />

                {/* Top Content: Title and Description */}
                <div className="relative z-10 text-white">
                  <h3 className="font-heading text-2xl md:text-3xl font-semibold text-white leading-tight tracking-tight drop-shadow-xs">
                    Get a free
                    <br />
                    design plan.
                  </h3>
                  <p className="mt-3.5 text-sm md:text-base text-cream/90 font-normal leading-relaxed">
                    Start your space project with a complimentary architectural floor plan.
                  </p>
                </div>

                {/* Bottom Action: CTA button with slide physics ONLY on button hover */}
                <div className="relative z-10 pt-8">
                  <span className="group/btn inline-flex items-center gap-2 rounded-full bg-cream text-ink px-4.5 py-2.5 sm:px-5 sm:py-3 font-heading text-xs sm:text-sm uppercase tracking-wider font-semibold shadow-md transition-all duration-300 hover:bg-white hover:shadow-lg whitespace-nowrap">
                    <ButtonLabel mode="slide">Download Free Plan</ButtonLabel>
                    <span className="relative flex h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 items-center justify-center overflow-hidden">
                      <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-5" />
                      <ArrowRight className="absolute inset-0 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-x-5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-0" />
                    </span>
                  </span>
                </div>
              </Link>
            </TiltCard>
          </div>
        </div>
      </div>
    </section>
  );
}
