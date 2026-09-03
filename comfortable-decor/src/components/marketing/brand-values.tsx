const steps = [
  {
    n: '01',
    title: 'Thoughtful sourcing',
    body: 'We partner with makers who prioritise solid materials, repairable construction, and transparent supply chains.',
  },
  {
    n: '02',
    title: 'Design that lasts',
    body: 'Forms are refined for daily life — calm proportions, honest finishes, and pieces that age with character.',
  },
  {
    n: '03',
    title: 'Curated, not crowded',
    body: 'Every product earns its place. We edit collections seasonally so shopping stays clear and intentional.',
  },
  {
    n: '04',
    title: 'Care after purchase',
    body: 'Guidance on materials, delivery, and care so your pieces stay beautiful for years — not just unboxing day.',
  },
];

export function BrandValues() {
  return (
    <section className="py-16 md:py-24 border-y border-border">
      <div className="container-wide">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 mb-12 md:mb-16">
          <div className="lg:col-span-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
              A tailored approach
            </p>
            <h2 className="font-heading text-2xl md:text-3xl lg:text-4xl font-medium tracking-tight leading-snug">
              We understand that your home is one-of-a-kind.
            </h2>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <p className="text-muted-foreground leading-relaxed">
              Our integrated approach covers furniture, lighting, and décor so
              you can build a cohesive narrative — flexible enough for your
              budget, rigorous enough for lasting quality.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
          {steps.map((step) => (
            <div key={step.n} className="border-t border-border pt-6">
              <span className="font-mono text-xs text-muted-foreground">
                {step.n}.
              </span>
              <h3 className="mt-3 font-heading text-lg font-medium">
                {step.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
