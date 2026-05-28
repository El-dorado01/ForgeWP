import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
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
            const fileContent = readFileSync(fullPath, "utf8");
            const hasState = fileContent.includes("useState") || fileContent.includes("useEffect") || fileContent.includes("useRef");
            const hasMotion = fileContent.includes("framer-motion") || fileContent.includes("gsap") || fileContent.includes("animate") || fileContent.includes("motion.");
            if (hasState || hasMotion) {
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
      const content = readFileSync(filePath, "utf8");
      for (const compName of interactiveComponents) {
        if (content.includes(`<${compName}`)) {
          const kebabName = compName.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
          if (!islands.has(kebabName)) {
            islands.add(kebabName);
            console.log(`\x1b[33m[ForgeWP Optimizer] Smart Discovery: Detected "${compName}" uses interactive hooks/animations. Auto-enforcing code-splitting chunk. Wrap it in <Hydrate> in page markup for dynamic browser activation!\x1b[0m`);
          }
        }
      }
    } catch {}
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

/**
 * Scans theme pages and layout files for <Hydrate> boundaries and extracts their kebab-case names,
 * source files, and defined properties.
 *
 * @param {string} themeRoot - The absolute path of the theme's root directory.
 * @returns {Array<{ name: string, file: string, trigger: string, preload: string, media: string|null, connection: string|null, clientOnly: boolean, smartDiscovered?: boolean }>}
 */
export function scanForHydrationIslandsWithProps(themeRoot) {
  const discovered = [];
  const namesFound = new Set();
  const filesToScan = [];

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
      const content = readFileSync(filePath, "utf8");
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
            const fileContent = readFileSync(fullPath, "utf8");
            const hasState = fileContent.includes("useState") || fileContent.includes("useEffect") || fileContent.includes("useRef");
            const hasMotion = fileContent.includes("framer-motion") || fileContent.includes("gsap") || fileContent.includes("animate") || fileContent.includes("motion.");
            if (hasState || hasMotion) {
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
    const relFile = path.relative(themeRoot, filePath).replace(/\\/g, "/");
    try {
      const content = readFileSync(filePath, "utf8");
      for (const compName of interactiveComponents) {
        if (content.includes(`<${compName}`)) {
          const kebabName = compName.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
          if (!namesFound.has(kebabName)) {
            namesFound.add(kebabName);
            discovered.push({
              name: kebabName,
              file: relFile,
              trigger: "visible",
              preload: "none",
              media: null,
              connection: "any",
              clientOnly: false,
              smartDiscovered: true,
            });
          }
        }
      }
    } catch {}
  }

  return discovered;
}

/**
 * Statically analyzes theme templates to detect missing metadata,
 * dynamic event handlers in static WpQueryLoop scopes, and hardcoded relative URLs.
 *
 * @param {string} themeRoot
 * @returns {Array<{ type: 'metadata' | 'loop' | 'url', file: string, message: string, severity: 'warning' | 'error', lineContent?: string }>}
 */
export function runStaticLintChecks(themeRoot) {
  const violations = [];
  const filesToScan = [];

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

  for (const filePath of filesToScan) {
    const relFile = path.relative(themeRoot, filePath).replace(/\\/g, "/");
    try {
      const content = readFileSync(filePath, "utf8");
      const lines = content.split("\n");

      // 1. Metadata Checks (Only for page files)
      const isPage = path.basename(filePath).startsWith("page.tsx") || filePath.includes("pages/");
      if (isPage) {
        const hasWpHead = content.includes("<WpHead") || content.includes("<WpHead\b");
        if (!hasWpHead) {
          violations.push({
            type: "metadata",
            file: relFile,
            message: "Missing SEO <WpHead> component on this major page template.",
            severity: "warning"
          });
        } else {
          const wpHeadRegex = /<WpHead\b([\s\S]*?)\/?>/g;
          let headMatch;
          while ((headMatch = wpHeadRegex.exec(content)) !== null) {
            const headProps = headMatch[1];
            const hasTitle = /title\s*=\s*(?:["']|\{)/.test(headProps);
            const hasDescription = /description\s*=\s*(?:["']|\{)/.test(headProps);

            if (!hasTitle) {
              violations.push({
                type: "metadata",
                file: relFile,
                message: "SEO <WpHead> is missing the required 'title' attribute.",
                severity: "warning"
              });
            }
            if (!hasDescription) {
              violations.push({
                type: "metadata",
                file: relFile,
                message: "SEO <WpHead> is missing the required 'description' attribute.",
                severity: "warning"
              });
            }
          }
        }
      }

      // 2. WpQueryLoop without Hydration check
      const hydrateBlocks = [];
      const hydrateRegex = /<Hydrate\b([\s\S]*?)>([\s\S]*?)<\/Hydrate>/g;
      let hydMatch;
      while ((hydMatch = hydrateRegex.exec(content)) !== null) {
        hydrateBlocks.push({
          start: hydMatch.index,
          end: hydMatch.index + hydMatch[0].length
        });
      }

      const loopRegex = /<WpQueryLoop\b([\s\S]*?)>([\s\S]*?)<\/WpQueryLoop>/g;
      let loopMatch;
      while ((loopMatch = loopRegex.exec(content)) !== null) {
        const loopBody = loopMatch[2];
        const loopStart = loopMatch.index;
        
        const isHydrated = hydrateBlocks.some(hb => loopStart >= hb.start && loopStart <= hb.end);
        
        if (!isHydrated) {
          const hasEventHandlers = /\bon[A-Z][a-zA-Z]*\s*=\s*\{/.test(loopBody);
          if (hasEventHandlers) {
            const eventMatch = loopBody.match(/\b(on[A-Z][a-zA-Z]*)\s*=\s*\{/);
            const eventName = eventMatch ? eventMatch[1] : "event handler";
            violations.push({
              type: "loop",
              file: relFile,
              message: `WpQueryLoop contains active interactive handler (${eventName}) but is not wrapped inside a <Hydrate> boundary. It will render static and non-interactive in production WordPress.`,
              severity: "error"
            });
          }
        }
      }

      // 3. Hardcoded relative internal links check
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const hrefRegex = /href\s*=\s*["']([^"']*)["']/g;
        let hrefMatch;
        while ((hrefMatch = hrefRegex.exec(line)) !== null) {
          const val = hrefMatch[1];
          const isRelative = val.startsWith("/") && 
                             !val.startsWith("//") && 
                             !val.startsWith("/wp-") &&
                             !val.startsWith("/feed");
          if (isRelative) {
            violations.push({
              type: "url",
              file: relFile,
              message: `Hardcoded relative URL "${val}" found. Use useWpPermalink() to resolve dynamically from WordPress.`,
              severity: "warning",
              lineContent: line.trim() + ` (line ${i + 1})`
            });
          }
        }

        const jsxHrefRegex = /href\s*=\s*\{\s*["']([^"']*)["']\s*\}/g;
        let jsxHrefMatch;
        while ((jsxHrefMatch = jsxHrefRegex.exec(line)) !== null) {
          const val = jsxHrefMatch[1];
          const isRelative = val.startsWith("/") && 
                             !val.startsWith("//") && 
                             !val.startsWith("/wp-") &&
                             !val.startsWith("/feed");
          if (isRelative) {
            violations.push({
              type: "url",
              file: relFile,
              message: `Hardcoded relative URL "${val}" found. Use useWpPermalink() to resolve dynamically from WordPress.`,
              severity: "warning",
              lineContent: line.trim() + ` (line ${i + 1})`
            });
          }
        }
      }

    } catch (err) {
      console.warn(`[Static Lint] Failed to scan file ${filePath}:`, err.message);
    }
  }

  return violations;
}


