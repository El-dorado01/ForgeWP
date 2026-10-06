import { LegalPageTemplate } from '../components/LegalPageTemplate';
import { useWpPageLink } from '@forgewp/react';

export const pageConfig = { layout: 'default' };

export function VertragWiderrufenPage() {
  const contactHref = useWpPageLink('kontakt-page', '/kontakt');
  const withdrawalInfoHref = useWpPageLink(
    'widerrufsbelehrung-page',
    '/widerrufsbelehrung',
  );

  return (
    <LegalPageTemplate
      slug='vertrag-widerrufen'
      title='Vertrag widerrufen'
      description='Informationen und Kontakt zur Ausübung eines Widerrufsrechts bei Hospitality 2035.'
      notice='Für die elektronische Erklärung Ihres Widerrufs nutzen Sie bitte das Formular auf dieser Seite. Die Übermittlung wird durch das Easy Digital Downloads Right of Withdrawal Add-on verarbeitet.'
      sections={[
        {
          heading: 'Widerruf erklären',
          paragraphs: [
            'Wenn Sie einen Vertrag widerrufen möchten, erklären Sie Ihren Entschluss bitte über das elektronische Widerrufsformular. Das Formular wird als Easy Digital Downloads Right of Withdrawal Block im WordPress-Inhalt dieser Seite gepflegt.',
            'DICON Marketing- und Beratungsgesellschaft mbH\nReinhardtstraße 29C\n10117 Berlin\ncontact@dicon-beratung.de\n+49 (0)30 300 132 500',
          ],
        },
      ]}
      links={[
        { label: 'Kontakt', href: contactHref },
        { label: 'Widerrufsbelehrung', href: withdrawalInfoHref },
      ]}
    />
  );
}
