import { LegalPageTemplate } from '../components/LegalPageTemplate';

export const pageConfig = { layout: 'default' };

export function ImpressumPage() {
  return (
    <LegalPageTemplate
      slug='impressum'
      title='Impressum'
      description='Anbieterkennzeichnung der DICON Marketing- und Beratungsgesellschaft mbH.'
      notice='Arbeitsfassung auf Grundlage der Kundendaten. Handelsregisterangabe und vollständige Anbieterkennzeichnung vor Veröffentlichung bestätigen und rechtlich prüfen lassen.'
      sections={[
        {
          heading: 'Angaben gemäß § 5 DDG',
          paragraphs: [
            'DICON Marketing- und Beratungsgesellschaft mbH\nReinhardtstraße 29C\n10117 Berlin\nDeutschland',
          ],
        },
        {
          heading: 'Vertreten durch',
          paragraphs: ['Geschäftsführer: Dipl.-Volkswirt Roland Schwecke'],
        },
        {
          heading: 'Kontakt',
          paragraphs: [
            'Telefon: +49 (0)30 300 132 500\nE-Mail: contact@dicon-beratung.de',
          ],
        },
        {
          heading: 'Registereintrag',
          paragraphs: [
            'Eintragung im Handelsregister. Registergericht: Amtsgericht Berlin-Charlottenburg. Handelsregisternummer: HRB 933399 B.',
          ],
        },
        {
          heading: 'Umsatzsteuer-Identifikationsnummer',
          paragraphs: [
            'Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: DE235630864.',
          ],
        },
        {
          heading: 'Verantwortlich für den Inhalt',
          paragraphs: ['Roland Schwecke, Anschrift wie oben.'],
        },
      ]}
      links={[
        {
          label: 'contact@dicon-beratung.de',
          href: 'mailto:contact@dicon-beratung.de',
        },
        { label: '+49 (0)30 300 132 500', href: 'tel:+4930300132500' },
      ]}
    />
  );
}
