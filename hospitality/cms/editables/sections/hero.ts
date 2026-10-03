import {
  defineEditable,
  getEditableDefaults,
  richText,
  text,
} from '@forgewp/react';

export const editable = defineEditable({
  eyebrow: richText({
    label: 'Hero Eyebrow',
    default: 'Eine strategische Studie über die Zukunft der Hotellerie',
  }),
  location: text({
    label: 'Hero Location',
    default: 'Berlin / Zürich / 2026',
  }),
  word: text({
    label: 'Hero Word',
    default: 'Hospitality',
  }),
  year: text({
    label: 'Hero Year',
    default: '2035',
  }),
  summary: richText({
    label: 'Hero Summary',
    default:
      'Steigende Kosten, neue Technologien und veränderte Erwartungen stellen die wirtschaftlichen Grundlagen des Hotelbetriebs neu auf.',
  }),
  subtitle: richText({
    label: 'Hero Subtitle',
    default: 'WIE SICH DIE WIRTSCHAFTLICHE LOGIK DER HOTELLERIE VERÄNDERT',
  }),
  previewLabel: text({
    label: 'Preview Button Label',
    default: 'Vorschau ansehen',
  }),
  buyLabel: text({
    label: 'Buy Button Label',
    default: 'Studie kaufen · 249 € netto',
  }),
  scrollLabel: text({
    label: 'Scroll Label',
    default: 'Scroll to explore',
  }),
  coverAlt: text({
    label: 'Cover Image Alt Text',
    default: 'Hospitality 2035 study cover',
  }),
});

export const defaults = getEditableDefaults(editable);
