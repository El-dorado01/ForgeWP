import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadProductsData, buildSeedProductsPhp } from '../../lib/functions/seed-products.js';

describe('WooCommerce Product Seeder Generator', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-seed-products-'));
    fs.mkdirSync(path.join(tmpDir, 'cms'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty string if seed.products is not configured', () => {
    const config = { textDomain: 'test-theme' };
    const php = buildSeedProductsPhp(config, tmpDir);
    expect(php).toBe('');
  });

  it('loads products from cms/products.json and generates WooCommerce PHP seeder', () => {
    const mockProducts = [
      {
        id: 1,
        slug: 'nordic-lounge-chair',
        name: 'Nordic Lounge Chair',
        price: 299,
        categories: ['Furniture', 'Chairs'],
        sku: 'FWP-NORDIC-CHAIR',
        images: ['https://example.com/chair.jpg'],
        description: 'A cozy minimalist lounge chair.',
        shortDescription: 'Nordic comfort.',
        weight: 12.5,
        dimensions: { length: 80, width: 75, height: 90 },
      },
    ];

    fs.writeFileSync(
      path.join(tmpDir, 'cms', 'products.json'),
      JSON.stringify(mockProducts, null, 2)
    );

    const config = {
      textDomain: 'test-theme',
      seed: {
        products: 'once',
        developmentOnly: true,
      },
    };

    const php = buildSeedProductsPhp(config, tmpDir);

    expect(php).toContain('forgewp_seed_woocommerce_products');
    expect(php).toContain('class_exists(\'WooCommerce\')');
    expect(php).toContain('Nordic Lounge Chair');
    expect(php).toContain('FWP-NORDIC-CHAIR');
    expect(php).toContain('product_cat');
    expect(php).toContain('forgewp_seeded_products_hash');
    expect(php).toContain('wp forgewp seed-products');
  });
});
