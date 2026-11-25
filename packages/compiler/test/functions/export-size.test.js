/**
 * Export size: capped WebP variants, WebP <img src>, and originals left out of
 * the theme once nothing names them.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { describe, it, expect } from 'vitest';
import { generateResponsiveVariants, DEFAULT_RESPONSIVE_WIDTHS } from '../../lib/assets/image-optimizer.js';
import { getResponsiveFallbackSrc } from '../../lib/markup-processor.js';
import { pruneOptimizedOriginals, rewriteBundles, fallbackVariantUrl, findUnreferencedPublicFiles, removeExcludedPublicFiles } from '../../lib/assets/prune-originals.js';
import { globToRegExp } from '../../lib/companion-sources.js';
import { runLosslessPass } from '../../lib/assets/lossless-pass.js';

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-size-'));
}
const image = (width, height = Math.round(width / 2)) =>
  sharp({ create: { width, height, channels: 3, background: '#888' } }).jpeg().toBuffer();

describe('responsive variants', () => {
  it('never writes a variant wider than the largest target (no 4912w copy of a big photo)', async () => {
    const dir = tmp();
    try {
      const r = await generateResponsiveVariants(await image(4912), 'berlin', dir);
      const widths = r.variants.map((v) => v.width);
      expect(Math.max(...widths)).toBe(Math.max(...DEFAULT_RESPONSIVE_WIDTHS));
      expect(widths).not.toContain(4912);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('still adds the original width when it is between two targets, and never upscales', async () => {
    const dir = tmp();
    try {
      expect((await generateResponsiveVariants(await image(1053), 'logo', dir)).variants.map((v) => v.width)).toEqual([480, 768, 1024, 1053]);
      expect((await generateResponsiveVariants(await image(300), 'icon', dir)).variants.map((v) => v.width)).toEqual([300]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

const variants = (name, widths) => widths.map((w) => ({ width: w, publicUrl: `assets/images/${name}-${w}w.webp` }));
const graph = (nodes) => ({
  getAsset: (src) => nodes.find((n) => n.source === src) || null,
  getLocalImages: () => nodes,
});

describe('WebP fallback src', () => {
  it('uses the largest variant up to 1920px', () => {
    const g = graph([{ source: '/berlin.jpg', classification: 'local-static', variants: variants('berlin', [480, 1024, 1920, 2560]) }]);
    expect(getResponsiveFallbackSrc('/berlin.jpg', g)).toBe('/assets/images/berlin-1920w.webp');
    expect(fallbackVariantUrl(variants('x', [300]))).toBe('/assets/images/x-300w.webp');
    expect(getResponsiveFallbackSrc('/unknown.jpg', g)).toBeNull();
  });
});

describe('leaving originals out', () => {
  function project() {
    const root = tmp();
    const out = path.join(root, 'out');
    fs.mkdirSync(path.join(root, 'public', 'img'), { recursive: true });
    fs.mkdirSync(path.join(out, 'img'), { recursive: true });
    fs.mkdirSync(path.join(out, 'assets'), { recursive: true });
    for (const f of ['img/hero.jpg', 'img/kept.png', 'img/bg.jpg']) {
      fs.writeFileSync(path.join(root, 'public', f), 'x'.repeat(1000));
      fs.writeFileSync(path.join(out, f), 'x'.repeat(1000));
    }
    const nodes = ['hero', 'kept', 'bg'].map((n, i) => ({
      source: `/img/${n}${i === 1 ? '.png' : '.jpg'}`,
      resolvedPath: path.join(root, 'public', 'img', `${n}${i === 1 ? '.png' : '.jpg'}`),
      classification: 'local-static',
      variants: variants(n, [480, 1024]),
    }));
    return { root, out, g: graph(nodes) };
  }

  it('removes originals nothing names, rewrites bundles to the WebP, and keeps the rest', () => {
    const { root, out, g } = project();
    try {
      fs.writeFileSync(path.join(out, 'index.php'), '<img src="assets/images/hero-1024w.webp">');
      fs.writeFileSync(path.join(out, 'assets', 'app.js'), 'a=(t||"")+"/img/hero.jpg"');
      fs.writeFileSync(path.join(out, 'assets', 'app.css'), '.x{background:url("../img/bg.jpg")}');
      fs.writeFileSync(path.join(out, 'functions.php'), "$default = '/img/kept.png'; // block default, not a quoted JS/CSS URL we rewrite");
      fs.writeFileSync(path.join(out, 'asset-manifest.json'), JSON.stringify({ all: ['/img/hero.jpg', '/img/kept.png', '/img/bg.jpg'] }));
      const r = pruneOptimizedOriginals(root, out, g);
      expect(r.removed.sort()).toEqual(['img/bg.jpg', 'img/hero.jpg']);
      expect(r.kept).toEqual(['img/kept.png']);
      expect(r.bytesSaved).toBe(2000);
      expect(fs.readFileSync(path.join(out, 'assets', 'app.js'), 'utf8')).toBe('a=(t||"")+"/assets/images/hero-1024w.webp"');
      expect(fs.readFileSync(path.join(out, 'assets', 'app.css'), 'utf8')).toBe('.x{background:url("images/bg-1024w.webp")}');
      expect(fs.existsSync(path.join(out, 'img', 'kept.png'))).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('only rewrites exact quoted URLs in JS', () => {
    const dir = tmp();
    try {
      fs.writeFileSync(path.join(dir, 'a.js'), 'a="/hero.jpg";b="/hero.jpg.bak";c="/x/hero.jpg";d=`/hero.jpg`');
      rewriteBundles(dir, [['/hero.jpg', '/assets/images/hero-1024w.webp']]);
      expect(fs.readFileSync(path.join(dir, 'a.js'), 'utf8')).toBe(
        'a="/assets/images/hero-1024w.webp";b="/hero.jpg.bak";c="/x/hero.jpg";d=`/assets/images/hero-1024w.webp`',
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('unreferenced public files and assets.exclude', () => {
  it('lists large public files nothing names (never deletes them), and leaves out excluded ones', () => {
    const root = tmp();
    const out = path.join(root, 'out');
    try {
      for (const [rel, size] of [['used.mp4', 200000], ['unused.mp4', 300000], ['small.png', 10], ['raw/a.psd', 150000]]) {
        for (const base of [path.join(root, 'public'), out]) {
          fs.mkdirSync(path.dirname(path.join(base, rel)), { recursive: true });
          fs.writeFileSync(path.join(base, rel), 'x'.repeat(size));
        }
      }
      fs.writeFileSync(path.join(out, 'index.php'), '<video src="used.mp4"></video>');
      expect(findUnreferencedPublicFiles(root, out)).toEqual([{ rel: 'unused.mp4', bytes: 300000 }, { rel: 'raw/a.psd', bytes: 150000 }]);
      expect(fs.existsSync(path.join(out, 'unused.mp4'))).toBe(true);
      expect(removeExcludedPublicFiles(root, out, ['raw/**', '*.mp4'], globToRegExp).sort()).toEqual(['raw/a.psd', 'unused.mp4', 'used.mp4']);
      expect(fs.existsSync(path.join(out, 'raw/a.psd'))).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('lossless pass', () => {
  const noisyPng = async (w, h) => {
    const raw = Buffer.alloc(w * h * 4);
    for (let i = 0; i < raw.length; i++) raw[i] = (i * 7919 + (i >> 5) * 31) % 256;
    return sharp(raw, { raw: { width: w, height: h, channels: 4 } }).png({ compressionLevel: 0 }).toBuffer();
  };

  it('turns a referenced PNG into a pixel-identical lossless WebP and updates every quoted reference', async () => {
    const out = tmp();
    try {
      fs.mkdirSync(path.join(out, 'assets', 'img'), { recursive: true });
      const png = await sharp({ create: { width: 600, height: 400, channels: 4, background: { r: 10, g: 120, b: 200, alpha: 1 } } }).png({ compressionLevel: 0 }).toBuffer();
      fs.writeFileSync(path.join(out, 'assets/img/logo.png'), png);
      fs.writeFileSync(path.join(out, 'functions.php'), "$d = attributes.logo || '/assets/img/logo.png'; get_theme_file_uri('assets/img/logo.png');");
      const r = await runLosslessPass(out);
      expect(r.converted).toEqual(['assets/img/logo.png']);
      expect(fs.existsSync(path.join(out, 'assets/img/logo.png'))).toBe(false);
      const webp = fs.readFileSync(path.join(out, 'assets/img/logo.webp'));
      const a = await sharp(png).ensureAlpha().raw().toBuffer();
      const b = await sharp(webp).ensureAlpha().raw().toBuffer();
      expect(a.equals(b)).toBe(true);
      expect(fs.readFileSync(path.join(out, 'functions.php'), 'utf8')).toBe("$d = attributes.logo || '/assets/img/logo.webp'; get_theme_file_uri('assets/img/logo.webp');");
    } finally {
      fs.rmSync(out, { recursive: true, force: true });
    }
  });

  it('changes nothing for a PNG that is also named in a form it cannot rewrite (all or nothing)', async () => {
    const out = tmp();
    try {
      fs.mkdirSync(path.join(out, 'assets'), { recursive: true });
      const png = await sharp({ create: { width: 600, height: 400, channels: 4, background: '#123456' } }).png({ compressionLevel: 0 }).toBuffer();
      fs.writeFileSync(path.join(out, 'assets/partner.png'), png);
      const php = 'a = "/assets/partner.png"; b = "\\/assets\\/partner.png\\";';
      fs.writeFileSync(path.join(out, 'index.php'), php);
      const r = await runLosslessPass(out);
      expect(r.converted).toEqual([]);
      expect(fs.readFileSync(path.join(out, 'index.php'), 'utf8')).toBe(php);
      expect(fs.existsSync(path.join(out, 'assets/partner.png'))).toBe(true);
      expect(fs.existsSync(path.join(out, 'assets/partner.webp'))).toBe(false);
    } finally {
      fs.rmSync(out, { recursive: true, force: true });
    }
  });

  it('never renames a PNG the theme does not reference (a post may link to it)', async () => {
    const out = tmp();
    try {
      const png = await sharp({ create: { width: 600, height: 400, channels: 4, background: '#335577' } }).png({ compressionLevel: 0 }).toBuffer();
      fs.writeFileSync(path.join(out, 'brochure-cover.png'), png);
      fs.writeFileSync(path.join(out, 'index.php'), '<p>no image here</p>');
      const r = await runLosslessPass(out);
      expect(r.converted).toEqual([]);
      expect(fs.existsSync(path.join(out, 'brochure-cover.png'))).toBe(true);
      expect(fs.existsSync(path.join(out, 'brochure-cover.webp'))).toBe(false);
    } finally {
      fs.rmSync(out, { recursive: true, force: true });
    }
  });

  it('keeps screenshot.png a PNG (WordPress needs it) and only recompresses it pixel-identically', async () => {
    const out = tmp();
    try {
      const png = await noisyPng(300, 200);
      fs.writeFileSync(path.join(out, 'screenshot.png'), png);
      await runLosslessPass(out);
      expect(fs.existsSync(path.join(out, 'screenshot.png'))).toBe(true);
      expect(fs.existsSync(path.join(out, 'screenshot.webp'))).toBe(false);
      const a = await sharp(png).ensureAlpha().raw().toBuffer();
      const b = await sharp(fs.readFileSync(path.join(out, 'screenshot.png'))).ensureAlpha().raw().toBuffer();
      expect(a.equals(b)).toBe(true);
    } finally {
      fs.rmSync(out, { recursive: true, force: true });
    }
  });

  it('merges byte-identical font files and points the CSS at the one kept', async () => {
    const out = tmp();
    try {
      fs.mkdirSync(path.join(out, 'assets', 'fonts'), { recursive: true });
      for (const n of ['lora-400-aaa.woff2', 'lora-500-bbb.woff2']) fs.writeFileSync(path.join(out, 'assets/fonts', n), 'same-bytes');
      fs.writeFileSync(path.join(out, 'assets/fonts', 'lora-700-ccc.woff2'), 'other-bytes');
      fs.writeFileSync(path.join(out, 'assets/fonts.css'), '@font-face{src:url(fonts/lora-400-aaa.woff2)}@font-face{src:url(fonts/lora-500-bbb.woff2)}@font-face{src:url(fonts/lora-700-ccc.woff2)}');
      const r = await runLosslessPass(out);
      expect(r.fontsMerged).toBe(1);
      expect(fs.readdirSync(path.join(out, 'assets/fonts')).sort()).toEqual(['lora-400-aaa.woff2', 'lora-700-ccc.woff2']);
      expect(fs.readFileSync(path.join(out, 'assets/fonts.css'), 'utf8')).toBe('@font-face{src:url(fonts/lora-400-aaa.woff2)}@font-face{src:url(fonts/lora-400-aaa.woff2)}@font-face{src:url(fonts/lora-700-ccc.woff2)}');
    } finally {
      fs.rmSync(out, { recursive: true, force: true });
    }
  });
});
