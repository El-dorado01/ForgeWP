import {
  defineEditable,
  getEditableDefaults,
  repeater,
  richText,
  text,
} from '@forgewp/react';

export const editable = defineEditable({
  eyebrow: text({ label: 'Study Eyebrow', default: '01 / Die Studie' }),
  topics: text({
    label: 'Study Topics',
    default: 'Wirtschaft · Technologie · Betrieb · Raum',
  }),
  title: text({
    label: 'Study Title',
    default: 'Die Hotellerie von morgen beginnt heute.',
  }),
  lead: richText({
    label: 'Study Lead',
    default:
      'Die entscheidende Frage lautet nicht, ob sich die wirtschaftliche Logik der Hotellerie verändert, sondern wie schnell und in welcher Form.',
  }),
  description: richText({
    label: 'Study Description',
    default:
      'Hospitality 2035 verbindet wirtschaftliche Analyse mit strategischer Zukunftsbetrachtung. Die Studie untersucht, wie Kostenstrukturen, Geschäftsmodelle, Flächennutzung und Wettbewerbsfähigkeit auf den Wandel reagieren.',
  }),
  theses: repeater({
    label: 'Study Theses',
    mode: 'dynamic',
    min: 1,
    fields: {
      number: text({ label: 'Number', default: '01' }),
      title: text({ label: 'Title', default: 'Personal und Kosten' }),
      text: richText({ label: 'Text', default: 'Edit this thesis.' }),
    },
    default: [
      {
        number: '01',
        title: 'Personal und Kosten',
        text: 'Personalengpässe und steigende Betriebskosten verändern die Grundlage jedes Hotelbetriebs.',
      },
      {
        number: '02',
        title: 'KI und Digitalisierung',
        text: 'Software, künstliche Intelligenz und automatisierte Prozesse werden zum operativen Kern.',
      },
      {
        number: '03',
        title: 'Robotik und Automation',
        text: 'Physische Automation verändert Abläufe, Servicequalität und die Organisation von Arbeit.',
      },
      {
        number: '04',
        title: 'Neue Geschäftsmodelle',
        text: 'Betreiber-, Franchise- und Plattformmodelle verschieben die Rollen in der Wertschöpfung.',
      },
      {
        number: '05',
        title: 'Produktive Flächen',
        text: 'Die wirtschaftliche Qualität eines Hotels wird stärker an jedem genutzten Quadratmeter gemessen.',
      },
      {
        number: '06',
        title: 'Die neue Guest Journey',
        text: 'Die Reise des Gastes wird nahtloser, datenbasierter und stärker auf individuelle Bedürfnisse ausgerichtet.',
      },
      {
        number: '07',
        title: 'Konvergierende Konzepte',
        text: 'Lifestyle, Budget, Serviced Apartments und klassische Hotellerie nähern sich einander an.',
      },
      {
        number: '08',
        title: 'Szenarien und Risiken',
        text: 'Die Studie macht Chancen, Abhängigkeiten und Risiken verschiedener Zukunftsszenarien sichtbar.',
      },
    ],
  }),
  frameworkLabel: text({ label: 'Framework Label', default: 'Framework / 01' }),
  frameworkTitle: text({
    label: 'Framework Title',
    default: 'Automation Readiness',
  }),
  frameworkDescription: richText({
    label: 'Framework Description',
    default:
      'Eine Systematik zur Bewertung, wie gut Gebäude, Layout, Technik und Prozesse eines Hotelbetriebs auf zunehmende Automatisierung vorbereitet sind.',
  }),
});

export const defaults = getEditableDefaults(editable);
