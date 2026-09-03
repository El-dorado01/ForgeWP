import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

/**
 * Standard responsive breakpoints for static image generation.
 */
export const DEFAULT_RESPONSIVE_WIDTHS = [480, 768, 1024, 1440, 1920];

/**
 * Extract intrinsic image metadata (dimensions, format, alpha).
 *
 * @param {string|Buffer} input - File path or buffer
 * @returns {Promise<{ width: number, height: number, format: string, aspectRatio: number, hasAlpha: boolean }>}
 */
export async function getImageMetadata(input) {
  const meta = await sharp(input).metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  const aspectRatio = width && height ? Number((width / height).toFixed(4)) : 1;

  return {
    width,
    height,
    format: meta.format || 'unknown',
    aspectRatio,
    hasAlpha: Boolean(meta.hasAlpha),
  };
}

/**
 * Generate a lightweight, base64-encoded WebP blur placeholder (LQIP).
 *
 * @param {string|Buffer} input - File path or buffer
 * @param {number} [size=16] - Dimension of the placeholder thumbnail in pixels
 * @returns {Promise<string>} Data URL string (e.g. "data:image/webp;base64,...")
 */
export async function generateBlurPlaceholder(input, size = 16) {
  try {
    const buffer = await sharp(input)
      .resize(size, size, { fit: 'inside' })
      .webp({ quality: 20, effort: 3 })
      .toBuffer();

    return `data:image/webp;base64,${buffer.toString('base64')}`;
  } catch {
    return '';
  }
}

/**
 * Compute a deterministic SHA256 hash from file buffer and options.
 */
export function computeImageHash(buffer, options = {}) {
  return crypto
    .createHash('sha256')
    .update(buffer)
    .update(JSON.stringify(options))
    .digest('hex')
    .slice(0, 16);
}

/**
 * Persistent build cache for optimized image variants and metadata.
 */
export class ImageOptimizationCache {
  constructor(cacheDir) {
    this.cacheDir = cacheDir;
    this.manifestPath = path.join(cacheDir, 'manifest.json');
    this.entries = new Map();
    this.load();
  }

  load() {
    if (existsSync(this.manifestPath)) {
      try {
        const raw = readFileSync(this.manifestPath, 'utf8');
        const data = JSON.parse(raw);
        for (const [key, val] of Object.entries(data)) {
          this.entries.set(key, val);
        }
      } catch {}
    }
  }

  save() {
    try {
      if (!existsSync(this.cacheDir)) {
        mkdirSync(this.cacheDir, { recursive: true });
      }
      const data = Object.fromEntries(this.entries.entries());
      writeFileSync(this.manifestPath, JSON.stringify(data, null, 2), 'utf8');
    } catch {}
  }

  get(hash) {
    return this.entries.get(hash) || null;
  }

  set(hash, result) {
    this.entries.set(hash, result);
    this.save();
  }
}

/**
 * Generate optimized WebP responsive variants from a source image buffer.
 *
 * @param {Buffer} inputBuffer - Raw image buffer
 * @param {string} baseName - Base name without extension (e.g. "hero-banner")
 * @param {string} outputDir - Directory to write variants to
 * @param {Object} [options]
 * @param {number[]} [options.widths] - Target responsive widths
 * @param {number} [options.quality=80] - Compression quality
 * @param {string} [options.publicUrlPrefix='assets/images'] - Prefix for srcset URL references
 * @returns {Promise<{ original: Object, variants: Array, srcset: string, blurDataURL: string }>}
 */
export async function generateResponsiveVariants(
  inputBuffer,
  baseName,
  outputDir,
  options = {},
) {
  const metadata = await getImageMetadata(inputBuffer);
  const origWidth = metadata.width;
  const origHeight = metadata.height;
  const quality = options.quality || 80;
  const targetWidths = options.widths || DEFAULT_RESPONSIVE_WIDTHS;
  const publicPrefix = (options.publicUrlPrefix || 'assets/images').replace(/\/+$/, '');

  // Filter widths: never upscale beyond original intrinsic resolution
  let widthsToGenerate = targetWidths.filter((w) => w <= origWidth);
  if (widthsToGenerate.length === 0 && origWidth > 0) {
    widthsToGenerate = [origWidth];
  } else if (!widthsToGenerate.includes(origWidth) && origWidth > 0) {
    widthsToGenerate.push(origWidth);
  }
  widthsToGenerate.sort((a, b) => a - b);

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const variants = [];
  const srcsetParts = [];

  for (const width of widthsToGenerate) {
    const filename = `${baseName}-${width}w.webp`;
    const outputPath = path.join(outputDir, filename);
    const calculatedHeight = origWidth && origHeight
      ? Math.round((width / origWidth) * origHeight)
      : undefined;

    // Resize and compress to WebP
    await sharp(inputBuffer)
      .resize(width, calculatedHeight, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality, effort: 4 })
      .toFile(outputPath);

    const publicUrl = `${publicPrefix}/${filename}`;

    variants.push({
      width,
      height: calculatedHeight,
      format: 'webp',
      filename,
      path: outputPath,
      publicUrl,
    });

    srcsetParts.push(`${publicUrl} ${width}w`);
  }

  const blurDataURL = await generateBlurPlaceholder(inputBuffer);

  return {
    original: metadata,
    variants,
    srcset: srcsetParts.join(', '),
    blurDataURL,
  };
}

/**
 * High-level optimizer function for a single image file on disk.
 *
 * @param {string} inputPath - Absolute file path to the source image
 * @param {Object} [options]
 * @param {string} [options.outputDir] - Destination directory for variants
 * @param {string} [options.cacheDir] - Directory for image cache
 * @param {number[]} [options.widths] - Target widths
 * @param {number} [options.quality=80] - Compression quality
 * @param {string} [options.publicUrlPrefix='assets/images']
 * @returns {Promise<{ original: Object, variants: Array, srcset: string, blurDataURL: string, cached: boolean }>}
 */
export async function optimizeImageFile(inputPath, options = {}) {
  if (!existsSync(inputPath)) {
    throw new Error(`[ForgeWP Optimizer] Source image not found: ${inputPath}`);
  }

  const inputBuffer = readFileSync(inputPath);
  const parsed = path.parse(inputPath);
  const baseName = parsed.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const outputDir = options.outputDir || path.join(path.dirname(inputPath), 'optimized');
  const cache = options.cacheDir ? new ImageOptimizationCache(options.cacheDir) : null;

  const hash = computeImageHash(inputBuffer, {
    widths: options.widths,
    quality: options.quality,
    publicUrlPrefix: options.publicUrlPrefix,
  });

  if (cache) {
    const cached = cache.get(hash);
    if (cached && cached.variants && cached.variants.every((v) => existsSync(v.path))) {
      return { ...cached, cached: true };
    }
  }

  const result = await generateResponsiveVariants(inputBuffer, baseName, outputDir, options);
  const payload = { ...result, hash };

  if (cache) {
    cache.set(hash, payload);
  }

  return { ...payload, cached: false };
}
