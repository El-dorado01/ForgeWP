import path from "node:path";
import { findComponentPath } from "./islands-scanner.js";

/**
 * Map a kebab-case hydration island id to its Vite-emitted JS file.
 *
 * Vite's manifest `name` is the Rollup input key (the island id). That is the
 * only reliable match for named exports that do not live in a same-named file
 * (a named export compiled from a differently-named source file).
 *
 * Filename fallbacks still exist for older manifests, but they must not treat
 * hyphens inside the island name as the start of the content hash —
 * `count-up-Dtfp7iNm.js`.replace(/-[A-Za-z0-9_-]+\.js$/, '') === "count".
 *
 * @param {Record<string, { file?: string, name?: string, src?: string }>} viteManifest
 * @param {string} island
 * @param {string} [themeRoot]
 * @returns {string|null} manifest `file` path (e.g. "assets/count-up-abc.js")
 */
export function resolveIslandChunk(viteManifest, island, themeRoot = process.cwd()) {
  if (!viteManifest || !island) return null;

  const pascalName = island
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");

  // Pass 1: Prioritize explicit entry chunks (isEntry === true) created by getHydrationRollupInputs
  for (const [key, value] of Object.entries(viteManifest)) {
    if (!value || !value.file || !value.isEntry) continue;

    if (value.name === island || key === island) {
      return value.file;
    }

    const src = value.src || key;
    const srcNorm = String(src).replace(/\\/g, "/");
    if (
      srcNorm.endsWith(`/${pascalName}.tsx`) ||
      srcNorm.endsWith(`/${pascalName}.ts`) ||
      srcNorm.endsWith(`/${island}.tsx`) ||
      srcNorm.endsWith(`/${island}.ts`)
    ) {
      return value.file;
    }

    const fileBasename = path.basename(value.file);
    if (
      fileBasename === `${island}.js` ||
      (fileBasename.startsWith(`${island}-`) && fileBasename.endsWith(".js"))
    ) {
      return value.file;
    }
  }

  // Pass 2: Fallback to non-entry chunks if no entry chunk matched
  for (const [key, value] of Object.entries(viteManifest)) {
    if (!value || !value.file) continue;

    if (value.name === island || key === island) {
      return value.file;
    }

    const src = value.src || key;
    const srcNorm = String(src).replace(/\\/g, "/");
    if (
      srcNorm.endsWith(`/${pascalName}.tsx`) ||
      srcNorm.endsWith(`/${pascalName}.ts`) ||
      srcNorm.endsWith(`/${island}.tsx`) ||
      srcNorm.endsWith(`/${island}.ts`)
    ) {
      return value.file;
    }

    const fileBasename = path.basename(value.file);
    if (
      fileBasename === `${island}.js` ||
      (fileBasename.startsWith(`${island}-`) && fileBasename.endsWith(".js"))
    ) {
      return value.file;
    }
  }

  // Pass 3: Resolve via findComponentPath if island is a named export from a multi-export source file
  try {
    const compPath = findComponentPath(themeRoot, island);
    if (compPath) {
      const compNorm = compPath.replace(/\\/g, "/");
      for (const [key, value] of Object.entries(viteManifest)) {
        if (!value || !value.file) continue;
        const src = value.src || key;
        const srcNorm = String(src).replace(/\\/g, "/");
        if (compNorm.endsWith(srcNorm) || srcNorm.endsWith(path.basename(compNorm))) {
          return value.file;
        }
      }
    }
  } catch {}

  return null;
}


