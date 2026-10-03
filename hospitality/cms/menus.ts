import { defineWpMenus } from '@forgewp/react';

export const menus = defineWpMenus({
  primary: [
    {
      title: 'Home',
      url: '/',
      children: [
        { title: 'Die Studie', url: '#study' },
        { title: 'Relevanz', url: '#audiences' },
        { title: 'Vorschau', url: '#preview' },
        { title: 'Events 2026', url: '#events' },
        { title: 'Lizenzen', url: '#buy' },
        { title: 'Automation', url: '#automation' },
        { title: 'Netzwerk', url: '#partners' },
        { title: 'Über DICON', url: '#about' },
      ],
    },
    {
      title: 'Die Studie',
      url: '/studie/hospitality-2035',
      children: [{ title: 'Vorschau', url: '/studie/hospitality-2035' }],
    },
    { title: 'Events', url: '/events' },
    {
      title: 'Lizenzen',
      url: '/lizenzen',
      children: [
        { title: 'Einzellizenz', url: '/checkout/single-license' },
        { title: 'Teamlizenz', url: '/lizenz/team' },
        { title: 'Unternehmenslizenz', url: '/lizenz/unternehmen' },
      ],
    },
    { title: 'Über DICON', url: '/#about' },
  ],
  footer: [
    { title: 'Impressum', url: '/impressum' },
    { title: 'Datenschutz', url: '/datenschutz' },
    { title: 'AGB & Lizenzbedingungen', url: '/agb-lizenzbedingungen' },
    { title: 'Widerrufsbelehrung', url: '/widerrufsbelehrung' },
    { title: 'Vertrag widerrufen', url: '/vertrag-widerrufen' },
    { title: 'Kontakt', url: '/kontakt' },
  ],
});

export default menus;
