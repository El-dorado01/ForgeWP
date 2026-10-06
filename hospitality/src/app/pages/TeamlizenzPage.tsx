import {
  buildLicenseInquiryFields,
  LicenseInquiryPage,
  type LicenseInquiryField,
} from '../components/LicenseInquiryPage';
import { useWpPageLink } from '@forgewp/react';
import { form } from '../../../cms/forms/team-license-inquiry';

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
  userCount: { min: 1, max: 10 },
  message: { placeholder: 'Optional', wide: true },
};

const fields = buildLicenseInquiryFields(form.fields ?? {}, fieldPresentation);

export function TeamlizenzPage() {
  const corporateLicenseHref = useWpPageLink(
    'unternehmenslizenz-page',
    '/lizenz/unternehmen',
  );

  return (
    <LicenseInquiryPage
      title='Teamlizenz'
      pageTitle='Gemeinsam fundierte Entscheidungen treffen.'
      description='Teamlizenz für Hospitality 2035 anfragen. Nutzungsrecht für bis zu zehn Personen innerhalb eines Unternehmens.'
      eyebrow='Teamlizenz'
      price='1.490 €'
      scope='Ein Nutzungsrecht für bis zu zehn Personen innerhalb eines Unternehmens.'
      introduction='Die vollständige Studie für Managementteams, Fachabteilungen, Beratungsunternehmen und kleinere Hotelgruppen.'
      formIntroduction='Teilen Sie uns Ihre Kontaktdaten und den geplanten Nutzerkreis mit. DICON meldet sich mit den nächsten Schritten zur Bestellung und Rechnungsstellung.'
      features={[
        'Nutzungsrecht für bis zu 10 Personen',
        'Einheitliche Lizenz innerhalb Ihres Unternehmens',
        'Angebot und Abwicklung direkt durch DICON',
      ]}
      fields={fields}
      formName='team-license-inquiry'
      otherLicense={{
        label: 'Firmenlizenz ansehen',
        href: corporateLicenseHref,
      }}
    />
  );
}
