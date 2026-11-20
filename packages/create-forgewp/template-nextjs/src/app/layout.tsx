import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'ForgeWP Next Starter',
  description: 'A WordPress theme built with Next.js App Router and ForgeWP.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <nav className="site-nav" aria-label="Primary">
            <Link href="/">Home</Link>
            <Link href="/about">About</Link>
          </nav>
        </header>
        {children}
        <footer className="site-footer">
          <div className="site-nav">Powered by ForgeWP + Next.js</div>
        </footer>
      </body>
    </html>
  );
}
