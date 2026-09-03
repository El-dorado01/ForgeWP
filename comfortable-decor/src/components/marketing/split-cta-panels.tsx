import { Link } from '@/components/ui/link';
import { ArrowRight } from 'lucide-react';
import { Stagger, StaggerItem } from '@/components/motion/reveal';
import { ButtonLabel } from '@/components/ui/button';
import { TiltCard } from '@/components/motion/tilt-card';
import { WpImage } from '@forgewp/react';

export function SplitCtaPanels() {
  return (
    <section className="section-y !pt-0">
      <div className="container-wide">
        <Stagger
          className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6"
          stagger={0.1}
        >
          {/* Panel 1: Physical Spaces */}
          <StaggerItem>
            <TiltCard maxTilt={4}>
              <Link
                href="/about"
                className="group/btn group relative flex min-h-[420px] md:min-h-[500px] flex-col justify-end overflow-hidden p-8 md:p-12 block bg-ink"
              >
                <WpImage
                  src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=85"
                  alt="Modern architectural physical showroom"
                  className="absolute inset-0 h-full w-full object-cover opacity-75 transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-108"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/40 to-transparent" />

                <div className="relative z-10 text-cream max-w-md">
                  <p className="font-mono text-xs uppercase tracking-widest text-cream/70 mb-3">
                    (08) // Spatial Perspectives · Physical Spaces
                  </p>
                  <h3 className="font-heading text-3xl md:text-4xl font-medium tracking-tight leading-tight">
                    Explore our
                    <br />
                    physical spaces
                  </h3>
                  <p className="mt-3.5 text-sm md:text-base text-cream/85 leading-relaxed font-light">
                    Discover how a minimalist environment creates room for the
                    mind to breathe amidst the soft light and intentional textures
                    of our latest collection.
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2.5 rounded-full bg-cream/15 px-6 py-3 font-heading text-sm uppercase tracking-wider font-semibold text-cream shadow-md backdrop-blur-md transition-colors hover:bg-cream hover:text-ink">
                    <ButtonLabel mode="slide">Find a location</ButtonLabel>
                    <span className="relative flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden">
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-5" />
                      <ArrowRight className="absolute inset-0 h-4 w-4 -translate-x-5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-0" />
                    </span>
                  </div>
                </div>
              </Link>
            </TiltCard>
          </StaggerItem>

          {/* Panel 2: Sustainable Perspectives */}
          <StaggerItem>
            <TiltCard maxTilt={4}>
              <Link
                href="/about"
                className="group/btn group relative flex min-h-[420px] md:min-h-[500px] flex-col justify-end overflow-hidden bg-[#243531] p-8 md:p-12 block"
              >
                <WpImage
                  src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&q=85"
                  alt="Sustainable architectural textures"
                  className="absolute inset-0 h-full w-full object-cover opacity-25 transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-108"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#16221f]/95 via-[#243531]/60 to-transparent" />

                <div className="relative z-10 text-cream max-w-md">
                  <p className="font-mono text-xs uppercase tracking-widest text-cream/70 mb-3">
                    (08) // Sustainable Footprint · Circularity
                  </p>
                  <h3 className="font-heading text-3xl md:text-4xl font-medium tracking-tight leading-tight">
                    Our sustainable
                    <br />
                    perspectives
                  </h3>
                  <p className="mt-3.5 text-sm md:text-base text-cream/85 leading-relaxed font-light">
                    We are always keen to hear from talented, creative people who
                    would like to add new perspectives to our team.
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2.5 rounded-full bg-cream/15 px-6 py-3 font-heading text-sm uppercase tracking-wider font-semibold text-cream shadow-md backdrop-blur-md transition-colors hover:bg-cream hover:text-ink">
                    <ButtonLabel mode="slide">Explore openings</ButtonLabel>
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
