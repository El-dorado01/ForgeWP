import { describe, it, expect } from 'vitest';
import { AssetGraph, generatePreloadTags } from '../../lib/assets/index.js';

describe('Preload Generator — Core Web Vitals (LCP)', () => {
  it('generates responsive <link rel="preload"> for local static hero images in PHP mode', () => {
    const graph = new AssetGraph('/test-theme');
    graph.addAsset({
      id: '/assets/hero.png',
      type: 'image',
      classification: 'local-static',
      source: '/assets/hero.png',
      priority: true,
      sizes: '(max-width: 1024px) 100vw, 50vw',
      variants: [
        { width: 480, height: 320, publicUrl: 'assets/images/hero-480w.webp' },
        { width: 1024, height: 683, publicUrl: 'assets/images/hero-1024w.webp' },
      ],
    });

    const tags = generatePreloadTags(graph, { isPhp: true });
    expect(tags).toHaveLength(1);

    const tag = tags[0];
    expect(tag).toContain('rel="preload"');
    expect(tag).toContain('as="image"');
    expect(tag).toContain('fetchpriority="high"');
    expect(tag).toContain("get_theme_file_uri( 'assets/images/hero-1024w.webp' )");
    expect(tag).toContain("get_theme_file_uri( 'assets/images/hero-480w.webp' )");
    expect(tag).toContain('imagesizes="(max-width: 1024px) 100vw, 50vw"');
  });

  it('generates simple <link rel="preload"> for external hero images', () => {
    const graph = new AssetGraph('/test-theme');
    graph.addAsset({
      id: 'https://images.unsplash.com/hero-lcp',
      type: 'image',
      classification: 'external-url',
      source: 'https://images.unsplash.com/hero-lcp',
      priority: true,
    });

    const tags = generatePreloadTags(graph, { isPhp: true });
    expect(tags).toHaveLength(1);
    expect(tags[0]).toBe(
      '<link rel="preload" as="image" href="https://images.unsplash.com/hero-lcp" fetchpriority="high">',
    );
  });

  it('ignores non-priority assets to prevent preload queue saturation', () => {
    const graph = new AssetGraph('/test-theme');
    graph.addAsset({
      id: '/assets/footer-logo.png',
      type: 'image',
      classification: 'local-static',
      source: '/assets/footer-logo.png',
      priority: false,
    });

    const tags = generatePreloadTags(graph, { isPhp: true });
    expect(tags).toHaveLength(0);
  });

  it('generates decoupled static relative preload tags when isPhp is false', () => {
    const graph = new AssetGraph('/test-theme');
    graph.addAsset({
      id: '/assets/hero.png',
      type: 'image',
      classification: 'local-static',
      source: '/assets/hero.png',
      priority: true,
      variants: [
        { width: 768, height: 500, publicUrl: 'assets/images/hero-768w.webp' },
      ],
    });

    const tags = generatePreloadTags(graph, { isPhp: false });
    expect(tags).toHaveLength(1);
    expect(tags[0]).toContain('href="assets/images/hero-768w.webp"');
    expect(tags[0]).not.toContain('get_theme_file_uri');
  });
});
