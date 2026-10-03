import { LegalPageTemplate } from '../components/LegalPageTemplate';

export const pageConfig = { layout: 'default' };

export function KontaktPage() {
  return (
    <LegalPageTemplate
      slug='kontakt'
      title='Kontakt'
      description='Kontaktieren Sie DICON zur Studie Hospitality 2035 und zu Lizenzanfragen.'
      sections={[
        {
          heading: 'DICON Marketing- und Beratungsgesellschaft mbH',
          paragraphs: [
            'Reinhardtstraße 29C\n10117 Berlin\nDeutschland',
            'Geschäftsführer: Dipl.-Volkswirt Roland Schwecke',
          ],
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
