import { WpHead, useWpI18n } from '../../.forgewp/wordpress';
import { ImpressumHero } from '../../components/ImpressumHero';
import { ImpressumContent } from '../../components/ImpressumContent';

/**
 * Impressum page — layout composition only.
 *
 * Content schema: cms/editables/impressum-page.ts
 * Sections own useWpMeta — no prop drilling.
 */
export function ImpressumPage() {
  const { __ } = useWpI18n();

  return (
    <main className="min-h-screen bg-[#fafaf8] font-sans select-none">
      <WpHead
        title={__('Impressum — Hotelchecker24')}
        description={__(
          'Offizielles Impressum und gesetzliche Offenlegung von Hotelchecker24.',
        )}
      />

      <ImpressumHero />
      <ImpressumContent />
    </main>
  );
}

export default ImpressumPage;
