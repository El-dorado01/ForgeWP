import { WpHead } from '../../.forgewp/wordpress';
import { Hydrate } from '@forgewp/react';
import Navbar from '../../components/navigation/Navbar';
import HeroSection from '../../components/HeroSection';
import EditorialLookbook from '../../components/EditorialLookbook';
import ProductShowroom from '../../components/ProductShowroom';

export default function ParallaxLandingPage() {
  return (
    <div className='min-h-screen bg-[#FAF9F6] text-zinc-800 selection:bg-brand selection:text-white relative font-sans'>
      <WpHead
        title='CD. — Comfortable Decor Parallax Experience'
        description='A premium parallax decor catalog featuring minimalist furniture, lighting, and ceramics.'
        ogType='website'
      />

      {/* Navbar is hydrated on load for interactive menus */}
      <Hydrate trigger='load'>
        <Navbar />
      </Hydrate>

      <main>
        <HeroSection />
        <EditorialLookbook />
        <ProductShowroom />
      </main>
    </div>
  );
}
