import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { rewriteThemePublicAssetUrls } from './assets/public-url.js';
import { resolveIslandChunk } from './hydration/resolve-island-chunk.js';

/** Package the existing Vite output and expose bundler-independent file mappings. */
export function packageAssets(themeRoot, outDir, { islands = [] } = {}) {
  const assetsOut = path.join(outDir, 'assets');
  const distAssets = path.join(themeRoot, 'dist', 'assets');
  mkdirSync(assetsOut, { recursive: true });
  cpSync(distAssets, assetsOut, { recursive: true });
  rewriteThemePublicAssetUrls(themeRoot, assetsOut);

  // Copy all other files/folders from dist to outDir (excluding .vite, index.html, and assets)
  const distDir = path.join(themeRoot, 'dist');
  if (existsSync(distDir)) {
    const items = readdirSync(distDir);
    for (const item of items) {
      if (item !== '.vite' && item !== 'index.html' && item !== 'assets') {
        const srcPath = path.join(distDir, item);
        const destPath = path.join(outDir, item);
        cpSync(srcPath, destPath, { recursive: true });
      }
    }
  }

  const manifestPath = [path.join(themeRoot, 'dist', '.vite', 'manifest.json'), path.join(themeRoot, 'dist', 'manifest.json')].find(existsSync);
  let viteManifest = {};
  if (manifestPath) {
    try {
      viteManifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch (e) {
      console.warn('Failed to parse Vite manifest.json:', e.message);
    }
  }

  const assetFiles = Object.fromEntries(Object.entries(viteManifest).filter(([, chunk]) => chunk?.file).map(([source, chunk]) => [source, chunk.file]));
  const clientEntries = {};
  for (const island of islands) {
    const file = resolveIslandChunk(viteManifest, island, themeRoot);
    if (file) clientEntries[island] = file;
  }
  const entry = viteManifest['index.html'] || Object.values(viteManifest).find((chunk) => chunk?.isEntry);
  // Drop unused JS from the theme ZIP
  const files = readdirSync(assetsOut);
  for (const file of files) {
    if (
      (file.endsWith('.js') || file.endsWith('.js.map')) &&
      file !== 'forgewp-editor.js' &&
      file !== 'forgewp-hydrator.js'
    ) {
      if (islands.length === 0) {
        rmSync(path.join(assetsOut, file), { force: true });
      }
    }
  }

  return { assetFiles, clientEntries, runtimeEntry: entry?.file };
}
