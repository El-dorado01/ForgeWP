import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

/**
 * Scans the theme's page files (page.tsx, layout.tsx, pages/*.tsx)
 * for <Hydrate> boundaries and extracts their resolved kebab-case component names.
 *
 * @param {string} themeRoot - The absolute path of the theme's root directory.
 * @returns {string[]} An array of discovered kebab-case hydration chunk identifiers.
 */
export function scanForHydrationIslands(themeRoot) {
  const islands = new Set();
  const filesToScan = [];

  const appDir = path.join(themeRoot, "src", "app");
  if (existsSync(appDir)) {
    // Scan page.tsx
    const mainPage = path.join(appDir, "page.tsx");
    if (existsSync(mainPage)) filesToScan.push(mainPage);

    // Scan layout.tsx
    const mainLayout = path.join(appDir, "layout.tsx");
    if (existsSync(mainLayout)) filesToScan.push(mainLayout);

    // Scan pages/ directory
    const pagesDir = path.join(appDir, "pages");
    if (existsSync(pagesDir)) {
      try {
        const pages = readdirSync(pagesDir).filter((f) => f.endsWith(".tsx"));
        for (const file of pages) {
          filesToScan.push(path.join(pagesDir, file));
        }
      } catch {}
    }
  }

  // Scan each file for <Hydrate> occurrences
  for (const filePath of filesToScan) {
    try {
      const content = readFileSync(filePath, "utf8");
      
      // Matches <Hydrate ...> ... </Hydrate>
      const hydrateRegex = /<Hydrate\b([\s\S]*?)>([\s\S]*?)<\/Hydrate>/g;
      let match;
      while ((match = hydrateRegex.exec(content)) !== null) {
        const propsStr = match[1];
        const childrenStr = match[2].trim();

        // 1. Try to parse explicit 'id' attribute
        const idMatch = propsStr.match(/id\s*=\s*["']([^"']*)["']/);
        if (idMatch) {
          islands.add(idMatch[1]);
          continue;
        }

        // 2. Fallback: Parse Component Tag name from children (e.g. <FadeUpSection />)
        const componentTagMatch = childrenStr.match(/<([A-Z][a-zA-Z0-9]*)\b/);
        if (componentTagMatch) {
          const compName = componentTagMatch[1];
          const kebabName = compName
            .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
            .toLowerCase();
          islands.add(kebabName);
        }
      }
    } catch (err) {
      console.warn(`[Hydration Scanner] Failed to scan file ${filePath}:`, err.message);
    }
  }

  return Array.from(islands);
}

/**
 * Searches components directories for a file matching the kebab-case component name.
 *
 * @param {string} themeRoot - The absolute path of the theme's root directory.
 * @param {string} kebabName - The target component's kebab-case identifier.
 * @returns {string|null} The absolute path to the component file, or null if not found.
 */
export function findComponentPath(themeRoot, kebabName) {
  const compDirs = [
    path.join(themeRoot, "src", "components"),
    path.join(themeRoot, "src", "components", "ui"),
  ];

  // Convert kebab-case back to PascalCase and check candidates
  const pascalName = kebabName
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");

  const candidates = [
    `${pascalName}.tsx`,
    `${pascalName}.ts`,
    `${kebabName}.tsx`,
    `${kebabName}.ts`,
  ];

  for (const dir of compDirs) {
    if (!existsSync(dir)) continue;
    try {
      const files = readdirSync(dir);
      for (const file of files) {
        if (candidates.includes(file)) {
          return path.join(dir, file);
        }
      }
    } catch {}
  }

  return null;
}

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

  const islands = scanForHydrationIslands(themeRoot);
  for (const island of islands) {
    const compPath = findComponentPath(themeRoot, island);
    if (compPath) {
      inputs[island] = compPath;
    }
  }

  return inputs;
}
