import type { ReactNode } from "react";
import { WpHead } from "../.forgewp/wordpress";
import { PresetsStyle } from "../.forgewp/PresetsStyle";
import { WpAuthProvider } from "@forgewp/auth";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    /*
     * The WpAuthProvider automatically resolves authentication policies
     * (such as allowed login fields) dynamically from your wp.config.ts
     * and WordPress Settings screen.
     */
    <WpAuthProvider>
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
          description="A WordPress theme built with ForgeWP - React & Tailwind CSS"
          keywords="WordPress, React, Tailwind, ForgeWP"
          ogType="website"
          twitterCard="summary_large_image"
        />
        {children}
      </div>
    </WpAuthProvider>
  );
}
