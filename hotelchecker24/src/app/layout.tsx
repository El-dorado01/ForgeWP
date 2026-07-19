import type { ReactNode } from "react";
import { WpHead } from "../.forgewp/wordpress";
import { PresetsStyle } from "../.forgewp/PresetsStyle";
import { SiteHeader } from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";


export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // No lang attribute here — the real <html lang="..."> (set correctly
    // per-page by WordPress's own language_attributes() in header.php via
    // Polylang) already covers everything inside via normal inheritance.
    // A hardcoded lang on this wrapper would override that for all visible
    // content, telling browsers the page is German even on /en/ pages —
    // exactly the mismatch that triggers an unwanted browser/Google
    // "Translate this page?" prompt. useWpLanguage() can't fix this here
    // either: it reads window.forgeWpTranslations, which doesn't exist
    // during the Node SSR pass that bakes this static wrapper, so it would
    // just bake the same wrong 'de' fallback in a different way.
    <div className="forgewp-root" translate="no">
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
        ogImage="https://hotelchecker24.com/wp-content/themes/hotelchecker24/Logo/hotelchecker24-logo_farbe.svg"
      />

      {/* GLOBAL SITE HEADER (Unified MiniHeader + Navbar) */}
      <SiteHeader />

      {children}
      
      {/* GLOBAL UPGRADED FOOTER */}
      <SiteFooter />
    </div>
  );
}
