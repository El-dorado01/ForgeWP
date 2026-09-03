import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { scanFontWeightUsage, detectUnusedConfiguredWeights } from './font-usage-scanner.js';

/**
 * Modern Desktop User-Agent used to request WOFF2 format from Google Fonts API.
 */
const WOFF2_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Parse Google Fonts family strings from configuration.
 *
 * @param {Array<string>|Object} configFonts
 * @returns {string[]} Array of formatted family strings (e.g. ["Inter:wght@400;500;700", "Space+Grotesk:wght@500;700"])
 */
export function normalizeFontFamilies(configFonts) {
  if (!configFonts) return [];
  const rawList = Array.isArray(configFonts)
    ? configFonts
    : configFonts.families || [];

  return rawList
    .map((item) => {
      if (typeof item !== 'string') return '';
      const trimmed = item.trim();
      if (!trimmed) return '';

      // Normalize "Inter:400,500,600,700" to "Inter:wght@400;500;600;700"
      if (trimmed.includes(':') && !trimmed.includes('wght@')) {
        const [name, weights] = trimmed.split(':');
        const formattedName = name.trim().replace(/\s+/g, '+');
        const formattedWeights = weights
          .split(',')
          .map((w) => w.trim())
          .filter(Boolean)
          .join(';');
        return `${formattedName}:wght@${formattedWeights}`;
      }
      return trimmed.replace(/\s+/g, '+');
    })
    .filter(Boolean);
}

/**
 * Fetch CSS from Google Fonts API with WOFF2 User-Agent.
 *
 * @param {string[]} families - Array of normalized family parameters
 * @param {string} [display='swap']
 * @returns {Promise<string>}
 */
export async function fetchGoogleFontCss(families, display = 'swap') {
  if (!families || families.length === 0) return '';

  const queryParams = families.map((f) => `family=${f}`).join('&');
  const url = `https://fonts.googleapis.com/css2?${queryParams}&display=${display}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': WOFF2_USER_AGENT,
      Accept: 'text/css,*/*;q=0.1',
    },
  });

  if (!response.ok) {
    throw new Error(`[ForgeWP Font Orchestrator] Google Fonts HTTP ${response.status} fetching CSS: ${url}`);
  }

  return response.text();
}

/**
 * Parse `@font-face` rules and extract font metadata and remote URLs.
 *
 * @param {string} css
 * @returns {Array<Object>}
 */
export function parseFontFaceRules(css) {
  if (!css || typeof css !== 'string') return [];

  const fontFaceRegex = /@font-face\s*\{([^}]+)\}/g;
  const rules = [];
  let match;

  while ((match = fontFaceRegex.exec(css)) !== null) {
    const block = match[1];

    const getProp = (name) => {
      const propRegex = new RegExp(`${name}:\\s*([^;]+);`, 'i');
      const m = block.match(propRegex);
      return m ? m[1].trim() : '';
    };

    const family = getProp('font-family').replace(/['"]/g, '');
    const style = getProp('font-style') || 'normal';
    const weight = getProp('font-weight') || '400';
    const display = getProp('font-display') || 'swap';
    const unicodeRange = getProp('unicode-range') || '';

    const srcMatch = block.match(/src:\s*url\((https:\/\/[^)]+)\)\s*format\(['"]?([^'"]+)['"]?\)/i);
    const url = srcMatch ? srcMatch[1] : '';
    const format = srcMatch ? srcMatch[2] : 'woff2';

    if (family && url) {
      rules.push({
        family,
        style,
        weight,
        display,
        unicodeRange,
        remoteUrl: url,
        format,
      });
    }
  }

  return rules;
}

/**
 * Download WOFF2 font files to local disk with caching.
 *
 * @param {Array<Object>} rules
 * @param {string} outputDir
 * @param {string} cacheDir
 * @returns {Promise<Array<Object>>} Enriched rules with local filenames and paths
 */
export async function downloadFontFiles(rules, outputDir, cacheDir) {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  if (cacheDir && !existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }

  const enriched = [];
  let index = 1;

  for (const rule of rules) {
    const urlHash = crypto.createHash('sha256').update(rule.remoteUrl).digest('hex').slice(0, 12);
    const cleanFamily = rule.family.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const filename = `${cleanFamily}-${rule.weight}-${rule.style}-${urlHash}.woff2`;
    const outputPath = path.join(outputDir, filename);

    let buffer = null;

    // Check disk cache
    if (cacheDir) {
      const cachedFile = path.join(cacheDir, filename);
      if (existsSync(cachedFile)) {
        buffer = readFileSync(cachedFile);
      }
    }

    if (!buffer) {
      try {
        const response = await fetch(rule.remoteUrl, {
          headers: { 'User-Agent': WOFF2_USER_AGENT },
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const arrayBuf = await response.arrayBuffer();
        buffer = Buffer.from(arrayBuf);

        // Save to cache
        if (cacheDir) {
          writeFileSync(path.join(cacheDir, filename), buffer);
        }
      } catch (err) {
        console.warn(`⚠️  [ForgeWP Font Orchestrator] Failed to download font ${rule.remoteUrl}: ${err.message}`);
        continue;
      }
    }

    writeFileSync(outputPath, buffer);

    enriched.push({
      ...rule,
      filename,
      localPath: outputPath,
      publicUrl: `assets/fonts/${filename}`,
    });
    index++;
  }

  return enriched;
}

/**
 * Generate a local `@font-face` CSS stylesheet.
 *
 * @param {Array<Object>} enrichedRules
 * @param {string} [fontUrlPrefix='./'] - Relative URL prefix for font references in CSS
 * @returns {string}
 */
export function generateLocalFontFaceCss(enrichedRules, fontUrlPrefix = './') {
  const cssBlocks = enrichedRules.map((rule) => {
    const url = `${fontUrlPrefix}${rule.filename}`;
    const rangeLine = rule.unicodeRange ? `\n  unicode-range: ${rule.unicodeRange};` : '';

    return `@font-face {
  font-family: '${rule.family}';
  font-style: ${rule.style};
  font-weight: ${rule.weight};
  font-display: ${rule.display};
  src: url('${url}') format('${rule.format}');${rangeLine}
}`;
  });

  return cssBlocks.join('\n\n') + '\n';
}

/**
 * High-level Font Orchestration runner.
 *
 * @param {string} themeRoot
 * @param {Object} config
 * @param {import('./asset-graph.js').AssetGraph} assetGraph
 * @param {Object} [options]
 * @returns {Promise<{ strategy: string, downloadedCount: number, fontsCssPath: string|null, preloadFonts: string[] }>}
 */
export async function orchestrateFonts(themeRoot, config, assetGraph, options = {}) {
  const outDir = options.outDir || path.join(themeRoot, '.forgewp', 'out');
  const targetFontsDir = path.join(outDir, 'assets', 'fonts');
  const cacheDir = path.join(themeRoot, '.forgewp', 'cache', 'fonts');

  // Discover font configuration
  const fontConfig = config.fonts?.google || config.settings?.typography?.googleFonts || null;
  const families = normalizeFontFamilies(fontConfig);
  const strategy = (config.fonts?.google?.strategy || config.settings?.typography?.fontStrategy || 'self-host').toLowerCase();
  const display = config.fonts?.google?.display || 'swap';

  if (families.length === 0 || strategy === 'remote') {
    return {
      strategy: families.length > 0 ? 'remote' : 'none',
      downloadedCount: 0,
      fontsCssPath: null,
      preloadFonts: [],
    };
  }

  // Scan codebase for used font weights BEFORE downloading
  const { usedWeights } = scanFontWeightUsage(themeRoot);
  const unusedWeights = detectUnusedConfiguredWeights(fontConfig, usedWeights);

  if (unusedWeights.length > 0) {
    for (const u of unusedWeights) {
      console.warn(`⚠️  [ForgeWP Fonts] Unused Font Weight: ${u.family} ${u.weight} (${u.reason}). Removing it from wp.config.ts saves ~${u.sizeKb} KB.`);
    }
  }

  try {
    const rawCss = await fetchGoogleFontCss(families, display);
    const parsedRules = parseFontFaceRules(rawCss);
    const enrichedRules = await downloadFontFiles(parsedRules, targetFontsDir, cacheDir);

    if (enrichedRules.length === 0) {
      return { strategy: 'self-host', downloadedCount: 0, fontsCssPath: null, preloadFonts: [] };
    }

    const localCss = generateLocalFontFaceCss(enrichedRules, './');
    const fontsCssPath = path.join(targetFontsDir, 'fonts.css');
    writeFileSync(fontsCssPath, localCss, 'utf8');

    // Register critical font weights (e.g. 400 and 700) in assetGraph for high-priority preload
    const preloadFonts = [];
    if (assetGraph) {
      const primaryWeights = ['400', '500', '600', '700'];
      const seenFamilies = new Set();

      for (const rule of enrichedRules) {
        if (primaryWeights.includes(String(rule.weight)) && !seenFamilies.has(`${rule.family}-${rule.weight}`)) {
          seenFamilies.add(`${rule.family}-${rule.weight}`);
          preloadFonts.push(rule.publicUrl);

          assetGraph.addAsset({
            id: rule.publicUrl,
            type: 'font',
            classification: 'local-static',
            source: rule.publicUrl,
            priority: true,
          });
        }
      }
    }

    return {
      strategy: 'self-host',
      downloadedCount: enrichedRules.length,
      fontsCssPath,
      preloadFonts,
      enrichedRules,
    };
  } catch (err) {
    console.warn(`⚠️  [ForgeWP Font Orchestrator] Self-hosting failed: ${err.message}. Falling back to remote enqueuing.`);
    return {
      strategy: 'remote-fallback',
      downloadedCount: 0,
      fontsCssPath: null,
      preloadFonts: [],
      enrichedRules: [],
    };
  }
}
