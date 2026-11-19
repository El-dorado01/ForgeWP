import { Link } from '@/components/ui/link';
import { ArrowRight, Quote } from 'lucide-react';
import { Reveal, slideRight, slideLeft } from '@/components/motion/reveal';
import { Button, ButtonLabel } from '@/components/ui/button';
import { WpImage } from '@forgewp/react';

export function CuratorQuote() {
  return (
    <section className="section-y bg-[#d2dbcc] border-t border-border/70 overflow-hidden">
      <div className="container-wide">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: Curator Portrait with Framed Border */}
          <Reveal className="lg:col-span-4" variants={slideRight}>
            <div className="relative aspect-[3/4] overflow-hidden bg-stone border border-ink/20 shadow-xl group">
              <WpImage
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900&q=85"
                alt="Elena Rostova — Head of Spatial Architecture & Design"
                className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 text-cream">
                <p className="font-heading text-base font-semibold">Elena Rostova</p>
                <p className="font-mono text-xs text-cream/75">
                  Head of Spatial Architecture & Design
                </p>
              </div>
            </div>
          </Reveal>

          {/* Right Column: Monumental Quote & Signature */}
          <Reveal className="lg:col-span-8" variants={slideLeft}>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-4 font-mono text-[11px] sm:text-xs uppercase tracking-wider sm:tracking-widest text-ink/70">
              <span>(05) // Curator's Perspective</span>
              <span className="text-ink/40">·</span>
              <span className="font-semibold">Architecture of Rest</span>
            </div>

            <Quote className="h-10 w-10 text-ink/30 mb-6" />

            <blockquote className="font-heading text-2xl md:text-3xl lg:text-4xl font-medium leading-[1.2] tracking-tight text-ink">
              “We believe luxury is not about excess ornament — it is the quiet confidence of
              honest materials, acoustic calm, and furniture designed to elevate daily living.”
            </blockquote>

            <div className="mt-8 pt-6 border-t border-ink/20 flex flex-wrap items-center justify-between gap-6">
              <div>
                <p className="font-heading text-sm font-semibold text-ink">
                  Comfortable Decor® Spatial Archive
                </p>
                <p className="text-xs font-mono text-ink/70 mt-0.5">
                  Copenhagen · Milan · Stockholm · Tokyo
                </p>
              </div>

              <Button
                asChild
                size="xl"
                shape="pill"
                className="bg-ink text-cream hover:bg-ink/90 shadow-lg px-7"
              >
                <Link href="/about" className="group/btn inline-flex items-center gap-2.5">
                  <ButtonLabel mode="slide">Read Design Manifesto</ButtonLabel>
                  <span className="relative flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden">
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-5" />
                    <ArrowRight className="absolute inset-0 h-4 w-4 -translate-x-5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-0" />
                  </span>
                </Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
