import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {
  AssetGraph,
  normalizeFontFamilies,
  parseFontFaceRules,
  generateLocalFontFaceCss,
  downloadFontFiles,
} from '../../lib/assets/index.js';

describe('Font Orchestrator — Self-Hosting & @font-face Generation', () => {
  let tmpDir;
  let cacheDir;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-font-test-'));
    cacheDir = path.join(tmpDir, 'cache', 'fonts');
    fs.mkdirSync(cacheDir, { recursive: true });
  });

  afterAll(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('normalizes various font family configuration inputs', () => {
    const input1 = ['Inter:400,500,700', 'Space Grotesk:500,700'];
    const norm1 = normalizeFontFamilies(input1);
    expect(norm1).toEqual([
      'Inter:wght@400;500;700',
      'Space+Grotesk:wght@500;700',
    ]);

    const input2 = {
      families: ['Plus Jakarta Sans:400,600', 'JetBrains Mono:400'],
    };
    const norm2 = normalizeFontFamilies(input2);
    expect(norm2).toEqual([
      'Plus+Jakarta+Sans:wght@400;600',
      'JetBrains+Mono:wght@400',
    ]);
  });

  it('parses @font-face CSS blocks into structured rules', () => {
    const mockCss = `
/* latin */
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/inter/v18/inter-400.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153;
}

@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/inter/v18/inter-700.woff2) format('woff2');
}
`;

    const rules = parseFontFaceRules(mockCss);
    expect(rules).toHaveLength(2);

    expect(rules[0].family).toBe('Inter');
    expect(rules[0].weight).toBe('400');
    expect(rules[0].style).toBe('normal');
    expect(rules[0].remoteUrl).toBe('https://fonts.gstatic.com/s/inter/v18/inter-400.woff2');
    expect(rules[0].format).toBe('woff2');

    expect(rules[1].weight).toBe('700');
  });

  it('generates clean local @font-face CSS pointing to local files', () => {
    const mockRules = [
      {
        family: 'Inter',
        style: 'normal',
        weight: '400',
        display: 'swap',
        format: 'woff2',
        filename: 'inter-400-normal-abc123.woff2',
        unicodeRange: 'U+0000-00FF',
      },
      {
        family: 'Inter',
        style: 'normal',
        weight: '700',
        display: 'swap',
        format: 'woff2',
        filename: 'inter-700-normal-def456.woff2',
      },
    ];

    const localCss = generateLocalFontFaceCss(mockRules, './');
    expect(localCss).toContain("@font-face {\n  font-family: 'Inter';");
    expect(localCss).toContain("src: url('./inter-400-normal-abc123.woff2') format('woff2');");
    expect(localCss).toContain('unicode-range: U+0000-00FF;');
    expect(localCss).toContain("src: url('./inter-700-normal-def456.woff2') format('woff2');");
  });

  it('downloads font files and retrieves from disk cache on subsequent runs', async () => {
    const mockRules = [
      {
        family: 'CustomTest',
        style: 'normal',
        weight: '400',
        display: 'swap',
        format: 'woff2',
        remoteUrl: 'https://fonts.gstatic.com/mock-custom.woff2',
      },
    ];

    // Seed the cache with a mock font binary
    const outputDir = path.join(tmpDir, 'theme-fonts');
    const crypto = await import('node:crypto');
    const urlHash = crypto.createHash('sha256').update(mockRules[0].remoteUrl).digest('hex').slice(0, 12);
    const filename = `customtest-400-normal-${urlHash}.woff2`;
    fs.writeFileSync(path.join(cacheDir, filename), Buffer.from('mock-woff2-binary'));

    const enriched = await downloadFontFiles(mockRules, outputDir, cacheDir);
    expect(enriched).toHaveLength(1);
    expect(fs.existsSync(enriched[0].localPath)).toBe(true);

    const content = fs.readFileSync(enriched[0].localPath, 'utf8');
    expect(content).toBe('mock-woff2-binary');
  });
});
