import { WpHead, useWpI18n } from '../../.forgewp/wordpress';
import { HotelsHero } from '../../components/HotelsHero';
import { HotelsWorkspace } from '../../components/HotelsWorkspace';

/**
 * Hotels directory page — layout composition only.
 *
 * Content schema: cms/editables/hotels-page.ts
 */
export function HotelsPage() {
  const { __ } = useWpI18n();

  return (
    <main className='min-h-screen bg-[#fafaf8] font-sans select-none'>
      <WpHead
        title={__('Hotels — Hotelchecker24')}
        description={__(
          'Entdecken Sie unsere kuratierte Auswahl an Luxushotels, Boutique-Resorts und exklusiven Unterkünften weltweit.',
        )}
      />

      <HotelsHero />

      {/* Main content workspace island */}

      <HotelsWorkspace />
    </main>
  );
}

export default HotelsPage;
