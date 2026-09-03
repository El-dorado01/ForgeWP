#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { loadConfig } from '../lib/load-config.js';
import { getProvider } from '../lib/i18n/providers.js';
import { loadTranslationsData, writeTranslationsData, translationsSourcePath } from '../lib/functions/load-translations.js';

console.log(`\n🤖  ${pc.bold(pc.bgCyan(pc.black("  FORGEWP I18N AUTO-TRANSLATOR  ")))}\n`);

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
    const providerName = i18n.provider || 'local';

    const translationsPath = translationsSourcePath(themeRoot);
    if (!translationsPath) {
      throw new Error(`Translations catalog not found at cms/translations.ts or cms/translations.json. Please run "pnpm forgewp i18n:extract" first.`);
    }

    const translations = loadTranslationsData(themeRoot);

    console.log(`  🔌 Active provider: ${pc.cyan(providerName)}`);
    console.log(`  🌐 Default locale: ${pc.yellow(defaultLocale)}`);

    const provider = getProvider(providerName, i18n.providerConfig || {});

    let totalTranslated = 0;

    for (const locale of locales) {
      if (locale === defaultLocale) continue;

      if (!translations[locale]) {
        translations[locale] = {};
      }

      const localeMap = translations[locale];
      const untranslatedKeys = Object.keys(localeMap).filter(key => !localeMap[key]);

      if (untranslatedKeys.length === 0) {
        console.log(`  ✅ Locale ${pc.yellow(locale.toUpperCase())} is fully translated.`);
        continue;
      }

      console.log(`  ⏳ Translating ${pc.yellow(untranslatedKeys.length)} keys to ${pc.green(locale.toUpperCase())}...`);

      if (providerName === 'local' || providerName === 'manual') {
        console.log(`  ⚠️  Manual/local mode: Initializing keys in ${pc.yellow(locale.toUpperCase())} as empty placeholders.`);
        for (const key of untranslatedKeys) {
          localeMap[key] = "";
        }
        continue;
      }

      // Execute auto-translation
      const translatedMap = await provider.translate(untranslatedKeys, defaultLocale, locale);
      
      let successCount = 0;
      for (const key of untranslatedKeys) {
        if (translatedMap[key]) {
          localeMap[key] = translatedMap[key];
          successCount++;
          totalTranslated++;
        }
      }
      console.log(`  ✅ Translated ${pc.green(successCount)}/${pc.yellow(untranslatedKeys.length)} keys successfully.`);
    }

    const writtenPath = writeTranslationsData(themeRoot, translations);

    console.log(`\n${pc.bold("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}`);
    console.log(`  ✨ ${pc.green("Translation execution completed successfully!")}`);
    if (totalTranslated > 0) {
      console.log(`  🎉 Total keys automated: ${pc.green(totalTranslated)}`);
    } else if (providerName === 'local' || providerName === 'manual') {
      console.log(`  💡 Setup complete. Open ${pc.cyan(path.relative(themeRoot, writtenPath))} to write translations manually.`);
      console.log(`     Or configure 'deepl' to auto-translate using environment variables.`);
    } else {
      console.log(`  ✅ All locales are 100% up-to-date. No API calls were made.`);
    }
    console.log(`\n`);

  } catch (error) {
    console.error(pc.red(`\n❌ Translation failed: ${error.message}\n`));
    process.exit(1);
  }
}

run();
