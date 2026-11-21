import type { Metadata } from 'next';
import Link from 'next/link';
import { Hydrate } from '@forgewp/react';
import { ForgeWPLogo, NextLogo } from '@/components/BrandLogos';
import { ThemeHotkey } from '@/components/ThemeHotkey';
import { THEME_STORAGE_KEY } from '@/lib/theme';
import './globals.css';

export const metadata: Metadata = {
  title: 'ForgeWP Next Starter',
  description: 'A minimalist WordPress theme starter built with Next.js App Router and ForgeWP.',
};

// Applies a saved light/dark choice before first paint, so there is no flash.
const themeScript = `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='dark'||t==='light')document.documentElement.classList.add(t)}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="fwp-page">
        <header className="fwp-header">
          <Link href="/" className="fwp-brand">
            <ForgeWPLogo className="fwp-brand-mark" />
            <span>ForgeWP</span>
          </Link>
          <span className="fwp-header-divider" aria-hidden="true" />
          <span className="fwp-logo-tile" title="Next.js">
            <NextLogo className="fwp-logo-icon" />
          </span>
          {/* Press "d" to toggle dark mode */}
          <Hydrate id="theme-hotkey" trigger="load">
            <ThemeHotkey />
          </Hydrate>
        </header>
        {children}
      </body>
    </html>
  );
}
