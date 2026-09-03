import { Hero } from '@/components/marketing/hero';
import { TrustStrip } from '@/components/marketing/trust-strip';
import { PressStrip } from '@/components/marketing/press-strip';
import { CategoryGrid } from '@/components/marketing/category-grid';
import { ShowroomSplit } from '@/components/marketing/showroom-split';
import { PickedCollection } from '@/components/marketing/picked-collection';
import { MaterialityAccordion } from '@/components/marketing/materiality-accordion';
import { CuratorQuote } from '@/components/marketing/curator-quote';
import { ReviewsMarquee } from '@/components/marketing/reviews-marquee';
import { JournalPreview } from '@/components/marketing/journal-preview';
import { NewsletterCta } from '@/components/marketing/newsletter-cta';
import {
  getSaleProducts,
  getAllProducts,
} from '@/data/products';
import { WpHead } from '@forgewp/react';

export default function HomePage() {
  const all = getAllProducts();
  // 5 flagship products for the Curated Living Archive
  const collection =
    getSaleProducts(5).length >= 5
      ? getSaleProducts(5)
      : all.slice(2, 7);

  return (
    <>
      <WpHead
        title="Comfortable Decor — Curated Architectural Living & Furniture"
        description="Premium furniture, lighting, and eco-friendly décor for warm, modern homes. Timeless Scandinavian design and material honesty."
        ogType="website"
      />

      {/* 1. Monumental Hero with Interactive Hotspot & Dual-Sliding Actions */}
      <Hero />

      {/* 2. Architectural Provenance Strip & Press Recognition */}
      <TrustStrip />
      <PressStrip />

      {/* 3. (01) Collection Atlas — 6-Card Popular Categories Grid */}
      <CategoryGrid />

      {/* 4. (02) Physical Showroom Experience — Munich Living Space */}
      <ShowroomSplit />

      {/* 5. (03) Curated Living Archive — Flagship Shoppable Products + Architectural Moodboard */}
      <PickedCollection products={collection} />

      {/* 6. (04) Materiality & Craft Accordion with Permanent Header Highlighter */}
      <MaterialityAccordion />

      {/* 7. (05) Curator's Perspective & Design Manifesto */}
      <CuratorQuote />

      {/* 8. (06) Client Reflections & Continuous Brand Signature Marquee */}
      <ReviewsMarquee />

      {/* 9. (07) Architectural Journal — Design Insights & Reading Times */}
      <JournalPreview />

      {/* 10. (08) Archival Newsletter & Member Rewards */}
      <NewsletterCta />
    </>
  );
}
