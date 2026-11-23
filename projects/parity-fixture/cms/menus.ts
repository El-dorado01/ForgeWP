import { defineWpMenus } from '@forgewp/react/config';

export const menus = defineWpMenus({
  primary: [
    { title: 'Home', url: '/' },
    { title: 'About', url: '/about' },
    { title: 'Blog', url: '/blog' },
    { title: 'Contact', url: '/contact' },
  ],
});

export default menus;
