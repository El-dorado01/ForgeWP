import {
  WpHead,
  useWpI18n,
} from '@forgewp/react';
import { AboutHero } from '../../components/AboutHero';
import { AboutStats } from '../../components/AboutStats';
import { AboutMission } from '../../components/AboutMission';
import { AboutValues } from '../../components/AboutValues';
import { AboutTeam } from '../../components/AboutTeam';
import { AboutLatestListicles } from '../../components/AboutLatestListicles';
import { AboutCta } from '../../components/AboutCta';
import { sectionPaddingY } from '../../lib/section-padding';

/**
 * About page — layout composition only.
 *
 * Content schema: cms/editables/ber-uns-page.ts (ACF for this template).
 * Each About* section reads its own fields via useWpMeta — no prop drilling.
 *
 * Dynamic CPT lists (listicles) must live in a child component so ForgeWP can
 * auto-island / hydrate them on the exported WP site. Queries inlined in this
 * page template are empty at compile-time and never re-run client-side.
 */
export function BerUnsPage() {
  const { __ } = useWpI18n();

  return (
    <main className="min-h-screen bg-[#fafaf8] font-sans select-none">
      <WpHead
        title={__('Über uns — Hotelchecker24')}
        description={__(
          'Erfahren Sie mehr über Hotelchecker24: das unabhängige Magazin für Luxushotels, Reiseziele und kuratierte Reiseberichte.',
        )}
      />

      <AboutHero />
      <AboutStats />

      {/* Shared vertical spacing for Mission | Values (children bake paddingY: none). */}
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${sectionPaddingY('lg')}`}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <AboutMission />
          <AboutValues />
        </div>
      </div>

      <AboutTeam />
      <AboutLatestListicles />
      <AboutCta />
    </main>
  );
}
