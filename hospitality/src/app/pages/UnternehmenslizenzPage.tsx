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
    label: 'Unternehmen / Hotelgruppe',
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
    min: 11,
    required: true,
  },
  { name: 'locations', label: 'Anzahl der Standorte', type: 'number', min: 1 },
  {
    name: 'scope',
    label: 'Gewünschter Nutzungsumfang',
    type: 'textarea',
    placeholder:
      'Zum Beispiel: mehrere Hotels, Unternehmensgruppe oder standortübergreifende Nutzung',
    required: true,
    wide: true,
  },
  {
    name: 'message',
    label: 'Weitere Informationen',
    type: 'textarea',
    placeholder: 'Optional',
    wide: true,
  },
];

export function UnternehmenslizenzPage() {
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
      otherLicense={{ label: 'Teamlizenz ansehen', href: '/lizenz/team' }}
    />
  );
}
