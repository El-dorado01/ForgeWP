import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  createTranslationCache,
  translateMissingEntries,
} from '../../lib/i18n/translation-cache.js';

let root;
const cachePath = '.forgewp/translations.json';
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-translation-cache-'));
});
afterEach(() => {
  if (
    !path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep) ||
    !path.basename(root).startsWith('forgewp-translation-cache-')
  )
    throw Error('Unsafe cleanup');
  fs.rmSync(root, { recursive: true, force: true });
});
const cache = (provider = 'deepl', config = {}) =>
  createTranslationCache(root, cachePath, provider, config);
describe('translation response cache', () => {
  it('is opt-in', () => {
    expect(createTranslationCache(root, undefined, 'deepl')).toBeNull();
  });
  it('persists successful results and restores missing entries without another request', async () => {
    const provider = {
      translate: vi.fn().mockResolvedValue({ Welcome: 'Bienvenue' }),
    };
    await translateMissingEntries(
      { Welcome: '' },
      'en',
      'fr',
      provider,
      cache()
    );
    const map = { Welcome: '' };
    expect(
      await translateMissingEntries(map, 'en', 'fr', provider, cache())
    ).toEqual({ restored: 1, translated: 0 });
    expect(map.Welcome).toBe('Bienvenue');
    expect(provider.translate).toHaveBeenCalledTimes(1);
  });
  it('preserves edited catalog translations over cached values', async () => {
    const stored = cache();
    stored.set('Welcome', 'en', 'fr', 'Cached');
    stored.save();
    const provider = { translate: vi.fn() };
    const map = { Welcome: 'Edited by client' };
    await translateMissingEntries(map, 'en', 'fr', provider, cache());
    expect(map.Welcome).toBe('Edited by client');
    expect(provider.translate).not.toHaveBeenCalled();
  });
  it('isolates source text, language pair, provider and endpoint', () => {
    const stored = cache('libretranslate', {
      endpoint: 'https://one.example',
      apiKey: 'secret',
    });
    stored.set('Welcome', 'en', 'fr', 'Bienvenue');
    stored.save();
    expect(
      cache('libretranslate', {
        endpoint: 'https://one.example',
        apiKey: 'rotated',
      }).get('Welcome', 'en', 'fr')
    ).toBe('Bienvenue');
    expect(cache().get('Welcome', 'en', 'fr')).toBeUndefined();
    expect(
      cache('libretranslate', { endpoint: 'https://two.example' }).get(
        'Welcome',
        'en',
        'fr'
      )
    ).toBeUndefined();
    expect(stored.get('Changed text', 'en', 'fr')).toBeUndefined();
    expect(stored.get('Welcome', 'de', 'fr')).toBeUndefined();
    expect(stored.get('Welcome', 'en', 'de')).toBeUndefined();
    expect(fs.readFileSync(path.join(root, cachePath), 'utf8')).not.toContain(
      'secret'
    );
  });
  it('requests only misses and ignores empty/non-string/unsolicited response values', async () => {
    const stored = cache();
    stored.set('Cached', 'en', 'fr', 'Sauve');
    stored.save();
    const provider = {
      translate: vi
        .fn()
        .mockResolvedValue({
          Good: 'Bon',
          Empty: '',
          Invalid: 42,
          Extra: 'Ignore',
        }),
    };
    const map = { Cached: '', Good: '', Empty: '', Invalid: '' };
    expect(
      await translateMissingEntries(map, 'en', 'fr', provider, stored)
    ).toEqual({ restored: 1, translated: 1 });
    expect(provider.translate).toHaveBeenCalledWith(
      ['Good', 'Empty', 'Invalid'],
      'en',
      'fr'
    );
    expect(cache().get('Empty', 'en', 'fr')).toBeUndefined();
    expect(cache().get('Extra', 'en', 'fr')).toBeUndefined();
  });
  it('does not write a response cache on provider failure', async () => {
    await expect(
      translateMissingEntries(
        { Welcome: '' },
        'en',
        'fr',
        { translate: vi.fn().mockRejectedValue(Error('offline')) },
        cache()
      )
    ).rejects.toThrow('offline');
    expect(fs.existsSync(path.join(root, cachePath))).toBe(false);
  });
  it('keeps successful earlier locale batches available after a later failure', async () => {
    const stored = cache();
    await translateMissingEntries(
      { Welcome: '' },
      'en',
      'fr',
      { translate: vi.fn().mockResolvedValue({ Welcome: 'Bienvenue' }) },
      stored
    );
    await expect(
      translateMissingEntries(
        { Welcome: '' },
        'en',
        'de',
        { translate: vi.fn().mockRejectedValue(Error('offline')) },
        stored
      )
    ).rejects.toThrow();
    expect(cache().get('Welcome', 'en', 'fr')).toBe('Bienvenue');
  });
  it('rejects malformed caches without overwriting them', () => {
    fs.mkdirSync(path.join(root, '.forgewp'));
    fs.writeFileSync(path.join(root, cachePath), '{broken');
    expect(() => cache()).toThrow(/Invalid translation cache/);
    expect(fs.readFileSync(path.join(root, cachePath), 'utf8')).toBe('{broken');
  });
  it.each([
    '../outside.json',
    'cms/translations.json',
    'package.json',
    'cache.ts',
    '',
    '/absolute.json',
  ])('rejects unsafe or conflicting paths: %s', (file) => {
    expect(() => createTranslationCache(root, file, 'deepl')).toThrow(
      /i18n.cache/
    );
  });
  it('leaves no temporary files after replacing an existing cache', () => {
    const stored = cache();
    stored.set('One', 'en', 'fr', 'Un');
    stored.save();
    stored.set('Two', 'en', 'fr', 'Deux');
    stored.save();
    expect(fs.readdirSync(path.join(root, '.forgewp'))).toEqual([
      'translations.json',
    ]);
    expect(cache().get('Two', 'en', 'fr')).toBe('Deux');
  });
  it('local/manual command mode ignores the response cache', () => {
    fs.mkdirSync(path.join(root, 'cms'));
    fs.mkdirSync(path.join(root, '.forgewp'));
    fs.writeFileSync(path.join(root, cachePath), 'not a response cache');
    fs.writeFileSync(
      path.join(root, 'cms/translations.json'),
      JSON.stringify({ en: { Welcome: 'Welcome' }, fr: { Welcome: '' } })
    );
    fs.writeFileSync(
      path.join(root, 'wp.config.ts'),
      'export default ' +
        JSON.stringify({
          name: 'Test',
          slug: 'test',
          configVersion: 1,
          i18n: {
            locales: ['en', 'fr'],
            defaultLocale: 'en',
            provider: 'manual',
            cache: cachePath,
          },
        })
    );
    const result = spawnSync(
      process.execPath,
      [fileURLToPath(new URL('../../bin/i18n-translate.js', import.meta.url))],
      { cwd: root, encoding: 'utf8' }
    );
    expect(result.status, result.stderr).toBe(0);
    expect(fs.readFileSync(path.join(root, cachePath), 'utf8')).toBe(
      'not a response cache'
    );
    expect(
      JSON.parse(
        fs.readFileSync(path.join(root, 'cms/translations.json'), 'utf8')
      ).fr.Welcome
    ).toBe('');
  });
  it('uses the cache through the actual command without network access', () => {
    fs.mkdirSync(path.join(root, 'cms'));
    const catalog = path.join(root, 'cms/translations.json');
    const config = {
      name: 'Test',
      slug: 'test',
      configVersion: 1,
      i18n: {
        locales: ['en', 'fr'],
        defaultLocale: 'en',
        provider: 'libretranslate',
        cache: cachePath,
      },
    };
    fs.writeFileSync(
      path.join(root, 'wp.config.ts'),
      'export default ' + JSON.stringify(config)
    );
    const initial = { en: { Welcome: 'Welcome' }, fr: { Welcome: '' } };
    fs.writeFileSync(catalog, JSON.stringify(initial));
    const preload = path.join(root, 'fake-fetch.mjs');
    fs.writeFileSync(
      preload,
      `import fs from 'node:fs'; globalThis.fetch = async (url, options) => { fs.appendFileSync(${JSON.stringify(path.join(root, 'requests.txt'))}, 'request\\n'); return {ok:true,json:async()=>({translatedText:JSON.parse(options.body).q.map(()=> 'Bienvenue')})}; };`
    );
    const command = fileURLToPath(
      new URL('../../bin/i18n-translate.js', import.meta.url)
    );
    const invoke = () =>
      spawnSync(
        process.execPath,
        ['--import', pathToFileURL(preload).href, command],
        { cwd: root, encoding: 'utf8' }
      );
    const first = invoke();
    expect(first.status, first.stderr).toBe(0);
    fs.writeFileSync(catalog, JSON.stringify(initial));
    const second = invoke();
    expect(second.status, second.stderr).toBe(0);
    expect(JSON.parse(fs.readFileSync(catalog, 'utf8')).fr.Welcome).toBe(
      'Bienvenue'
    );
    expect(fs.readFileSync(path.join(root, 'requests.txt'), 'utf8')).toBe(
      'request\n'
    );
  });
});
