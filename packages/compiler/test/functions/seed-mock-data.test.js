import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadMockData, buildSeedMockDataPhp } from '../../lib/functions/seed-mock-data.js';

describe('WordPress Mock Data Seeder Generator', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-seed-mock-'));
    fs.mkdirSync(path.join(tmpDir, 'cms'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty string if seed.mockData is not configured', () => {
    const config = { textDomain: 'test-theme' };
    const php = buildSeedMockDataPhp(config, tmpDir);
    expect(php).toBe('');
  });

  it('loads mock data from cms/mock-data.json and generates WordPress post/CPT seeder', () => {
    const mockData = {
      project: [
        {
          id: 1,
          title: 'Villa Minimalist',
          slug: 'villa-minimalist',
          excerpt: 'Modern architecture showcase.',
          content: '<p>Complete interior and exterior renovation.</p>',
          featuredImage: 'https://example.com/villa.jpg',
          customFields: {
            architect: 'Studio Nordic',
            year: '2026',
          },
          _terms: {
            category: ['Residential'],
          },
        },
      ],
      post: [
        {
          id: 10,
          title: 'Design Trends 2026',
          slug: 'design-trends-2026',
          content: '<p>Top interior trends.</p>',
        },
      ],
    };

    fs.writeFileSync(
      path.join(tmpDir, 'cms', 'mock-data.json'),
      JSON.stringify(mockData, null, 2)
    );

    const config = {
      textDomain: 'test-theme',
      seed: {
        mockData: 'once',
        developmentOnly: true,
      },
    };

    const php = buildSeedMockDataPhp(config, tmpDir);

    expect(php).toContain('forgewp_seed_mock_content');
    expect(php).toContain('Villa Minimalist');
    expect(php).toContain('Design Trends 2026');
    expect(php).toContain('update_post_meta');
    expect(php).toContain('wp_set_post_terms');
    expect(php).toContain('forgewp_seeded_mock_data_hash');
    expect(php).toContain('wp forgewp seed-mock-data');
  });
});
