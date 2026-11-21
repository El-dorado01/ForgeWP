#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { createUi } from '../lib/terminal-ui.js';

import { loadConfig } from '../lib/load-config.js';
import { findWpConfigPath } from '../lib/project-language.js';
import { extractKeysFromDirectory } from '../lib/i18n/extractor.js';
import { loadTranslationsData, writeTranslationsData } from '../lib/functions/load-translations.js';

const ui = createUi();
const { c } = ui;

console.log(ui.header("i18n:extract", "collect translation strings"));

const themeRoot = process.cwd();

async function run() {
  try {
    let config = {};
    if (findWpConfigPath(themeRoot)) {
      config = await loadConfig(themeRoot);
    } else {
      console.warn(ui.warn("No wp.config found", "using default locales (en, de)"));
    }

    const i18n = config.i18n || {
      locales: ['en', 'de'],
      defaultLocale: 'en',
      provider: 'local'
    };

    const defaultLocale = i18n.defaultLocale || 'en';
    const locales = i18n.locales || ['en', 'de'];

    const srcDir = path.join(themeRoot, 'src');
    if (!fs.existsSync(srcDir)) {
      throw new Error(`Source directory not found at ${srcDir}`);
    }

    const extractedKeys = extractKeysFromDirectory(srcDir);
    console.log(ui.done(`Found ${extractedKeys.length} translation key${extractedKeys.length === 1 ? '' : 's'}`, 'in src/'));

    const cmsDir = path.join(themeRoot, 'cms');
    if (!fs.existsSync(cmsDir)) {
      fs.mkdirSync(cmsDir, { recursive: true });
    }

    let translations = loadTranslationsData(themeRoot);

    // Initialize missing locales
    for (const locale of locales) {
      if (!translations[locale] || typeof translations[locale] !== 'object') {
        translations[locale] = {};
      }
    }

    let addedCount = 0;
    let unusedCount = 0;

    // Merge extracted keys
    for (const locale of locales) {
      const isDefault = locale === defaultLocale;
      const localeMap = translations[locale];

      // Add new keys
      for (const key of extractedKeys) {
        if (typeof localeMap[key] === 'undefined') {
          localeMap[key] = isDefault ? key : '';
          addedCount++;
        }
      }

      // Check for unused keys (defined in JSON but not found in source code)
      for (const key of Object.keys(localeMap)) {
        if (!extractedKeys.includes(key)) {
          unusedCount++;
        }
      }
    }

    // Write back sorted translations
    const sortedTranslations = {};
    for (const locale of locales) {
      const localeMap = translations[locale];
      const sortedMap = {};
      
      // Sort keys alphabetically for clean diffs
      const allKeys = Array.from(new Set([...extractedKeys, ...Object.keys(localeMap)])).sort();
      for (const key of allKeys) {
        if (typeof localeMap[key] !== 'undefined') {
          sortedMap[key] = localeMap[key];
        }
      }
      sortedTranslations[locale] = sortedMap;
    }

    const translationsPath = writeTranslationsData(themeRoot, sortedTranslations);

    const added = addedCount / locales.length;
    const unused = unusedCount / locales.length;
    console.log(ui.done(`Catalog updated`, path.relative(themeRoot, translationsPath).replaceAll('\\', '/')));
    console.log(ui.detail(`${added} new key${added === 1 ? '' : 's'} · locales ${locales.join(', ')}`));
    if (unused > 0) {
      console.log(ui.detail(`${unused} unused key${unused === 1 ? '' : 's'} kept so no translation work is lost`));
    }
    console.log(`${ui.hint('Next', `${ui.command('pnpm forgewp i18n:translate')} ${c.dim('to fill in the other locales')}`)}\n`);

  } catch (error) {
    console.error(ui.errorBlock('Extraction failed', error.message));
    process.exit(1);
  }
}

run();
