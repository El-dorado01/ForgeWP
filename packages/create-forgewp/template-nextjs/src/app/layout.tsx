import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'ForgeWP Next Starter',
  description: 'A WordPress theme built with Next.js App Router and ForgeWP.',
};

function ForgeWPLogoMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 44 40"
      width={size}
      height={Math.round((size * 40) / 44)}
      fill="none"
      aria-hidden="true"
    >
      <g fill="#09090b">
        <path d="M5 0H40.2Q44 0 41.19 2.56L33 10H5A5 5 0 0 1 5 0Z" />
        <path d="M5 15H22.6Q26.4 15 23.59 17.56L15.4 25H5A5 5 0 0 1 5 15Z" />
        <path d="M5 30H13Q16.8 30 13.99 32.56L5.8 40H5A5 5 0 0 1 5 30Z" />
      </g>
      <circle cx="39" cy="20" r="5" fill="#f97316" />
    </svg>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <Link href="/" className="brand-link">
              <span className="brand-mark">
                <ForgeWPLogoMark size={18} />
              </span>
              <span>ForgeWP Next Starter</span>
              <span className="brand-tag">Next.js</span>
            </Link>
            <nav className="site-nav" aria-label="Primary">
              <Link href="/">Home</Link>
              <Link href="/about">About</Link>
              <Link href="/about" className="nav-cta">
                Architecture
              </Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="site-footer-inner">
            <span className="footer-brand">
              <ForgeWPLogoMark size={16} />
              <span>Built with ForgeWP + Next.js App Router</span>
            </span>
            <div className="footer-links">
              <Link href="/">Home</Link>
              <Link href="/about">About</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
