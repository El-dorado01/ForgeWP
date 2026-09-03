import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {
  AssetGraph,
  scanFontWeightUsage,
  detectUnusedFontWeights,
  generateAssetManifest,
  printAssetDiagnosticsReport,
} from '../../lib/assets/index.js';

describe('Asset Manifest & Diagnostics Report', () => {
  let tmpDir;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-diag-test-'));
    const srcDir = path.join(tmpDir, 'src', 'components');
    fs.mkdirSync(srcDir, { recursive: true });

    // Create a mock component using specific font weight classes
    const componentCode = `
import React from 'react';

export function Banner() {
  return (
    <div className="font-semibold text-lg">
      <h1 className="font-bold text-2xl">Title</h1>
      <p className="font-medium text-sm">Subtitle</p>
      <span className="font-[300]">Extra Light</span>
    </div>
  );
}
`;
    fs.writeFileSync(path.join(srcDir, 'Banner.tsx'), componentCode, 'utf8');
  });

  afterAll(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('scans and identifies used font weights from source code', () => {
    const { usedWeights } = scanFontWeightUsage(tmpDir);

    expect(usedWeights.has(400)).toBe(true); // Base body text default
    expect(usedWeights.has(300)).toBe(true); // font-[300]
    expect(usedWeights.has(500)).toBe(true); // font-medium
    expect(usedWeights.has(600)).toBe(true); // font-semibold
    expect(usedWeights.has(700)).toBe(true); // font-bold
    expect(usedWeights.has(900)).toBe(false); // font-black not used
  });

  it('detects unused configured font weights and calculates file savings', () => {
    const { usedWeights } = scanFontWeightUsage(tmpDir);

    const mockFontRules = [
      {
        family: 'Space Grotesk',
        weight: '500',
        style: 'normal',
        filename: 'space-grotesk-500.woff2',
      },
      {
        family: 'Space Grotesk',
        weight: '700',
        style: 'normal',
        filename: 'space-grotesk-700.woff2',
      },
      {
        family: 'Space Grotesk',
        weight: '900',
        style: 'normal',
        filename: 'space-grotesk-900.woff2',
      },
    ];

    const unused = detectUnusedFontWeights(mockFontRules, usedWeights);
    expect(unused).toHaveLength(1);
    expect(unused[0].family).toBe('Space Grotesk');
    expect(unused[0].weight).toBe(900);
  });

  it('scans real comfortable-decor project and identifies used and unused font weights', () => {
    const comfortableDecorRoot = path.resolve(__dirname, '../../../comfortable-decor');
    if (fs.existsSync(comfortableDecorRoot)) {
      const { usedWeights } = scanFontWeightUsage(comfortableDecorRoot);
      expect(usedWeights.has(400)).toBe(true);
      expect(usedWeights.has(500)).toBe(true);
      expect(usedWeights.has(600)).toBe(true);
      expect(usedWeights.has(800)).toBe(false); // 800 (extrabold) is not used in comfortable-decor
    }
  });

  it('generates a machine-readable asset-manifest.json', () => {
    const graph = new AssetGraph(tmpDir);
    graph.addAsset({
      id: '/assets/hero.jpg',
      type: 'image',
      classification: 'local-static',
      source: '/assets/hero.jpg',
      width: 1440,
      height: 900,
      priority: true,
      variants: [
        { width: 768, height: 480, format: 'webp', publicUrl: 'assets/images/hero-768w.webp' },
        { width: 1440, height: 900, format: 'webp', publicUrl: 'assets/images/hero-1440w.webp' },
      ],
    });

    const outDir = path.join(tmpDir, 'theme-out');
    const manifest = generateAssetManifest(tmpDir, graph, {
      outDir,
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
    expect(manifest.summary.totalImages).toBe(1);
    expect(manifest.summary.optimizedImages).toBe(1);
    expect(manifest.summary.totalVariants).toBe(2);
    expect(manifest.summary.totalFonts).toBe(1);
    expect(manifest.summary.preloadedAssets).toBe(1);

    // Verify manifest file exists on disk
    expect(fs.existsSync(path.join(outDir, 'asset-manifest.json'))).toBe(true);

    // Verify print output does not throw
    expect(() => printAssetDiagnosticsReport(manifest)).not.toThrow();
  });
});
