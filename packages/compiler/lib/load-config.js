import fs, { existsSync } from 'node:fs';
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

  // Validate configVersion
  if (config.configVersion === undefined) {
    console.warn(
      '\x1b[33m%s\x1b[0m',
      '⚠️  [ForgeWP Warning]: "configVersion" is missing in wp.config.ts. In a future version, "configVersion: 1" will be required.'
    );
  } else if (config.configVersion !== 1) {
    throw new Error(
      `Unsupported configVersion: ${config.configVersion}. The current supported version is 1.`
    );
  }

  // Validate favicon
  if (config.favicon !== undefined) {
    if (typeof config.favicon !== 'string') {
      throw new Error(
        'favicon must be a string pointing to an asset file (e.g. "/Logo/favicon.svg")'
      );
    }
    const cleanedFavicon = config.favicon.replace(/^\//, '');
    const path1 = path.join(themeRoot, cleanedFavicon);
    const path2 = path.join(themeRoot, 'public', cleanedFavicon);
    if (!existsSync(path1) && !existsSync(path2)) {
      console.warn(
        '\x1b[33m%s\x1b[0m',
        `⚠️  [ForgeWP Warning]: Favicon file not found at "${config.favicon}". Please verify the file path exists in your theme directory.`
      );
    }
  }

  // Validate seo
  if (config.seo !== undefined) {
    if (typeof config.seo !== 'object' || config.seo === null) {
      throw new Error('seo configuration must be an object');
    }
    if (config.seo.sitemaps !== undefined) {
      const { postTypes, taxonomies } = config.seo.sitemaps;
      if (
        postTypes !== undefined &&
        (!Array.isArray(postTypes) || postTypes.some((pt) => typeof pt !== 'string'))
      ) {
        throw new Error('seo.sitemaps.postTypes must be an array of strings');
      }
      if (postTypes && new Set(postTypes).size !== postTypes.length) {
        throw new Error('seo.sitemaps.postTypes contains duplicate entries');
      }

      if (
        taxonomies !== undefined &&
        (!Array.isArray(taxonomies) || taxonomies.some((t) => typeof t !== 'string'))
      ) {
        throw new Error('seo.sitemaps.taxonomies must be an array of strings');
      }
      if (taxonomies && new Set(taxonomies).size !== taxonomies.length) {
        throw new Error('seo.sitemaps.taxonomies contains duplicate entries');
      }
    }
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

  // Execute plugin configuration validation hooks
  if (config.plugins && Array.isArray(config.plugins)) {
    for (const plugin of config.plugins) {
      if (typeof plugin.validateConfig === 'function') {
        plugin.validateConfig(config, themeRoot, { fs, path });
      }
    }
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
