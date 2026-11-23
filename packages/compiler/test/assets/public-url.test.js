/**
 * Root-relative public files work in Vite and 404 on WordPress after
 * hydration, because the client bundle still points at the site root.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PUBLIC_ASSET_RUNTIME,
  collectPublicAssetUrls,
  cssUrlForPublicAsset,
  rewriteCssPublicAssetUrls,
  rewriteJsPublicAssetUrls,
  rewriteThemePublicAssetUrls,
} from '../../lib/assets/public-url.js';
import { resolveWpAsset } from '../../../react/src/hooks.ts';

const temps = [];

afterEach(() => {
  vi.unstubAllGlobals();
  for (const dir of temps.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function themeWithPublicAssets() {
  const root = mkdtempSync(path.join(tmpdir(), 'forgewp-public-'));
  temps.push(root);
  mkdirSync(path.join(root, 'public', 'assets', 'editorial'), { recursive: true });
  writeFileSync(path.join(root, 'public', 'Logo.png'), 'logo');
  writeFileSync(path.join(root, 'public', 'assets', 'editorial', 'cover.png'), 'cover');
  return root;
}

describe('collectPublicAssetUrls', () => {
  it('returns root-relative urls, longest first', () => {
    const urls = collectPublicAssetUrls(themeWithPublicAssets());
    expect(urls[0]).toBe('/assets/editorial/cover.png');
    expect(urls).toContain('/Logo.png');
    expect(urls.indexOf('/assets/editorial/cover.png')).toBeLessThan(
      urls.indexOf('/Logo.png'),
    );
  });
});

describe('rewriteJsPublicAssetUrls', () => {
  it('prefixes a quoted public path with the theme uri exactly once', () => {
    const urls = ['/assets/editorial/cover.png', '/Logo.png'];
    const source = 'const logo = "/Logo.png"; const cover = \'/assets/editorial/cover.png\';';
    const rewritten = rewriteJsPublicAssetUrls(source, urls);
    expect(rewritten).toBe(
      `const logo = ${PUBLIC_ASSET_RUNTIME}+"/Logo.png"; const cover = ${PUBLIC_ASSET_RUNTIME}+"/assets/editorial/cover.png";`,
    );
    expect(rewritten.split(PUBLIC_ASSET_RUNTIME)).toHaveLength(3);
  });

  it('does not rewrite a longer path down to a shorter public file', () => {
    const rewritten = rewriteJsPublicAssetUrls(
      'src:"/assets/editorial/cover.png"',
      ['/assets/editorial/cover.png', '/cover.png'],
    );
    expect(rewritten).toBe(
      `src:${PUBLIC_ASSET_RUNTIME}+"/assets/editorial/cover.png"`,
    );
    expect(rewritten.split(PUBLIC_ASSET_RUNTIME)).toHaveLength(2);
  });

  it('does not double-prefix paths already concatenated with themeUri (G3 regression) and is idempotent', () => {
    const urls = ['/Logo/hotelchecker24-logo_farbe.svg'];
    const concatSource =
      'const a=themeUri+"/Logo/hotelchecker24-logo_farbe.svg";const b=themeUri + \'/Logo/hotelchecker24-logo_farbe.svg\';';
    expect(rewriteJsPublicAssetUrls(concatSource, urls)).toBe(concatSource);

    const standalone = 'src:"/Logo/hotelchecker24-logo_farbe.svg"';
    const once = rewriteJsPublicAssetUrls(standalone, urls);
    expect(once).toBe(`src:${PUBLIC_ASSET_RUNTIME}+"/Logo/hotelchecker24-logo_farbe.svg"`);
    expect(rewriteJsPublicAssetUrls(once, urls)).toBe(once);
  });
});

describe('resolveWpAsset (G3 absolute URL pass-through)', () => {
  it('passes http(s), protocol-relative, data, blob, and already-prefixed URLs through unchanged without collapsing //', () => {
    const themeUri = 'http://localhost:8080/wp-content/themes/hotelchecker24';
    vi.stubGlobal('window', {
      forgeWpHydration: { themeUri },
    });

    const absoluteLogo = `${themeUri}/Logo/hotelchecker24-logo_farbe.svg`;
    expect(resolveWpAsset(absoluteLogo)).toBe(absoluteLogo);
    expect(resolveWpAsset(`  ${absoluteLogo}  `)).toBe(absoluteLogo);
    expect(resolveWpAsset('HTTPS://cdn.example.com/logo.svg')).toBe(
      'HTTPS://cdn.example.com/logo.svg',
    );
    expect(resolveWpAsset('//cdn.example.com/logo.svg')).toBe('//cdn.example.com/logo.svg');
    expect(resolveWpAsset('data:image/svg+xml,<svg/>')).toBe('data:image/svg+xml,<svg/>');
    expect(resolveWpAsset('blob:http://localhost:8080/abc')).toBe(
      'blob:http://localhost:8080/abc',
    );

    // Relative paths still resolve cleanly once
    expect(resolveWpAsset('/Logo/hotelchecker24-logo_farbe.svg')).toBe(absoluteLogo);
    expect(resolveWpAsset('./Logo/hotelchecker24-logo_farbe.svg')).toBe(absoluteLogo);
  });
});

describe('rewriteCssPublicAssetUrls', () => {
  it('makes /assets files siblings of the stylesheet and root files parents', () => {
    expect(cssUrlForPublicAsset('/assets/editorial/cover.png')).toBe(
      'editorial/cover.png',
    );
    expect(cssUrlForPublicAsset('/Logo.png')).toBe('../Logo.png');
    const css = 'a{background:url("/Logo.png")}b{background:url(/assets/editorial/cover.png)}';
    expect(
      rewriteCssPublicAssetUrls(css, ['/assets/editorial/cover.png', '/Logo.png']),
    ).toBe('a{background:url("../Logo.png")}b{background:url("editorial/cover.png")}');
  });
});

describe('rewriteThemePublicAssetUrls', () => {
  it('rewrites js and css in the theme assets directory and skips source maps', () => {
    const root = themeWithPublicAssets();
    const assets = path.join(root, 'out', 'assets');
    mkdirSync(assets, { recursive: true });
    const jsPath = path.join(assets, 'page.js');
    const cssPath = path.join(assets, 'app.css');
    const mapPath = path.join(assets, 'page.js.map');
    writeFileSync(jsPath, 'img.src="/Logo.png"');
    writeFileSync(cssPath, 'body{background:url("/Logo.png")}');
    writeFileSync(mapPath, 'img.src="/Logo.png"');

    expect(rewriteThemePublicAssetUrls(root, assets)).toBe(2);
    expect(readFileSync(jsPath, 'utf8')).toBe(
      `img.src=${PUBLIC_ASSET_RUNTIME}+"/Logo.png"`,
    );
    expect(readFileSync(cssPath, 'utf8')).toBe(
      'body{background:url("../Logo.png")}',
    );
    expect(readFileSync(mapPath, 'utf8')).toBe('img.src="/Logo.png"');
  });
});
