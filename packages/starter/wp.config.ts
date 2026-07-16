import { defineConfig } from '@forgewp/compiler/define-config';
import { siteOptions } from './cms/site-options';
import { themeMods } from './cms/theme-mods';
// import seoPlugin from '@forgewp/plugin-seo';

export default defineConfig({
  name: 'ForgeWP Starter',
  slug: 'forgewp-starter',
  version: '0.1.0',
  description: 'A clean default canvas for building block-themes with ForgeWP.',
  textDomain: 'forgewp-starter',
  configVersion: 1,
  options: siteOptions,
  themeMods: themeMods,
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
  style: 'forgewp', // "forgewp" (sharp corners) or "shadcn" (smooth modern curves)
  frameworkAdapter: 'react',

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
        { name: 'Brand Primary', slug: 'brand', color: '#ff000c' },
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
