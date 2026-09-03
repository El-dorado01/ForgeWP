import { WpHead, useWpI18n } from '@forgewp/react';
import { ContactHero } from '../../components/ContactHero';
import { ContactDetails } from '../../components/ContactDetails';
import { ContactFormSection } from '../../components/ContactFormSection';
import { sectionPaddingY } from '../../lib/section-padding';

/**
 * Contact page — layout composition only.
 *
 * Content schema: cms/editables/kontakt-page.ts
 * Gutenberg parent shell: contact-split-section (details + form).
 * Site contact options: phone, email, socials (cms site options).
 */
export function KontaktPage() {
  const { __ } = useWpI18n();

  return (
    <main className="min-h-screen bg-[#fafaf8] font-sans select-none">
      <WpHead
        title={__('Kontakt — Hotelchecker24')}
        description={__(
          'Kontaktieren Sie die Hotelchecker24-Redaktion. Wir helfen Ihnen bei Fragen zu Hotels, Reiseempfehlungen und Kooperationsanfragen.',
        )}
      />

      <ContactHero />

      {/* Mirrors contact-split-section shell (details 2 cols | form 3 cols). */}
      <div
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${sectionPaddingY('lg')}`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-10 items-start">
          <div className="min-w-0">
            <ContactDetails />
          </div>
          <div className="min-w-0">
            <ContactFormSection />
          </div>
        </div>
      </div>
    </main>
  );
}

export default KontaktPage;
