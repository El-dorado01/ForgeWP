import {
  defineEditable,
  getEditableDefaults,
  repeater,
  richText,
  text,
} from '@forgewp/react';

export const editable = defineEditable({
  eyebrow: text({ label: 'Partners Eyebrow', default: '07 / Netzwerk' }),
  intro: text({
    label: 'Partners Intro',
    default:
      'Ein Branchenprojekt mit institutioneller und technologischer Perspektive',
  }),
  title: text({
    label: 'Partners Title',
    default: 'Mit Unterstützung aus der Branche.',
  }),
  description: richText({
    label: 'Partners Description',
    default:
      'Hospitality 2035 ordnet den Wandel gemeinsam mit Partnern aus Hotellerie, Technologie, Verbänden und Medien ein.',
  }),
  associationLabel: text({
    label: 'Association Label',
    default: 'Studienunterstützer / Branchenpartner',
  }),
  associationNote: text({
    label: 'Association Note',
    default: 'Weitere Logos werden nach verbindlicher Bestätigung ergänzt.',
  }),
  associations: repeater({
    label: 'Association Partners',
    mode: 'dynamic',
    fields: { name: text({ label: 'Name', default: 'KNX Deutschland' }) },
    default: [{ name: 'KNX Deutschland' }, { name: 'HotellerieSuisse' }],
  }),
  strategicLabel: text({
    label: 'Strategic Label',
    default: 'Strategic Partners',
  }),
  strategicPartners: repeater({
    label: 'Strategic Partners',
    mode: 'dynamic',
    fields: {
      name: text({ label: 'Name', default: 'Accor' }),
      role: text({ label: 'Role', default: 'Hospitality / Operator Partner' }),
    },
    default: [
      { name: 'Accor', role: 'Hospitality / Operator Partner' },
      {
        name: 'Terra Robotics / UBTECH',
        role: 'Robotics & Automation Partner',
      },
      {
        name: 'Oracle Hospitality',
        role: 'Technology & Software Partner',
      },
    ],
  }),
  innovationLabel: text({
    label: 'Innovation Label',
    default: 'Industry & Innovation Partners',
  }),
  innovationPartners: repeater({
    label: 'Innovation Partners',
    mode: 'dynamic',
    fields: { name: text({ label: 'Name', default: 'Häfele' }) },
    default: [{ name: 'Häfele' }, { name: 'DreamBoks' }],
  }),
  mediaLabel: text({ label: 'Media Label', default: 'Media Partner' }),
  mediaName: text({ label: 'Media Name', default: 'hotelinside' }),
  mediaDescription: richText({
    label: 'Media Description',
    default: 'Eventmoderation und redaktionelle Berichterstattung.',
  }),
});

export const defaults = getEditableDefaults(editable);
