import { Link } from '@/components/ui/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useWpProductCategories } from '@forgewp/woocommerce';
import { getAllCategories } from '@/data/categories';
import { getAllProducts } from '@/data/products';
import { WpHead, WpImage } from '@forgewp/react';

export default function CategoriesPage() {
  const fallbackCategories = getAllCategories();
  const wpCategories = useWpProductCategories();
  const categories = wpCategories && wpCategories.length > 0
    ? wpCategories.map((c) => ({
        id: String(c.id),
        name: c.name,
        slug: c.slug,
        description: c.description || '',
        image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
        productCount: c.count || 0,
      }))
    : fallbackCategories;
  const allProducts = getAllProducts();

  return (
    <>
      <WpHead
        title="Departments & Collections — Comfortable Decor"
        description="Browse our architectural collections spanning furniture, sculptural lighting, seating, outdoor pieces, storage, and eco-friendly accents."
      />

      {/* Header Banner */}
      <div className="border-b border-border/60 bg-cream">
        <div className="container-wide py-6 sm:py-10 md:py-16">
          <nav className="flex flex-wrap items-center gap-1.5 sm:gap-2 font-mono text-[11px] sm:text-xs uppercase tracking-wider text-ink-muted mb-4 sm:mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ink transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-ink font-semibold">Categories</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 sm:gap-6 border-b border-border/70 pb-5 md:pb-6">
            <div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 font-mono text-[11px] sm:text-xs uppercase tracking-wider sm:tracking-widest text-ink-muted mb-1.5 sm:mb-2">
                <span>(01) // Spatial Departments</span>
                <span>·</span>
                <span className="text-sage-deep font-semibold">Architectural Living</span>
              </div>
              <h1 className="font-heading font-semibold text-ink text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-tight leading-tight">
                Explore All Categories
              </h1>
              <p className="mt-1.5 sm:mt-2 text-sm sm:text-base md:text-lg text-ink/80 max-w-xl font-light leading-relaxed">
                Discover pieces curated by room and functional typology, unified by natural
                material honesty and timeless modern aesthetics.
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-ink-muted self-start md:self-auto">
              <span className="rounded-full bg-stone px-4 py-1.5 font-semibold text-ink">
                {categories.length} Departments Available
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Categories Cards Grid */}
      <div className="container-wide py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {categories.map((cat) => {
            const count = allProducts.filter(
              (p) => p.categorySlug === cat.slug || p.category.toLowerCase() === cat.slug.toLowerCase(),
            ).length;

            return (
              <div
                key={cat.slug}
                className="group flex flex-col bg-stone/30 border border-border/70 rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300 select-none"
              >
                {/* Category Image Card with Zoom */}
                <Link
                  href={`/category/${cat.slug}`}
                  className="relative aspect-16/11 overflow-hidden bg-stone block"
                >
                  <WpImage
                    src={cat.image}
                    alt={cat.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute top-3.5 left-3.5">
                    <span className="rounded-full bg-cream/90 backdrop-blur-sm px-3.5 py-1 font-mono text-[11px] uppercase tracking-wider font-semibold text-ink shadow-xs">
                      0{cat.id} // {count || cat.productCount || 6} Pieces
                    </span>
                  </div>
                </Link>

                {/* Category Content */}
                <div className="p-6 flex flex-col flex-1 justify-between bg-card">
                  <div>
                    <h3 className="font-heading text-2xl font-semibold text-ink group-hover:text-sage-deep transition-colors">
                      <Link href={`/category/${cat.slug}`}>{cat.name}</Link>
                    </h3>
                    <p className="mt-2 text-sm text-ink/75 font-light leading-relaxed line-clamp-3">
                      {cat.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between">
                    <Link
                      href={`/category/${cat.slug}`}
                      className="group/link inline-flex items-center gap-2 font-heading text-xs uppercase tracking-wider font-semibold text-ink hover:text-sage-deep transition-colors"
                    >
                      <span>Explore Collection</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/link:translate-x-1" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Curation Guarantees Strip */}
        <div className="mt-16 p-8 border border-border/70 bg-cream/60 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ink text-cream shadow-sm">
              <Sparkles className="h-5 w-5 text-sage" />
            </div>
            <div>
              <h4 className="font-heading text-lg font-semibold text-ink">
                Custom Spatial Advisory & Trade Orders
              </h4>
              <p className="text-xs md:text-sm text-ink/75 font-light">
                Looking for tailored dimensions, swatch physical samples, or bespoke commercial furnishing?
              </p>
            </div>
          </div>
          <Link
            href="/about"
            className="rounded-full bg-ink px-6 py-3 font-heading text-xs uppercase tracking-wider font-semibold text-cream hover:bg-sage-deep transition-all whitespace-nowrap shadow-md"
          >
            Contact Studio Concierge
          </Link>
        </div>
      </div>
    </>
  );
}
