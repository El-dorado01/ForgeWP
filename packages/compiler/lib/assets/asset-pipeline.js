import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { optimizeImageFile } from './image-optimizer.js';
import { processExternalBuildOptimizations } from './external-fetcher.js';

/**
 * Supported raster image file extensions for Sharp optimization.
 */
export const RASTER_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.tiff', '.gif'];

/**
 * Resolve the absolute on-disk path for a local static asset reference.
 *
 * @param {string} themeRoot
 * @param {string} sourcePath
 * @returns {string|null}
 */
export function resolveLocalAssetPath(themeRoot, sourcePath) {
  if (!sourcePath || typeof sourcePath !== 'string') return null;

  // Clean relative prefixes
  const clean = sourcePath.replace(/^(\/|\.\/|@\/)+/, '');

  const candidatePaths = [
    path.join(themeRoot, clean),
    path.join(themeRoot, 'public', clean),
    path.join(themeRoot, 'src', clean),
    path.join(themeRoot, 'src', 'assets', clean),
    path.join(themeRoot, 'src', 'assets', 'images', clean),
    path.join(themeRoot, 'assets', clean),
  ];

  for (const candidate of candidatePaths) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

/**
 * Execute the build-time asset pipeline over an AssetGraph.
 *
 * @param {string} themeRoot - Theme root directory
 * @param {import('./asset-graph.js').AssetGraph} assetGraph
 * @param {Object} [options]
 * @param {string} [options.outDir] - Target output directory (e.g. .forgewp/out/theme)
 * @param {string} [options.cacheDir] - Cache directory (e.g. .forgewp/cache/images)
 * @param {number} [options.quality=80] - WebP quality
 * @returns {Promise<{ processedCount: number, cachedCount: number, totalVariants: number, errors: Array }>}
 */
export async function runAssetPipeline(themeRoot, assetGraph, options = {}) {
  const outDir = options.outDir || path.join(themeRoot, '.forgewp', 'out');
  const targetImagesDir = path.join(outDir, 'assets', 'images');
  const cacheDir = options.cacheDir || path.join(themeRoot, '.forgewp', 'cache', 'images');
  const quality = options.quality || 80;

  const localImages = assetGraph ? assetGraph.getLocalImages() : [];
  const results = {
    processedCount: 0,
    cachedCount: 0,
    totalVariants: 0,
    errors: [],
  };

  for (const node of localImages) {
    const ext = path.extname(node.source).toLowerCase();
    if (!RASTER_EXTENSIONS.includes(ext)) {
      continue; // Skip SVGs or unsupported formats for raster transcoding
    }

    const resolvedPath = node.resolvedPath || resolveLocalAssetPath(themeRoot, node.source);
    if (!resolvedPath) {
      continue;
    }

    node.resolvedPath = resolvedPath;

    try {
      const optimized = await optimizeImageFile(resolvedPath, {
        outputDir: targetImagesDir,
        cacheDir,
        quality,
        publicUrlPrefix: 'assets/images',
      });

      // Update AssetNode with intrinsic dimensions and generated variants
      if (!node.width && optimized.original.width) {
        node.width = optimized.original.width;
      }
      if (!node.height && optimized.original.height) {
        node.height = optimized.original.height;
      }
      node.sizes = node.sizes || '(max-width: 1024px) 100vw, 50vw';
      node.srcset = optimized.srcset;
      node.blurDataURL = optimized.blurDataURL;
      node.variants = optimized.variants;

      results.processedCount++;
      if (optimized.cached) results.cachedCount++;
      results.totalVariants += (optimized.variants || []).length;
    } catch (err) {
      results.errors.push({
        assetId: node.id,
        source: node.source,
        message: err.message,
      });
    }
  }

  // Process external images with optimize="build"
  try {
    const extResults = await processExternalBuildOptimizations(themeRoot, assetGraph, options);
    results.processedCount += extResults.processedCount;
    results.errors.push(...extResults.errors);
  } catch (err) {
    results.errors.push({
      assetId: 'external-optimizations',
      message: err.message,
    });
  }

  return results;
}
