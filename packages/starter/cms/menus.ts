import { defineWpMenus } from '@forgewp/react';

export const menus = defineWpMenus({
  primary: [
    { title: "Home", url: "/" },
    { title: "About", url: "/about" },
    { title: "Blog", url: "/blog" },
    { title: "Contact", url: "/contact" }
  ],
  footer: [
    { title: "Privacy Policy", url: "/privacy" },
    { title: "Terms of Service", url: "/terms" }
  ]
});

export default menus;
