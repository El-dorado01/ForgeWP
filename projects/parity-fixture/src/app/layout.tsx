import type { Metadata } from 'next';
import Link from 'next/link';
import { WpMenu } from '@forgewp/react';
import { wpClient } from '@/lib/content';
import './globals.css';

export const metadata: Metadata = {
  title: 'ForgeWP Parity Fixture',
  description: 'The same project exported natively and run decoupled must agree.',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const primaryMenu = await wpClient.getMenu('primary');
  const settings = await wpClient.getSiteSettings();
  return (
    <html lang="en">
      <body className="fwp-page">
        <header className="fwp-header">
          <Link href="/" className="fwp-brand" data-parity="brand">
            ForgeWP Parity
          </Link>
          <WpMenu location="primary" items={primaryMenu} className="fwp-nav" />
        </header>
        {children}
        <footer className="fwp-footer">
          <p data-parity="contact-phone">{settings.options.contact_phone}</p>
          <p data-parity="footer-text">{settings.themeMods.footer_text}</p>
        </footer>
      </body>
    </html>
  );
}
