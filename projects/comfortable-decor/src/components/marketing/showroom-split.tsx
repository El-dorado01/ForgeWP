import { Link } from '@/components/ui/link';
import { ArrowRight } from 'lucide-react';
import { Button, ButtonLabel } from '@/components/ui/button';
import {
  Stagger,
  StaggerItem,
  slideRight,
  slideLeft,
} from '@/components/motion/reveal';
import { WpImage } from '@forgewp/react';

export function ShowroomSplit() {
  return (
    <section className="section-y !pt-0">
      <div className="container-wide">
        <Stagger
          className="grid grid-cols-1 lg:grid-cols-2 min-h-[440px] md:min-h-[520px] overflow-hidden border border-border/70"
          stagger={0.1}
        >
          {/* Left: Pistachio Statement Panel */}
          <StaggerItem variants={slideRight}>
            <div className="flex h-full flex-col justify-center bg-[#d4dfcd] px-6 py-10 sm:px-10 sm:py-14 md:px-14 md:py-20">
              <div className="flex flex-wrap items-center gap-2 mb-4 md:mb-5">
                <span className="font-mono text-[11px] sm:text-xs uppercase tracking-widest text-ink/70 font-semibold shrink-0">
                  (02) // Spatial Showroom
                </span>
                <span className="text-ink/40 hidden xs:inline">·</span>
                <span className="inline-flex items-center rounded-full bg-ink px-2.5 py-0.5 font-heading text-[10px] sm:text-[11px] font-semibold text-cream uppercase tracking-wider shrink-0">
                  Munich N°19
                </span>
              </div>

              <h2 className="display-section text-ink max-w-md">
                Inside the studio:
                <br />
                our new design showroom
              </h2>

              <p className="mt-5 max-w-md text-base md:text-[1.0625rem] text-ink/80 leading-relaxed font-light">
                Explore our showroom to touch the raw timber, test the ergonomic
                curves of our seating, and consult with our team on creating a
                cohesive narrative for your home.
              </p>

              <div className="mt-8">
                <Button asChild size="xl" shape="pill" className="bg-ink text-cream hover:bg-ink/90 shadow-md px-7">
                  <Link href="/contact" className="group/btn inline-flex items-center gap-2.5">
                    <ButtonLabel mode="slide">Book a consultation</ButtonLabel>
                    <span className="relative flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden">
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-5" />
                      <ArrowRight className="absolute inset-0 h-4 w-4 -translate-x-5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-0" />
                    </span>
                  </Link>
                </Button>
              </div>
            </div>
          </StaggerItem>

          {/* Right: High-Res Modern Showroom Photography */}
          <StaggerItem variants={slideLeft}>
            <div className="relative h-full min-h-[340px] lg:min-h-full overflow-hidden group bg-stone">
              <WpImage
                src="https://images.unsplash.com/photo-1556912173-46c336c7fd55?w=1400&q=85"
                alt="Design showroom kitchen and dining interior"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                loading="lazy"
              />
            </div>
          </StaggerItem>
        </Stagger>
      </div>
    </section>
  );
}
