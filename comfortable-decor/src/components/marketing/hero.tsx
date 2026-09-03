import { Link } from '@/components/ui/link';
import { ArrowRight } from 'lucide-react';
import { Button, ButtonLabel } from '@/components/ui/button';
import {
  HeroMotion,
  HeroItem,
  motion,
  useReducedMotion,
} from '@/components/motion/reveal';
import { ProductHotspot } from '@/components/product/product-hotspot';
import { getProductBySlug } from '@/data/products';
import { WpImage } from '@forgewp/react';

export function Hero() {
  const reduce = useReducedMotion();
  const featuredProduct = getProductBySlug('about-a-chair-aa51') || {
    id: 1,
    slug: 'about-a-chair-aa51',
    name: 'About A Chair AA51',
    price: 276,
    currency: 'USD',
    images: ['https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=1000&q=85'],
    category: 'Furniture',
    categorySlug: 'furniture',
    inStock: true,
    description: 'Moulded polypropylene shell with solid oak legs.',
  };

  return (
    <section className="relative bg-cream overflow-hidden border-b border-border/40">
      <div className="container-wide">
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[min(94vh,900px)] items-center gap-10 lg:gap-8 py-12 lg:py-6">
          {/* Left Column: Editorial Headline & Actions */}
          <HeroMotion className="lg:col-span-5 relative z-10">
            <HeroItem>
              <div className="flex items-center gap-2 mb-4 md:mb-5">
                <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  #SA25–26
                </span>
                <span className="h-1 w-1 rounded-full bg-border" />
                <span className="text-xs uppercase tracking-wider text-sage-deep font-semibold">
                  Curated Living
                </span>
              </div>
            </HeroItem>

            <HeroItem>
              <h1 className="display-hero text-ink relative">
                Sweet home
                <br />
                collection.
                <span className="inline-block ml-2 text-sage-deep animate-pulse text-2xl align-super">
                  ✦
                </span>
              </h1>
            </HeroItem>

            <HeroItem>
              <p className="mt-5 md:mt-6 max-w-md text-body-lg text-ink/80 font-light">
                Discover contemporary design perfectly tailored to meet the
                needs of the discerning homeowner.
              </p>
            </HeroItem>

            <HeroItem>
              <div className="mt-8 md:mt-10 flex flex-wrap items-center gap-4">
                {/* Black CTA: Go Shopping with rolling cube text and dual sliding arrow */}
                <Button
                  asChild
                  size="xl"
                  shape="pill"
                  className="bg-ink text-cream hover:bg-ink/90 shadow-lg px-7"
                >
                  <Link href="/shop" className="group/btn inline-flex items-center justify-center gap-2.5">
                    <ButtonLabel mode="slide">Go shopping</ButtonLabel>
                    <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden">
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-5" />
                      <ArrowRight className="absolute inset-0 h-4 w-4 -translate-x-5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-0" />
                    </span>
                  </Link>
                </Button>

                {/* Secondary CTA: Explore Viewbook with rolling text animation and sliding arrow */}
                {/* <Button
                  asChild
                  variant="outline"
                  size="xl"
                  shape="pill"
                  className="border-ink/30 text-ink hover:border-ink px-7 bg-transparent"
                >
                  <Link href="/category/furniture" className="group/btn inline-flex items-center gap-2.5">
                    <ButtonLabel mode="slide">Explore Viewbook</ButtonLabel>
                    <span className="relative flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden">
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-5" />
                      <ArrowRight className="absolute inset-0 h-4 w-4 -translate-x-5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-0" />
                    </span>
                  </Link>
                </Button> */}
              </div>
            </HeroItem>
          </HeroMotion>

          {/* Right Column: Increased Height High-Res Warm Interior Scene + Interactive Product Hotspot */}
          <div className="lg:col-span-7 relative">
            <motion.div
              className="relative aspect-[3/4] sm:aspect-[4/3] lg:aspect-auto lg:h-[min(88vh,860px)] overflow-hidden bg-stone shadow-sm"
              initial={reduce ? undefined : { opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            >
              <WpImage
                src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1600&q=85"
                alt="Warm contemporary dining and living showroom interior"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-105"
              />

              {/* Interactive Radar Hotspot on the chair */}
              <ProductHotspot
                product={featuredProduct as any}
                top="72%"
                left="78%"
                mobileTop="60%"
                mobileLeft="50%"
                label="Hay About"
                defaultOpen={true}
              />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
