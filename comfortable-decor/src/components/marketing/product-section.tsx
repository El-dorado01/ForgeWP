import { Link } from '@/components/ui/link';
import { ArrowRight } from 'lucide-react';
import type { Product } from '@/types';
import { ProductCard } from '@/components/product/product-card';
import { Reveal } from '@/components/motion/reveal';
import { ButtonLabel } from '@/components/ui/button';
import { TiltCard } from '@/components/motion/tilt-card';
import { cn } from '@/lib/utils';

type ProductSectionProps = {
  title: string;
  subtitle?: string;
  products: Product[];
  href?: string;
  linkLabel?: string;
  sidePromo?: {
    title: string;
    body: string;
    href: string;
    cta: string;
    image?: string;
    tone?: 'ochre' | 'sage' | 'blush' | 'dark';
  };
  className?: string;
};

export function ProductSection({
  title,
  subtitle,
  products,
  href = '/shop',
  linkLabel = 'Explore all',
  sidePromo,
  className,
}: ProductSectionProps) {
  return (
    <section className={cn('section-y !pt-0', className)}>
      <div className="container-wide">
        <Reveal className="mb-10 md:mb-12 flex flex-wrap items-end justify-between gap-4 border-b border-border/80 pb-6">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-ink-muted mb-2">
              <span>(03) // New Releases</span>
              <span>·</span>
              <span className="text-sage-deep font-semibold">Seasonal Archive</span>
            </div>
            <h2 className="display-section text-ink">{title}</h2>
            {subtitle && (
              <p className="mt-2 text-sm md:text-base text-ink-muted font-light">
                {subtitle}
              </p>
            )}
          </div>
          <Link
            href={href}
            className="group/btn inline-flex items-center gap-2.5 font-heading text-sm uppercase tracking-wider font-semibold text-ink hover:text-sage-deep transition-colors"
          >
            <ButtonLabel mode="slide">{linkLabel}</ButtonLabel>
            <span className="relative flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden">
              <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-5" />
              <ArrowRight className="absolute inset-0 h-4 w-4 -translate-x-5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-0" />
            </span>
          </Link>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6 items-stretch">
          {products.slice(0, 3).map((product) => (
            <div key={product.id} className="h-full">
              <ProductCard product={product} />
            </div>
          ))}

          {sidePromo && (
            <TiltCard maxTilt={5} className="h-full">
              <Link
                href={sidePromo.href}
                className={cn(
                  'group/btn group relative flex h-full min-h-[360px] flex-col justify-between overflow-hidden p-8 md:p-9 block',
                  sidePromo.tone === 'ochre' && 'bg-[#e2dc9d] text-ink',
                  sidePromo.tone === 'sage' && 'bg-[#d2dbcc] text-ink',
                  sidePromo.tone === 'dark' && 'bg-ink text-cream',
                  (!sidePromo.tone || sidePromo.tone === 'ochre') &&
                    'bg-[#e2dc9d] text-ink',
                )}
              >
                <div>
                  <h3 className="font-heading text-2xl md:text-3xl font-medium tracking-tight leading-tight">
                    {sidePromo.title}
                  </h3>
                  <p className="mt-3 text-sm md:text-[0.9375rem] leading-relaxed text-ink/80 font-light">
                    {sidePromo.body}
                  </p>
                </div>

                <div className="mt-8">
                  <div className="inline-flex items-center gap-2.5 rounded-full bg-ink px-6 py-3 font-heading text-sm uppercase tracking-wider font-semibold text-cream shadow-md transition-colors hover:bg-ink/90">
                    <ButtonLabel mode="slide">{sidePromo.cta}</ButtonLabel>
                    <span className="relative flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden">
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-5" />
                      <ArrowRight className="absolute inset-0 h-4 w-4 -translate-x-5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-0" />
                    </span>
                  </div>
                </div>
              </Link>
            </TiltCard>
          )}
        </div>
      </div>
    </section>
  );
}
