import { WpHead, useWpI18n } from '@forgewp/react';
import { HeroSection } from '../components/HeroSection';
import { TrustStrip } from '../components/TrustStrip';
import { FeaturedHotels } from '../components/FeaturedHotels';
import { EditorialStrip } from '../components/EditorialStrip';
import { LatestListicles } from '../components/LatestListicles';
import { Destinations } from '../components/Destinations';

/**
 * Front page — layout composition only.
 *
 * Content schema: cms/editables/front-page.ts (ACF for the WP front page).
 * Each section reads its own fields via useWpMeta — no prop drilling.
 */
export default function HomePage() {
  const { __ } = useWpI18n();

  return (
    <div className='min-h-screen w-full bg-slate-50 font-sans selection:bg-primary selection:text-white'>
      <WpHead
        title={__('Hotelchecker24 — Premium Hotel- & Vergleichs-Magazin')}
        description={__(
          'Entdecken Sie kuratierte Boutique- und Luxushotels in Österreich, Deutschland, der Schweiz und Italien.',
        )}
        ogType='website'
      />

      <HeroSection />
      <TrustStrip />
      <FeaturedHotels />
      <EditorialStrip />
      <LatestListicles />
      <Destinations />
    </div>
  );
}
