import { defineConfig } from '@forgewp/compiler/define-config';
import { siteOptions } from './cms/site-options';
import { themeMods } from './cms/theme-mods';
// import seoPlugin from '@forgewp/plugin-seo';

export default defineConfig({
  name: 'Hospitality 2035',
  slug: 'hospitality',
  version: '0.1.0',
  description:
    'Hospitality 2035 – Wie sich die wirtschaftliche Logik der Hotellerie verändert (DICON)',
  textDomain: 'hospitality',
  configVersion: 1,
  options: siteOptions,
  themeMods: themeMods,
  postTypes: {
    hospitality_event: {
      icon: 'dashicons-calendar-alt',
      hasArchive: false,
      labels: {
        singular: 'Veranstaltung',
        plural: 'Veranstaltungen',
      },
      rewrite: { slug: 'events', withFront: false },
      supports: ['title', 'editor', 'thumbnail', 'custom-fields', 'excerpt'],
    },
  },
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
  style: 'shadcn', // "forgewp" (sharp corners) or "shadcn" (smooth modern curves)
  frameworkAdapter: 'react',

  formsAdminCapability: 'manage_options',

  i18n: {
    locales: ['de', 'en'],
    defaultLocale: 'de',
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
        { name: 'Navy Brand', slug: 'brand', color: '#0F172A' },
        { name: 'Accent Magenta', slug: 'accent', color: '#E11D48' },
        { name: 'Slate Secondary', slug: 'secondary', color: '#334155' },
        { name: 'Warm Light Background', slug: 'background', color: '#F8FAFC' },
        { name: 'Text Slate', slug: 'text', color: '#0F172A' },
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
          name: 'Sans Serif (Outfit)',
          slug: 'sans',
          fontFamily: 'Outfit, system-ui, sans-serif',
        },
        {
          name: 'Space Grotesk (Heading)',
          slug: 'heading',
          fontFamily: 'Space Grotesk, system-ui, sans-serif',
        },
        {
          name: 'Serif (Lora)',
          slug: 'serif',
          fontFamily: 'Lora, Georgia, serif',
        },
      ],
      googleFonts: [
        'Outfit:wght@300;400;500;600;700',
        'Space Grotesk:wght@300;400;500;600;700;800;900',
        'Lora:ital,wght@0,400;0,500;1,400',
      ],
    },
  },
});
