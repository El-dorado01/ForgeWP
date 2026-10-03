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
    default: 'Klarer Kauf. Digitale Bereitstellung. Dokumentierte Zustimmung.',
  }),
  title: text({
    label: 'Checkout Title',
    default: 'Ein digitaler Kaufprozess mit klaren Regeln.',
  }),
  description: richText({
    label: 'Checkout Description',
    default:
      'Die Single License wird nach erfolgreicher Zahlung digital bereitgestellt. Alle erforderlichen Informationen und Zustimmungen werden vor dem Kauf eindeutig dokumentiert.',
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
    default: 'Zahlungspflichtig bestellen – 249,00 €',
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
