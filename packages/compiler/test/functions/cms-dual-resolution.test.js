import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { buildFunctionsPhp } from '../../lib/functions/index.js';
import { loadMockData } from '../../lib/functions/seed-mock-data.js';
import { loadProductsData } from '../../lib/functions/seed-products.js';
import {
  loadTranslationsData,
  writeTranslationsData,
  translationsSourcePath,
} from '../../lib/functions/load-translations.js';

describe('CMS .ts / .json dual-resolution', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-cms-dual-'));
    fs.mkdirSync(path.join(tmpDir, 'cms'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('registers custom post types from cms/mock-data.ts', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'cms', 'mock-data.ts'),
      `import { defineWpPosts } from '@forgewp/react';

export const mockData = defineWpPosts({
  portfolio: [
    {
      id: 1,
      title: 'Villa',
      customFields: { client: 'Nordic' },
      _terms: { discipline: ['Architecture'] }
    }
  ],
  post: [{ id: 1, title: 'Hello' }]
});

export default mockData;
`
    );

    const php = buildFunctionsPhp(
      { textDomain: 'test_theme', version: '1.0.0' },
      { cssFile: 'assets/main.css' },
      [],
      tmpDir,
    );

    expect(php).toContain("register_post_type('portfolio'");
    expect(php).toContain("register_taxonomy('discipline'");
    expect(loadMockData(tmpDir).portfolio[0].title).toBe('Villa');
  });

  it('registers post types declared only in wp.config.ts postTypes', () => {
    const php = buildFunctionsPhp(
      {
        textDomain: 'test_theme',
        version: '1.0.0',
        postTypes: {
          project: { icon: 'dashicons-portfolio' },
          review: { icon: 'dashicons-star-filled' },
        },
      },
      { cssFile: 'assets/main.css' },
      [],
      tmpDir,
    );

    expect(php).toContain("register_post_type('project'");
    expect(php).toContain("register_post_type('review'");
    expect(php).toContain("'menu_icon'   => 'dashicons-portfolio'");
  });

  it('loads translations from cms/translations.ts via defineTranslations()', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'cms', 'translations.ts'),
      `import { defineTranslations } from '@forgewp/react';

export const translations = defineTranslations({
  en: { Hello: 'Hello' },
  de: { Hello: 'Hallo' }
});

export default translations;
`
    );

    const data = loadTranslationsData(tmpDir);
    expect(data.en.Hello).toBe('Hello');
    expect(data.de.Hello).toBe('Hallo');
    expect(translationsSourcePath(tmpDir)).toMatch(/translations\.ts$/);
  });

  it('prefers cms/translations.ts over cms/translations.json', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'cms', 'translations.ts'),
      `export const translations = { en: { Hello: 'From TS' } };`
    );
    fs.writeFileSync(
      path.join(tmpDir, 'cms', 'translations.json'),
      JSON.stringify({ en: { Hello: 'From JSON' } })
    );

    expect(loadTranslationsData(tmpDir).en.Hello).toBe('From TS');
  });

  it('writes back to translations.ts when that file is the active source', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'cms', 'translations.ts'),
      `export const translations = { en: {} };`
    );

    const written = writeTranslationsData(tmpDir, { en: { Shop: 'Shop' }, de: { Shop: '' } });
    expect(written).toMatch(/translations\.ts$/);
    expect(fs.existsSync(path.join(tmpDir, 'cms', 'translations.json'))).toBe(false);
    expect(fs.readFileSync(written, 'utf8')).toContain("defineTranslations");
    expect(loadTranslationsData(tmpDir).en.Shop).toBe('Shop');
  });

  it('loads products from cms/products.ts via defineProducts()', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'cms', 'products.ts'),
      `import { defineProducts } from '@forgewp/woocommerce';

export const products = defineProducts([
  { id: 1, name: 'Oak Chair', slug: 'oak-chair', price: 299 }
]);

export default products;
`
    );

    const products = loadProductsData(tmpDir);
    expect(products).toHaveLength(1);
    expect(products[0].name).toBe('Oak Chair');
  });
});
