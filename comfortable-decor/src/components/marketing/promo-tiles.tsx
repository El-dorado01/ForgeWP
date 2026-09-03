import { Link } from '@/components/ui/link';
import { ArrowRight } from 'lucide-react';
import { Stagger, StaggerItem } from '@/components/motion/reveal';
import { ButtonLabel } from '@/components/ui/button';
import { TiltCard } from '@/components/motion/tilt-card';
import { WpImage } from '@forgewp/react';

export function PromoTiles() {
  return (
    <section className="section-y !pt-12 md:!pt-16">
      <div className="container-wide">
        <Stagger
          className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6"
          stagger={0.1}
        >
          {/* Card 1: Dark Slate / Forest Architecture Card */}
          <StaggerItem>
            <TiltCard maxTilt={5}>
              <Link
                href="/about"
                className="group/btn group relative flex min-h-[380px] md:min-h-[460px] flex-col justify-end overflow-hidden bg-[#2d3f3b] p-8 md:p-12 block"
              >
                <WpImage
                  src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=85"
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-35 transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1d2a27]/90 via-[#2d3f3b]/50 to-transparent" />

                <div className="relative z-10 max-w-md">
                  <h3 className="display-card text-cream">
                    Helping make your
                    <br />
                    project perfect
                  </h3>
                  <p className="mt-3.5 text-base md:text-[1.0625rem] text-cream/85 leading-relaxed font-light">
                    Partner with us to unlock volume discounts, specialized
                    support, and respect the precision and creative vision of your
                    spatial designs.
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2.5 rounded-full bg-ink px-6 py-3 font-heading text-sm uppercase tracking-wider font-semibold text-cream shadow-md transition-colors hover:bg-white hover:text-ink">
                    <ButtonLabel mode="slide">Explore more</ButtonLabel>
                    <span className="relative flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden">
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-5" />
                      <ArrowRight className="absolute inset-0 h-4 w-4 -translate-x-5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-0" />
                    </span>
                  </div>
                </div>
              </Link>
            </TiltCard>
          </StaggerItem>

          {/* Card 2: Warm Terracotta / Peach Rewards Card with Floating Armchair */}
          <StaggerItem>
            <TiltCard maxTilt={5}>
              <Link
                href="/account"
                className="group/btn group relative flex min-h-[380px] md:min-h-[460px] flex-col justify-end overflow-hidden bg-[#e0b8af] p-8 md:p-12 block"
              >
                {/* Armchair image on the right */}
                <WpImage
                  src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1000&q=85"
                  alt=""
                  className="absolute right-0 top-0 h-full w-[55%] object-cover opacity-90 transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#e0b8af] via-[#e0b8af]/90 to-transparent md:w-[60%]" />

                <div className="relative z-10 max-w-sm">
                  <h3 className="display-card text-ink">
                    Make this year iconic,
                    <br />
                    earn 25% in rewards
                  </h3>
                  <p className="mt-3.5 text-base md:text-[1.0625rem] text-ink/80 leading-relaxed font-light">
                    Join our exclusive circle of collectors this season to access
                    precision-crafted furniture, editorial inspiration, and
                    unparallelled value.
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2.5 rounded-full bg-ink px-6 py-3 font-heading text-sm uppercase tracking-wider font-semibold text-cream shadow-md transition-colors hover:bg-ink/90">
                    <ButtonLabel mode="slide">Get started</ButtonLabel>
                    <span className="relative flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden">
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-5" />
                      <ArrowRight className="absolute inset-0 h-4 w-4 -translate-x-5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-0" />
                    </span>
                  </div>
                </div>
              </Link>
            </TiltCard>
          </StaggerItem>
        </Stagger>
      </div>
    </section>
  );
}
