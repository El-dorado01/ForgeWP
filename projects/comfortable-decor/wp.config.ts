import { defineConfig } from '@forgewp/compiler/define-config';
import { siteOptions } from './cms/site-options';
import { themeMods } from './cms/theme-mods';
// import seoPlugin from '@forgewp/plugin-seo';

export default defineConfig({
  seed: {
    products: 'upsert',
    mockData: 'once',
    developmentOnly: false,
  },

  auth: {
    loginField: 'usernameAndEmail',
    defaultRole: 'subscriber',
    reservedUsernames: ['admin', 'system', 'root', 'administrator'],
    features: {
      registration: true,
      emailVerification: true,
      blockLoginUntilVerified: true,
      autoLoginAfterSignup: false,
    },
    emails: {
      verification: {
        subject: 'Verify your ForgeWP Account',
        body: 'Welcome to ForgeWP! Click this link to verify your email address:\n\n{verification_url}',
      },
      passwordReset: {
        subject: 'Password Reset Request',
        body: 'Click the link below to reset your password:\n\n{reset_url}',
      },
    },
  },
  name: "Comfortable Decor",
  slug: "comfortable-decor",
  version: "0.1.0",
  description: "A premium block-theme built with React, Tailwind CSS, and ForgeWP.",
  textDomain: "comfortable-decor",
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
  style: "shadcn", // "forgewp" (sharp corners) or "shadcn" (smooth modern curves)
  frameworkAdapter: "react",

  postTypes: {
    product: {
      icon: 'dashicons-products',
    },
    project: {
      icon: 'dashicons-portfolio',
    },
    review: {
      icon: 'dashicons-star-filled',
    },
  },

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
