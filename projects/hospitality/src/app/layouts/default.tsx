import type { ReactNode } from 'react';
import SiteNavigation from '../components/SiteNavigation';
import SiteFooter from '../components/SiteFooter';

export default function DefaultLayout({ children }: { children: ReactNode }) {
  return (
    <div className='flex min-h-screen flex-col'>
      <SiteNavigation />
      <main className='flex-1 pt-20'>{children}</main>
      <SiteFooter />
    </div>
  );
}
