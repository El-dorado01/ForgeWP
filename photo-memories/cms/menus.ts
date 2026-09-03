import { defineWpMenus } from '@forgewp/react';

export const menus = defineWpMenus({
  primary: [
    { title: 'Hotelvergleiche', url: '/hotelvergleiche' },
    { title: 'Hotels', url: '/hotels' },
    { title: 'Über uns', url: '/about' },
  ],
  utility: [
    { title: 'Kontakt', url: '/contact' },
  ],
});

export default menus;
