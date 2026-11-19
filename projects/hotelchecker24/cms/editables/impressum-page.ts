/**
 * Impressum page — single editable contract.
 *
 * Source of truth for ACF (page-impressum-page.php) and Impressum* sections.
 */
import {
  defineEditable,
  getEditableDefaults,
  text,
  richText,
} from '@forgewp/react';

export const editable = defineEditable({
  hero_badge: text({
    label: 'Hero Badge',
    default: 'Gesetzliche Offenlegung',
  }),
  hero_title: text({
    label: 'Hero Title',
    default: 'Impressum',
  }),

  company_heading: text({
    label: 'Company Section Heading',
    default: 'Medieninhaber & Unternehmensbezeichnung',
  }),
  company_name: text({
    label: 'Company Name',
    default: 'maxonline® Marketing hfw GesmbH',
  }),
  company_legal_form: text({
    label: 'Legal Form',
    default: 'Rechtsform: Gesellschaft mit beschränkter Haftung',
  }),

  address_heading: text({
    label: 'Address Section Heading',
    default: 'Firmensitz & Anschrift',
  }),
  address_line_1: text({
    label: 'Address Line 1',
    default: 'Coronablick 7',
  }),
  address_line_2: text({
    label: 'Address Line 2',
    default: 'A-3652 Leiben',
  }),
  address_country: text({
    label: 'Country',
    default: 'Österreich',
  }),

  contact_heading: text({
    label: 'Contact Section Heading',
    default: 'Kontakt',
  }),
  contact_email: text({
    label: 'Contact Email',
    default: 'office@max-online.at',
  }),
  contact_website_label: text({
    label: 'Website Label Prefix',
    default: 'Internet:',
  }),
  contact_website_url: text({
    label: 'Website URL',
    default: 'https://max-online.at',
  }),
  contact_website_display: text({
    label: 'Website Display Text',
    default: 'www.max-online.at',
  }),

  register_heading: text({
    label: 'Register Section Heading',
    default: 'Register & Gerichtsstand',
  }),
  register_number_label: text({
    label: 'Company Register Label',
    default: 'Firmenbuchnummer',
  }),
  register_number: text({
    label: 'Company Register Number',
    default: 'FN 659087 x',
  }),
  vat_label: text({
    label: 'VAT Label',
    default: 'Umsatzsteuer-ID',
  }),
  vat_id: text({
    label: 'VAT ID',
    default: 'ATU82431815',
  }),
  court_label: text({
    label: 'Court Label',
    default: 'Gerichtsstandort',
  }),
  court_name: text({
    label: 'Court Name',
    default: 'Landesgericht St. Pölten',
  }),

  legal_heading: text({
    label: 'Legal Sidebar Heading',
    default: 'Rechtliche Hinweise',
  }),
  business_purpose_label: text({
    label: 'Business Purpose Label',
    default: 'Unternehmensgegenstand',
  }),
  business_purpose: richText({
    label: 'Business Purpose',
    default:
      'Dienstleistungen in der automatischen Datenverarbeitung und Informationstechnik.',
  }),
  authority_label: text({
    label: 'Supervisory Authority Label',
    default: 'Aufsichtsbehörde',
  }),
  authority: richText({
    label: 'Supervisory Authority',
    default: 'Bezirkshauptmannschaft Melk (gemäß E-Commerce Gesetz - ECG)',
  }),
  trademark_label: text({
    label: 'Trademark Label',
    default: 'Markenschutz',
  }),
  trademark: richText({
    label: 'Trademark Notice',
    default:
      'maxonline® ist eine eingetragene Wortbildmarke.<br />Markenregister Aktenzeichen: AM 12102/2019<br />Register-Nr.: 305857',
  }),
});

export const defaults = getEditableDefaults(editable);
