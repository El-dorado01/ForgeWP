import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'ForgeWP Next Starter',
  description: 'A minimalist WordPress theme starter built with Next.js App Router and ForgeWP.',
};

function ForgeWPMark() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 44 40"
      width="24"
      height="22"
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
      <body className="fwp-page">
        <header className="fwp-header">
          <Link href="/" className="fwp-brand-link">
            <ForgeWPMark />
            <span className="fwp-wordmark">ForgeWP</span>
          </Link>
          <span className="fwp-pill">Next.js</span>
        </header>
        {children}
        <footer className="fwp-footer">
          <span>ForgeWP Next Starter</span>
          <span>·</span>
          <Link href="/">Home</Link>
          <span>·</span>
          <Link href="/about">About</Link>
        </footer>
      </body>
    </html>
  );
}
