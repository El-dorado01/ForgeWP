import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import sharp from 'sharp';
import {
  AssetGraph,
  computeUrlHash,
  fetchExternalImage,
  processExternalBuildOptimizations,
} from '../../lib/assets/index.js';

describe('External Asset Fetcher & Optimizer', () => {
  let tmpDir;
  let cacheDir;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-ext-test-'));
    cacheDir = path.join(tmpDir, 'cache', 'external');
    fs.mkdirSync(cacheDir, { recursive: true });
  });

  afterAll(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('computes deterministic SHA256 URL hashes', () => {
    const url1 = 'https://images.unsplash.com/photo-123';
    const url2 = 'https://images.unsplash.com/photo-123';
    const url3 = 'https://images.unsplash.com/photo-456';

    expect(computeUrlHash(url1)).toBe(computeUrlHash(url2));
    expect(computeUrlHash(url1)).not.toBe(computeUrlHash(url3));
  });

  it('rejects invalid or non-HTTP/HTTPS URLs cleanly', async () => {
    await expect(fetchExternalImage('ftp://example.com/image.jpg')).rejects.toThrow(
      /Invalid HTTP\/HTTPS URL/,
    );
  });

  it('serves cached images from disk without network fetch', async () => {
    const testUrl = 'https://example.com/cached-chair.png';
    const hash = computeUrlHash(testUrl);
    const cachedImagePath = path.join(cacheDir, `${hash}.png`);

    // Create a dummy image in cache
    await sharp({
      create: {
        width: 600,
        height: 400,
        channels: 4,
        background: { r: 120, g: 80, b: 40, alpha: 1 },
      },
    })
      .png()
      .toFile(cachedImagePath);

    const manifestPath = path.join(cacheDir, 'manifest.json');
    fs.writeFileSync(
      manifestPath,
      JSON.stringify({
        [hash]: {
          url: testUrl,
          filePath: cachedImagePath,
          contentType: 'image/png',
          timestamp: Date.now(),
        },
      }),
      'utf8',
    );

    const result = await fetchExternalImage(testUrl, { cacheDir });
    expect(result.cached).toBe(true);
    expect(result.contentType).toBe('image/png');
    expect(result.buffer).toBeInstanceOf(Buffer);
  });

  it('processes optimize="build" external assets into local WebP variants', async () => {
    const testUrl = 'https://example.com/editorial-room.png';
    const hash = computeUrlHash(testUrl);
    const cachedImagePath = path.join(cacheDir, `${hash}.png`);

    // Seed the cache with a mock downloaded image
    await sharp({
      create: {
        width: 1000,
        height: 600,
        channels: 4,
        background: { r: 200, g: 150, b: 100, alpha: 1 },
      },
    })
      .png()
      .toFile(cachedImagePath);

    const manifestPath = path.join(cacheDir, 'manifest.json');
    let manifest = {};
    if (fs.existsSync(manifestPath)) {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    }
    manifest[hash] = {
      url: testUrl,
      filePath: cachedImagePath,
      contentType: 'image/png',
      timestamp: Date.now(),
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest), 'utf8');

    const graph = new AssetGraph(tmpDir);
    graph.addAsset({
      id: testUrl,
      type: 'image',
      classification: 'external-url',
      source: testUrl,
      optimize: 'build',
    });

    const outDir = path.join(tmpDir, 'theme-out');
    const result = await processExternalBuildOptimizations(tmpDir, graph, {
      outDir,
      cacheDir: path.join(tmpDir, 'cache'),
    });

    expect(result.processedCount).toBe(1);
    expect(result.errors).toHaveLength(0);

    const node = graph.getAsset(testUrl);
    expect(node.localOptimized).toBe(true);
    expect(node.width).toBe(1000);
    expect(node.height).toBe(600);
    expect(node.srcset).toContain('assets/images/ext-');
    expect(node.blurDataURL).toMatch(/^data:image\/webp;base64,/);
  });

  it('falls back gracefully on network failure without breaking the build', async () => {
    const graph = new AssetGraph(tmpDir);
    const badUrl = 'https://127.0.0.1:59999/nonexistent-image-to-fail.jpg';
    graph.addAsset({
      id: badUrl,
      type: 'image',
      classification: 'external-url',
      source: badUrl,
      optimize: 'build',
    });

    const result = await processExternalBuildOptimizations(tmpDir, graph, {
      outDir: path.join(tmpDir, 'theme-out'),
      cacheDir: path.join(tmpDir, 'cache'),
    });

    expect(result.processedCount).toBe(0);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);

    const node = graph.getAsset(badUrl);
    // Node remains in safe passthrough mode
    expect(node.localOptimized).toBeUndefined();
    expect(node.source).toBe(badUrl);
  });
});
