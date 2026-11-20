import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
export const metadata: Metadata = { title: 'ForgeWP Next.js research fixture' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>
    <header data-fixture="shared-layout"><nav aria-label="Main">
      <Link href="/">Home</Link><Link href="/about/">About</Link>
    </nav></header>
    {children}
    <footer>Next.js adapter research; native export not yet supported.</footer>
  </body></html>;
}
