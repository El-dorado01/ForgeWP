import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import sharp from 'sharp';
import {
  getImageMetadata,
  generateBlurPlaceholder,
  generateResponsiveVariants,
  optimizeImageFile,
  computeImageHash,
  runAssetPipeline,
  AssetGraph,
} from '../../lib/assets/index.js';

describe('Image Optimizer — Sharp Integration', () => {
  let tmpDir;
  let testLargePngPath;
  let testSmallJpgPath;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-img-test-'));

    // 1. Create a 1200x800 sample PNG
    testLargePngPath = path.join(tmpDir, 'hero-chair.png');
    await sharp({
      create: {
        width: 1200,
        height: 800,
        channels: 4,
        background: { r: 180, g: 140, b: 100, alpha: 1 },
      },
    })
      .png()
      .toFile(testLargePngPath);

    // 2. Create a 400x300 sample JPEG
    testSmallJpgPath = path.join(tmpDir, 'thumb-pot.jpg');
    await sharp({
      create: {
        width: 400,
        height: 300,
        channels: 3,
        background: { r: 50, g: 100, b: 150 },
      },
    })
      .jpeg()
      .toFile(testSmallJpgPath);
  });

  afterAll(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('extracts intrinsic dimensions and format correctly', async () => {
    const meta = await getImageMetadata(testLargePngPath);
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(800);
    expect(meta.format).toBe('png');
    expect(meta.aspectRatio).toBe(1.5);
    expect(meta.hasAlpha).toBe(true);
  });

  it('generates base64 WebP blur placeholder (LQIP)', async () => {
    const blur = await generateBlurPlaceholder(testLargePngPath);
    expect(blur).toMatch(/^data:image\/webp;base64,/);
    expect(blur.length).toBeGreaterThan(50);
  });

  it('generates responsive WebP variants without upscaling', async () => {
    const outputDir = path.join(tmpDir, 'output-large');
    const inputBuffer = fs.readFileSync(testLargePngPath);

    const result = await generateResponsiveVariants(
      inputBuffer,
      'hero-chair',
      outputDir,
      {
        widths: [480, 768, 1024, 1440, 1920],
        quality: 80,
      },
    );

    expect(result.variants).toBeDefined();
    // 1200px source image should generate 480, 768, 1024, 1200 (capped at 1200, NO 1440 or 1920)
    const generatedWidths = result.variants.map((v) => v.width);
    expect(generatedWidths).toEqual([480, 768, 1024, 1200]);

    // Check files actually exist
    for (const v of result.variants) {
      expect(fs.existsSync(v.path)).toBe(true);
      expect(v.filename).toMatch(/^hero-chair-\d+w\.webp$/);
    }

    // Check srcset format
    expect(result.srcset).toContain('assets/images/hero-chair-480w.webp 480w');
    expect(result.srcset).toContain('assets/images/hero-chair-1200w.webp 1200w');
  });

  it('handles small images gracefully by capping to intrinsic width', async () => {
    const outputDir = path.join(tmpDir, 'output-small');
    const inputBuffer = fs.readFileSync(testSmallJpgPath);

    const result = await generateResponsiveVariants(
      inputBuffer,
      'thumb-pot',
      outputDir,
      {
        widths: [480, 768, 1024, 1440],
      },
    );

    // 400px source image should generate exactly [400]
    expect(result.variants).toHaveLength(1);
    expect(result.variants[0].width).toBe(400);
    expect(fs.existsSync(result.variants[0].path)).toBe(true);
  });

  it('caches optimized results across invocations', async () => {
    const outputDir = path.join(tmpDir, 'output-cached');
    const cacheDir = path.join(tmpDir, 'cache');

    // First run (fresh)
    const run1 = await optimizeImageFile(testLargePngPath, {
      outputDir,
      cacheDir,
    });
    expect(run1.cached).toBe(false);

    // Second run (cached)
    const run2 = await optimizeImageFile(testLargePngPath, {
      outputDir,
      cacheDir,
    });
    expect(run2.cached).toBe(true);
    expect(run2.variants.length).toBe(run1.variants.length);
  });

  it('runs asset pipeline over an AssetGraph and populates node metadata', async () => {
    const graph = new AssetGraph(tmpDir);
    graph.addAsset({
      id: '/assets/hero-chair.png',
      type: 'image',
      classification: 'local-static',
      source: '/assets/hero-chair.png',
      resolvedPath: testLargePngPath,
    });

    const pipelineResult = await runAssetPipeline(tmpDir, graph, {
      outDir: path.join(tmpDir, 'theme-out'),
      cacheDir: path.join(tmpDir, 'pipeline-cache'),
    });

    expect(pipelineResult.processedCount).toBe(1);
    expect(pipelineResult.totalVariants).toBeGreaterThanOrEqual(1);

    const node = graph.getAsset('/assets/hero-chair.png');
    expect(node.width).toBe(1200);
    expect(node.height).toBe(800);
    expect(node.srcset).toBeDefined();
    expect(node.blurDataURL).toMatch(/^data:image\/webp;base64,/);
  });
});
