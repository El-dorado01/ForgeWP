import fs, {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { scanForEditableSchemas } from './hydration-scanner.js';
import { loadFrameworkAdapter } from './framework-adapter.js';
import {
  analyzeHydrationIslands,
  printDiagnosticsReport,
} from './diagnostics.js';

// Import newly refactored modular helpers
import { processMarkup } from './markup-processor.js';
import {
  buildStyleCss,
  buildHeaderPhp,
  buildFooterPhp,
  buildIndexPhp,
  buildSinglePhp,
  build404Php,
  buildArchivePhp,
  buildPagePhp,
} from './php-builders.js';
import { buildFunctionsPhp } from './functions-builder.js';
import { compileBlocks } from './block-compiler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Orchestrates the theme generation pipeline.
 * Transpiles isomorphic React components into native WordPress theme assets.
 *
 * @param {Object} options
 * @param {string} options.themeRoot
 * @param {string} options.outDir
 * @param {import('./types.js').ForgeWPThemeConfig} options.config
 * @param {string} options.appHtml
 * @param {string} [options.headerHtml]
 * @param {string} [options.footerHtml]
 * @param {import('./types.js').ForgeWPBuildAssets} options.assets
 */
export async function generateTheme({
  themeRoot,
  outDir,
  config,
  appHtml,
  headerHtml = '',
  footerHtml = '',
  headHtml = '',
  singleHeadHtml = '',
  singleHtml = '',
  notFoundHtml = '',
  archiveHtml = '',
  assets,
}) {
  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
  }

  mkdirSync(outDir, { recursive: true });

  const schemas = scanForEditableSchemas(themeRoot);
  console.log(`[ForgeWP Compiler] Discovered colocated editable schemas for templates: ${Object.keys(schemas).join(', ') || '<none>'}`);

  // Load project-specific compiler hooks if they exist in theme src
  let projectHooks = null;
  const hooksPath = path.join(themeRoot, 'src', 'compiler-hooks.js');
  if (existsSync(hooksPath)) {
    console.warn(
      '\x1b[33m%s\x1b[0m',
      '⚠️  [ForgeWP Deprecation Warning]: "compiler-hooks.js" is deprecated. Please migrate custom PHP logic to "src/server/*.php" files.'
    );
    try {
      const fileUrl = pathToFileURL(hooksPath).href;
      projectHooks = await import(fileUrl);
    } catch (e) {
      console.warn('[ForgeWP Compiler] Failed to import project compiler hooks:', e.message);
    }
  }

  // Load menus configuration for auto-registration and setup
  let menus = {};
  const menusJsonSrc = path.join(themeRoot, 'cms', 'menus.json');
  if (existsSync(menusJsonSrc)) {
    try {
      menus = JSON.parse(readFileSync(menusJsonSrc, 'utf8'));
    } catch (e) {
      console.warn('Failed to parse menus.json:', e.message);
    }
  }

  // Merge static menu definitions from defineTheme/wp.config.ts config.menus
  if (config.menus) {
    for (const [key, label] of Object.entries(config.menus)) {
      if (!menus[key]) {
        menus[key] = []; // Initialize menu locations for auto-registration
      }
    }
  }

  // Gather compiled custom page templates for auto-creation with smart slug mapping
  const pagesToAutoCreate = [];
  const pageTemplateSlugs = [];
  const forgewpDir = path.join(themeRoot, '.forgewp');
  if (existsSync(forgewpDir)) {
    const templateFiles = readdirSync(forgewpDir);
    for (const file of templateFiles) {
      if (
        file.startsWith('template-') &&
        file.endsWith('.html') &&
        !file.includes('-head')
      ) {
        const slug = file.replace('.html', '');
        const pageTemplateSlug = slug.replace('template-', '');
        pageTemplateSlugs.push(pageTemplateSlug);

        let matchedSlug = null;
        let matchedTitle = null;

        const toKebabTemplateSlug = (str) => {
          const compName =
            str
              .replace(/[^a-zA-Z0-9]/g, ' ')
              .trim()
              .split(/\s+/)
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
              .join('') + 'Page';
          return compName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
        };

        const targetKebab = pageTemplateSlug;

        // Search in menus to find matching target URL slugs defined by the developer
        for (const [location, items] of Object.entries(menus)) {
          if (!Array.isArray(items)) continue;
          for (const item of items) {
            if (!item.url || !item.url.startsWith('/')) continue;
            const menuUrlSlug = item.url.replace(/^\//, '');

            if (
              toKebabTemplateSlug(item.title) === targetKebab ||
              toKebabTemplateSlug(menuUrlSlug) === targetKebab
            ) {
              matchedSlug = menuUrlSlug;
              matchedTitle = item.title;
              break;
            }
          }
          if (matchedSlug) break;
        }

        // Fallback 1: Strip trailing "-page" from template slug
        if (!matchedSlug) {
          matchedSlug = pageTemplateSlug.endsWith('-page')
            ? pageTemplateSlug.slice(0, -5)
            : pageTemplateSlug;
        }

        // Fallback 2: Generate clean human-readable title
        if (!matchedTitle) {
          const cleanName = pageTemplateSlug.endsWith('-page')
            ? pageTemplateSlug.slice(0, -5)
            : pageTemplateSlug;
          matchedTitle = cleanName
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
        }

        pagesToAutoCreate.push({
          title: matchedTitle,
          slug: matchedSlug,
          template: `page-${pageTemplateSlug}.php`,
        });
      }
    }
  }

  const adapter = await loadFrameworkAdapter(config.frameworkAdapter);
  const scanForHydrationIslands =
    adapter.scanForHydrationIslands || adapter.default?.scanForHydrationIslands;

  const hydrationIslands = scanForHydrationIslands
    ? scanForHydrationIslands(themeRoot)
    : [];
  const hasHydration = hydrationIslands.length > 0;

  const assetsOut = path.join(outDir, 'assets');
  const distAssets = path.join(themeRoot, 'dist', 'assets');
  mkdirSync(assetsOut, { recursive: true });
  cpSync(distAssets, assetsOut, { recursive: true });

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

  let hydrationManifestJson = '{}';
  if (hasHydration) {
    const manifestPath = path.join(themeRoot, 'dist', '.vite', 'manifest.json');
    let viteManifest = {};
    if (existsSync(manifestPath)) {
      try {
        viteManifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      } catch (e) {
        console.warn('Failed to parse Vite manifest.json:', e.message);
      }
    } else {
      console.warn(
        'Hydration manifest not found at dist/.vite/manifest.json. Hydration asset generation may be incomplete.',
      );
    }

    const mapping = {};
    let mainJsFile = '';
    const entryChunk =
      viteManifest['index.html'] ||
      Object.values(viteManifest).find((c) => c.isEntry);
    if (entryChunk) {
      mainJsFile = entryChunk.file;
    }

    for (const island of hydrationIslands) {
      const pascalName = island
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join('');

      let resolvedChunk = null;
      for (const [key, value] of Object.entries(viteManifest)) {
        const fileBasename = path.basename(value.file || '');
        const cleanName = fileBasename.replace(/-[A-Za-z0-9_-]+\.js$/, '');
        if (
          key.endsWith(`/${pascalName}.tsx`) ||
          key.endsWith(`/${pascalName}.ts`) ||
          key.endsWith(`/${island}.tsx`) ||
          key.endsWith(`/${island}.ts`) ||
          cleanName === island ||
          cleanName === pascalName.toLowerCase()
        ) {
          resolvedChunk = value.file;
          break;
        }
      }

      if (resolvedChunk) {
        mapping[island] = resolvedChunk;
      }
    }

    if (!mainJsFile) {
      throw new Error(
        'Hydration generation failed: could not resolve the React runtime entry chunk. Ensure Vite emitted a valid manifest and the theme entry is present.',
      );
    }

    const missingIslands = hydrationIslands.filter(
      (island) => !(island in mapping),
    );
    if (missingIslands.length > 0) {
      throw new Error(
        `Hydration generation failed: missing compiled chunk for island(s): ${missingIslands.join(', ')}. ` +
          'Verify the Hydrate component children and the corresponding Vite input files.',
      );
    }

    const hydratorScript = `(function () {
  const config = window.forgeWpHydration || { themeUri: "", manifest: {} };
  const islands = document.querySelectorAll("[data-forgewp-hydrate]");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const hydrate = entry.target.__forgewpHydrate;
        if (typeof hydrate === "function") hydrate();
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: "200px" });

  // Predictive preloading observer with larger viewport margin (600px)
  const preloadObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        preloadElement(el);
        preloadObserver.unobserve(el);
      }
    });
  }, { rootMargin: "600px" });

  const StrategyRegistry = {
    load: (el, hydrate) => {
      if (document.readyState === "complete") {
        hydrate();
      } else {
        window.addEventListener("load", hydrate);
      }
    },
    visible: (el, hydrate) => {
      el.__forgewpHydrate = hydrate;
      observer.observe(el);
    },
    interaction: (el, hydrate) => {
      const run = () => {
        hydrate();
        el.removeEventListener("click", run);
        el.removeEventListener("mouseenter", run);
        el.removeEventListener("focusin", run);
      };
      el.addEventListener("click", run);
      el.addEventListener("mouseenter", run);
      el.addEventListener("focusin", run);
    },
    click: (el, hydrate) => {
      const run = () => {
        hydrate();
        el.removeEventListener("click", run);
      };
      el.addEventListener("click", run);
    },
    hover: (el, hydrate) => {
      const run = () => {
        hydrate();
        el.removeEventListener("mouseenter", run);
      };
      el.addEventListener("mouseenter", run);
    },
    idle: (el, hydrate) => {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(hydrate);
      } else {
        setTimeout(hydrate, 200);
      }
    }
  };

  islands.forEach((el) => {
    const islandName = el.getAttribute("data-forgewp-hydrate");

    // 1. Network-Aware Check: Restrict/skip hydration on slow 2G/3G connections if requested
    const connection = el.getAttribute("data-forgewp-connection");
    if (connection === "fast") {
      const conn = navigator.connection;
      if (conn && (conn.saveData || /2g|3g/.test(conn.effectiveType))) {
        console.warn("[ForgeWP Hydrator] Deferring hydration of island '" + islandName + "' due to slow 2G/3G network conditions.");
        return;
      }
    }

    // 2. Predictive Preloading Setup
    const preload = el.getAttribute("data-forgewp-preload");
    if (preload === "near-visible") {
      preloadObserver.observe(el);
    }

    const runHydration = () => hydrateElement(el);

    // 3. Media-Query Check: Gated by target device dimensions
    const media = el.getAttribute("data-forgewp-media");
    if (media) {
      const mql = window.matchMedia(media);
      const setupMediaHydration = () => {
        const trigger = el.getAttribute("data-forgewp-trigger") || "visible";
        const strategy = StrategyRegistry[trigger];
        if (strategy) {
          strategy(el, runHydration);
        } else {
          StrategyRegistry.visible(el, runHydration);
        }
      };

      if (mql.matches) {
        setupMediaHydration();
      } else {
        const listener = (e) => {
          if (e.matches) {
            setupMediaHydration();
            mql.removeEventListener("change", listener);
          }
        };
        mql.addEventListener("change", listener);
      }
      return;
    }

    // Standard trigger registration
    const trigger = el.getAttribute("data-forgewp-trigger") || "visible";
    const strategy = StrategyRegistry[trigger];
    if (strategy) {
      strategy(el, runHydration);
    } else {
      StrategyRegistry.visible(el, runHydration);
    }
  });

  function preloadElement(el) {
    const islandName = el.getAttribute("data-forgewp-hydrate");
    const chunkPath = config.manifest?.[islandName];
    if (!chunkPath) return;
    const scriptUrl = config.themeUri + "/assets/" + chunkPath.replace("assets/", "").replace("assets\\\\", "");
    
    // Inject link[rel=modulepreload]
    if (document.querySelector("link[href='" + scriptUrl + "']")) return;
    const link = document.createElement("link");
    link.rel = "modulepreload";
    link.href = scriptUrl;
    document.head.appendChild(link);
  }

  function hydrateElement(el) {
    const islandName = el.getAttribute("data-forgewp-hydrate");
    if (!islandName) {
      console.error("[ForgeWP Hydrator] Missing data-forgewp-hydrate attribute on hydration boundary.");
      return;
    }

    const rawProps = el.getAttribute("data-forgewp-props") || "{}";
    let props = {};
    try {
      props = JSON.parse(rawProps);
    } catch (err) {
      console.error("[ForgeWP Hydrator] Failed to parse props for island " + islandName + ":", err);
    }

    const chunkPath = config.manifest?.[islandName];
    if (!chunkPath) {
      const available = config.manifest ? Object.keys(config.manifest).join(", ") : "<none>";
      console.error(
        "[ForgeWP Hydrator] Could not find compiled chunk for island " + islandName + ". " +
        "Available manifest keys: " + available
      );
      return;
    }

    const scriptUrl = config.themeUri + "/assets/" + chunkPath.replace("assets/", "").replace("assets\\\\", "");

    import(scriptUrl)
      .then((module) => {
        let Component = module.default;
        if (!Component) {
          Component = Object.values(module).find((val) => typeof val === "function");
          if (!Component) {
            Component = Object.values(module)[0];
          }
        }
        if (typeof Component !== "function") {
          const exportsList = Object.keys(module).join(", ");
          console.error(
            "[ForgeWP Hydrator] Chunk for " + islandName + " does not export a valid React component. " +
            "Available exports: " + exportsList
          );
          return;
        }

        // Resolve ReactDOM/React — prefer window globals set by main.tsx.
        // Always use createRoot (not hydrateRoot): island chunks bundle their
        // own React via Vite code-splitting, so hydrateRoot from window.ReactDOM
        // (a different instance) causes a silent Fiber reconciler failure.
        // createRoot takes full ownership of the container, bypassing this issue.
        const ReactDOM = window.ReactDOM;
        const React = window.React;

        if (ReactDOM && React) {
          const root = ReactDOM.createRoot(el);
          root.render(React.createElement(Component, props));
        } else {
          console.error("[ForgeWP Hydration Error] React or ReactDOM not found on window. Ensure main.tsx exposes window.React and window.ReactDOM.");
        }
      })
      .catch((err) => {
        console.error("[ForgeWP Hydrator] Failed to load chunk for " + islandName + ":", err);
      });
  }
})();`;

    writeFileSync(
      path.join(assetsOut, 'forgewp-hydrator.js'),
      hydratorScript,
      'utf8',
    );
    hydrationManifestJson = JSON.stringify({
      mainJsFile,
      mapping,
    });

    // Run compiler diagnostics & output detailed metrics
    const analysis = analyzeHydrationIslands(themeRoot, mapping);
    printDiagnosticsReport(analysis);
  }

  // Drop unused JS from the theme ZIP
  const files = readdirSync(assetsOut);
  for (const file of files) {
    if (
      (file.endsWith('.js') || file.endsWith('.js.map')) &&
      file !== 'forgewp-editor.js' &&
      file !== 'forgewp-hydrator.js'
    ) {
      if (!hasHydration) {
        rmSync(path.join(assetsOut, file), { force: true });
      }
    }
  }

  // Scan all page templates for translations before processMarkup replaces them
  const i18nKeys = new Set();
  const scanForI18nKeys = (content) => {
    if (!content) return;
    const regex = /__FORGEWP_I18N_([^_](?:[^_]|_(?!_))*?)__/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const clean = match[1]
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      i18nKeys.add(clean);
    }
  };

  scanForI18nKeys(appHtml);
  scanForI18nKeys(headerHtml);
  scanForI18nKeys(footerHtml);
  scanForI18nKeys(singleHtml);
  scanForI18nKeys(notFoundHtml);
  scanForI18nKeys(archiveHtml);

  if (existsSync(forgewpDir)) {
    const templateFiles = readdirSync(forgewpDir);
    for (const file of templateFiles) {
      if (file.endsWith('.html')) {
        const rawHtml = readFileSync(path.join(forgewpDir, file), 'utf8');
        scanForI18nKeys(rawHtml);
      }
    }
  }

  // Load and merge keys from cms/translations.json
  const translationsFileSrc = path.join(themeRoot, 'cms', 'translations.json');
  if (existsSync(translationsFileSrc)) {
    try {
      const transData = JSON.parse(readFileSync(translationsFileSrc, 'utf8'));
      for (const locale of Object.keys(transData)) {
        if (transData[locale] && typeof transData[locale] === 'object') {
          for (const key of Object.keys(transData[locale])) {
            i18nKeys.add(key);
          }
        }
      }
    } catch (e) {
      // Ignore parse/read errors during build time
    }
  }

  // Fix nav links and split markup
  const processedApp = processMarkup(appHtml, config.textDomain);
  const processedHeader = processMarkup(headerHtml, config.textDomain);
  const processedFooter = processMarkup(footerHtml, config.textDomain);

  // Extract content (App markup minus Header/Footer)
  let contentHtml = processedApp;
  if (processedHeader) {
    const replaced = contentHtml.replace(processedHeader, '');
    contentHtml = replaced !== contentHtml ? replaced : contentHtml.replace(/<header\b[^>]*>([\s\S]*?)<\/header>/i, '');
  }
  if (processedFooter) {
    const replaced = contentHtml.replace(processedFooter, '');
    contentHtml = replaced !== contentHtml ? replaced : contentHtml.replace(/<footer\b[^>]*>([\s\S]*?)<\/footer>/i, '');
  }
  contentHtml = contentHtml.replace(/<div\b[^>]*data-forgewp-hydrate="(navbar|site-header|site-footer)"[^>]*>\s*<\/div>/g, '');

  // Process single post template if exists
  let processedSingle = '';
  if (singleHtml) {
    processedSingle = processMarkup(singleHtml, config.textDomain);
    if (processedHeader) {
      const replaced = processedSingle.replace(processedHeader, '');
      processedSingle = replaced !== processedSingle ? replaced : processedSingle.replace(/<header\b[^>]*>([\s\S]*?)<\/header>/i, '');
    }
    if (processedFooter) {
      const replaced = processedSingle.replace(processedFooter, '');
      processedSingle = replaced !== processedSingle ? replaced : processedSingle.replace(/<footer\b[^>]*>([\s\S]*?)<\/footer>/i, '');
    }
    processedSingle = processedSingle.replace(/<div\b[^>]*data-forgewp-hydrate="(navbar|site-header|site-footer)"[^>]*>\s*<\/div>/g, '');
  }

  // Process 404 template if exists
  let processedNotFound = '';
  if (notFoundHtml) {
    processedNotFound = processMarkup(notFoundHtml, config.textDomain);
    if (processedHeader) {
      const replaced = processedNotFound.replace(processedHeader, '');
      processedNotFound = replaced !== processedNotFound ? replaced : processedNotFound.replace(/<header\b[^>]*>([\s\S]*?)<\/header>/i, '');
    }
    if (processedFooter) {
      const replaced = processedNotFound.replace(processedFooter, '');
      processedNotFound = replaced !== processedNotFound ? replaced : processedNotFound.replace(/<footer\b[^>]*>([\s\S]*?)<\/footer>/i, '');
    }
    processedNotFound = processedNotFound.replace(/<div\b[^>]*data-forgewp-hydrate="(navbar|site-header|site-footer)"[^>]*>\s*<\/div>/g, '');
  }

  const staticDir = path.join(outDir, 'forgewp-static');
  mkdirSync(staticDir, { recursive: true });
  writeFileSync(path.join(staticDir, 'content.html'), contentHtml, 'utf8');
  writeFileSync(path.join(staticDir, 'header.html'), processedHeader, 'utf8');
  writeFileSync(path.join(staticDir, 'footer.html'), processedFooter, 'utf8');
  if (headHtml) {
    writeFileSync(path.join(staticDir, 'head.html'), headHtml, 'utf8');
  }
  if (singleHeadHtml) {
    writeFileSync(
      path.join(staticDir, 'single-head.html'),
      singleHeadHtml,
      'utf8',
    );
  }
  if (processedSingle) {
    writeFileSync(path.join(staticDir, 'single.html'), processedSingle, 'utf8');
  }
  if (processedNotFound) {
    writeFileSync(path.join(staticDir, '404.html'), processedNotFound, 'utf8');
  }

  // Archive page (category / tag / date archives)
  let processedArchive = '';
  if (archiveHtml) {
    processedArchive = processMarkup(archiveHtml, config.textDomain);
    if (processedHeader) {
      const replaced = processedArchive.replace(processedHeader, '');
      processedArchive = replaced !== processedArchive ? replaced : processedArchive.replace(/<header\b[^>]*>([\s\S]*?)<\/header>/i, '');
    }
    if (processedFooter) {
      const replaced = processedArchive.replace(processedFooter, '');
      processedArchive = replaced !== processedArchive ? replaced : processedArchive.replace(/<footer\b[^>]*>([\s\S]*?)<\/footer>/i, '');
    }
    processedArchive = processedArchive.replace(/<div\b[^>]*data-forgewp-hydrate="(navbar|site-header|site-footer)"[^>]*>\s*<\/div>/g, '');
    writeFileSync(
      path.join(staticDir, 'archive.html'),
      processedArchive,
      'utf8',
    );
  }

  // Dynamic Gutenberg blocks compilation (Phase 5)
  const compiledBlocks = compileBlocks(themeRoot, outDir);

  const editorScriptContent = `
const { registerBlockType } = wp.blocks;
const { createElement } = wp.element;
const { InspectorControls, useBlockProps } = wp.blockEditor;
const { PanelBody, TextControl } = wp.components;
const ServerSideRender = wp.serverSideRender;

if (window.forgeWpBlocks) {
    window.forgeWpBlocks.forEach(block => {
        registerBlockType(block.name, {
            title: block.title,
            icon: block.icon,
            category: block.category,
            attributes: block.attributes,
            edit: function(props) {
                const { attributes, setAttributes } = props;
                const blockProps = useBlockProps();
                
                if (block.customEditJsx) {
                    try {
                        const renderFn = new Function('props', 'createElement', 'useBlockProps', 'attributes', 'setAttributes', 'blockProps', 
                            'return ' + block.customEditJsx
                        );
                        return renderFn(props, createElement, useBlockProps, attributes, setAttributes, blockProps);
                    } catch (e) {
                        console.error("[ForgeWP Editor] Custom edit render failed for block " + block.name + ":", e);
                        return createElement('div', blockProps, 'Render Error: ' + e.message);
                    }
                }

                // Build inspector controls dynamically from attributes
                const controls = Object.keys(block.attributes).map(key => {
                    return createElement(TextControl, {
                        label: key.charAt(0).toUpperCase() + key.slice(1),
                        value: attributes[key],
                        onChange: (val) => setAttributes({ [key]: val })
                    });
                });

                return createElement('div', blockProps,
                    createElement(InspectorControls, null,
                        createElement(PanelBody, { title: 'Block Settings', initialOpen: true }, controls)
                    ),
                    createElement(ServerSideRender, {
                        block: block.name,
                        attributes: attributes
                    })
                );
            },
            save: function() {
                return null; // Dynamic blocks return null in save
            }
        });
    });
}
`;
  writeFileSync(
    path.join(outDir, 'assets', 'forgewp-editor.js'),
    editorScriptContent,
    'utf8',
  );

  writeFileSync(path.join(outDir, 'style.css'), buildStyleCss(config), 'utf8');

  let hydrationData = null;
  if (hasHydration) {
    try {
      hydrationData = JSON.parse(hydrationManifestJson);
    } catch {}
  }

  const queries = scanForQueries(themeRoot);
  console.log(`[ForgeWP Compiler] Scanned and compiled ${queries.length} REST endpoints: ${queries.map(q => q.queryId).join(', ') || '<none>'}`);

  let functionsPhpContent = buildFunctionsPhp(
    config,
    assets,
    compiledBlocks,
    themeRoot,
    pagesToAutoCreate,
    menus,
    hydrationData,
    Array.from(i18nKeys),
    schemas,
    queries,
  );

  if (projectHooks && typeof projectHooks.processFunctionsPhp === 'function') {
    functionsPhpContent = projectHooks.processFunctionsPhp(functionsPhpContent, config);
  }

  // Execute plugin functions.php transformation hooks
  if (config.plugins && Array.isArray(config.plugins)) {
    for (const plugin of config.plugins) {
      if (typeof plugin.transformFunctionsPhp === 'function') {
        functionsPhpContent = plugin.transformFunctionsPhp(functionsPhpContent, config, themeRoot, { fs, path });
      }
    }
  }

  // Append custom PHP server escape hatch files from src/server/*.php
  const serverDir = path.join(themeRoot, 'src', 'server');
  if (existsSync(serverDir)) {
    const phpFiles = readdirSync(serverDir)
      .filter((file) => file.endsWith('.php'))
      .sort();
    if (phpFiles.length > 0) {
      let serverPhpContent = '\n\n/**\n * ── PHP Server Escape Hatch (src/server/) ──\n */';
      for (const file of phpFiles) {
        const filePath = path.join(serverDir, file);
        let content = readFileSync(filePath, 'utf8');
        // Clean leading and trailing php tags safely
        content = content
          .replace(/^<\?php\s*/i, '')
          .replace(/^<\?\s*/i, '')
          .replace(/\s*\?>\s*$/i, '');
        serverPhpContent += `\n\n/**\n * Source: src/server/${file}\n */\n${content.trim()}`;
      }
      functionsPhpContent += serverPhpContent + '\n';
    }
  }

  writeFileSync(
    path.join(outDir, 'functions.php'),
    functionsPhpContent,
    'utf8',
  );

  // Copy translations.json directly if it exists in the project cms/ folder
  const translationsSrc = path.join(themeRoot, 'cms', 'translations.json');
  if (existsSync(translationsSrc)) {
    copyFileSync(translationsSrc, path.join(outDir, 'translations.json'));
  }
  writeFileSync(
    path.join(outDir, 'header.php'),
    buildHeaderPhp(config),
    'utf8',
  );
  writeFileSync(
    path.join(outDir, 'footer.php'),
    buildFooterPhp(config),
    'utf8',
  );
  writeFileSync(path.join(outDir, 'index.php'), buildIndexPhp(), 'utf8');
  writeFileSync(path.join(outDir, 'single.php'), buildSinglePhp(), 'utf8');
  writeFileSync(path.join(outDir, '404.php'), build404Php(), 'utf8');
  writeFileSync(path.join(outDir, 'front-page.php'), buildIndexPhp(), 'utf8');
  writeFileSync(path.join(outDir, 'archive.php'), buildArchivePhp(), 'utf8');
  writeFileSync(path.join(outDir, 'page.php'), buildPagePhp(), 'utf8');

  // Dynamic Custom WP hierarchy templates compiler (single-*, taxonomy-*, archive-*, etc.)
  if (existsSync(forgewpDir)) {
    const templateFiles = readdirSync(forgewpDir);
    for (const file of templateFiles) {
      const name = file.replace('.html', '');
      const isHierarchyTemplate =
        (name.startsWith('single-') ||
         name.startsWith('archive-') ||
         name.startsWith('taxonomy-') ||
         name === 'taxonomy') &&
        file.endsWith('.html') &&
        !file.includes('-head');
      
      if (isHierarchyTemplate) {
        const rawHtml = readFileSync(path.join(forgewpDir, file), 'utf8');
        let processedHtml = processMarkup(rawHtml, config.textDomain);
        if (processedHeader) {
          const replaced = processedHtml.replace(processedHeader, '');
          processedHtml = replaced !== processedHtml ? replaced : processedHtml.replace(/<header\b[^>]*>([\s\S]*?)<\/header>/i, '');
        }
        if (processedFooter) {
          const replaced = processedHtml.replace(processedFooter, '');
          processedHtml = replaced !== processedHtml ? replaced : processedHtml.replace(/<footer\b[^>]*>([\s\S]*?)<\/footer>/i, '');
        }
        processedHtml = processedHtml.replace(/<div\b[^>]*data-forgewp-hydrate="(navbar|site-header|site-footer)"[^>]*>\s*<\/div>/g, '');

        writeFileSync(path.join(staticDir, file), processedHtml, 'utf8');

        const headFile = file.replace('.html', '-head.html');
        if (existsSync(path.join(forgewpDir, headFile))) {
          writeFileSync(
            path.join(staticDir, headFile),
            readFileSync(path.join(forgewpDir, headFile), 'utf8'),
            'utf8',
          );
        }

        const phpLoop = name.startsWith('single-')
          ? `    if (have_posts()) {
        the_post();
        include $markup_file;
    } else {
        include $markup_file;
    }`
          : `    if (have_posts()) {
        while (have_posts()) {
            the_post();
            include $markup_file;
        }
    } else {
        include $markup_file;
    }`;

        const phpContent = `<?php
/**
 * Dynamic ${name} template
 *
 * @package ${config.textDomain}
 */

get_header();

$markup_file = get_template_directory() . '/forgewp-static/${file}';
if (file_exists($markup_file)) {
${phpLoop}
}

get_footer();
`;
        writeFileSync(path.join(outDir, `${name}.php`), phpContent, 'utf8');
        console.warn(`[ForgeWP Compiler] Wrote dynamic WP template ${name}.php`);
      }
    }
  }

  // Dynamic Custom Page Templates Compiler
  if (existsSync(forgewpDir)) {
    const templateFiles = readdirSync(forgewpDir);
    for (const file of templateFiles) {
      if (
        file.startsWith('template-') &&
        file.endsWith('.html') &&
        !file.includes('-head')
      ) {
        const slug = file.replace('.html', '');
        const rawHtml = readFileSync(path.join(forgewpDir, file), 'utf8');

        let processedHtml = processMarkup(rawHtml, config.textDomain);
        if (processedHeader) {
          const replaced = processedHtml.replace(processedHeader, '');
          processedHtml = replaced !== processedHtml ? replaced : processedHtml.replace(/<header\b[^>]*>([\s\S]*?)<\/header>/i, '');
        }
        if (processedFooter) {
          const replaced = processedHtml.replace(processedFooter, '');
          processedHtml = replaced !== processedHtml ? replaced : processedHtml.replace(/<footer\b[^>]*>([\s\S]*?)<\/footer>/i, '');
        }
        processedHtml = processedHtml.replace(/<div\b[^>]*data-forgewp-hydrate="(navbar|site-header|site-footer)"[^>]*>\s*<\/div>/g, '');

        if (projectHooks && typeof projectHooks.processTemplateMarkup === 'function') {
          processedHtml = projectHooks.processTemplateMarkup(slug, processedHtml, config);
        }

        writeFileSync(path.join(staticDir, file), processedHtml, 'utf8');

        const headFile = file.replace('.html', '-head.html');
        if (existsSync(path.join(forgewpDir, headFile))) {
          writeFileSync(
            path.join(staticDir, headFile),
            readFileSync(path.join(forgewpDir, headFile), 'utf8'),
            'utf8',
          );
        }

        // Generate the native WordPress PHP Custom Page Template
        const templateName = slug
          .replace('template-', '')
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        const phpContent = `<?php
/**
 * Template Name: ${templateName}
 *
 * @package ${config.textDomain}
 */

get_header();

$markup_file = get_template_directory() . '/forgewp-static/${file}';
if (file_exists($markup_file)) {
    include $markup_file;
}

get_footer();
`;
        writeFileSync(
          path.join(outDir, `page-${slug.replace('template-', '')}.php`),
          phpContent,
          'utf8',
        );
      }
    }
  }

  // Dynamic theme.json compiler (Phase 5)
  const themeJsonSrc = path.join(themeRoot, 'cms', 'theme.json');
  let themeJson = {
    $schema: 'https://schemas.wp.org/trunk/theme.json',
    version: 3,
    settings: {
      appearanceTools: true,
    },
  };

  if (existsSync(themeJsonSrc)) {
    try {
      themeJson = JSON.parse(readFileSync(themeJsonSrc, 'utf8'));
    } catch (e) {
      console.warn('Failed to parse theme.json template:', e.message);
    }
  }

  // Merge tokens from wp.config.ts
  if (config.settings) {
    if (!themeJson.settings) themeJson.settings = {};

    // Layout (contentSize, wideSize)
    if (config.settings.layout) {
      themeJson.settings.layout = {
        ...themeJson.settings.layout,
        ...config.settings.layout,
      };
    }

    // Colors (custom, palette)
    if (config.settings.color) {
      themeJson.settings.color = {
        ...themeJson.settings.color,
        ...config.settings.color,
      };
    }

    // Typography (fontSizes, fontFamilies)
    if (config.settings.typography) {
      themeJson.settings.typography = {
        ...themeJson.settings.typography,
        ...config.settings.typography,
      };
    }
  }

  writeFileSync(
    path.join(outDir, 'theme.json'),
    JSON.stringify(themeJson, null, 2),
    'utf8',
  );

  const screenshot = path.join(themeRoot, 'cms', 'screenshot.png');
  if (existsSync(screenshot)) {
    copyFileSync(screenshot, path.join(outDir, 'screenshot.png'));
  } else {
    const fallbackScreenshot = path.join(__dirname, 'screenshot-fallback.png');
    if (existsSync(fallbackScreenshot)) {
      copyFileSync(fallbackScreenshot, path.join(outDir, 'screenshot.png'));
    }
  }
}

function extractUseWpQueryArgs(fileContent) {
  const queries = [];
  const regex = /useWpQuery\s*\(/g;
  let match;
  while ((match = regex.exec(fileContent)) !== null) {
    const startIdx = regex.lastIndex; // index right after the '('
    let parenCount = 1;
    let endIdx = startIdx;
    let inString = false;
    let stringChar = null;
    
    for (let i = startIdx; i < fileContent.length; i++) {
      const char = fileContent[i];
      
      if (inString) {
        if (char === stringChar && fileContent[i - 1] !== '\\') {
          inString = false;
        }
        continue;
      }
      if (char === '"' || char === "'" || char === '`') {
        inString = true;
        stringChar = char;
        continue;
      }
      
      if (char === '(') parenCount++;
      if (char === ')') {
        parenCount--;
        if (parenCount === 0) {
          endIdx = i;
          break;
        }
      }
    }
    
    if (endIdx > startIdx) {
      const argText = fileContent.slice(startIdx, endIdx).trim();
      queries.push(argText);
    }
  }
  return queries;
}

function safeEvalObject(objText) {
  if (!objText) return null;
  if (!objText.startsWith('{') || !objText.endsWith('}')) {
    return null;
  }
  try {
    const sandbox = new Proxy({}, {
      has() { return true; },
      get(target, prop) {
        if (prop === 'Symbol(Symbol.toPrimitive)') return undefined;
        return `__DYNAMIC_${String(prop)}__`;
      }
    });
    const fn = new Function('sandbox', `with(sandbox) { return (${objText}); }`);
    return fn(sandbox);
  } catch (e) {
    console.warn('[ForgeWP Query Parser] safeEvalObject failed for:', objText, e.message);
    return null;
  }
}

function scanForQueries(themeRoot) {
  const srcDir = path.join(themeRoot, 'src');
  if (!existsSync(srcDir)) return [];

  const queries = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    const files = readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (/\.(js|jsx|ts|tsx)$/.test(file)) {
        const content = readFileSync(fullPath, 'utf8');
        if (content.includes('useWpQuery')) {
          const rawArgsList = extractUseWpQueryArgs(content);
          for (const rawArgs of rawArgsList) {
            if (!rawArgs) continue;
            const parsed = safeEvalObject(rawArgs);
            if (parsed && typeof parsed === 'object') {
              if (!parsed.postType) {
                parsed.postType = 'post';
              }
              if (!parsed.queryId) {
                const baseName = path.basename(file, path.extname(file));
                const postTypePart = String(parsed.postType).toLowerCase();
                const cleanBase = baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                parsed.queryId = cleanBase + '-' + postTypePart;
              }
              queries.push(parsed);
            }
          }
        }
      }
    }
  };

  walk(srcDir);

  const uniqueQueries = [];
  const seenIds = new Set();
  for (const q of queries) {
    const cleanId = q.queryId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!seenIds.has(cleanId)) {
      seenIds.add(cleanId);
      uniqueQueries.push(q);
    }
  }
  return uniqueQueries;
}
