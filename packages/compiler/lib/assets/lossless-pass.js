/**
 * Lossless size pass over the exported theme. Nothing the browser shows
 * changes: every converted or recompressed image is checked pixel by pixel
 * against the original and dropped if it differs or is not smaller.
 *
 * 1. PNGs the theme references (for example a block's default image) become
 *    lossless WebP when every reference can be updated. Unreferenced PNGs keep
 *    their name: a post may link to them directly.
 * 2. Byte-identical font files (one variable font saved once per weight)
 *    are kept once; references point at that one file.
 * 3. Remaining PNGs are recompressed losslessly.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const TEXT_EXTENSIONS = new Set(['.php', '.html', '.htm', '.js', '.mjs', '.css', '.json', '.txt', '.xml', '.svg', '.webmanifest']);
// WordPress needs screenshot.png/jpg; icons keep their format for every client.
const KEEP_FORMAT = /(^|\/)(screenshot\.png)$|icon|favicon|apple-touch/i;
const MIN_CONVERT_BYTES = 50 * 1024;

function listFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    if (statSync(abs).isDirectory()) listFiles(abs, out);
    else out.push(abs);
  }
  return out;
}

async function samePixels(a, b) {
  const [x, y] = await Promise.all([
    sharp(a).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(b).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  return x.info.width === y.info.width && x.info.height === y.info.height && x.data.equals(y.data);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Replaces quoted occurrences of a theme-relative path (with or without a leading /). */
function replaceQuotedPath(text, fromRel, toRel) {
  const re = new RegExp(`(['"\`])(/?)${escapeRegExp(fromRel)}\\1`, 'g');
  return text.replace(re, (_m, q, slash) => `${q}${slash}${toRel}${q}`);
}

/**
 * @param {string} outDir exported theme folder
 * @returns {Promise<{ converted: string[], recompressed: string[], fontsMerged: number, bytesSaved: number }>}
 */
export async function runLosslessPass(outDir) {
  const result = { converted: [], recompressed: [], fontsMerged: 0, bytesSaved: 0 };
  if (!existsSync(outDir)) return result;
  let files = listFiles(outDir);
  const rel = (abs) => path.relative(outDir, abs).split(path.sep).join('/');
  const textFiles = () => files.filter((f) => TEXT_EXTENSIONS.has(path.extname(f).toLowerCase()) && path.basename(f) !== 'asset-manifest.json');

  // 1 + 3: PNGs.
  const conversions = [];
  for (const f of files.filter((x) => /\.png$/i.test(x))) {
    const src = readFileSync(f);
    const r = rel(f);
    const webpPath = f.replace(/\.png$/i, '.webp');
    if (!KEEP_FORMAT.test(r) && src.length >= MIN_CONVERT_BYTES && !existsSync(webpPath)) {
      const webp = await sharp(src).webp({ lossless: true, exact: true, effort: 6 }).toBuffer();
      if (webp.length < src.length * 0.9 && (await samePixels(src, webp))) {
        writeFileSync(webpPath, webp);
        conversions.push([r, rel(webpPath), f, src.length - webp.length]);
        continue;
      }
    }
    const png = await sharp(src).png({ compressionLevel: 9, adaptiveFiltering: true, palette: false, effort: 10 }).toBuffer();
    if (png.length < src.length && (await samePixels(src, png))) {
      writeFileSync(f, png);
      result.recompressed.push(r);
      result.bytesSaved += src.length - png.length;
    }
  }
  if (conversions.length > 0) {
    // All or nothing per image: rewrite in memory first, and apply only if no
    // reference to the PNG would remain (an unquoted or escaped reference keeps
    // the PNG, and then nothing is rewritten for it).
    const docs = new Map(textFiles().map((f) => [f, readFileSync(f, 'utf8')]));
    const changed = new Set();
    for (const [from, to, abs, saved] of conversions) {
      const name = path.basename(from);
      const next = new Map();
      for (const [f, text] of docs) {
        if (!text.includes(name)) continue;
        next.set(f, replaceQuotedPath(text, from, to));
      }
      const leftover = [...next.values()].some((t) => t.includes(name));
      // Not referenced by the theme at all: keep the PNG under its own name, a
      // post may link to it directly (only lossless PNG recompression applies).
      if (next.size === 0 || leftover) {
        rmSync(path.join(outDir, to), { force: true });
        continue;
      }
      for (const [f, text] of next) {
        docs.set(f, text);
        changed.add(f);
      }
      rmSync(abs, { force: true });
      result.converted.push(from);
      result.bytesSaved += saved;
    }
    for (const f of changed) writeFileSync(f, docs.get(f));
    files = listFiles(outDir);
  }

  // 2: identical font files.
  const byHash = new Map();
  for (const f of files.filter((x) => /\.(woff2?|ttf|otf)$/i.test(x)).sort()) {
    const h = createHash('sha256').update(readFileSync(f)).digest('hex');
    if (!byHash.has(h)) byHash.set(h, []);
    byHash.get(h).push(f);
  }
  const fontPairs = [];
  const fontDuplicates = [];
  for (const group of byHash.values()) {
    if (group.length < 2) continue;
    const keep = group[0];
    for (const dup of group.slice(1)) {
      fontPairs.push([path.basename(dup), path.basename(keep), dup, path.dirname(dup) === path.dirname(keep)]);
    }
  }
  if (fontPairs.length > 0) {
    // Font files carry content hashes in their names, so a plain name swap is
    // exact; only same-folder duplicates are merged (relative CSS URLs stay valid).
    for (const f of textFiles()) {
      const before = readFileSync(f, 'utf8');
      let text = before;
      for (const [dupName, keepName, , sameDir] of fontPairs) if (sameDir) text = text.split(dupName).join(keepName);
      if (text !== before) writeFileSync(f, text);
    }
    for (const [, , dup, sameDir] of fontPairs) {
      if (!sameDir) continue;
      result.bytesSaved += statSync(dup).size;
      rmSync(dup, { force: true });
      fontDuplicates.push(dup);
    }
    result.fontsMerged = fontDuplicates.length;
  }
  return result;
}
