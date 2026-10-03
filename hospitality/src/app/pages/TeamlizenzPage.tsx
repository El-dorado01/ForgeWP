import {
  LicenseInquiryPage,
  type LicenseInquiryField,
} from '../components/LicenseInquiryPage';

export const pageConfig = { layout: 'default' };

const fields: LicenseInquiryField[] = [
  {
    name: 'firstName',
    label: 'Vorname',
    autoComplete: 'given-name',
    required: true,
  },
  {
    name: 'lastName',
    label: 'Nachname',
    autoComplete: 'family-name',
    required: true,
  },
  {
    name: 'company',
    label: 'Unternehmen',
    autoComplete: 'organization',
    required: true,
    wide: true,
  },
  {
    name: 'street',
    label: 'Straße und Hausnummer',
    autoComplete: 'street-address',
    required: true,
    wide: true,
  },
  {
    name: 'postalCode',
    label: 'Postleitzahl',
    autoComplete: 'postal-code',
    required: true,
  },
  {
    name: 'city',
    label: 'Ort',
    autoComplete: 'address-level2',
    required: true,
  },
  {
    name: 'country',
    label: 'Land',
    autoComplete: 'country-name',
    required: true,
  },
  {
    name: 'email',
    label: 'Geschäftliche E-Mail-Adresse',
    type: 'email',
    autoComplete: 'email',
    required: true,
    wide: true,
  },
  {
    name: 'phone',
    label: 'Telefonnummer',
    type: 'tel',
    autoComplete: 'tel',
    required: true,
  },
  {
    name: 'userCount',
    label: 'Geplante Nutzerzahl',
    type: 'number',
    min: 1,
    max: 10,
    required: true,
  },
  {
    name: 'message',
    label: 'Nachricht oder Rückrufhinweis',
    type: 'textarea',
    placeholder: 'Optional',
    wide: true,
  },
];

export function TeamlizenzPage() {
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
        href: '/lizenz/unternehmen',
      }}
    />
  );
}
