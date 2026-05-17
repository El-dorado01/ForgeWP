import type { ReactNode } from "react";
import { SEO } from "../lib/SEO";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="forgewp-root">
      {/*
        ── Global SEO defaults ──────────────────────────────────────────────────
        These apply to every page in your theme. Edit freely.
        Individual page files (page.tsx, single.tsx, etc.) can render their
        own <SEO /> to override specific fields for that template.

        The ForgeWP compiler reads these props and writes them as native
        <meta> tags into your WordPress theme's <head> automatically.
        ─────────────────────────────────────────────────────────────────────── */}
      <SEO
        description="A WordPress theme built with ForgeWP - React & Tailwind CSS"
        keywords="WordPress, React, Tailwind, ForgeWP"
        ogType="website"
        twitterCard="summary_large_image"
      />
      {children}
    </div>
  );
}
