/**
 * Leaves original images out of the theme once they are no longer needed.
 *
 * Images in public/ are copied into the theme as is, and the asset pipeline
 * also writes WebP variants for them (assets/images/*-<width>w.webp). After the
 * markup points src and srcset at the variants, the original is only needed if
 * something else still names it: a CSS background, a script, a link. So an
 * original is removed only when no text file of the export mentions its file
 * name. The export's own validation runs afterwards and fails if a referenced
 * file is missing.
 *
 * Before that check, the client bundles are pointed at the WebP too: after
 * hydration React renders from the JS bundle, which still named the original
 * (a 3 MB JPEG where the server HTML used a 300 KB WebP). Only exact quoted
 * URL literals in JS and url(...) in CSS are changed.
 */
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { cssUrlForPublicAsset } from './public-url.js';

const TEXT_EXTENSIONS = new Set(['.php', '.html', '.htm', '.js', '.mjs', '.css', '.json', '.txt', '.xml', '.svg', '.webmanifest']);
// Reports written by ForgeWP itself list every source image; they are not references.
const IGNORED_FILES = new Set(['asset-manifest.json']);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Largest variant up to 1920px, as a site-relative URL (same rule as the markup's src). */
export function fallbackVariantUrl(variants) {
  const list = (variants || [])
    .filter((v) => v && typeof v.publicUrl === 'string' && Number(v.width) > 0)
    .sort((a, b) => Number(a.width) - Number(b.width));
  if (list.length === 0) return null;
  const upTo = list.filter((v) => Number(v.width) <= 1920);
  return '/' + (upTo.length > 0 ? upTo[upTo.length - 1] : list[0]).publicUrl.replace(/^\/+/, '');
}

/** Points quoted JS literals and CSS url(...) of originals at their WebP. */
export function rewriteBundles(outDir, replacements) {
  if (replacements.length === 0) return 0;
  let changed = 0;
  for (const file of listFiles(outDir)) {
    const ext = path.extname(file).toLowerCase();
    if (ext !== '.js' && ext !== '.mjs' && ext !== '.css') continue;
    const before = readFileSync(file, 'utf8');
    let text = before;
    for (const [from, to] of replacements) {
      if (!text.includes(from)) continue;
      if (ext === '.css') {
        const fromCss = escapeRegExp(cssUrlForPublicAsset(from));
        text = text.replace(new RegExp(`url\\(\\s*(['"]?)${fromCss}\\1\\s*\\)`, 'g'), `url("${cssUrlForPublicAsset(to)}")`);
      } else {
        text = text.replace(new RegExp(`(['"\`])${escapeRegExp(from)}\\1`, 'g'), (_m, q) => `${q}${to}${q}`);
      }
    }
    if (text !== before) {
      writeFileSync(file, text);
      changed++;
    }
  }
  return changed;
}

function listFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    if (statSync(abs).isDirectory()) listFiles(abs, out);
    else out.push(abs);
  }
  return out;
}

/**
 * @param {string} themeRoot
 * @param {string} outDir    exported theme folder
 * @param {object} assetGraph graph after runAssetPipeline (nodes carry variants)
 * @returns {{ removed: string[], kept: string[], bytesSaved: number }}
 */
export function pruneOptimizedOriginals(themeRoot, outDir, assetGraph) {
  const result = { removed: [], kept: [], bytesSaved: 0 };
  if (!assetGraph || typeof assetGraph.getLocalImages !== 'function' || !existsSync(outDir)) return result;
  const publicDir = path.join(themeRoot, 'public');

  const candidates = new Map();
  const replacements = []; // [ '/berlin.jpg', '/assets/images/berlin-1920w.webp' ]
  for (const node of assetGraph.getLocalImages()) {
    if (!node || !node.resolvedPath || !Array.isArray(node.variants) || node.variants.length === 0) continue;
    const rel = path.relative(publicDir, node.resolvedPath);
    if (rel.startsWith('..') || path.isAbsolute(rel)) continue; // only files copied from public/
    const target = path.join(outDir, rel);
    if (!existsSync(target)) continue;
    candidates.set(target, path.basename(target));
    const fallback = fallbackVariantUrl(node.variants);
    if (fallback) replacements.push(['/' + rel.split(path.sep).join('/'), fallback]);
  }
  if (candidates.size === 0) return result;
  result.rewrittenFiles = rewriteBundles(outDir, replacements);

  // One pass over every text file; a file name anywhere keeps the original.
  const names = new Set(candidates.values());
  const referenced = new Set();
  for (const file of listFiles(outDir)) {
    if (candidates.has(file)) continue;
    if (!TEXT_EXTENSIONS.has(path.extname(file).toLowerCase()) || IGNORED_FILES.has(path.basename(file))) continue;
    const text = readFileSync(file, 'utf8');
    for (const name of names) {
      if (!referenced.has(name) && (text.includes(name) || text.includes(encodeURIComponent(name)))) referenced.add(name);
    }
    if (referenced.size === names.size) break;
  }

  for (const [target, name] of candidates) {
    const rel = path.relative(outDir, target).split(path.sep).join('/');
    if (referenced.has(name)) {
      result.kept.push(rel);
      continue;
    }
    result.bytesSaved += statSync(target).size;
    rmSync(target, { force: true });
    result.removed.push(rel);
  }
  return result;
}

/**
 * Files copied from public/ that no text file of the export names. Not removed:
 * a post in the database may still link to one (a brochure, a press kit).
 * The export lists the large ones so the developer can delete them from
 * public/ or leave them out with assets.exclude.
 */
export function findUnreferencedPublicFiles(themeRoot, outDir, { minBytes = 100 * 1024 } = {}) {
  const publicDir = path.join(themeRoot, 'public');
  if (!existsSync(publicDir) || !existsSync(outDir)) return [];
  const copies = [];
  for (const file of listFiles(publicDir)) {
    const rel = path.relative(publicDir, file).split(path.sep).join('/');
    const target = path.join(outDir, rel);
    if (existsSync(target) && statSync(target).size >= minBytes) copies.push({ rel, target, name: path.basename(rel), bytes: statSync(target).size });
  }
  if (copies.length === 0) return [];
  const pending = new Set(copies.map((c) => c.name));
  for (const file of listFiles(outDir)) {
    if (pending.size === 0) break;
    if (!TEXT_EXTENSIONS.has(path.extname(file).toLowerCase()) || IGNORED_FILES.has(path.basename(file))) continue;
    const text = readFileSync(file, 'utf8');
    for (const name of [...pending]) {
      if (text.includes(name) || text.includes(encodeURIComponent(name))) pending.delete(name);
    }
  }
  return copies.filter((c) => pending.has(c.name)).sort((a, b) => b.bytes - a.bytes).map(({ rel, bytes }) => ({ rel, bytes }));
}

/** assets.exclude: globs (relative to public/) never shipped in the theme. */
export function removeExcludedPublicFiles(themeRoot, outDir, globs, toRegExp) {
  if (!Array.isArray(globs) || globs.length === 0) return [];
  const publicDir = path.join(themeRoot, 'public');
  if (!existsSync(publicDir)) return [];
  const res = globs.map(toRegExp);
  const removed = [];
  for (const file of listFiles(publicDir)) {
    const rel = path.relative(publicDir, file).split(path.sep).join('/');
    if (!res.some((re) => re.test(rel))) continue;
    const target = path.join(outDir, rel);
    if (existsSync(target)) {
      rmSync(target, { force: true });
      removed.push(rel);
    }
  }
  return removed;
}
