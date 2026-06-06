#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { loadConfig } from '../lib/load-config.js';
import { extractKeysFromDirectory } from '../lib/i18n/extractor.js';

console.log(`\n🗣️  ${pc.bold(pc.bgCyan(pc.black("  FORGEWP I18N EXTRACTOR  ")))}\n`);

const themeRoot = process.cwd();

async function run() {
  try {
    let config = {};
    const configPath = path.join(themeRoot, 'wp.config.ts');
    if (fs.existsSync(configPath)) {
      config = await loadConfig(themeRoot);
    } else {
      console.warn(pc.yellow(`⚠️  Could not load wp.config.ts, using fallback defaults.`));
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

    console.log(`  🔍 Scanning files in: ${pc.cyan('src/')}`);
    const extractedKeys = extractKeysFromDirectory(srcDir);
    console.log(`  ✅ Extracted ${pc.green(extractedKeys.length)} unique translation keys.`);

    const cmsDir = path.join(themeRoot, 'cms');
    if (!fs.existsSync(cmsDir)) {
      fs.mkdirSync(cmsDir, { recursive: true });
    }

    const translationsPath = path.join(cmsDir, 'translations.json');
    let translations = {};
    if (fs.existsSync(translationsPath)) {
      try {
        translations = JSON.parse(fs.readFileSync(translationsPath, 'utf8'));
      } catch (err) {
        console.warn(pc.yellow(`⚠️  Could not parse existing translations.json, starting fresh.`));
      }
    }

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

    fs.writeFileSync(translationsPath, JSON.stringify(sortedTranslations, null, 2), 'utf8');

    console.log(`\n${pc.bold("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}`);
    console.log(`  ✨ ${pc.green("Extraction completed successfully!")}`);
    console.log(`  📍 File: ${pc.cyan(path.relative(themeRoot, translationsPath))}`);
    console.log(`  🌐 Locales: ${pc.yellow(locales.join(', '))}`);
    console.log(`  ➕ New keys discovered: ${pc.green(addedCount / locales.length)}`);
    if (unusedCount > 0) {
      console.log(`  ℹ️  Unused keys remaining in catalog: ${pc.yellow(unusedCount / locales.length)} (retained to prevent work loss)`);
    }
    console.log(`\n`);

  } catch (error) {
    console.error(pc.red(`\n❌ Extraction failed: ${error.message}\n`));
    process.exit(1);
  }
}

run();
