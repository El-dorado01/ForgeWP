import {
  defineEditable,
  getEditableDefaults,
  repeater,
  richText,
  text,
} from '@forgewp/react';

export const editable = defineEditable({
  eyebrow: text({ label: 'Checkout Eyebrow', default: '09 / Checkout' }),
  intro: text({
    label: 'Checkout Intro',
    default: 'Die Studie für Entscheiderinnen und Entscheider',
  }),
  title: text({
    label: 'Checkout Title',
    default: 'Hospitality 2035',
  }),
  description: richText({
    label: 'Checkout Description',
    default:
      'Wie sich die wirtschaftliche Logik der Hotellerie verändert. Eine strategische Analyse für Entscheiderinnen und Entscheider aus Hotellerie, Immobilien-, Finanz- und Technologiebranche – auf rund 90 Seiten.',
  }),
  takeawaysTitle: text({
    label: 'Study Benefits Title',
    default: 'Was Sie aus Hospitality 2035 mitnehmen',
  }),
  takeaways: repeater({
    label: 'Study Benefits',
    mode: 'dynamic',
    fields: {
      text: text({ label: 'Benefit', default: 'Strategische Erkenntnisse' }),
    },
    default: [
      { text: 'Welche Kosten- und Betriebsstrukturen bis 2035 unter Druck geraten' },
      { text: 'Wo KI und Automatisierung tatsächlich wirtschaftliche Wirkung entfalten können' },
      { text: 'Wie sich Hotelkonzepte und Flächenbedarfe verändern' },
      { text: 'Welche Geschäftsmodelle an Bedeutung gewinnen' },
      { text: 'Wie sich Hotels auf zunehmende Automatisierung vorbereiten können' },
      { text: 'Welche strategischen Konsequenzen sich für Betreiber, Eigentümer und Investoren ergeben' },
    ],
  }),
  consentText: richText({
    label: 'Consent Text',
    default:
      'Ich stimme ausdrücklich zu, dass DICON vor Ablauf der 14-tägigen Widerrufsfrist mit der Bereitstellung der digitalen Studie beginnt. Mir ist bekannt, dass ich mit Beginn der Bereitstellung der Studie mein Widerrufsrecht verliere.',
  }),
  consentNote: richText({
    label: 'Consent Note',
    default:
      'Die Zustimmung wird im finalen Checkout mit Datum und Uhrzeit dokumentiert und in der Bestellbestätigung ausgewiesen.',
  }),
  productLabel: text({ label: 'Product Label', default: 'Single License' }),
  productName: text({ label: 'Product Name', default: 'Hospitality 2035' }),
  orderButtonLabel: text({
    label: 'Order Button Label',
    default: 'Studie kaufen',
  }),
  previewButtonLabel: text({
    label: 'Preview Button Label',
    default: 'Vorschau ansehen',
  }),
  integrationNote: text({
    label: 'Integration Note',
    default: 'WooCommerce + Stripe folgt',
  }),
  liveSystemLabel: text({
    label: 'Live System Label',
    default: 'Vorgesehen im Live-System',
  }),
  requirements: repeater({
    label: 'Checkout Requirements',
    mode: 'dynamic',
    fields: {
      text: richText({
        label: 'Requirement',
        default: 'Edit this checkout requirement.',
      }),
    },
    default: [
      { text: 'AGB & Lizenzbedingungen direkt erreichbar' },
      { text: 'Widerrufsbelehrung vor Bestellabschluss verlinkt' },
      { text: 'Vertragsbestätigung auf dauerhaftem Datenträger' },
      { text: 'Elektronische Funktion „Vertrag widerrufen“' },
    ],
  }),
});

export const defaults = getEditableDefaults(editable);
