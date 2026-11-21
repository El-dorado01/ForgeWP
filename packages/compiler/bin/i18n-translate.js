#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { createUi } from '../lib/terminal-ui.js';

import { loadConfig } from '../lib/load-config.js';
import { findWpConfigPath } from '../lib/project-language.js';
import { getProvider } from '../lib/i18n/providers.js';
import { createTranslationCache, translateMissingEntries } from '../lib/i18n/translation-cache.js';
import { loadTranslationsData, writeTranslationsData, translationsSourcePath } from '../lib/functions/load-translations.js';

const ui = createUi();
const { c } = ui;

console.log(ui.header("i18n:translate", "fill in missing translations"));

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
    const providerName = i18n.provider || 'local';

    const translationsPath = translationsSourcePath(themeRoot);
    if (!translationsPath) {
      throw new Error(`Translations catalog not found at cms/translations.ts or cms/translations.json. Please run "pnpm forgewp i18n:extract" first.`);
    }

    const translations = loadTranslationsData(themeRoot);

    console.log(ui.info(`Provider ${providerName}`, `default locale ${defaultLocale}`));

    const provider = getProvider(providerName, i18n.providerConfig || {});
    const cache = providerName === 'local' || providerName === 'manual' ? null :
      createTranslationCache(themeRoot, i18n.cache, providerName, i18n.providerConfig || {});

    let totalTranslated = 0;

    for (const locale of locales) {
      if (locale === defaultLocale) continue;

      if (!translations[locale]) {
        translations[locale] = {};
      }

      const localeMap = translations[locale];
      const untranslatedKeys = Object.keys(localeMap).filter(key => !localeMap[key]);

      if (untranslatedKeys.length === 0) {
        console.log(ui.done(`${locale.toUpperCase()} is fully translated`));
        continue;
      }

      console.log(ui.step(`${locale.toUpperCase()}: ${untranslatedKeys.length} missing key${untranslatedKeys.length === 1 ? '' : 's'}`));

      if (providerName === 'local' || providerName === 'manual') {
        console.log(ui.detail(`Added empty entries for ${locale.toUpperCase()} to fill in by hand (local provider).`));
        for (const key of untranslatedKeys) {
          localeMap[key] = "";
        }
        continue;
      }

      const result = await translateMissingEntries(localeMap, defaultLocale, locale, provider, cache);
      const successCount = result.translated + result.restored;
      totalTranslated += result.translated;
      console.log(ui.done(`${locale.toUpperCase()}: translated ${successCount} of ${untranslatedKeys.length}`, result.restored ? `${result.restored} from cache` : undefined));
    }

    const writtenPath = writeTranslationsData(themeRoot, translations);

    const catalog = path.relative(themeRoot, writtenPath).replaceAll('\\', '/');
    console.log('');
    if (totalTranslated > 0) {
      console.log(`  ${c.green(ui.symbols.done)} ${c.bold(`Translated ${totalTranslated} key${totalTranslated === 1 ? '' : 's'}`)}  ${c.dim(catalog)}\n`);
    } else if (providerName === 'local' || providerName === 'manual') {
      console.log(`  ${c.green(ui.symbols.done)} ${c.bold('Catalog ready to translate')}  ${c.dim(catalog)}`);
      console.log(`${ui.tip(`Fill in the empty entries by hand, or set ${ui.command("provider: 'deepl'")} in wp.config to translate automatically.`)}\n`);
    } else {
      console.log(`  ${c.yellow(ui.symbols.warn)} ${c.bold('No new translations returned')}  ${c.dim(`review blank entries in ${catalog}`)}\n`);
    }

  } catch (error) {
    console.error(ui.errorBlock('Translation failed', error.message));
    process.exit(1);
  }
}

run();
