import { useState } from 'react';
import { Link } from '@/components/ui/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Reveal, motion, AnimatePresence } from '@/components/motion/reveal';
import { ButtonLabel } from '@/components/ui/button';
import { WpImage } from '@forgewp/react';

interface MaterialItem {
  id: string;
  num: string;
  name: string;
  category: string;
  description: string;
  provenance: string;
  image: string;
  href: string;
}

const materials: MaterialItem[] = [
  {
    id: 'oak',
    num: '01',
    name: 'FSC-Certified Solid Oak & Walnut',
    category: 'Timber & Joinery',
    description:
      'Harvested from sustainably managed Scandinavian forests, each plank is kiln-dried and finished with organic matte oils to celebrate raw grain variation and enduring structural strength.',
    provenance: 'Småland, Sweden · FSC-C104523',
    image: 'https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=1200&q=85',
    href: '/category/furniture',
  },
  {
    id: 'boucle',
    num: '02',
    name: 'Tactile Italian Wool Bouclé',
    category: 'Textiles & Weaves',
    description:
      'Woven in Biella, Italy using pure virgin wool yarns. Its distinctive looped texture offers superior acoustic absorption, luxurious tactile warmth, and exceptional 60,000 Martindale durability.',
    provenance: 'Biella, Italy · Oeko-Tex Standard 100',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&q=85',
    href: '/category/living',
  },
  {
    id: 'travertine',
    num: '03',
    name: 'Honed Roman Travertine & Stone',
    category: 'Natural Minerals',
    description:
      'Cut from historic quarries in Tivoli, every slab is precision water-jet profiled and hand-honed to preserve natural sedimentation pores while resisting daily living.',
    provenance: 'Tivoli, Italy · Class A Natural Stone',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=85',
    href: '/category/decor',
  },
  {
    id: 'aluminum',
    num: '04',
    name: 'Brushed Anodized Aluminum & Brass',
    category: 'Architectural Metals',
    description:
      'Recycled aerospace-grade alloy cold-formed and hand-finished with an ultra-thin satin anodized barrier for corrosion resistance and soft, non-glare ambient reflection.',
    provenance: 'Bavaria, Germany · 100% Circular Alloy',
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=1200&q=85',
    href: '/category/lighting',
  },
];

export function MaterialityAccordion() {
  const [activeId, setActiveId] = useState<string>('oak');
  const activeMaterial = materials.find((m) => m.id === activeId) || materials[0];

  return (
    <section className="section-y bg-[#ebe7df] border-t border-border/70">
      <div className="container-wide">
        {/* Section Header with Editorial Index */}
        <Reveal className="mb-8 md:mb-14 flex flex-col sm:flex-row sm:items-end justify-between gap-4 md:gap-6 border-b border-border/80 pb-5 md:pb-6">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 font-mono text-[11px] sm:text-xs uppercase tracking-wider sm:tracking-widest text-ink-muted mb-2">
              <span>(04) // Materiality & Craft</span>
              <span className="text-ink/40">·</span>
              <span className="text-sage-deep font-semibold">Provenance Archives</span>
            </div>
            <h2 className="display-section text-ink">
              <span className="relative inline-block">
                <span className="relative z-10 text-ink font-semibold">Material honesty in every piece</span>
                <span
                  aria-hidden
                  className="absolute inset-0 bg-[#dbe6d7] rounded-none z-0"
                />
              </span>
            </h2>
          </div>
          <p className="max-w-md text-xs sm:text-sm md:text-base text-ink-muted font-light leading-relaxed">
            We source only renewable hardwoods, natural wools, and circular minerals —
            designed to patina with grace over decades of daily use.
          </p>
        </Reveal>

        {/* 2-Column Accordion Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-stretch">
          {/* Left Column: Interactive Material Tabs */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-3">
            <div className="divide-y divide-border/80 border-y border-border/80">
              {materials.map((item) => {
                const isActive = item.id === activeId;
                return (
                  <div
                    key={item.id}
                    className="py-5 md:py-6 transition-colors duration-300 cursor-pointer group"
                    onMouseEnter={() => setActiveId(item.id)}
                    onClick={() => setActiveId(item.id)}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-baseline gap-4">
                        <span className="font-mono text-xs md:text-sm text-ink-muted">
                          {item.num}
                        </span>
                        <h3
                          className={`font-heading text-xl md:text-2xl lg:text-[1.65rem] font-medium tracking-tight transition-colors duration-300 ${
                            isActive ? 'text-ink font-semibold' : 'text-ink/60 group-hover:text-ink'
                          }`}
                        >
                          {item.name}
                        </h3>
                      </div>
                      <span
                        className={`font-mono text-xs uppercase tracking-widest shrink-0 transition-transform duration-300 ${
                          isActive ? 'rotate-90 text-sage-deep' : 'text-ink/40 group-hover:text-ink'
                        }`}
                      >
                        [➔]
                      </span>
                    </div>

                    {/* Expandable Material Narrative */}
                    <AnimatePresence initial={false}>
                      {isActive && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="pt-4 pl-8 md:pl-10 space-y-4">
                            <p className="text-sm md:text-base text-ink/80 font-light leading-relaxed max-w-lg">
                              {item.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-ink-muted">
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-stone px-3 py-1 text-ink font-semibold">
                                <Sparkles className="h-3 w-3 text-sage-deep" />
                                {item.provenance}
                              </span>
                              <span className="text-ink/60">·</span>
                              <span>Category: {item.category}</span>
                            </div>
                            <div className="pt-2">
                              <Link
                                href={item.href}
                                className="group/btn inline-flex items-center gap-2.5 font-heading text-xs md:text-sm uppercase tracking-wider font-semibold text-ink hover:text-sage-deep transition-colors"
                              >
                                <ButtonLabel mode="slide">Explore {item.category}</ButtonLabel>
                                <span className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center overflow-hidden">
                                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-4" />
                                  <ArrowRight className="absolute inset-0 h-3.5 w-3.5 -translate-x-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-0" />
                                </span>
                              </Link>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* Bottom Catalog Action */}
            <div className="pt-6 flex items-center justify-between">
              <p className="text-xs md:text-sm font-mono text-ink-muted">
                (ARCHIVE 2026) · 100% RECYCLABLE PACKAGING
              </p>
              <Link
                href="/shop"
                className="font-heading text-xs uppercase tracking-wider font-semibold text-ink underline underline-offset-4 hover:text-sage-deep transition-colors"
              >
                View all specifications ↗
              </Link>
            </div>
          </div>

          {/* Right Column: High-Res Dynamic Material Crossfade Photography */}
          <div className="lg:col-span-6 relative min-h-[420px] lg:min-h-[540px] overflow-hidden bg-stone">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeMaterial.id}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 h-full w-full"
              >
                <WpImage
                  src={activeMaterial.image}
                  alt={activeMaterial.name}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent" />

                {/* Overlaid Material Badge */}
                <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 flex flex-wrap sm:flex-nowrap items-end justify-between gap-3 text-cream">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[10px] sm:text-xs uppercase tracking-widest text-cream/70">
                      Active Material Spec
                    </p>
                    <p className="font-heading text-base sm:text-lg md:text-xl font-medium mt-0.5 truncate">
                      {activeMaterial.name}
                    </p>
                  </div>
                  <Link
                    href={activeMaterial.href}
                    className="inline-flex items-center gap-2 rounded-full bg-cream/20 backdrop-blur-md px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-heading uppercase tracking-wider text-cream hover:bg-cream hover:text-ink transition-colors shrink-0 whitespace-nowrap"
                  >
                    <span>Shop items</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
