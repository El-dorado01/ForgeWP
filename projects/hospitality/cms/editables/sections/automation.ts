import {
  defineEditable,
  getEditableDefaults,
  image,
  repeater,
  richText,
  text,
} from '@forgewp/react';

export const editable = defineEditable({
  eyebrow: text({ label: 'Automation Eyebrow', default: '06 / Automation' }),
  intro: text({
    label: 'Automation Intro',
    default: 'Wenn Technologie in den Betrieb einzieht',
  }),
  title: text({
    label: 'Automation Title',
    default: 'Der automatisierte Hotelbetrieb beginnt mit dem Raum.',
  }),
  description: richText({
    label: 'Automation Description',
    default:
      'Künstliche Intelligenz und Robotik sind keine isolierten Innovationen. Sie verändern, wie Gäste ankommen, wie Teams arbeiten und wie ein Hotel seine Fläche organisiert.',
  }),
  imageAlt: text({
    label: 'Automation Image Alt',
    default: 'Robotic hotel lobby concept with autonomous service technology',
  }),
  primaryImage: image({ label: 'Primary Automation Image' }),
  detailTitle: text({
    label: 'Automation Detail Title',
    default: 'Von der Software bis zum Service-Roboter.',
  }),
  detailDescription: richText({
    label: 'Automation Detail Description',
    default:
      'Die Studie betrachtet die gesamte Kette: digitale Prozesse, intelligente Gebäudetechnik und physische Systeme, die repetitive Abläufe übernehmen. Entscheidend ist nicht die einzelne Technologie, sondern ihre Einbettung in einen wirtschaftlich tragfähigen Betrieb.',
  }),
  details: repeater({
    label: 'Automation Details',
    mode: 'dynamic',
    min: 1,
    fields: {
      number: text({ label: 'Number', default: '01' }),
      title: text({ label: 'Title', default: 'Digitale Abläufe' }),
      text: richText({
        label: 'Text',
        default: 'Edit this automation detail.',
      }),
    },
    default: [
      {
        number: '01',
        title: 'Digitale Abläufe',
        text: 'Check-in, Kommunikation und Planung werden nahtloser.',
      },
      {
        number: '02',
        title: 'Intelligente Gebäude',
        text: 'Technik, Energie und Zugang reagieren auf Nutzung und Bedarf.',
      },
      {
        number: '03',
        title: 'Physischer Service',
        text: 'Robotik unterstützt Teams dort, wo Prozesse wiederholbar und planbar sind.',
      },
    ],
  }),
  secondImageAlt: text({
    label: 'Second Automation Image Alt',
    default: 'Future hotel lobby with robotic guest services',
  }),
  secondaryImage: image({ label: 'Secondary Automation Image' }),
});

export const defaults = getEditableDefaults(editable);
