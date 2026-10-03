import {
  defineEditable,
  getEditableDefaults,
  repeater,
  richText,
  text,
} from '@forgewp/react';

export const editable = defineEditable({
  eyebrow: text({ label: 'Audience Eyebrow', default: '02 / Relevanz' }),
  intro: text({
    label: 'Audience Intro',
    default: 'Eine Perspektive für jede Rolle im Hospitality-Ökosystem',
  }),
  title: text({
    label: 'Audience Title',
    default: 'Für wen ist Hospitality 2035 relevant?',
  }),
  description: richText({
    label: 'Audience Description',
    default:
      'Die Studie verbindet die Perspektiven derjenigen, die Hotels betreiben, finanzieren, entwickeln und technologisch neu denken.',
  }),
  audiences: repeater({
    label: 'Audience Groups',
    mode: 'dynamic',
    min: 1,
    fields: {
      number: text({ label: 'Number', default: '01' }),
      title: text({
        label: 'Title',
        default: 'Hotelbetreiber und Hotelgruppen',
      }),
      text: richText({
        label: 'Text',
        default: 'Edit this audience description.',
      }),
    },
    default: [
      {
        number: '01',
        title: 'Hotelbetreiber und Hotelgruppen',
        text: 'Zur strategischen Weiterentwicklung von Geschäftsmodellen, Betriebsabläufen und zukünftigen Betreiberkonzepten.',
      },
      {
        number: '02',
        title: 'Eigentümer, Investoren und Projektentwickler',
        text: 'Zur Einschätzung zukünftiger Anforderungen an Hotelimmobilien, Flächen, Investitionen und Betreiberfähigkeit.',
      },
      {
        number: '03',
        title: 'Technologie- und Lösungsanbieter',
        text: 'Zur Einordnung der Nachfrage nach Digitalisierung, künstlicher Intelligenz, Automatisierung und Robotik.',
      },
      {
        number: '04',
        title: 'Banken, Finanzierer und Berater',
        text: 'Zur Bewertung struktureller Veränderungen, neuer Risiken und langfristiger Wettbewerbsfähigkeit.',
      },
      {
        number: '05',
        title: 'Verbände und Branchenorganisationen',
        text: 'Als fundierte Grundlage für die Diskussion über die Zukunft und Wettbewerbsfähigkeit der Hotellerie.',
      },
    ],
  }),
});

export const defaults = getEditableDefaults(editable);
