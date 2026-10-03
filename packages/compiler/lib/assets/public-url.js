/**
 * Root-relative public files (`public/logo.png` → `/logo.png`) work in Vite
 * and break after hydration on WordPress: the client bundle still points at
 * the site root, while the file lives in the theme. Rewrite those string
 * literals to the theme URI the hydrator already publishes.
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const MEDIA_EXT = /\.(png|jpe?g|webp|gif|svg|avif|mp4|webm|ogg|mp3|wav|woff2?|ttf|eot)$/i;

export const PUBLIC_ASSET_RUNTIME =
  '(window.forgeWpHydration&&window.forgeWpHydration.themeUri||"")';

/**
 * @param {string} themeRoot
 * @returns {string[]} URL paths, longest first (`/assets/logo.png`)
 */
export function collectPublicAssetUrls(themeRoot) {
  const publicDir = path.join(themeRoot, 'public');
  if (!existsSync(publicDir)) return [];
  const urls = [];

  function walk(dir) {
    let items;
    try {
      items = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const item of items) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) {
        walk(full);
        continue;
      }
      if (!item.isFile() || !MEDIA_EXT.test(item.name)) continue;
      const rel = path.relative(publicDir, full).split(path.sep).join('/');
      urls.push(`/${rel}`);
    }
  }

  walk(publicDir);
  urls.sort((a, b) => b.length - a.length);
  return urls;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Replace a quoted public URL with a theme-uri expression.
 * `String.replace` does not rescan the inserted text, so the quoted path
 * inside the expression is not rewritten again.
 *
 * @param {string} source
 * @param {string[]} urls
 * @returns {string}
 */
export function rewriteJsPublicAssetUrls(source, urls) {
  if (!source || !urls?.length) return source || '';
  let out = source;
  for (const url of urls) {
    const re = new RegExp(`(['"\`])${escapeRegExp(url)}\\1`, 'g');
    const literal = JSON.stringify(url);
    out = out.replace(re, `${PUBLIC_ASSET_RUNTIME}+${literal}`);
  }
  return out;
}

/**
 * CSS cannot read `window`. Files in `assets/` reference a public
 * `/assets/...` file as a sibling, and a public root file as `../file`.
 *
 * @param {string} urlPath
 * @returns {string}
 */
export function cssUrlForPublicAsset(urlPath) {
  if (urlPath.startsWith('/assets/')) return urlPath.slice('/assets/'.length);
  return `..${urlPath}`;
}

/**
 * @param {string} source
 * @param {string[]} urls
 * @returns {string}
 */
export function rewriteCssPublicAssetUrls(source, urls) {
  if (!source || !urls?.length) return source || '';
  let out = source;
  for (const url of urls) {
    const rel = cssUrlForPublicAsset(url);
    const escaped = escapeRegExp(url);
    out = out.replace(
      new RegExp(`url\\(\\s*(['"])${escaped}\\1\\s*\\)`, 'g'),
      `url("${rel}")`,
    );
    out = out.replace(
      new RegExp(`url\\(\\s*${escaped}\\s*\\)`, 'g'),
      `url("${rel}")`,
    );
  }
  return out;
}

/**
 * @param {string} themeRoot
 * @param {string} assetsDir theme `assets/` directory
 * @returns {number} files changed
 */
export function rewriteThemePublicAssetUrls(themeRoot, assetsDir) {
  const urls = collectPublicAssetUrls(themeRoot);
  if (!urls.length || !existsSync(assetsDir)) return 0;
  let changed = 0;

  function walk(dir) {
    let items;
    try {
      items = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of items) {
      const full = path.join(dir, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        walk(full);
        continue;
      }
      if (name.endsWith('.map')) continue;
      const isJs = name.endsWith('.js') || name.endsWith('.mjs');
      const isCss = name.endsWith('.css');
      if (!isJs && !isCss) continue;
      const before = readFileSync(full, 'utf8');
      const after = isCss
        ? rewriteCssPublicAssetUrls(before, urls)
        : rewriteJsPublicAssetUrls(before, urls);
      if (after !== before) {
        writeFileSync(full, after, 'utf8');
        changed += 1;
      }
    }
  }

  walk(assetsDir);
  return changed;
}
