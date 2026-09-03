import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { scanForHydrationIslands, findComponentPath } from "./islands-scanner.js";
import { splitInteractiveIslands } from "./island-split.js";
import { scanAppProviders } from "./scan-app-providers.js";

/**
 * Resolves Rollup's multi-entry input mapping for Vite based on discovered hydration islands.
 *
 * @param {string} themeRoot - The absolute path of the theme's root directory.
 * @returns {Record<string, string>} Rollup input object.
 */
export function getHydrationRollupInputs(themeRoot) {
  const inputs = {
    index: path.resolve(themeRoot, "index.html"),
  };

  // vite.config.ts calls this at config-load time — BEFORE any plugin's
  // buildStart() hook fires (config resolution always precedes the build's
  // plugin lifecycle) — so a component that a dev's own code mixes static
  // and interactive content in must be auto-split HERE, not only in
  // forgewpPageConfigPlugin's buildStart(); otherwise scanForHydrationIslands
  // below sees the original, still-fully-interactive file and registers it
  // as its own direct Rollup entry, containing raw (pre-esbuild) JSX that
  // Rollup's lightweight import-analysis parser cannot handle.
  try {
    splitInteractiveIslands(themeRoot);
  } catch (err) {
    console.warn("[ForgeWP Auto-Island-Split] Error running splitInteractiveIslands:", err.message);
  }

  const islands = scanForHydrationIslands(themeRoot);
  for (const island of islands) {
    const compPath = findComponentPath(themeRoot, island);
    if (compPath) {
      inputs[island] = compPath;
    }
  }

  // Provider modules are not UI islands, but every island remounts in its
  // own React root and must be wrapped with the same provider tree the
  // layout declared (flying hearts, cart drawer open, auth, …).
  for (const provider of scanAppProviders(themeRoot)) {
    if (!inputs[provider.kebab] && existsSync(provider.file)) {
      inputs[provider.kebab] = provider.file;
    }
  }

  // Scan and inject custom blocks from src/blocks/
  const blocksDir = path.join(themeRoot, "src", "blocks");
  if (existsSync(blocksDir)) {
    try {
      const items = readdirSync(blocksDir);
      for (const item of items) {
        const fullPath = path.join(blocksDir, item);
        const isDir = statSync(fullPath).isDirectory();
        if (isDir) {
          const indexPath = path.join(fullPath, "index.tsx");
          if (existsSync(indexPath)) {
            const blockName = item
              .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-");
            inputs[`block-${blockName}`] = indexPath;
          }
        } else if (item.endsWith(".tsx") || item.endsWith(".jsx")) {
          const blockName = item
            .replace(/\.(tsx|jsx)$/, "")
            .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-");
          inputs[`block-${blockName}`] = fullPath;
        }
      }
    } catch (err) {
      console.warn("[Hydration Scanner] Failed to scan src/blocks/:", err.message);
    }
  }

  return inputs;
}
