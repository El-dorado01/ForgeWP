import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { ts } from "./is-interactive.js";
import { scanForHydrationIslandsWithProps } from "./islands-scanner.js";

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

  // Load CPTs, Taxonomies, and Custom Fields from wp.config.ts and cms/mock-data.json
  const validPostTypes = new Set(["post", "page"]);
  const postTypeTaxonomies = {
    "post": new Set(["category", "post_tag"]),
    "page": new Set()
  };
  const postTypeCustomFields = {
    "post": new Set(),
    "page": new Set()
  };

  // 1. Scan CPTs from wp.config.ts
  const configPath = path.join(themeRoot, "wp.config.ts");
  if (existsSync(configPath)) {
    try {
      const configContent = readFileSync(configPath, "utf8");
      const postTypesMatch = configContent.match(/postTypes\s*:\s*\{([\s\S]*?)\}/);
      if (postTypesMatch) {
        const block = postTypesMatch[1];
        const keyRegex = /\b([a-zA-Z0-9_-]+)\s*:/g;
        let m;
        while ((m = keyRegex.exec(block)) !== null) {
          const pt = m[1];
          if (pt !== 'labels' && pt !== 'singular' && pt !== 'plural' && pt !== 'translatable') {
            validPostTypes.add(pt);
            if (!postTypeTaxonomies[pt]) {
              postTypeTaxonomies[pt] = new Set(["category", "post_tag"]);
            }
            if (!postTypeCustomFields[pt]) {
              postTypeCustomFields[pt] = new Set();
            }
          }
        }
      }
    } catch {}
  }

  // 2. Scan CPTs, Taxonomies, and Custom Fields from cms/mock-data.json and cms/products.json
  const dataFiles = [
    path.join(themeRoot, "cms", "mock-data.json"),
    path.join(themeRoot, "cms", "products.json")
  ];
  for (const dbPath of dataFiles) {
    if (existsSync(dbPath)) {
      try {
        const mockData = JSON.parse(readFileSync(dbPath, "utf8"));
        for (const pt of Object.keys(mockData)) {
          if (
            pt !== 'posts' &&
            pt !== 'pages' &&
            pt !== 'post' &&
            pt !== 'page' &&
            pt !== 'menus' &&
            pt !== 'attachment' &&
            !pt.startsWith('_')
          ) {
            validPostTypes.add(pt);
            if (!postTypeTaxonomies[pt]) {
              postTypeTaxonomies[pt] = new Set(["category", "post_tag"]);
            }
            if (!postTypeCustomFields[pt]) {
              postTypeCustomFields[pt] = new Set();
            }

            const items = mockData[pt];
            if (Array.isArray(items)) {
              for (const item of items) {
                if (item._terms && typeof item._terms === 'object') {
                  for (const tax of Object.keys(item._terms)) {
                    postTypeTaxonomies[pt].add(tax);
                  }
                }
                if (item.customFields && typeof item.customFields === 'object') {
                  for (const key of Object.keys(item.customFields)) {
                    postTypeCustomFields[pt].add(key);
                  }
                }
              }
            }
          } else if (pt === 'post' || pt === 'page') {
            const items = mockData[pt];
            if (Array.isArray(items)) {
              for (const item of items) {
                if (item._terms && typeof item._terms === 'object') {
                  for (const tax of Object.keys(item._terms)) {
                    postTypeTaxonomies[pt].add(tax);
                  }
                }
                if (item.customFields && typeof item.customFields === 'object') {
                  for (const key of Object.keys(item.customFields)) {
                    postTypeCustomFields[pt].add(key);
                  }
                }
              }
            }
          }
        }
      } catch {}
    }
  }

  const validSlugs = new Set(["page"]);
  const pagesDir = path.join(themeRoot, "src", "app", "pages");
  if (existsSync(pagesDir)) {
    try {
      const pageFiles = readdirSync(pagesDir).filter(f => f.endsWith(".tsx"));
      for (const pf of pageFiles) {
        const pageName = pf.replace(".tsx", "");
        if (pageName.startsWith("Single")) {
          continue;
        }
        const slug = pageName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
        validSlugs.add(slug);
      }
    } catch {}
  }

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

      // 4. useWpPageLink template slug typo check
      const pageLinkRegex = /useWpPageLink\s*\(\s*["']([^"']+)["']/g;
      let pageLinkMatch;
      while ((pageLinkMatch = pageLinkRegex.exec(content)) !== null) {
        const slugUsed = pageLinkMatch[1];
        if (!validSlugs.has(slugUsed)) {
          violations.push({
            type: "pagelink",
            file: relFile,
            message: `useWpPageLink references non-existent page template slug "${slugUsed}". Valid slugs: ${Array.from(validSlugs).join(", ")}`,
            severity: "warning"
          });
        }
      }

      // 5. useWpQuery arguments audit
      const useWpQueryRegex = /useWpQuery\s*\(\s*(\{[\s\S]*?\})\s*\)/g;
      let queryMatch;
      while ((queryMatch = useWpQueryRegex.exec(content)) !== null) {
        const argsStr = queryMatch[1];
        
        const postTypeMatch = argsStr.match(/postType\s*:\s*['"]([^'"]+)['"]/);
        const postType = postTypeMatch ? postTypeMatch[1] : 'post';

        if (!validPostTypes.has(postType)) {
          violations.push({
            type: "query",
            file: relFile,
            message: `useWpQuery references unregistered postType "${postType}".`,
            severity: "warning"
          });
        } else {
          // Validate Taxonomies inside taxQuery
          const taxRegex = /\btaxonomy\s*:\s*['"]([^'"]+)['"]/g;
          let taxMatch;
          const allowedTaxonomies = postTypeTaxonomies[postType] || new Set();
          while ((taxMatch = taxRegex.exec(argsStr)) !== null) {
            const taxSlug = taxMatch[1];
            if (!allowedTaxonomies.has(taxSlug)) {
              violations.push({
                type: "query",
                file: relFile,
                message: `useWpQuery in ${path.basename(filePath)} queries taxonomy "${taxSlug}", which is not registered for postType "${postType}" in wp.config.ts.`,
                severity: "warning"
              });
            }
          }

          // Validate Custom Fields inside metaQuery
          const keyRegex = /\bkey\s*:\s*['"]([^'"]+)['"]/g;
          let keyMatch;
          const allowedFields = postTypeCustomFields[postType] || new Set();
          while ((keyMatch = keyRegex.exec(argsStr)) !== null) {
            const fieldKey = keyMatch[1];
            if (!allowedFields.has(fieldKey)) {
              violations.push({
                type: "query",
                file: relFile,
                message: `useWpQuery in ${path.basename(filePath)} queries custom field "${fieldKey}", which is not defined for postType "${postType}" in wp.config.ts.`,
                severity: "warning"
              });
            }
          }
        }
      }

    } catch (err) {
      console.warn(`[Static Lint] Failed to scan file ${filePath}:`, err.message);
    }
  }

  // 6. Auto-hydration layout-class safety check
  //
  // Smart Discovery auto-wraps interactive components in an unstyled <Hydrate> boundary
  // div. The compiler tries to hoist that component's own root className onto the wrapper
  // so layout-critical classes (w-full, flex, grid, sticky, ...) survive, but it can only
  // do that when the className is statically provable. When it isn't (a dynamic template,
  // a cn()/clsx() call, a variable), the wrapper falls back to a bare `display:block` box —
  // which can silently break width/flex sizing exactly like ForgeWP's own docs warn about
  // for manual <Hydrate> usage. Flag those cases so a dev can wrap explicitly instead.
  try {
    const islands = scanForHydrationIslandsWithProps(themeRoot);
    for (const island of islands) {
      if (island.smartDiscovered && island.rootClassNameUnresolved) {
        violations.push({
          type: "hydration-layout",
          file: island.file,
          message: `Component behind auto-detected hydration island "${island.name}" has a dynamic/non-static className on its root element. ForgeWP could not automatically copy it onto the generated <Hydrate> wrapper, so layout classes (width, flex, grid, etc.) on that root element may be silently lost in the compiled output. Wrap it explicitly instead: <Hydrate className="...">.`,
          severity: "warning",
        });
      }
    }
  } catch (err) {
    console.warn(`[Static Lint] Failed to run hydration layout-class check:`, err.message);
  }

  return violations;
}
