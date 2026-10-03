import {
  defineEditable,
  getEditableDefaults,
  richText,
  text,
} from '@forgewp/react';

export const editable = defineEditable({
  eyebrow: text({ label: 'Preview Eyebrow', default: '03 / Vorschau' }),
  title: text({ label: 'Preview Title', default: 'Ein Blick in die Studie.' }),
  description: richText({
    label: 'Preview Description',
    default:
      'Die Vorschau gibt Einblick in Titelblatt, Inhaltsverzeichnis und die Partnerstruktur von Hospitality 2035.',
  }),
  scopeLabel: text({ label: 'Scope Label', default: 'Umfang' }),
  scopeValue: text({ label: 'Scope Value', default: 'ca. 80 Seiten' }),
  formatLabel: text({ label: 'Format Label', default: 'Format' }),
  formatValue: text({ label: 'Format Value', default: 'Digitale PDF' }),
  sampleLabel: text({ label: 'Sample Label', default: 'Einblick' }),
  sampleValue: text({ label: 'Sample Value', default: '5–8 Seiten' }),
  previewLabel: text({
    label: 'Preview Button Label',
    default: 'Vorschau ansehen',
  }),
  pendingNote: text({
    label: 'Pending Note',
    default: 'PDF folgt nach Freigabe',
  }),
  coverAlt: text({
    label: 'Cover Alt Text',
    default: 'Hospitality 2035 study cover preview',
  }),
});

export const defaults = getEditableDefaults(editable);
