import type { ReactNode } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CustomCursor from '@/components/CustomCursor';

export default function DefaultLayout({ children }: { children: ReactNode }) {
  return (
    <div className='flex min-h-screen flex-col bg-[#fafafa]'>
      <CustomCursor />
      <Navbar fixed />
      <main className='flex-1'>{children}</main>
      <Footer />
    </div>
  );
}
