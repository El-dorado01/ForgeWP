import { describe, it, expect } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {
  AssetGraph,
  classifyAssetSource,
  scanAssetGraph,
} from '../../lib/assets/index.js';

describe('Asset Graph — Source Classification', () => {
  it('correctly classifies WordPress attachments by id, field, or object', () => {
    expect(classifyAssetSource(undefined, 123)).toBe('wp-attachment');
    expect(classifyAssetSource(undefined, undefined, 'featuredImage')).toBe('wp-attachment');
    expect(classifyAssetSource(undefined, undefined, 'hero_banner')).toBe('wp-attachment');
    expect(classifyAssetSource(42)).toBe('wp-attachment');
    expect(classifyAssetSource({ id: 99, url: 'https://wp.site/image.jpg' })).toBe('wp-attachment');
    expect(classifyAssetSource({ sizes: { full: { url: 'https://wp.site/full.jpg' } } })).toBe('wp-attachment');
  });

  it('correctly classifies external URLs', () => {
    expect(classifyAssetSource('https://images.unsplash.com/photo-1618221195710')).toBe('external-url');
    expect(classifyAssetSource('http://cdn.example.com/assets/banner.png')).toBe('external-url');
    expect(classifyAssetSource('//cdn.example.com/assets/banner.png')).toBe('external-url');
    expect(classifyAssetSource({ src: 'https://images.unsplash.com/photo-1' })).toBe('external-url');
  });

  it('correctly classifies local static assets', () => {
    expect(classifyAssetSource('/assets/hero.jpg')).toBe('local-static');
    expect(classifyAssetSource('@/assets/images/chair.png')).toBe('local-static');
    expect(classifyAssetSource('./icons/sparkles.svg')).toBe('local-static');
    expect(classifyAssetSource({ src: '/assets/imported-hero.jpg', width: 1200, height: 800 })).toBe('local-static');
  });
});

describe('Asset Graph — Model & Querying', () => {
  it('manages asset nodes, merges properties, and queries by category', () => {
    const graph = new AssetGraph('/test-root');

    // Add local hero image
    graph.addAsset({
      id: '/assets/hero.jpg',
      type: 'image',
      classification: 'local-static',
      source: '/assets/hero.jpg',
      width: 1440,
      height: 900,
      priority: true,
      usageLocations: [{ file: 'src/components/Hero.tsx', line: 12 }],
    });

    // Add another usage of the same asset with extra properties
    graph.addAsset({
      id: '/assets/hero.jpg',
      sizes: '(max-width: 1024px) 100vw, 50vw',
      usageLocations: [{ file: 'src/app/page.tsx', line: 45 }],
    });

    // Add external image
    graph.addAsset({
      id: 'https://images.unsplash.com/photo-1',
      type: 'image',
      classification: 'external-url',
      source: 'https://images.unsplash.com/photo-1',
      width: 800,
      height: 600,
      priority: false,
    });

    // Add WP attachment
    graph.addAsset({
      id: 'field:featuredImage',
      type: 'image',
      classification: 'wp-attachment',
      source: 'field:featuredImage',
      field: 'featuredImage',
    });

    const hero = graph.getAsset('/assets/hero.jpg');
    expect(hero).toBeDefined();
    expect(hero.priority).toBe(true);
    expect(hero.loading).toBe('eager');
    expect(hero.width).toBe(1440);
    expect(hero.sizes).toBe('(max-width: 1024px) 100vw, 50vw');
    expect(hero.usageLocations).toHaveLength(2);

    expect(graph.getLocalImages()).toHaveLength(1);
    expect(graph.getPriorityAssets()).toHaveLength(1);
    expect(graph.getExternalAssets()).toHaveLength(1);
    expect(graph.getWpAttachments()).toHaveLength(1);

    const json = graph.toJSON();
    expect(json.totalAssets).toBe(3);
    expect(json.assets['/assets/hero.jpg'].priority).toBe(true);
  });
});

describe('Asset Graph — AST Code Scanner', () => {
  it('scans TSX source files and discovers <WpImage>, <img>, and static imports', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-asset-test-'));
    const srcDir = path.join(tmpDir, 'src', 'components');
    fs.mkdirSync(srcDir, { recursive: true });

    const componentCode = `
import React from 'react';
import bannerImg from '@/assets/banner.png';
import { WpImage } from '@forgewp/react';

export function HeaderHero({ post }) {
  return (
    <section>
      <WpImage
        src="/assets/hero-chair.jpg"
        alt="Hero Chair"
        width={1440}
        height={800}
        priority
        sizes="(max-width: 1024px) 100vw, 50vw"
      />
      <WpImage
        field="featuredImage"
        alt={post.title}
        size="large"
      />
      <WpImage
        src="https://images.unsplash.com/photo-editorial"
        alt="Editorial Room"
        width={800}
        height={600}
        optimize="build"
      />
      <img
        src="/icons/star.svg"
        alt="Star Icon"
        width={24}
        height={24}
        loading="lazy"
      />
    </section>
  );
}
`;

    fs.writeFileSync(path.join(srcDir, 'HeaderHero.tsx'), componentCode, 'utf8');

    const graph = scanAssetGraph(tmpDir);
    const assets = graph.getAllAssets();

    expect(assets.length).toBeGreaterThanOrEqual(4);

    // 1. Static import
    const banner = graph.getAsset('@/assets/banner.png');
    expect(banner).toBeDefined();
    expect(banner.classification).toBe('local-static');

    // 2. Local hero WpImage with priority
    const hero = graph.getAsset('/assets/hero-chair.jpg');
    expect(hero).toBeDefined();
    expect(hero.classification).toBe('local-static');
    expect(hero.priority).toBe(true);
    expect(hero.width).toBe(1440);
    expect(hero.height).toBe(800);
    expect(hero.sizes).toBe('(max-width: 1024px) 100vw, 50vw');

    // 3. Featured image WpImage
    const feat = graph.getAsset('field:featuredImage');
    expect(feat).toBeDefined();
    expect(feat.classification).toBe('wp-attachment');
    expect(feat.field).toBe('featuredImage');

    // 4. External Unsplash WpImage
    const unsplash = graph.getAsset('https://images.unsplash.com/photo-editorial');
    expect(unsplash).toBeDefined();
    expect(unsplash.classification).toBe('external-url');
    expect(unsplash.optimize).toBe('build');

    // Clean up
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
