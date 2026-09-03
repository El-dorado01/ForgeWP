import { Link } from '@/components/ui/link';
import { WpImage } from '@forgewp/react';

const looks = [
  {
    title: 'Warm living, layered neutrals',
    meta: 'Living · Soft textures',
    image:
      'https://images.unsplash.com/photo-1618220179428-22790b461013?w=900&q=80',
    href: '/shop',
  },
  {
    title: 'Scandinavian light & timber',
    meta: 'Dining · Natural oak',
    image:
      'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=900&q=80',
    href: '/category/furniture',
  },
  {
    title: 'Evening glow, quiet corners',
    meta: 'Lighting · Ambient',
    image:
      'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=900&q=80',
    href: '/category/lighting',
  },
  {
    title: 'Outdoor calm, climate-ready',
    meta: 'Outdoor · Refined comfort',
    image:
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=80',
    href: '/category/decor',
  },
];

export function LookbookGrid() {
  return (
    <section className="py-16 md:py-24 bg-stone/50">
      <div className="container-wide">
        <div className="mb-10 md:mb-14 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
              Lifestyle
            </p>
            <h2 className="font-heading text-2xl md:text-3xl font-medium tracking-tight">
              Selected spaces
            </h2>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span>({looks.length})</span>
            <span className="font-mono text-xs">2024—2026</span>
            <Link
              href="/blog"
              className="text-ink hover:text-accent underline-offset-4 hover:underline"
            >
              View all
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
          {looks.map((look, i) => (
            <Link
              key={look.title}
              href={look.href}
              className={`group block ${i % 3 === 0 ? 'sm:mt-0' : i % 2 === 1 ? 'sm:mt-12' : ''}`}
            >
              <div className="aspect-[4/3] overflow-hidden bg-stone mb-4">
                <WpImage
                  src={look.image}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  loading="lazy"
                />
              </div>
              <h3 className="font-heading text-lg md:text-xl font-medium leading-snug group-hover:text-accent transition-colors">
                {look.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{look.meta}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
