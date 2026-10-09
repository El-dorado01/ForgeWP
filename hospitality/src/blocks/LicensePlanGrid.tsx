import { defineBlock } from '@forgewp/react';

export default defineBlock({
  name: 'license-plan-grid',
  title: 'Hospitality License Plan Grid',
  category: 'theme',
  icon: 'grid-view',
  description:
    'Responsive layout preloaded with the three editable license plan cards.',
  innerBlocks: {
    allowedBlocks: ['license-plan-card'],
    template: [
      [
        'license-plan-card',
        {
          eyebrow: 'Für eine Person',
          title: 'Einzellizenz',
          price: '249 €',
          featureOne: 'Nutzungsrecht für einen persönlichen Nutzer',
          featureTwo: 'Für einzelne Entscheider und Fachverantwortliche',
          actionLabel: 'Einzellizenz auswählen',
          actionHref: '/checkout/single-license',
        },
      ],
      [
        'license-plan-card',
        {
          eyebrow: 'Für bis zu 10 Nutzer',
          title: 'Teamlizenz',
          price: '1.490 €',
          featureOne: 'Nutzungsrecht für bis zu 10 Personen',
          featureTwo: 'Für Managementteams und Fachabteilungen',
          actionLabel: 'Teamlizenz anfragen',
          actionHref: '/lizenz/team',
          featured: true,
        },
      ],
      [
        'license-plan-card',
        {
          eyebrow: 'Für größere Organisationen',
          title: 'Firmenlizenz',
          price: 'ab 2.490 €',
          featureOne: 'Für größere Teams, Hotelgruppen und Unternehmen',
          featureTwo: 'Preis abhängig vom vereinbarten Nutzungsumfang',
          actionLabel: 'Firmenlizenz anfragen',
          actionHref: '/lizenz/unternehmen',
        },
      ],
    ],
    templateLock: false,
    orientation: 'horizontal',
  },
  shell: {
    className: 'mx-auto max-w-360 px-6 py-8 sm:px-8 lg:px-14',
    gridClassName:
      'grid grid-cols-1 gap-4 border border-brand/20 bg-brand/20 lg:grid-cols-3 lg:gap-px',
  },
  edit: () => null,
});
