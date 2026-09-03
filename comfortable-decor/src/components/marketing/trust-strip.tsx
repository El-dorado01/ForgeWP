import { ShieldCheck, Truck, CheckCircle2 } from 'lucide-react';
import { Stagger, StaggerItem } from '@/components/motion/reveal';

const items = [
  {
    n: '01.',
    icon: CheckCircle2,
    title: 'Crafted Material Honesty',
    subtitle: 'Småland Oak & Italian Bouclé',
    body: 'Solid FSC-certified hardwoods and tactile natural weaves built to last a lifetime.',
  },
  {
    n: '02.',
    icon: ShieldCheck,
    title: 'Architectural Guarantee',
    subtitle: '5-Year Structural Warranty',
    body: 'White-glove delivery, bespoke room assembly, and fully encrypted checkout.',
  },
  {
    n: '03.',
    icon: Truck,
    title: 'Direct European Logistics',
    subtitle: 'Carbon-Neutral Dispatch',
    body: 'Complimentary EU freight on orders over €150 with tracked 2–5 day delivery.',
  },
];

export function TrustStrip() {
  return (
    <section className="border-b border-border/80 bg-cream">
      <Stagger className="container-wide grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/80">
        {items.map(({ n, icon: Icon, title, subtitle, body }) => (
          <StaggerItem key={title}>
            <div className="group flex items-start gap-4 px-2 py-8 md:px-8 md:py-9 transition-colors hover:bg-stone/20">
              <span className="font-mono text-xs font-semibold text-sage-deep pt-1 shrink-0">
                {n}
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-heading text-base md:text-[1.0625rem] font-semibold tracking-tight text-ink">
                    {title}
                  </h2>
                  <Icon className="h-4 w-4 text-ink-muted/50 stroke-[1.5] transition-colors group-hover:text-ink" />
                </div>
                <p className="font-mono text-[11px] uppercase tracking-wider text-ink-muted/80 mt-0.5">
                  {subtitle}
                </p>
                <p className="mt-2 text-sm md:text-[0.9375rem] text-ink-muted leading-relaxed font-light">
                  {body}
                </p>
              </div>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
