import {
  buildLicenseInquiryFields,
  LicenseInquiryPage,
  type LicenseInquiryField,
} from '../components/LicenseInquiryPage';
import { useWpPageLink } from '@forgewp/react';
import { form } from '../../../cms/forms/corporate-license-inquiry';

export const pageConfig = { layout: 'default' };

const fieldPresentation: Record<
  string,
  Pick<
    LicenseInquiryField,
    'autoComplete' | 'min' | 'max' | 'placeholder' | 'wide'
  >
> = {
  firstName: { autoComplete: 'given-name' },
  lastName: { autoComplete: 'family-name' },
  company: { autoComplete: 'organization', wide: true },
  street: { autoComplete: 'street-address', wide: true },
  postalCode: { autoComplete: 'postal-code' },
  city: { autoComplete: 'address-level2' },
  country: { autoComplete: 'country-name' },
  email: { autoComplete: 'email', wide: true },
  phone: { autoComplete: 'tel' },
  userCount: { min: 11 },
  locations: { min: 1 },
  scope: {
    placeholder:
      'Zum Beispiel: mehrere Hotels, Unternehmensgruppe oder standortübergreifende Nutzung',
    wide: true,
  },
  message: { placeholder: 'Optional', wide: true },
};

const fields = buildLicenseInquiryFields(form.fields ?? {}, fieldPresentation);

export function UnternehmenslizenzPage() {
  const teamLicenseHref = useWpPageLink('teamlizenz-page', '/lizenz/team');

  return (
    <LicenseInquiryPage
      title='Unternehmenslizenz'
      pageTitle='Nutzungsrechte für Ihre Organisation.'
      description='Unternehmenslizenz für Hospitality 2035 anfragen. Individueller Umfang und Preis für größere Teams, Hotelgruppen und Unternehmen.'
      eyebrow='Unternehmenslizenz'
      price='ab 2.490 €'
      scope='Für größere Teams, Hotelgruppen und Unternehmen. Umfang und Preis werden passend zur geplanten Nutzung vereinbart.'
      introduction='Eine individuelle Lizenzlösung für mehrere Standorte, größere Nutzerkreise und unternehmensweite Nutzung.'
      formIntroduction='Beschreiben Sie kurz Ihre Organisation und den vorgesehenen Einsatz der Studie. DICON stimmt den passenden Lizenzumfang und das Angebot anschließend direkt mit Ihnen ab.'
      features={[
        'Individuell abgestimmter Nutzerkreis',
        'Geeignet für Hotelgruppen und mehrere Standorte',
        'Angebot und Abwicklung direkt durch DICON',
      ]}
      fields={fields}
      formName='corporate-license-inquiry'
      otherLicense={{ label: 'Teamlizenz ansehen', href: teamLicenseHref }}
    />
  );
}
