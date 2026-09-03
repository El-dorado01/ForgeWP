import * as React from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Stagger,
  StaggerItem,
  slideRight,
  slideLeft,
} from '@/components/motion/reveal';
import { WpImage } from '@forgewp/react';

export function NewsletterCta() {
  const [submitted, setSubmitted] = React.useState(false);
  const [agreed, setAgreed] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;
    setSubmitted(true);
  };

  return (
    <section className="section-y !pt-0">
      <div className="container-wide">
        <Stagger
          className="grid grid-cols-1 lg:grid-cols-5 min-h-[440px] md:min-h-[500px] overflow-hidden border border-border/70"
          stagger={0.1}
        >
          {/* Left: 2/5 Form Block */}
          <StaggerItem variants={slideRight} className="lg:col-span-2 h-full">
            <div className="flex h-full flex-col justify-center bg-[#ebd1cb] px-7 py-12 md:px-12 md:py-16">
              <div className="mb-4">
                <span className="rounded-full bg-ink px-3 py-1 font-heading text-xs font-semibold text-cream">
                  Subscribe
                </span>
              </div>

              <h2 className="display-section text-ink">Stay in the loop</h2>
              <p className="mt-3 text-sm md:text-base text-ink/80 leading-relaxed font-light">
                Sign up to our Newsletter for archival releases, curated events,
                and private member previews.
              </p>

              {submitted ? (
                <div className="mt-8 rounded-none border border-ink/20 bg-cream/90 p-5 flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-cream">
                    <Check className="h-4.5 w-4.5" />
                  </span>
                  <p className="font-heading text-sm text-ink font-medium">
                    Thank you for subscribing! Check your inbox for your 10% discount code.
                  </p>
                </div>
              ) : (
                <form className="mt-7 space-y-3.5" onSubmit={handleSubmit}>
                  <Input
                    type="text"
                    placeholder="Your first name"
                    aria-label="First name"
                    required
                    className="bg-cream/90 border-transparent h-11 rounded-none px-4 text-sm text-ink placeholder:text-ink/50 focus-visible:ring-ink"
                  />
                  <Input
                    type="email"
                    placeholder="Your email address"
                    aria-label="Email for newsletter"
                    required
                    className="bg-cream/90 border-transparent h-11 rounded-none px-4 text-sm text-ink placeholder:text-ink/50 focus-visible:ring-ink"
                  />

                  <label className="flex items-start gap-2.5 pt-1 text-xs text-ink/75 font-light leading-relaxed cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="mt-0.5 accent-ink h-4 w-4 rounded-none cursor-pointer"
                      required
                    />
                    <span>
                      I agree to receive seasonal design notes & member previews.
                    </span>
                  </label>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      size="default"
                      shape="pill"
                      className="bg-ink text-cream hover:bg-ink/90 shadow-md px-6 h-10 font-heading text-xs uppercase tracking-wider font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <span>Continue</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </StaggerItem>

          {/* Right: 3/5 High-Res Living Room Interior */}
          <StaggerItem variants={slideLeft} className="lg:col-span-3 h-full">
            <div className="relative h-full min-h-[360px] lg:min-h-full overflow-hidden group bg-stone">
              <WpImage
                src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1600&q=85"
                alt="Warm living room interior with contemporary seating"
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
