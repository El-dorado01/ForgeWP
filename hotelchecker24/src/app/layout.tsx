import type { ReactNode } from "react";
import { WpHead } from "../.forgewp/wordpress";
import { PresetsStyle } from "../.forgewp/PresetsStyle";
import { MiniHeader } from "../components/MiniHeader";
import { Navbar } from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import { Hydrate } from "@forgewp/react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <div translate="no" className="forgewp-root notranslate">
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
        description="A WordPress theme built with ForgeWP - React & Tailwind CSS"
        keywords="WordPress, React, Tailwind, ForgeWP"
        ogType="website"
        twitterCard="summary_large_image"
      />

      {/* MINI TOP HEADER (Static, scrolls out) */}
      <MiniHeader />

      {/* NAVBAR (Sticky, Hydrated) */}
      <Hydrate trigger="load" className="sticky top-0 z-50 w-full">
        <Navbar />
      </Hydrate>

      {children}
      
      {/* GLOBAL UPGRADED FOOTER */}
      <Hydrate trigger="visible">
        <SiteFooter />
      </Hydrate>
    </div>
  );
}
