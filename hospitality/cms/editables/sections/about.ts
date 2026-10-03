import {
  defineEditable,
  getEditableDefaults,
  richText,
  text,
} from '@forgewp/react';

export const editable = defineEditable({
  eyebrow: text({ label: 'About Eyebrow', default: '08 / Herausgeber' }),
  intro: text({
    label: 'About Intro',
    default: 'Wirtschaftliche Expertise für die Hotellerie seit 2004',
  }),
  title: text({
    label: 'About Title',
    default: 'DICON denkt Hotellerie wirtschaftlich.',
  }),
  description: richText({
    label: 'About Description',
    default:
      'DICON Marketing- und Beratungsgesellschaft mbH begleitet die Hotellerie mit Marktanalysen, Wirtschaftlichkeitsbewertungen und strategischer Beratung.',
  }),
  companyDescription: richText({
    label: 'Company Description',
    default:
      'DICON ist auf die wirtschaftliche und strategische Beratung der Hotellerie sowie auf Hotelentwicklung und die Bewertung neuer Beherbergungs- und Betreiberkonzepte spezialisiert.',
  }),
  cityLabel: text({ label: 'City Label', default: 'Berlin · Deutschland' }),
  foundedLabel: text({ label: 'Founded Label', default: 'Gegründet 2004' }),
  authorLabel: text({ label: 'Author Label', default: 'Autor / Herausgeber' }),
  authorName: text({ label: 'Author Name', default: 'Roland Schwecke' }),
  authorRole: text({
    label: 'Author Role',
    default: 'Dipl.-Volkswirt · Hotelkaufmann · Geschäftsführer',
  }),
  authorDescription: richText({
    label: 'Author Description',
    default:
      'Roland Schwecke beschäftigt sich seit vielen Jahren mit der Entwicklung der Beherbergungswirtschaft, neuen Hotelkonzepten und den wirtschaftlichen Folgen des strukturellen Wandels.',
  }),
});

export const defaults = getEditableDefaults(editable);
