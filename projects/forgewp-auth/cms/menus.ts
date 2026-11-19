import { defineWpMenus } from '@forgewp/react';

export const menus = defineWpMenus({
  "_comment": "⚡ ForgeWP Navigation Menus — Edit this file to add/remove links in local dev.",
  "primary": [
    {
      "title": "Hotelvergleiche",
      "url": "/hotelvergleiche"
    },
    {
      "title": "Hotels",
      "url": "/hotels"
    },
    {
      "title": "Über uns",
      "url": "/about"
    }
  ],
  "utility": [
    {
      "title": "Kontakt",
      "url": "/contact"
    }
  ]
});

export default menus;
