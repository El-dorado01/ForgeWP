import type { ThemeSettings } from '../../react/src/hooks.js';
import { defineConfig, type ForgeWPThemeConfig } from '@forgewp/compiler';

// The legacy helper describes a subset, not a complete export configuration.
type SharedSettings = Omit<ThemeSettings, 'screenshot' | 'features'>;
declare const shared: SharedSettings;
const compatible: Partial<ForgeWPThemeConfig> = shared;
void compatible;

const theme = defineConfig({
  name: 'Example', slug: 'example', version: '1.0.0',
  description: 'Configuration contract fixture', textDomain: 'example',
  menus: { primary: 'Main navigation' },
  presets: { wordpressCoreStyles: false },
  settings: { menus: { primary: { description: 'Main navigation' } } },
});
void theme;

// @ts-expect-error Screenshot selection uses cms/screenshot.png, not config.
defineConfig({ ...theme, screenshot: 'custom.png' });
// @ts-expect-error A generic features bag is not the compiler configuration API.
defineConfig({ ...theme, features: { anything: true } });
// @ts-expect-error Theme support is a boolean flag.
defineConfig({ ...theme, presets: { wordpressCoreStyles: 'false' } });
// @ts-expect-error Menu location declarations are strings, not menu item arrays.
defineConfig({ ...theme, menus: { primary: [] } });
