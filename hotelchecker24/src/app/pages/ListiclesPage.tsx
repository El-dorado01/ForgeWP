import { WpHead, useWpI18n } from '../../.forgewp/wordpress';
import { ListiclesHero } from '../../components/ListiclesHero';
import { ListiclesWorkspace } from '../../components/ListiclesWorkspace';

/**
 * Listicles (Hotelvergleiche) directory page — layout composition only.
 *
 * Content schema: cms/editables/listicles-page.ts
 */
export function ListiclesPage() {
  const { __ } = useWpI18n();

  return (
    <main className='min-h-screen bg-[#fafaf8] font-sans select-none'>
      <WpHead
        title={__('Hotelvergleiche — Hotelchecker24')}
        description={__(
          'Kuratierte Hotelvergleiche, Hotellisten und Insider-Tipps von unserer Redaktion. Entdecken Sie die besten Hotels und Reiseziele.',
        )}
      />

      <ListiclesHero />

      {/* Dynamic workspace island */}
      <ListiclesWorkspace />
    </main>
  );
}

export default ListiclesPage;
