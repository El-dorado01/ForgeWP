import type { ReactNode } from "react";
import { WpHead, PresetsStyle } from "@forgewp/react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="forgewp-root">
      {/* Dev-only preset variables and font enqueues (no-op in production) */}
      <PresetsStyle />

      {/*
        ── Global SEO defaults ──────────────────────────────────────────────────
        These apply to every page in your theme. Edit freely.
        Individual page files (page.tsx, single.tsx, etc.) can render their
        own <WpHead /> to override specific fields for that template.

        The ForgeWP compiler reads these props and writes them as native
        <meta> tags into your WordPress theme's <head> automatically.
        ─────────────────────────────────────────────────────────────────────── */}
      <WpHead
        title="Hospitality 2035 | Wie sich die wirtschaftliche Logik der Hotellerie verändert"
        description="Strategische Analyse zum Wandel der Hotellerie bis 2035: Kosten, KI, Automatisierung, Hotelkonzepte und Geschäftsmodelle."
        keywords="Hospitality 2035, Hotellerie, Hotelwirtschaft, KI, Automatisierung, Hotelstrategie"
        ogTitle="Hospitality 2035 | Wie sich die wirtschaftliche Logik der Hotellerie verändert"
        ogDescription="Eine strategische Analyse der Hotellerie bis 2035 – mit Erkenntnissen zu Kosten, KI, Automatisierung, Flächen und Geschäftsmodellen."
        ogType="website"
        twitterCard="summary_large_image"
      />
      {children}
    </div>
  );
}
