import { defineConfig } from '@forgewp/compiler/define-config';
// import seoPlugin from '@forgewp/plugin-seo';

export default defineConfig({
  name: "Forge Commerce",
  slug: "forge-commerce",
  version: "0.1.0",
  description: "A premium block-theme built with React, Tailwind CSS, and ForgeWP.",
  textDomain: "forge-commerce",
  configVersion: 1,
  // favicon: '/Logo/favicon.svg',
  // plugins: [
  //   seoPlugin({
  //     sitemaps: {
  //       postTypes: ['post', 'page'],
  //       taxonomies: ['category', 'post_tag']
  //     },
  //     plugins: {
  //       yoast: true,
  //       rankMath: true
  //     }
  //   })
  // ],
  style: "shadcn", // "forgewp" (sharp corners) or "shadcn" (smooth modern curves)
  frameworkAdapter: "react",

  i18n: {
    locales: ['en', 'de'],
    defaultLocale: 'en',
    provider: 'local',
  },

  settings: {
    layout: {
      contentSize: '720px',
      wideSize: '1200px',
    },
    color: {
      custom: true,
      palette: [
        { name: 'Brand Primary', slug: 'brand', color: '#C3B19F' },
        { name: 'Brand Secondary', slug: 'secondary', color: '#1e293b' },
        { name: 'Accent Amber', slug: 'accent', color: '#f59e0b' },
        { name: 'Background Light', slug: 'background', color: '#fafafa' },
        { name: 'Text Slate', slug: 'text', color: '#0f172a' },
      ],
    },
    typography: {
      fontSizes: [
        { name: 'Small', slug: 'sm', size: '0.875rem' },
        { name: 'Base', slug: 'base', size: '1rem' },
        { name: 'Large', slug: 'lg', size: '1.125rem' },
        { name: 'Extra Large', slug: 'xl', size: '1.25rem' },
      ],
      fontFamilies: [
        {
          name: 'Mogra (Sans)',
          slug: 'sans',
          fontFamily: 'Mogra, system-ui, sans-serif',
        },
        {
          name: 'Space Grotesk (Heading)',
          slug: 'heading',
          fontFamily: 'Space Grotesk, system-ui, sans-serif',
        },
      ],
      googleFonts: [
        'Mogra:wght@400',
        'Space Grotesk:wght@300;400;500;600;700;800;900',
      ],
    },
  },
});
