import { defineConfig } from '@forgewp/compiler/define-config';

export default defineConfig({
  name: 'ForgeWP HTML Starter',
  slug: 'forgewp-html-starter',
  version: '0.1.0',
  description: 'A lightweight static HTML ForgeWP theme starter.',
  textDomain: 'forgewp-html-starter',
  frameworkAdapter: 'html',

  i18n: {
    locales: ['en', 'de'],
    defaultLocale: 'en',
    provider: 'local',
  },
});
