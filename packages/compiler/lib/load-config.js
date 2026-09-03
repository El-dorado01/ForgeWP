import fs, { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createJiti } from 'jiti';
import { scanForFormSchemas } from './hydration/form-schemas.js';

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

  const importedConfig = await jiti.import(configPath);

  // With interopDefault, jiti (this version, at least) returns a CJS-style
  // wrapper `{ __esModule: true, default: <real config object> }` whose
  // properties forward reads to `.default` — but that forwarding is
  // resolved once via static analysis of wp.config.ts's source, not a live
  // proxy: a NEW property added to `.default` at runtime (e.g. this
  // function's own `config.forms = ...` a few lines down) is invisible
  // through the wrapper forever afterward, even though it's genuinely
  // there on `.default`. Unwrap to the real object up front so every
  // mutation below (there are many) is a normal, unsurprising object
  // mutation with no wrapper involved.
  const config =
    importedConfig && importedConfig.__esModule && importedConfig.default
      ? importedConfig.default
      : importedConfig;

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

  // Validate headerPath
  if (config.headerPath !== undefined) {
    if (typeof config.headerPath !== 'string') {
      throw new Error('headerPath must be a string pointing to a header component file');
    }
    const absPath = path.isAbsolute(config.headerPath) ? config.headerPath : path.join(themeRoot, config.headerPath);
    if (!existsSync(absPath)) {
      console.warn(
        '\x1b[33m%s\x1b[0m',
        `⚠️  [ForgeWP Warning]: Header component file not found at "${config.headerPath}".`
      );
    }
  }

  // Validate footerPath
  if (config.footerPath !== undefined) {
    if (typeof config.footerPath !== 'string') {
      throw new Error('footerPath must be a string pointing to a footer component file');
    }
    const absPath = path.isAbsolute(config.footerPath) ? config.footerPath : path.join(themeRoot, config.footerPath);
    if (!existsSync(absPath)) {
      console.warn(
        '\x1b[33m%s\x1b[0m',
        `⚠️  [ForgeWP Warning]: Footer component file not found at "${config.footerPath}".`
      );
    }
  }

  // Validate headless
  if (config.headless !== undefined) {
    if (typeof config.headless !== 'object' || config.headless === null) {
      throw new Error('headless configuration must be an object');
    }
    if (config.headless.apiUrl !== undefined && typeof config.headless.apiUrl !== 'string') {
      throw new Error('headless.apiUrl must be a string');
    }
    if (config.headless.jwtAuth !== undefined && typeof config.headless.jwtAuth !== 'boolean') {
      throw new Error('headless.jwtAuth must be a boolean');
    }
  }

  // Validate auth
  if (config.auth !== undefined) {
    if (typeof config.auth !== 'object' || config.auth === null) {
      throw new Error('auth configuration must be an object');
    }
    if (
      config.auth.loginField !== undefined &&
      !['usernameOnly', 'emailOnly', 'usernameAndEmail'].includes(config.auth.loginField)
    ) {
      throw new Error('auth.loginField must be "usernameOnly", "emailOnly", or "usernameAndEmail"');
    }
    if (config.auth.defaultRole !== undefined && typeof config.auth.defaultRole !== 'string') {
      throw new Error('auth.defaultRole must be a string');
    }
    if (config.auth.reservedUsernames !== undefined) {
      if (!Array.isArray(config.auth.reservedUsernames) || config.auth.reservedUsernames.some((u) => typeof u !== 'string')) {
        throw new Error('auth.reservedUsernames must be an array of strings');
      }
    }
    if (config.auth.features !== undefined) {
      if (typeof config.auth.features !== 'object' || config.auth.features === null) {
        throw new Error('auth.features must be an object');
      }
      if (config.auth.features.registration !== undefined && typeof config.auth.features.registration !== 'boolean') {
        throw new Error('auth.features.registration must be a boolean');
      }
      if (config.auth.features.emailVerification !== undefined && typeof config.auth.features.emailVerification !== 'boolean') {
        throw new Error('auth.features.emailVerification must be a boolean');
      }
      if (config.auth.features.blockLoginUntilVerified !== undefined && typeof config.auth.features.blockLoginUntilVerified !== 'boolean') {
        throw new Error('auth.features.blockLoginUntilVerified must be a boolean');
      }
      if (config.auth.features.autoLoginAfterSignup !== undefined && typeof config.auth.features.autoLoginAfterSignup !== 'boolean') {
        throw new Error('auth.features.autoLoginAfterSignup must be a boolean');
      }
      if (config.auth.features.blockLoginUntilVerified === true && config.auth.features.autoLoginAfterSignup === true) {
        console.warn('\x1b[33m%s\x1b[0m', '⚠️  Warning: Both blockLoginUntilVerified and autoLoginAfterSignup are set to true. Unverified users will be blocked from auto-logging in after signup.');
      }
    }
    if (config.auth.emails !== undefined) {
      if (typeof config.auth.emails !== 'object' || config.auth.emails === null) {
        throw new Error('auth.emails must be an object');
      }
      if (config.auth.emails.verification !== undefined) {
        if (typeof config.auth.emails.verification !== 'object' || config.auth.emails.verification === null) {
          throw new Error('auth.emails.verification must be an object');
        }
        if (config.auth.emails.verification.subject !== undefined && typeof config.auth.emails.verification.subject !== 'string') {
          throw new Error('auth.emails.verification.subject must be a string');
        }
        if (config.auth.emails.verification.body !== undefined && typeof config.auth.emails.verification.body !== 'string') {
          throw new Error('auth.emails.verification.body must be a string');
        }
      }
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

  // Validate seed configuration
  if (config.seed !== undefined) {
    if (typeof config.seed !== 'object' || config.seed === null) {
      throw new Error('seed must be an object configuration in wp.config.ts');
    }
    const validStrategies = [true, false, 'once', 'upsert', 'force'];
    if (config.seed.products !== undefined && !validStrategies.includes(config.seed.products)) {
      throw new Error(
        `Invalid seed.products strategy: "${config.seed.products}". Expected true, false, "once", "upsert", or "force".`
      );
    }
    if (config.seed.developmentOnly === undefined) {
      config.seed.developmentOnly = true;
    }
    if (config.seed.sideloadImages === undefined) {
      config.seed.sideloadImages = true;
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

  // Merge in forms discovered under cms/forms/** (one defineWpForm() call
  // per file, filename → form key — mirrors cms/editables/**'s convention
  // and scanForEditableSchemas' discovery approach). An explicit `forms` key
  // already in wp.config.ts always wins on a same-key collision — inline
  // config is the more deliberate declaration and shouldn't be silently
  // overridden by a colocated file the developer might not remember exists.
  const discoveredForms = scanForFormSchemas(themeRoot);
  if (Object.keys(discoveredForms).length > 0) {
    const inlineForms = config.forms || {};
    for (const key of Object.keys(discoveredForms)) {
      if (Object.prototype.hasOwnProperty.call(inlineForms, key)) {
        console.warn(
          `\x1b[33m%s\x1b[0m`,
          `⚠️  Form "${key}" is declared both in wp.config.ts's \`forms\` key and in cms/forms/${key}.ts — the wp.config.ts version wins. Remove one of them.`,
        );
      }
    }
    config.forms = { ...discoveredForms, ...inlineForms };
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
