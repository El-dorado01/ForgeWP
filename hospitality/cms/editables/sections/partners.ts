import {
  defineEditable,
  getEditableDefaults,
  image,
  repeater,
  richText,
  text,
  url,
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
    fields: {
      name: text({ label: 'Name', default: 'KNX Deutschland' }),
      logo: image({ label: 'Partner Logo' }),
      url: url({ label: 'Partner Website URL' }),
    },
    default: [
      { name: 'KNX Deutschland', logo: null, url: '' },
      { name: 'HotellerieSuisse', logo: null, url: '' },
    ],
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
      logo: image({ label: 'Partner Logo' }),
      url: url({ label: 'Partner Website URL' }),
    },
    default: [
      {
        name: 'Accor',
        role: 'Hospitality / Operator Partner',
        logo: null,
        url: '',
      },
      {
        name: 'Oracle Hospitality',
        role: 'Technology & Software Partner',
        logo: null,
        url: '',
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
    fields: {
      name: text({ label: 'Name', default: '' }),
      url: url({ label: 'Partner Website URL' }),
    },
    default: [],
  }),
  mediaLabel: text({ label: 'Media Label', default: 'Media Partner' }),
  mediaLogo: image({
    label: 'Media Partner Logo',
    default: '/assets/client-assets/partner-assets/hotel-inside.jpg',
  }),
  mediaName: text({ label: 'Media Name', default: 'hotelinside' }),
  mediaDescription: richText({
    label: 'Media Description',
    default: 'Eventmoderation und redaktionelle Berichterstattung.',
  }),
  ihaLogo: image({ label: 'IHA Logo' }),
  ihaUrl: url({ label: 'IHA Website URL' }),
});

export const defaults = getEditableDefaults(editable);
