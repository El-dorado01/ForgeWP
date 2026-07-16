import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { isComponentInteractive, readComponentSource } from "./is-interactive.js";
import { getComponentRootClassName } from "./root-class-extractor.js";

// scanForHydrationIslands/scanForHydrationIslandsWithProps both run from
// several integration points within one `forgewp export` (vite.config.ts's
// config-load-time getHydrationRollupInputs call, the Vite plugin's
// buildStart, etc.) — without deduping, the same "detected X" line would
// print once per integration point. Tracked per-process (not per-call) so
// each discovery is announced once no matter how many call sites trigger it;
// full per-item detail is behind FORGEWP_VERBOSE=1, matching island-split.js's
// convention.
const smartDiscoveryReportedOnce = new Set();

function reportSmartDiscovery(key, verboseMessage) {
  if (smartDiscoveryReportedOnce.has(key)) return false;
  smartDiscoveryReportedOnce.add(key);
  if (process.env.FORGEWP_VERBOSE) {
    console.warn(verboseMessage);
  }
  return true;
}

/**
 * Searches components directories for a file matching the kebab-case component name.
 *
 * @param {string} themeRoot - The absolute path of the theme's root directory.
 * @param {string} kebabName - The target component's kebab-case identifier.
 * @returns {string|null} The absolute path to the component file, or null if not found.
 */
export function findComponentPath(themeRoot, kebabName) {
  const compDir = path.join(themeRoot, "src", "components");
  const appDir = path.join(themeRoot, "src", "app");
  const blocksDir = path.join(themeRoot, "src", "blocks");

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

  let result = null;

  function searchRecursive(dir) {
    if (result || !existsSync(dir)) return;
    try {
      const items = readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          searchRecursive(fullPath);
        } else if (item.isFile()) {
          if (candidates.includes(item.name)) {
            result = fullPath;
            return;
          }
        }
      }
    } catch {}
  }

  searchRecursive(compDir);
  if (result) return result;

  // Special cases for page templates
  if (kebabName === "page" || kebabName === "layout" || kebabName === "404" || kebabName === "single" || kebabName === "archive") {
    const pagePath = path.join(appDir, `${kebabName}.tsx`);
    if (existsSync(pagePath)) return pagePath;
    const tsPath = path.join(appDir, `${kebabName}.ts`);
    if (existsSync(tsPath)) return tsPath;
  }

  searchRecursive(appDir);
  if (result) return result;

  searchRecursive(blocksDir);
  return result;
}

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
  let newDiscoveries = 0;

  const dirsToScan = [
    path.join(themeRoot, "src", "app"),
    path.join(themeRoot, "src", "components"),
    path.join(themeRoot, "src", "blocks"),
  ];

  function collectFilesRecursive(dir) {
    if (!existsSync(dir)) return;
    try {
      const items = readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          collectFilesRecursive(fullPath);
        } else if (item.isFile() && (item.name.endsWith(".tsx") || item.name.endsWith(".ts"))) {
          filesToScan.push(fullPath);
        }
      }
    } catch {}
  }

  for (const dir of dirsToScan) {
    collectFilesRecursive(dir);
  }

  // Scan each file for <Hydrate> occurrences
  for (const filePath of filesToScan) {
    try {
      // readComponentSource (not raw readFileSync): a file's on-disk content
      // may have been auto-split, in which case the shell's rewritten source
      // (referencing the extracted island components by tag name) — not the
      // dev's original, unmodified content — is what actually determines
      // which components need their own hydration bundle.
      const content = readComponentSource(filePath);
      
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

  // 3. Smart Component Discovery: scan src/components/ for interactive/animated components
  const compDir = path.join(themeRoot, "src", "components");
  const interactiveComponents = new Set();

  function scanComponentsRecursive(dir) {
    if (!existsSync(dir)) return;
    try {
      const items = readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          scanComponentsRecursive(fullPath);
        } else if (item.isFile() && (item.name.endsWith(".tsx") || item.name.endsWith(".ts"))) {
          try {
            if (isComponentInteractive(fullPath)) {
              const compName = path.basename(item.name, path.extname(item.name));
              interactiveComponents.add(compName);
            }
          } catch {}
        }
      }
    } catch {}
  }

  scanComponentsRecursive(compDir);

  for (const filePath of filesToScan) {
    try {
      // readComponentSource (not raw readFileSync): a file's on-disk content
      // may have been auto-split, in which case the shell's rewritten source
      // (referencing the extracted island components by tag name) — not the
      // dev's original, unmodified content — is what actually determines
      // which components need their own hydration bundle.
      const content = readComponentSource(filePath);
      for (const compName of interactiveComponents) {
        const pascalName = compName
          .split('-')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join('');
        if (content.includes(`<${compName}`) || content.includes(`<${pascalName}`)) {
          const kebabName = compName.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
          if (!islands.has(kebabName)) {
            islands.add(kebabName);
            if (reportSmartDiscovery(
              `component:${kebabName}`,
              `\x1b[33m[ForgeWP Optimizer] Smart Discovery: Detected "${compName}" uses interactive hooks/animations. Auto-enforcing code-splitting chunk. Wrap it in <Hydrate> in page markup for dynamic browser activation!\x1b[0m`,
            )) newDiscoveries++;
          }
        }
      }
    } catch {}
  }

  // 4. Smart Page Hydration: if a page file itself is interactive, register it directly
  const appDir = path.join(themeRoot, "src", "app");
  if (existsSync(appDir)) {
    try {
      const items = readdirSync(appDir, { withFileTypes: true });
      for (const item of items) {
        if (item.isFile() && (item.name.endsWith(".tsx") || item.name.endsWith(".ts"))) {
          const fullPath = path.join(appDir, item.name);
          if (isComponentInteractive(fullPath)) {
            const compName = path.basename(item.name, path.extname(item.name));
            const kebabName = compName.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
            if (!islands.has(kebabName)) {
              islands.add(kebabName);
              if (reportSmartDiscovery(
                `page:${kebabName}`,
                `\x1b[33m[ForgeWP Optimizer] Smart Discovery: Detected interactive page file "${compName}". Auto-enforcing page hydration island!\x1b[0m`,
              )) newDiscoveries++;
            }
          }
        }
      }
    } catch {}
  }

  if (newDiscoveries > 0 && !process.env.FORGEWP_VERBOSE) {
    console.warn(`\x1b[33m[ForgeWP Optimizer] Smart Discovery: auto-enforced code-splitting for ${newDiscoveries} interactive component(s)/page(s) — set FORGEWP_VERBOSE=1 to see which.\x1b[0m`);
  }

  return Array.from(islands);
}

/**
 * Scans theme pages and layout files for <Hydrate> boundaries and extracts their kebab-case names,
 * source files, and defined properties.
 *
 * @param {string} themeRoot - The absolute path of the theme's root directory.
 * @returns {Array<{ name: string, file: string, trigger: string, preload: string, media: string|null, connection: string|null, clientOnly: boolean, smartDiscovered?: boolean, rootClassName?: string|null, rootClassNameUnresolved?: boolean }>}
 */
export function scanForHydrationIslandsWithProps(themeRoot) {
  const discovered = [];
  const namesFound = new Set();
  const filesToScan = [];
  let newDiscoveries = 0;

  const dirsToScan = [
    path.join(themeRoot, "src", "app"),
    path.join(themeRoot, "src", "components"),
    path.join(themeRoot, "src", "blocks"),
  ];

  function collectFilesRecursive(dir) {
    if (!existsSync(dir)) return;
    try {
      const items = readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          collectFilesRecursive(fullPath);
        } else if (item.isFile() && (item.name.endsWith(".tsx") || item.name.endsWith(".ts"))) {
          filesToScan.push(fullPath);
        }
      }
    } catch {}
  }

  for (const dir of dirsToScan) {
    collectFilesRecursive(dir);
  }

  // Helper to extract attribute values
  const getAttr = (str, attr) => {
    const regex1 = new RegExp(`${attr}\\s*=\\s*["']([^"']*)["']`);
    const regex2 = new RegExp(`${attr}\\s*=\\s*\\{["']([^"']*)["']\\}`);
    const regex3 = new RegExp(`${attr}\\s*=\\s*\\{([^\\}]*)\\}`);

    const m1 = str.match(regex1);
    if (m1) return m1[1];
    const m2 = str.match(regex2);
    if (m2) return m2[1];
    const m3 = str.match(regex3);
    if (m3) return m3[1].trim();

    return null;
  };

  for (const filePath of filesToScan) {
    const relFile = path.relative(themeRoot, filePath).replace(/\\/g, "/");
    try {
      // readComponentSource (not raw readFileSync): a file's on-disk content
      // may have been auto-split, in which case the shell's rewritten source
      // (referencing the extracted island components by tag name) — not the
      // dev's original, unmodified content — is what actually determines
      // which components need their own hydration bundle.
      const content = readComponentSource(filePath);
      const hydrateRegex = /<Hydrate\b([\s\S]*?)>([\s\S]*?)<\/Hydrate>/g;
      let match;
      while ((match = hydrateRegex.exec(content)) !== null) {
        const propsStr = match[1];
        const childrenStr = match[2].trim();

        // Resolve component identifier name
        let islandName = null;
        const idMatch = propsStr.match(/id\s*=\s*["']([^"']*)["']/);
        if (idMatch) {
          islandName = idMatch[1];
        } else {
          const componentTagMatch = childrenStr.match(/<([A-Z][a-zA-Z0-9]*)\b/);
          if (componentTagMatch) {
            const compName = componentTagMatch[1];
            islandName = compName.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
          }
        }

        if (islandName) {
          namesFound.add(islandName);
          const trigger = getAttr(propsStr, "trigger") || "visible";
          const preload = getAttr(propsStr, "preload") || "none";
          const media = getAttr(propsStr, "media");
          const connection = getAttr(propsStr, "connection") || "any";
          const clientOnly = propsStr.includes("clientOnly") && !propsStr.includes("clientOnly={false}");

          discovered.push({
            name: islandName,
            file: relFile,
            trigger,
            preload,
            media,
            connection,
            clientOnly,
          });
        }
      }
    } catch (err) {
      console.warn(`[Hydration Scanner] Failed to scan file ${filePath}:`, err.message);
    }
  }

  // Smart Discovery matching
  const compDir = path.join(themeRoot, "src", "components");
  const interactiveComponents = new Map(); // compName -> absolute file path

  function scanComponentsRecursive(dir) {
    if (!existsSync(dir)) return;
    try {
      const items = readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          scanComponentsRecursive(fullPath);
        } else if (item.isFile() && (item.name.endsWith(".tsx") || item.name.endsWith(".ts"))) {
          try {
            if (isComponentInteractive(fullPath)) {
              const compName = path.basename(item.name, path.extname(item.name));
              interactiveComponents.set(compName, fullPath);
            }
          } catch {}
        }
      }
    } catch {}
  }

  scanComponentsRecursive(compDir);

  for (const filePath of filesToScan) {
    const relFile = path.relative(themeRoot, filePath).replace(/\\/g, "/");
    try {
      // readComponentSource (not raw readFileSync): a file's on-disk content
      // may have been auto-split, in which case the shell's rewritten source
      // (referencing the extracted island components by tag name) — not the
      // dev's original, unmodified content — is what actually determines
      // which components need their own hydration bundle.
      const content = readComponentSource(filePath);
      for (const [compName, compFullPath] of interactiveComponents) {
        const pascalName = compName
          .split('-')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join('');
        if (content.includes(`<${compName}`) || content.includes(`<${pascalName}`)) {
          const kebabName = compName.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
          if (!namesFound.has(kebabName)) {
            namesFound.add(kebabName);
            // Resolve the *component's own* root className (not the referencing page's),
            // so the auto-generated <Hydrate> wrapper can inherit its layout classes
            // instead of defaulting to an unstyled display:block box.
            const rootInfo = getComponentRootClassName(compFullPath);
            discovered.push({
              name: kebabName,
              file: relFile,
              trigger: "visible",
              preload: "none",
              media: null,
              connection: "any",
              clientOnly: false,
              smartDiscovered: true,
              rootClassName: rootInfo.resolvable ? rootInfo.className : null,
              rootClassNameUnresolved: rootInfo.reason === "dynamic-classname",
            });
          }
        }
      }
    } catch {}
  }

  // Smart Page Hydration: if a page file itself is interactive, register it directly
  const appDir2 = path.join(themeRoot, "src", "app");
  if (existsSync(appDir2)) {
    try {
      const items = readdirSync(appDir2, { withFileTypes: true });
      for (const item of items) {
        if (item.isFile() && (item.name.endsWith(".tsx") || item.name.endsWith(".ts"))) {
          const fullPath = path.join(appDir2, item.name);
          if (isComponentInteractive(fullPath)) {
            const compName = path.basename(item.name, path.extname(item.name));
            const kebabName = compName.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
            if (!namesFound.has(kebabName)) {
              namesFound.add(kebabName);
              const rootInfo = getComponentRootClassName(fullPath);
              discovered.push({
                name: kebabName,
                file: path.relative(themeRoot, fullPath).replace(/\\/g, "/"),
                trigger: "load", // Pages should default to load trigger for immediate responsiveness
                preload: "none",
                media: null,
                connection: "any",
                clientOnly: false,
                smartDiscovered: true,
                rootClassName: rootInfo.resolvable ? rootInfo.className : null,
                rootClassNameUnresolved: rootInfo.reason === "dynamic-classname",
              });
              if (reportSmartDiscovery(
                `page:${kebabName}`,
                `\x1b[33m[ForgeWP Optimizer] Smart Discovery: Detected interactive page file "${compName}". Auto-enforcing page hydration island!\x1b[0m`,
              )) newDiscoveries++;
            }
          }
        }
      }
    } catch {}
  }

  if (newDiscoveries > 0 && !process.env.FORGEWP_VERBOSE) {
    console.warn(`\x1b[33m[ForgeWP Optimizer] Smart Discovery: auto-enforced page hydration for ${newDiscoveries} interactive page file(s) — set FORGEWP_VERBOSE=1 to see which.\x1b[0m`);
  }

  return discovered;
}
