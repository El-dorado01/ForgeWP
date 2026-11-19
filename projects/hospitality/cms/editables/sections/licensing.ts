import {
  defineEditable,
  getEditableDefaults,
  repeater,
  richText,
  text,
  url,
} from '@forgewp/react';

export const editable = defineEditable({
  eyebrow: text({ label: 'Licensing Eyebrow', default: '05 / Lizenzen' }),
  intro: text({
    label: 'Licensing Intro',
    default: 'Der passende Zugang für Einzelpersonen, Teams und Unternehmen',
  }),
  title: text({
    label: 'Licensing Title',
    default: 'Die passende Lizenz für Ihren Bedarf.',
  }),
  description: richText({
    label: 'Licensing Description',
    default:
      'Sichern Sie sich den vollständigen strategischen Blick auf die wirtschaftliche Zukunft der Hotellerie.',
  }),
  licenses: repeater({
    label: 'License Cards',
    mode: 'fixed',
    fields: {
      name: text({ label: 'Name', default: 'Single License' }),
      label: text({ label: 'Label', default: 'Einzellizenz' }),
      scope: text({ label: 'Scope', default: 'Für eine einzelne Person' }),
      description: richText({
        label: 'Description',
        default: 'Edit this license description.',
      }),
      action: text({ label: 'Action Label', default: 'Einzellizenz kaufen' }),
    },
    default: [
      {
        name: 'Single License',
        label: 'Einzellizenz',
        scope: 'Für eine einzelne Person',
        description:
          'Direkter digitaler Zugang zur Studie für die persönliche strategische Arbeit.',
        action: 'Einzellizenz kaufen',
      },
      {
        name: 'Team License',
        label: 'Teamlizenz',
        scope: 'Bis zu 10 Nutzer in einem Unternehmen',
        description:
          'Gemeinsame Nutzung für Teams, Abteilungen und interne Strategieprozesse.',
        action: 'Teamlizenz anfragen',
      },
      {
        name: 'Corporate License',
        label: 'Unternehmenslizenz',
        scope: 'Für größere Teams und Hotelgruppen',
        description:
          'Individueller Umfang für mehrere Standorte, große Organisationen und Unternehmensgruppen.',
        action: 'Unternehmenslizenz anfragen',
      },
    ],
  }),
  singleLicenseUrl: url({ label: 'Single License URL', default: '' }),
  teamLicenseUrl: url({ label: 'Team License URL', default: '' }),
  companyLicenseUrl: url({ label: 'Company License URL', default: '' }),
  vatNote: text({
    label: 'VAT Note',
    default:
      'Alle Preise verstehen sich zuzüglich der gesetzlich anwendbaren Umsatzsteuer.',
  }),
});

export const defaults = getEditableDefaults(editable);
