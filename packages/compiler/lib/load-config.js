import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createJiti } from 'jiti';

/**
 * @param {string} themeRoot
 * @returns {Promise<import('./types.js').ForgeWPThemeConfig>}
 */
export async function loadConfig(themeRoot) {
  const configPath = path.join(themeRoot, 'wp.config.ts');

  if (!existsSync(configPath)) {
    throw new Error(`Missing wp.config.ts in ${themeRoot}`);
  }

  const jiti = createJiti(pathToFileURL(configPath).href, {
    interopDefault: true,
  });

  const config = await jiti.import(configPath);

  if (!config?.slug || !config?.name) {
    throw new Error(
      'wp.config.ts must export name, slug, version, description, textDomain',
    );
  }

  if (config.i18n) {
    const { locales, defaultLocale, provider } = config.i18n;
    if (locales !== undefined) {
      if (!Array.isArray(locales) || locales.some(l => typeof l !== 'string')) {
        throw new Error('i18n.locales must be an array of locale code strings (e.g. ["en", "de"])');
      }
      if (locales.length === 0) {
        throw new Error('i18n.locales array cannot be empty');
      }
    }
    if (defaultLocale !== undefined) {
      if (typeof defaultLocale !== 'string') {
        throw new Error('i18n.defaultLocale must be a string (e.g. "en")');
      }
      if (locales && !locales.includes(defaultLocale)) {
        throw new Error(`i18n.defaultLocale "${defaultLocale}" must be one of the configured locales: ${JSON.stringify(locales)}`);
      }
    }
    if (provider !== undefined && typeof provider !== 'string') {
      throw new Error('i18n.provider must be a string (e.g. "local", "deepl")');
    }
  }

  if (config.postTypes) {
    for (const pt of Object.keys(config.postTypes)) {
      if (pt.length > 20) {
        throw new Error(
          `Custom Post Type "${pt}" configured in wp.config.ts exceeds the WordPress limit of 20 characters.`
        );
      }
    }
  }

  if (!config.frameworkAdapter) {
    config.frameworkAdapter = 'react';
  }

  return config;
}

/**
 * Helper to define theme configurations with TypeScript Intellisense autocompletion.
 * @param {import('./types.js').ForgeWPThemeConfig} config
 * @returns {import('./types.js').ForgeWPThemeConfig}
 */
export function defineConfig(config) {
  return config;
}
