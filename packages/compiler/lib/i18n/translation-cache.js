import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

/** Optional build-time response cache. Catalog values always take precedence. */
export function createTranslationCache(
  themeRoot,
  cachePath,
  providerName,
  providerConfig = {}
) {
  if (cachePath === undefined) return null;
  if (typeof cachePath !== 'string' || !cachePath.trim()) {
    throw new Error('i18n.cache must be a nonempty project-relative JSON path');
  }
  const root = path.resolve(themeRoot);
  const file = path.resolve(root, cachePath);
  const relative = path.relative(root, file);
  if (
    path.isAbsolute(cachePath) ||
    relative.startsWith('..' + path.sep) ||
    relative === '..' ||
    !relative ||
    path.extname(file).toLowerCase() !== '.json'
  ) {
    throw new Error(
      'i18n.cache must point to a JSON file inside the theme project'
    );
  }
  if (
    ['cms/translations.json', 'package.json'].includes(
      relative.replaceAll('\\', '/').toLowerCase()
    )
  ) {
    throw new Error(
      'i18n.cache must be separate from the translation catalog and package.json'
    );
  }
  let entries = {};
  if (fs.existsSync(file)) {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      throw new Error(
        `Invalid translation cache at ${file}; remove it or choose a new cache path`
      );
    }
    if (
      data?.version !== 1 ||
      !data.entries ||
      typeof data.entries !== 'object' ||
      Array.isArray(data.entries) ||
      Object.entries(data.entries).some(
        ([key, value]) =>
          !/^[a-f0-9]{64}$/.test(key) ||
          typeof value !== 'string' ||
          !value.trim()
      )
    ) {
      throw new Error(
        `Invalid translation cache at ${file}; remove it or choose a new cache path`
      );
    }
    entries = data.entries;
  }
  const keyFor = (text, source, target) =>
    createHash('sha256')
      .update(
        JSON.stringify([
          providerName,
          providerConfig.endpoint || '',
          source,
          target,
          text,
        ])
      )
      .digest('hex');
  let dirty = false;
  return {
    get(text, source, target) {
      return entries[keyFor(text, source, target)];
    },
    set(text, source, target, value) {
      if (typeof value !== 'string' || !value.trim()) return;
      const key = keyFor(text, source, target);
      if (entries[key] !== value) {
        entries[key] = value;
        dirty = true;
      }
    },
    save() {
      if (!dirty) return;
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const temporary = `${file}.${randomUUID()}.tmp`;
      try {
        fs.writeFileSync(
          temporary,
          JSON.stringify({ version: 1, entries }, null, 2) + '\n',
          { flag: 'wx' }
        );
        fs.renameSync(temporary, file);
        dirty = false;
      } finally {
        if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
      }
    },
  };
}

/** Translate only blank catalog entries, caching successful remote responses. */
export async function translateMissingEntries(
  localeMap,
  source,
  target,
  provider,
  cache
) {
  const missing = Object.keys(localeMap).filter((key) => !localeMap[key]);
  const pending = [];
  let restored = 0;
  for (const text of missing) {
    const cached = cache?.get(text, source, target);
    if (cached !== undefined) {
      localeMap[text] = cached;
      restored++;
    } else pending.push(text);
  }
  if (!pending.length) return { restored, translated: 0 };
  const response = await provider.translate(pending, source, target);
  let translated = 0;
  for (const text of pending) {
    const value = response?.[text];
    if (typeof value !== 'string' || !value.trim()) continue;
    localeMap[text] = value;
    cache?.set(text, source, target, value);
    translated++;
  }
  cache?.save();
  return { restored, translated };
}
