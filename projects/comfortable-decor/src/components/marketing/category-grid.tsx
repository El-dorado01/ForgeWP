import { Link } from '@/components/ui/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import {
  Reveal,
  Stagger,
  StaggerItem,
  fadeUpSoft,
} from '@/components/motion/reveal';
import { ButtonLabel } from '@/components/ui/button';
import { TiltCard } from '@/components/motion/tilt-card';
import { WpImage } from '@forgewp/react';

const tiles = [
  {
    type: 'category',
    href: '/category/furniture',
    title: 'Furniture',
    body: 'From lounge seating to handcrafted dining tables, explore pieces designed to anchor your living space with a timeless sense.',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1000&q=85',
  },
  {
    type: 'category',
    href: '/category/lighting',
    title: 'Lighting',
    body: 'Discover a collection of pendants and lamps crafted to transform the mood and character of every room in your home.',
    image: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=1000&q=85',
  },
  {
    type: 'editorial',
    href: '/shop',
    title: 'Blue & white with an earthy twist',
    body: 'Muted tones and organic silhouettes crafted to bring harmony to your space.',
    cta: 'Go shopping',
    bg: 'bg-[#293d39] text-cream',
  },
  {
    type: 'category',
    href: '/category/outdoor',
    title: 'Outdoor',
    body: 'With a vivid palette and climate-proof finishes, our collection anchors your exterior spaces in refined Nordic comfort.',
    image: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=1000&q=85',
  },
  {
    type: 'category',
    href: '/category/storage',
    title: 'Storage',
    body: 'Exploring the essential elements with a series of wood-crafted systems that prioritize clean lines and structural clarity.',
    image: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=1000&q=85',
  },
  {
    type: 'category',
    href: '/shop?sort=sale',
    title: 'Weekly highlights. Up to 50% off',
    body: 'Reflecting on the best of this season’s archive with significant price adjustments.',
    image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1000&q=85',
  },
];

export function CategoryGrid() {
  return (
    <section className="section-y">
      <div className="container-wide">
        <Reveal className="mb-8 md:mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/80 pb-5 md:pb-6">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 font-mono text-[11px] sm:text-xs uppercase tracking-wider sm:tracking-widest text-ink-muted mb-2">
              <span>(01) // Collection Atlas</span>
              <span className="text-ink/40">·</span>
              <span className="text-sage-deep font-semibold">Living Modules</span>
            </div>
            <h2 className="display-section text-ink font-semibold">Popular categories</h2>
          </div>
          <p className="font-mono text-[11px] sm:text-xs text-ink-muted shrink-0">
            (06 CATEGORIES) · 2026 ARCHIVE
          </p>
        </Reveal>

        <Stagger
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6"
          stagger={0.06}
        >
          {tiles.map((tile) => (
            <StaggerItem key={tile.title} variants={fadeUpSoft}>
              <TiltCard maxTilt={4} className="h-full">
                {tile.type === 'category' ? (
                  <Link
                    href={tile.href}
                    className="group relative flex h-full min-h-[400px] md:min-h-[460px] flex-col justify-between overflow-hidden p-7 md:p-8 bg-stone block"
                  >
                    <WpImage
                      src={tile.image}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-108"
                      loading="lazy"
                    />
                    {/* Dual-direction gradient ensuring ultra-high text readability at top and bottom */}
                    <div className="absolute inset-0 bg-gradient-to-b from-ink/85 via-ink/40 to-ink/90 transition-opacity duration-500 group-hover:from-ink/90 group-hover:to-ink/95" />

                    {/* Top Content: Title and Description with bold high-contrast styling */}
                    <div className="relative z-10 text-white">
                      <h3 className="font-heading text-2xl md:text-[1.85rem] font-semibold text-white tracking-tight drop-shadow-xs">
                        {tile.title}
                      </h3>
                      <p className="mt-2.5 text-sm md:text-[0.9375rem] text-cream/90 line-clamp-3 font-normal leading-relaxed">
                        {tile.body}
                      </p>
                    </div>

                    {/* Bottom Action: Slanted Arrow Rotating to the Right on Hover */}
                    <div className="relative z-10 pt-6">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-cream/25 text-white backdrop-blur-md transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:bg-cream group-hover:text-ink group-hover:scale-105">
                        <ArrowUpRight className="h-5 w-5 transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-45" />
                      </span>
                    </div>
                  </Link>
                ) : (
                  <Link
                    href={tile.href}
                    className={`relative flex h-full min-h-[400px] md:min-h-[460px] flex-col justify-between overflow-hidden p-7 md:p-8 block ${tile.bg}`}
                  >
                    {/* Top Content: Title and Description with bold high-contrast styling */}
                    <div className="relative z-10">
                      <h3 className="font-heading text-2xl md:text-[1.85rem] font-semibold text-white tracking-tight leading-tight">
                        {tile.title}
                      </h3>
                      <p className="mt-2.5 text-sm md:text-[0.9375rem] text-cream/90 leading-relaxed font-normal">
                        {tile.body}
                      </p>
                    </div>

                    {/* Bottom Action: CTA button with slide animation ONLY on button hover */}
                    <div className="relative z-10 pt-6">
                      <span className="group/btn inline-flex items-center gap-2.5 rounded-full bg-cream text-ink px-6 py-3 font-heading text-sm uppercase tracking-wider font-semibold shadow-md transition-all duration-300 hover:bg-white hover:shadow-lg">
                        <ButtonLabel mode="slide">{tile.cta}</ButtonLabel>
                        <span className="relative flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden">
                          <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-5" />
                          <ArrowRight className="absolute inset-0 h-4 w-4 -translate-x-5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-0" />
                        </span>
                      </span>
                    </div>
                  </Link>
                )}
              </TiltCard>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
