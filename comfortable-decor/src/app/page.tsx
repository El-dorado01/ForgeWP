import { WpHead } from '../.forgewp/wordpress';
import { Hydrate } from '@forgewp/react';
import Navbar from '../components/navigation/Navbar';
import HeroSection from '../components/HeroSection';
import EditorialLookbook from '../components/EditorialLookbook';
import AboutSection from '../components/AboutSection';
import LightingShowcase from '../components/LightingShowcase';
import ProductShowroom from '../components/ProductShowroom';
import BannerCta from '../components/BannerCta';
import Footer from '../components/Footer';

export default function HomePage() {
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
        <Hydrate trigger='load'>
          <HeroSection />
        </Hydrate>
        <Hydrate
          trigger='visible'
          preload='near-visible'
        >
          <EditorialLookbook />
        </Hydrate>
        <Hydrate
          trigger='visible'
          preload='near-visible'
        >
          <AboutSection />
        </Hydrate>
        <Hydrate
          trigger='visible'
          preload='near-visible'
        >
          <LightingShowcase />
        </Hydrate>
        <Hydrate
          trigger='visible'
          preload='near-visible'
        >
          <ProductShowroom />
        </Hydrate>
        <Hydrate
          trigger='visible'
          preload='near-visible'
        >
          <BannerCta />
        </Hydrate>
        <Hydrate
          trigger='visible'
          preload='near-visible'
        >
          <Footer />
        </Hydrate>
      </main>
    </div>
  );
}
