import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import sharp from 'sharp';
import {
  AssetGraph,
  scanAssetGraph,
  runAssetPipeline,
  orchestrateFonts,
  generatePreloadTags,
  generateAssetManifest,
  printAssetDiagnosticsReport,
  computeUrlHash,
} from '../../lib/assets/index.js';
import { processMarkup } from '../../lib/markup-processor.js';

describe('ForgeWP Asset Orchestration — Comprehensive End-to-End System Test', () => {
  let themeRoot;
  let outDir;
  let cacheDir;

  beforeAll(async () => {
    themeRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-e2e-theme-'));
    outDir = path.join(themeRoot, '.forgewp', 'out');
    cacheDir = path.join(themeRoot, '.forgewp', 'cache');

    fs.mkdirSync(path.join(themeRoot, 'src', 'assets'), { recursive: true });
    fs.mkdirSync(path.join(themeRoot, 'src', 'components'), { recursive: true });
    fs.mkdirSync(path.join(cacheDir, 'fonts'), { recursive: true });
    fs.mkdirSync(path.join(cacheDir, 'external'), { recursive: true });
    fs.mkdirSync(outDir, { recursive: true });

    // 1. Create a sample high-res static PNG image in src/assets/
    await sharp({
      create: {
        width: 1600,
        height: 900,
        channels: 4,
        background: { r: 40, g: 120, b: 200, alpha: 1 },
      },
    })
      .png()
      .toFile(path.join(themeRoot, 'src', 'assets', 'hero-living-room.png'));

    // 2. Seed cache for an external image with optimize="build"
    const externalUrl = 'https://images.unsplash.com/photo-luxury-chair';
    const extHash = computeUrlHash(externalUrl);
    const cachedExtPath = path.join(cacheDir, 'external', `${extHash}.png`);
    await sharp({
      create: {
        width: 1200,
        height: 800,
        channels: 4,
        background: { r: 180, g: 140, b: 90, alpha: 1 },
      },
    })
      .png()
      .toFile(cachedExtPath);

    fs.writeFileSync(
      path.join(cacheDir, 'external', 'manifest.json'),
      JSON.stringify({
        [extHash]: {
          url: externalUrl,
          filePath: cachedExtPath,
          contentType: 'image/png',
          timestamp: Date.now(),
        },
      }),
      'utf8',
    );

    // 3. Create TSX Component exercising multiple image types and font weight classes
    const componentCode = `
import React from 'react';
import { WpImage } from '@forgewp/react';

export function HeroSection() {
  return (
    <section className="font-heading font-semibold text-slate-900">
      <h1 className="font-bold text-4xl">Comfortable Living</h1>
      <p className="font-medium text-lg">Curated design furniture</p>
      
      {/* 1. Local static hero image with LCP priority */}
      <WpImage
        src="/src/assets/hero-living-room.png"
        alt="Hero Living Room"
        priority={true}
        className="rounded-2xl shadow-xl"
      />

      {/* 2. Dynamic WordPress Media Attachment by numeric ID */}
      <WpImage
        src={205}
        size="large"
        alt="WordPress Media Library Item"
        className="aspect-video object-cover"
      />

      {/* 3. Dynamic WordPress Post Featured Image */}
      <WpImage
        src="featuredImage"
        size="medium_large"
        alt="Featured Post Banner"
      />

      {/* 4. External image with opt-in build optimization */}
      <WpImage
        src="${externalUrl}"
        optimize="build"
        alt="Luxury Chair"
        className="w-full h-auto"
      />
    </section>
  );
}
`;
    fs.writeFileSync(
      path.join(themeRoot, 'src', 'components', 'HeroSection.tsx'),
      componentCode,
      'utf8',
    );
  });

  afterAll(() => {
    if (themeRoot && fs.existsSync(themeRoot)) {
      fs.rmSync(themeRoot, { recursive: true, force: true });
    }
  });

  it('scans and classifies all heterogeneous image assets from TypeScript AST', () => {
    const graph = scanAssetGraph(themeRoot);
    const all = graph.getAllAssets();

    expect(all.length).toBeGreaterThanOrEqual(4);

    const localHero = graph.getAsset('/src/assets/hero-living-room.png');
    expect(localHero).toBeDefined();
    expect(localHero.classification).toBe('local-static');
    expect(localHero.priority).toBe(true);

    const wpAttachment = graph.getAsset('205');
    expect(wpAttachment).toBeDefined();
    expect(wpAttachment.classification).toBe('wp-attachment');

    const featuredImg = graph.getAsset('featuredImage');
    expect(featuredImg).toBeDefined();
    expect(featuredImg.classification).toBe('wp-attachment');

    const extImage = graph.getAsset('https://images.unsplash.com/photo-luxury-chair');
    expect(extImage).toBeDefined();
    expect(extImage.classification).toBe('external-url');
    expect(extImage.optimize).toBe('build');
  });

  it('runs build-time optimization pipeline for local and external assets', async () => {
    const graph = scanAssetGraph(themeRoot);
    const results = await runAssetPipeline(themeRoot, graph, {
      outDir,
      cacheDir,
      quality: 80,
    });

    expect(results.processedCount).toBeGreaterThanOrEqual(2);
    expect(results.errors).toHaveLength(0);

    // Verify local hero image variants in output directory
    const heroNode = graph.getAsset('/src/assets/hero-living-room.png');
    expect(heroNode.width).toBe(1600);
    expect(heroNode.height).toBe(900);
    expect(heroNode.srcset).toContain('480w');
    expect(heroNode.srcset).toContain('768w');
    expect(heroNode.srcset).toContain('1024w');
    expect(heroNode.srcset).toContain('1440w');
    expect(heroNode.blurDataURL).toMatch(/^data:image\/webp;base64,/);

    // Verify generated WebP files exist on disk
    const targetImagesDir = path.join(outDir, 'assets', 'images');
    expect(fs.existsSync(targetImagesDir)).toBe(true);
    const files = fs.readdirSync(targetImagesDir);
    expect(files.some((f) => f.includes('hero-living-room') && f.endsWith('.webp'))).toBe(true);
    expect(files.some((f) => f.startsWith('ext-') && f.endsWith('.webp'))).toBe(true);
  });

  it('generates responsive LCP preloads for both WordPress PHP and static HTML targets', () => {
    const graph = scanAssetGraph(themeRoot);
    const heroNode = graph.getAsset('/src/assets/hero-living-room.png');
    heroNode.variants = [
      { width: 480, height: 270, format: 'webp', publicUrl: 'assets/images/hero-480w.webp' },
      { width: 1024, height: 576, format: 'webp', publicUrl: 'assets/images/hero-1024w.webp' },
    ];
    heroNode.srcset = 'assets/images/hero-480w.webp 480w, assets/images/hero-1024w.webp 1024w';
    heroNode.sizes = '(max-width: 1024px) 100vw, 50vw';

    // Target 1: Decoupled / Static HTML
    const staticPreloads = generatePreloadTags(graph, { isPhp: false });
    expect(staticPreloads).toHaveLength(1);
    expect(staticPreloads[0]).toContain('<link rel="preload" as="image"');
    expect(staticPreloads[0]).toContain('imagesrcset="assets/images/hero-480w.webp 480w, assets/images/hero-1024w.webp 1024w"');
    expect(staticPreloads[0]).toContain('fetchpriority="high"');

    // Target 2: WordPress Theme PHP
    const phpPreloads = generatePreloadTags(graph, { isPhp: true });
    expect(phpPreloads).toHaveLength(1);
    expect(phpPreloads[0]).toContain('get_theme_file_uri');
  });

  it('transpiles markup seamlessly for WordPress PHP and static HTML targets', () => {
    const rawMarkup = `
      <forgewp-image data-src="205" data-size="large" alt="WP Media" class="aspect-video" />
      <forgewp-image data-src="featuredImage" data-size="medium_large" alt="Featured Post" />
      <forgewp-image data-src="/src/assets/hero-living-room.png" alt="Hero" data-priority="true" />
    `;

    const processed = processMarkup(rawMarkup, {});

    // Target 2 verification: dynamic WP attachments use native wp_get_attachment_image
    expect(processed).toContain("wp_get_attachment_image( 205, 'large'");
    expect(processed).toContain('get_post_thumbnail_id( get_the_ID() )');
    expect(processed).toContain("wp_get_attachment_image( get_post_thumbnail_id( get_the_ID() ), 'medium_large'");

    // Local static image uses get_theme_file_uri
    expect(processed).toContain('get_theme_file_uri');
    expect(processed).toContain('fetchpriority="high"');
  });

  it('orchestrates fonts, detects unused weights, and produces complete asset manifest', async () => {
    const config = {
      fonts: {
        google: {
          families: [
            'Inter:wght@400;600;700',
            'Space Grotesk:wght@500;800', // Note: 800 is declared in config but not used in HeroSection.tsx
          ],
          strategy: 'self-host',
        },
      },
    };

    const graph = scanAssetGraph(themeRoot);
    const manifest = generateAssetManifest(themeRoot, graph, {
      outDir,
      config,
      fontRules: [
        {
          family: 'Inter',
          weight: '400',
          style: 'normal',
          filename: 'inter-400.woff2',
          publicUrl: 'assets/fonts/inter-400.woff2',
        },
      ],
    });

    expect(manifest.version).toBe('1.0.0');
    expect(manifest.summary.totalImages).toBeGreaterThanOrEqual(2);
    expect(manifest.summary.preloadedAssets).toBeGreaterThanOrEqual(1);

    // Unused font weight intelligence verification
    expect(manifest.diagnostics.unusedFontWeights.length).toBeGreaterThanOrEqual(1);
    const unused800 = manifest.diagnostics.unusedFontWeights.find((u) => u.weight === 800);
    expect(unused800).toBeDefined();
    expect(unused800.family).toBe('Space Grotesk');
    expect(unused800.sizeKb).toBeGreaterThan(0);

    // Manifest written to disk
    expect(fs.existsSync(path.join(outDir, 'asset-manifest.json'))).toBe(true);

    // Terminal report renders cleanly
    expect(() => printAssetDiagnosticsReport(manifest)).not.toThrow();
  });
});
