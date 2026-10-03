import {
  defineEditable,
  getEditableDefaults,
  richText,
  text,
} from '@forgewp/react';

export const editable = defineEditable({
  eyebrow: text({ label: 'Events Eyebrow', default: '04 / Events 2026' }),
  intro: text({
    label: 'Events Intro',
    default:
      'Zwei Orte. Eine gemeinsame Frage nach der Zukunft der Hotellerie.',
  }),
  title: text({ label: 'Events Title', default: 'Hospitality 2035 live.' }),
  description: richText({
    label: 'Events Description',
    default:
      'Die Veröffentlichung der Studie wird von zwei Gesprächen für Entscheider aus Hotellerie, Technologie, Immobilienwirtschaft und Finanzierung begleitet.',
  }),
});

export const defaults = getEditableDefaults(editable);
