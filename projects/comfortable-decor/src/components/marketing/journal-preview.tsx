import { Link } from '@/components/ui/link';
import { ArrowRight } from 'lucide-react';
import { blogPosts } from '@/data/blog';
import { Reveal, Stagger, StaggerItem, fadeUpSoft } from '@/components/motion/reveal';
import { ButtonLabel } from '@/components/ui/button';
import { WpImage } from '@forgewp/react';

export function JournalPreview() {
  const posts = blogPosts.slice(0, 4);

  return (
    <section className="section-y bg-cream">
      <div className="container-wide">
        <Reveal className="mb-8 md:mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/80 pb-5 md:pb-6">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 font-mono text-[11px] sm:text-xs uppercase tracking-wider sm:tracking-widest text-ink-muted mb-2">
              <span>(07) // Architectural Journal</span>
              <span className="text-ink/40">·</span>
              <span className="text-sage-deep font-semibold">Spatial Reflections</span>
            </div>
            <h2 className="display-section text-ink font-semibold">
              Insights into the curated home
            </h2>
          </div>
          <Link
            href="/blog"
            className="group/btn inline-flex items-center gap-2.5 font-heading text-xs sm:text-sm uppercase tracking-wider font-semibold text-ink hover:text-sage-deep transition-colors shrink-0"
          >
            <ButtonLabel mode="slide">Read all essays</ButtonLabel>
            <span className="relative flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden">
              <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-5" />
              <ArrowRight className="absolute inset-0 h-4 w-4 -translate-x-5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-0" />
            </span>
          </Link>
        </Reveal>

        <Stagger
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 items-stretch"
          stagger={0.06}
        >
          {posts.map((post) => (
            <StaggerItem key={post.id} variants={fadeUpSoft} className="h-full">
              <article className="group flex h-full flex-col justify-between bg-cream/40">
                <div>
                  {/* Fixed Aspect Image Frame */}
                  <Link
                    href={`/blog/${post.slug}`}
                    className="relative aspect-[16/11] overflow-hidden bg-stone mb-4 block"
                  >
                    <WpImage
                      src={post.image}
                      alt={post.title}
                      className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                      loading="lazy"
                    />
                  </Link>

                  {/* Metadata and Title */}
                  <p className="font-mono text-xs uppercase tracking-wider text-ink-muted">
                    {post.date} · {post.readTime}
                  </p>

                  <h3 className="mt-2 font-heading text-base md:text-[1.125rem] font-semibold leading-snug line-clamp-2 min-h-[2.8rem]">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="text-ink transition-colors hover:text-sage-deep"
                    >
                      {post.title}
                    </Link>
                  </h3>

                  <p className="mt-2 text-sm md:text-[0.9375rem] text-ink-muted line-clamp-2 leading-relaxed font-light">
                    {post.excerpt}
                  </p>
                </div>

                {/* Bottom Tags pinned at matching baseline */}
                <div className="mt-5 pt-3.5 flex items-center gap-2 border-t border-border/50">
                  <span className="rounded-full bg-stone/80 px-2.5 py-0.5 font-heading text-[11px] uppercase tracking-wider font-semibold text-ink">
                    Editorial
                  </span>
                  <span className="rounded-full bg-stone/80 px-2.5 py-0.5 font-heading text-[11px] uppercase tracking-wider font-semibold text-ink">
                    {post.category}
                  </span>
                </div>
              </article>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
