import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { generateResponsiveVariants } from './image-optimizer.js';

/**
 * Compute URL hash for disk caching.
 */
export function computeUrlHash(url) {
  return crypto.createHash('sha256').update(url).digest('hex').slice(0, 16);
}

/**
 * Fetch a remote image with timeout and disk caching.
 *
 * @param {string} url - External image URL
 * @param {Object} [options]
 * @param {string} [options.cacheDir] - Directory to persist downloaded images
 * @param {number} [options.timeout=5000] - Request timeout in ms
 * @returns {Promise<{ buffer: Buffer, contentType: string, cached: boolean }>}
 */
export async function fetchExternalImage(url, options = {}) {
  if (!/^https?:\/\//i.test(url)) {
    throw new Error(`[ForgeWP External Asset] Invalid HTTP/HTTPS URL: ${url}`);
  }

  const cacheDir = options.cacheDir || null;
  const urlHash = computeUrlHash(url);
  const timeoutMs = options.timeout || 5000;

  // Check cache
  if (cacheDir) {
    const manifestPath = path.join(cacheDir, 'manifest.json');
    if (existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
        const entry = manifest[urlHash];
        if (entry && existsSync(entry.filePath)) {
          const buffer = readFileSync(entry.filePath);
          return { buffer, contentType: entry.contentType, cached: true };
        }
      } catch {}
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'ForgeWP-Asset-Compiler/1.0',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });
  } catch (err) {
    clearTimeout(timer);
    throw new Error(`[ForgeWP External Asset] Network fetch failed for ${url}: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`[ForgeWP External Asset] HTTP ${response.status} fetching ${url}`);
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Write to cache
  if (cacheDir) {
    try {
      if (!existsSync(cacheDir)) {
        mkdirSync(cacheDir, { recursive: true });
      }
      const ext = contentType.includes('png')
        ? '.png'
        : contentType.includes('webp')
          ? '.webp'
          : contentType.includes('svg')
            ? '.svg'
            : '.jpg';

      const filePath = path.join(cacheDir, `${urlHash}${ext}`);
      writeFileSync(filePath, buffer);

      const manifestPath = path.join(cacheDir, 'manifest.json');
      let manifest = {};
      if (existsSync(manifestPath)) {
        try {
          manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
        } catch {}
      }
      manifest[urlHash] = { url, filePath, contentType, timestamp: Date.now() };
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    } catch {}
  }

  return { buffer, contentType, cached: false };
}

/**
 * Process all external images with optimize="build" in the AssetGraph.
 *
 * @param {string} themeRoot
 * @param {import('./asset-graph.js').AssetGraph} assetGraph
 * @param {Object} [options]
 * @param {string} [options.outDir]
 * @param {string} [options.cacheDir]
 * @param {number} [options.quality=80]
 * @returns {Promise<{ processedCount: number, errors: Array }>}
 */
export async function processExternalBuildOptimizations(themeRoot, assetGraph, options = {}) {
  if (!assetGraph) return { processedCount: 0, errors: [] };

  const outDir = options.outDir || path.join(themeRoot, '.forgewp', 'out');
  const targetImagesDir = path.join(outDir, 'assets', 'images');
  const externalCacheDir = options.cacheDir
    ? path.join(options.cacheDir, 'external')
    : path.join(themeRoot, '.forgewp', 'cache', 'external');
  const quality = options.quality || 80;

  const externalAssets = assetGraph.getExternalAssets();
  const buildOptimizable = externalAssets.filter((node) => node.optimize === 'build');

  const results = {
    processedCount: 0,
    errors: [],
  };

  for (const node of buildOptimizable) {
    try {
      const { buffer } = await fetchExternalImage(node.source, {
        cacheDir: externalCacheDir,
        timeout: 6000,
      });

      const urlHash = computeUrlHash(node.source);
      const baseName = `ext-${urlHash}`;

      const optimized = await generateResponsiveVariants(
        buffer,
        baseName,
        targetImagesDir,
        {
          quality,
          publicUrlPrefix: 'assets/images',
        },
      );

      node.width = node.width || optimized.original.width;
      node.height = node.height || optimized.original.height;
      node.variants = optimized.variants;
      node.srcset = optimized.srcset;
      node.blurDataURL = optimized.blurDataURL;
      node.localOptimized = true;

      results.processedCount++;
    } catch (err) {
      results.errors.push({
        assetId: node.id,
        source: node.source,
        message: err.message,
      });
      console.warn(`⚠️  [ForgeWP Optimizer] Could not download external image ${node.source}: ${err.message}. Falling back to remote passthrough.`);
    }
  }

  return results;
}
