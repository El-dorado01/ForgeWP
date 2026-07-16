import { transformThemeFile } from './hydration/index.js';
import { scanAndGenerateBlocks } from './blocks/index.js';
import { splitInteractiveIslands } from './hydration/island-split.js';
import { hasContentOverride, readComponentSource } from './hydration/is-interactive.js';

/**
 * Custom Vite Plugin to statically parse "export const pageConfig = { ... }" configs in pages,
 * and dynamically inject useWpPageProtect(pageConfig) hook call at component startup.
 *
 * It also automatically detects interactive components inside static parents and wraps them in
 * <Hydrate> (automatic island detection) and wraps them in <WpAuthProvider> if they use auth hooks.
 */
export function forgewpPageConfigPlugin() {
  let themeRoot = process.cwd();
  return {
    name: 'forgewp-page-config',
    configResolved(config) {
      themeRoot = config.root;
    },
    buildStart() {
      // Must run BEFORE scanAndGenerateBlocks and before Rollup resolves its
      // entry inputs (getHydrationRollupInputs / islands-scanner.js's Smart
      // Discovery scan the filesystem) — any auto-split island file needs to
      // exist on disk by then to be picked up as its own build entry.
      try {
        splitInteractiveIslands(themeRoot);
      } catch (err) {
        console.error('[ForgeWP Compiler] Error running splitInteractiveIslands at build start:', err.message);
      }
      try {
        scanAndGenerateBlocks(themeRoot);
      } catch (err) {
        console.error('[ForgeWP Compiler] Error running scanAndGenerateBlocks at build start:', err.message);
      }
    },
    transform(code, id) {
      const normalizedPath = id.replace(/\\/g, '/');
      if (normalizedPath.includes('node_modules')) {
        return null;
      }

      const fileThemeRoot = normalizedPath.includes('/src/')
        ? id.substring(0, normalizedPath.indexOf('/src/'))
        : themeRoot;

      // If this file was auto-split, substitute the static shell for the raw
      // code Vite just read from disk BEFORE anything below runs — every
      // downstream step (the @forgewp-block re-scan, transformThemeFile's
      // Hydrate auto-wrap, and the final returned module code) must see the
      // shell, not the dev's original, still-fully-interactive file content.
      // Only substitute when THIS path has an actual registered override —
      // never infer one from "a fresh disk read differs from what Vite gave
      // us," since Vite's own code may already be preprocessed by an earlier
      // plugin (that alone would look like a difference for every file, not
      // just split ones, and reverting it breaks Rollup's import analysis).
      let effectiveCode = code;
      if (hasContentOverride(id)) {
        try {
          effectiveCode = readComponentSource(id);
        } catch {}
      }

      // Trigger real-time block generation if the edited file defines a block
      if (effectiveCode.includes('@forgewp-block')) {
        try {
          scanAndGenerateBlocks(fileThemeRoot);
        } catch (err) {
          console.error('[ForgeWP Compiler] Error running scanAndGenerateBlocks during transform:', err.message);
        }
      }

      try {
        const transformed = transformThemeFile(effectiveCode, id, fileThemeRoot);
        if (transformed !== code) {
          return { code: transformed, map: null };
        }
      } catch (err) {
        console.error(`[ForgeWP Compiler] Error transforming ${id}:`, err);
      }
      return null;
    }
  };
}

