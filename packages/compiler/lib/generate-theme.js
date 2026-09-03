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
import { createRequire } from 'node:module';
import { scanForEditableSchemas, scanForHydrationIslandsWithProps, resolveIslandChunk, scanAppProviders } from './hydration/index.js';
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
  buildPlaceholderPagePhp,
  buildBuilderPagePhp,
} from './php-builders.js';
import { collectFallbackPageRoutes } from './collect-static-routes.js';
import { buildFunctionsPhp } from './functions/index.js';
import { loadMenusData } from './functions/load-menus.js';
import { loadTranslationsData, translationsSourcePath } from './functions/load-translations.js';
import { lintFormsUsage } from './functions/forms.js';
import { buildSettingsPagePhp } from './functions/settings-page.js';
import { compileBlocks, warmupIconCache } from './blocks/index.js';
import { findHtmlTagEnd } from './blocks/shared-utils.js';
import { buildEditorIconRegistry, FORGEWP_DEFAULT_ICON_SLUGS } from './icon-registry.js';
import { scanAssetGraph, generatePreloadTags } from './assets/index.js';

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
 * @param {string} [options.headHtml]
 * @param {string} [options.singleHeadHtml]
 * @param {string} [options.singleHtml]
 * @param {string} [options.notFoundHtml]
 * @param {string} [options.archiveHtml]
 * @param {import('./types.js').ForgeWPBuildAssets} options.assets
 * @param {boolean} [options.strict] Fail export on editable from/pick issues
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
  assetGraph,
  strict = false,
}) {
  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
  }

  mkdirSync(outDir, { recursive: true });

  // Pre-warm the icon library cache asynchronously to speed up block transpilation
  await warmupIconCache(themeRoot);

  const schemas = scanForEditableSchemas(themeRoot);
  console.log(`[ForgeWP Compiler] Discovered colocated editable schemas for templates: ${Object.keys(schemas).join(', ') || '<none>'}`);

  // Real richText-ness per field key, from the actual editable schema type —
  // used by processMarkup instead of guessing from the key name (a field
  // like hero_subtitle declared as text() must not be wpautop-wrapped just
  // because its key happens to contain "subtitle").
  //
  // Different templates' schemas can independently reuse the same key name
  // (e.g. both front-page.ts and ber-uns-page.ts declare "hero_subtitle",
  // one as text() and the other as richText()) — a single flat, merged Set
  // would misclassify whichever template DIDN'T mean it as rich text. Where
  // the template is known, getRichTextKeysForSlug() below scopes the check
  // to that one schema. Where it isn't (shared header/footer/404/archive
  // markup), richTextFieldKeys excludes any key that's ambiguous across
  // templates — safer to under-format a rare cross-template collision than
  // to wpautop-wrap a plain field and break its styling.
  const richTextFieldKeysBySlug = {};
  const textOnlyKeysAnywhere = new Set();
  const richTextKeysAnywhere = new Set();
  for (const [slug, schema] of Object.entries(schemas)) {
    const slugSet = new Set();
    for (const [key, field] of Object.entries(schema)) {
      if (!field) continue;
      if (field.type === 'richText') {
        slugSet.add(key);
        richTextKeysAnywhere.add(key);
      } else if (field.type === 'text') {
        textOnlyKeysAnywhere.add(key);
      }
    }
    richTextFieldKeysBySlug[slug] = slugSet;
  }
  const richTextFieldKeys = new Set(
    [...richTextKeysAnywhere].filter((key) => !textOnlyKeysAnywhere.has(key)),
  );
  function getRichTextKeysForSlug(slug) {
    return richTextFieldKeysBySlug[slug] || richTextFieldKeys;
  }

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

  // Prefer cms/menus.ts (defineWpMenus); fall back to legacy cms/menus.json.
  const menus = loadMenusData(themeRoot);
  const loadedMenuLocations = Object.keys(menus).filter((k) => !k.startsWith('_'));
  if (loadedMenuLocations.length > 0) {
    console.log(`[ForgeWP Compiler] Nav menu locations: ${loadedMenuLocations.join(', ')}`);
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

  // Menu + routes.tsx paths that have no compiled template still need a WP page,
  // or redirect_canonical will steal similar CPT slugs (about → about-a-chair).
  let routesSource = '';
  const routesPath = path.join(themeRoot, 'src', 'app', 'routes.tsx');
  if (existsSync(routesPath)) {
    try {
      routesSource = readFileSync(routesPath, 'utf8');
    } catch {}
  }
  const fallbackPages = collectFallbackPageRoutes({
    menus,
    routesSource,
    existingSlugs: pagesToAutoCreate.map((p) => p.slug),
  });
  for (const page of fallbackPages) {
    pagesToAutoCreate.push(page);
  }
  if (fallbackPages.length > 0) {
    console.log(
      `[ForgeWP Compiler] Coming-next pages for unmatched routes: ${fallbackPages.map((p) => '/' + p.slug).join(', ')}`,
    );
  }

  const adapter = await loadFrameworkAdapter(config.frameworkAdapter);
  const scanForHydrationIslands =
    adapter.scanForHydrationIslands || adapter.default?.scanForHydrationIslands;

  const layoutProviders = scanAppProviders(themeRoot);
  const hydrationIslands = scanForHydrationIslands
    ? scanForHydrationIslands(themeRoot)
    : [];
  for (const provider of layoutProviders) {
    if (!hydrationIslands.includes(provider.kebab)) {
      hydrationIslands.push(provider.kebab);
    }
  }
  const hasHydration = hydrationIslands.length > 0;

  // Collect Smart Discovery islands (auto-detected interactive components with no explicit <Hydrate> wrapper)
  const detailedIslands = scanForHydrationIslandsWithProps(themeRoot);
  const autoIslands = detailedIslands.filter(i => i.smartDiscovered);

  /**
   * Post-process SSR HTML to convert data-forgewp-auto-island divs (injected by the
   * React.createElement patch in render-theme.mts) into proper data-forgewp-hydrate
   * hydration island wrappers that the browser micro-hydrator can activate.
   *
   * @param {string} html
   * @returns {string}
   */
  function injectAutoHydrationMarkers(html) {
    if (!html) return html;
    // Replace data-forgewp-auto-island="name" with data-forgewp-hydrate="name"
    // + trigger + data-forgewp-props. The real props (e.g. searchPlaceholder)
    // are carried by a render-theme.mts-emitted data-forgewp-auto-island-props
    // attribute on the SAME div.
    //
    // Can't find the tag's end with a naive `[^>]*"...">` regex: the props
    // attribute's JSON value can itself contain an already-embedded
    // `<?php ... ?>` snippet (e.g. a meta-value marker resolved earlier by
    // processMarkup), and PHP's own `?>` closer contains a literal `>` that
    // a bare negated-character-class scan can't tell apart from the real
    // tag-closing `>` — it would cut the match off mid-attribute. Reuse
    // findHtmlTagEnd (blocks/shared-utils.js), which already tracks
    // <?php ?> spans and quoted strings to find the tag's true end.
    // The SSR emits: <div data-forgewp-auto-island="hero-section" style="display:contents" data-forgewp-auto-island-props="{&quot;searchPlaceholder&quot;:&quot;...&quot;}">...</div>
    // We need:      <div data-forgewp-hydrate="hero-section" data-forgewp-trigger="visible" data-forgewp-props="{&quot;searchPlaceholder&quot;:&quot;...&quot;}" style="display:contents">...</div>
    const autoIslandMap = new Map(autoIslands.map(i => [i.name, i.trigger || 'visible']));
    const marker = 'data-forgewp-auto-island="';
    let result = '';
    let cursor = 0;
    while (true) {
      const markerIdx = html.indexOf(marker, cursor);
      if (markerIdx === -1) {
        result += html.slice(cursor);
        break;
      }
      const tagStart = html.lastIndexOf('<div', markerIdx);
      const tagEnd = tagStart !== -1 ? findHtmlTagEnd(html, tagStart) : -1;
      if (tagStart === -1 || tagEnd === -1) {
        // Shouldn't happen; skip past this occurrence rather than loop forever.
        result += html.slice(cursor, markerIdx + marker.length);
        cursor = markerIdx + marker.length;
        continue;
      }
      result += html.slice(cursor, tagStart);
      const attrsStr = html.slice(tagStart + 4, tagEnd); // strip leading "<div" and trailing ">"
      const kebabMatch = attrsStr.match(/data-forgewp-auto-island="([^"]+)"/);
      const kebab = kebabMatch ? kebabMatch[1] : '';
      const propsMatch = attrsStr.match(/data-forgewp-auto-island-props="([^"]*)"/);
      const propsValue = propsMatch ? propsMatch[1] : '{}';
      const trigger = autoIslandMap.get(kebab) || 'visible';
      const restAttrs = attrsStr
        .replace(/\s*data-forgewp-auto-island="[^"]*"/, '')
        .replace(/\s*data-forgewp-auto-island-props="[^"]*"/, '')
        .trim();
      result += `<div data-forgewp-hydrate="${kebab}" data-forgewp-trigger="${trigger}" data-forgewp-props="${propsValue}"${restAttrs ? ' ' + restAttrs : ''}>`;
      cursor = tagEnd + 1;
    }
    return result;
  }


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

  const manifestPath = path.join(themeRoot, 'dist', '.vite', 'manifest.json');
  let viteManifest = {};
  if (existsSync(manifestPath)) {
    try {
      viteManifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch (e) {
      console.warn('Failed to parse Vite manifest.json:', e.message);
    }
  }

  const replaceAssetPlaceholders = (markup) => {
    if (!markup) return '';
    return markup.replace(/__FORGEWP_ASSET__([a-zA-Z0-9_\-\.\/]+)/g, (match, srcPath) => {
      const manifestEntry = viteManifest[srcPath];
      if (manifestEntry && manifestEntry.file) {
        return `<?php echo esc_url( get_template_directory_uri() ); ?>/${manifestEntry.file}`;
      }
      return `<?php echo esc_url( get_template_directory_uri() ); ?>/${srcPath}`;
    });
  };

  let hydrationManifestJson = '{}';
  let hydrationData = null;
  if (hasHydration) {
    if (!existsSync(manifestPath)) {
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
      const resolvedChunk = resolveIslandChunk(viteManifest, island);
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

    const providerIdsJson = JSON.stringify(layoutProviders.map((p) => p.kebab));
    const hydratorScript = `(function () {
  const config = window.forgeWpHydration || { themeUri: "", manifest: {} };
  if (!config.providers) config.providers = ${providerIdsJson};
  const islands = document.querySelectorAll("[data-forgewp-hydrate]");

  function firstObservableBox(el) {
    if (!el || el.nodeType !== 1) return null;
    try {
      const display = window.getComputedStyle(el).display;
      if (display !== "contents") return el;
    } catch (e) {
      return el;
    }
    for (let i = 0; i < el.children.length; i++) {
      const found = firstObservableBox(el.children[i]);
      if (found) return found;
    }
    return null;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        let node = entry.target;
        while (node && typeof node.__forgewpHydrate !== "function") {
          node = node.parentElement;
        }
        if (node && typeof node.__forgewpHydrate === "function") {
          node.__forgewpHydrate();
        }
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
      const target = firstObservableBox(el);
      if (!target || (target === el && window.getComputedStyle(el).display === "contents")) {
        hydrate();
        return;
      }
      const rect = target.getBoundingClientRect();
      const vw = window.innerWidth || document.documentElement.clientWidth;
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (rect.bottom >= -200 && rect.right >= -200 && rect.top <= vh + 200 && rect.left <= vw + 200) {
        hydrate();
        return;
      }
      observer.observe(target);
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
    if (el.__forgewpHydrated) return;
    let parent = el.parentElement;
    while (parent) {
      if (parent.__forgewpHydrated) return;
      parent = parent.parentElement;
    }
    el.__forgewpHydrated = true;

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
        const Component = resolveExport(module, islandName);
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
          const backup = el.innerHTML;
          const needsProviders = el.getAttribute("data-forgewp-needs-providers") === "true";
          const providerReady = needsProviders ? loadProviderComponents() : Promise.resolve([]);
          providerReady.then(function (providerComponents) {
            const nextProps = Object.assign({}, props);
            if (el.getAttribute("data-forgewp-slot-children") === "true") {
              const ssrHtml = el.innerHTML;
              if (ssrHtml && String(ssrHtml).trim()) {
                nextProps.children = React.createElement("span", {
                  style: { display: "contents" },
                  dangerouslySetInnerHTML: { __html: ssrHtml },
                });
              }
            }
            let tree = React.createElement(Component, nextProps);
            for (let i = providerComponents.length - 1; i >= 0; i--) {
              tree = React.createElement(providerComponents[i], null, tree);
            }
            try {
              const root = ReactDOM.createRoot(el);
              root.render(tree);
            } catch (err) {
              el.innerHTML = backup;
              console.error("[ForgeWP Hydrator] Render failed for " + islandName + ", restored SSR HTML:", err);
            }
          }).catch(function (err) {
            el.innerHTML = backup;
            console.error("[ForgeWP Hydrator] Provider wrap failed for " + islandName + ":", err);
          });
        } else {
          console.error("[ForgeWP Hydration Error] React or ReactDOM not found on window. Ensure main.tsx exposes window.React and window.ReactDOM.");
        }
      })
      .catch((err) => {
        console.error("[ForgeWP Hydrator] Failed to load chunk for " + islandName + ":", err);
      });
  }

  function resolveExport(module, islandName) {
    if (!module || typeof module !== "object") return undefined;
    const pascalName = islandName
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join("");
    const camelName = pascalName.charAt(0).toLowerCase() + pascalName.slice(1);

    if (typeof module[pascalName] === "function") return module[pascalName];
    if (typeof module[camelName] === "function") return module[camelName];
    if (typeof module.default === "function") return module.default;

    const keys = Object.keys(module);
    for (let i = 0; i < keys.length; i++) {
      const val = module[keys[i]];
      if (typeof val === "function") {
        if (val.displayName === pascalName || val.name === pascalName) return val;
        if (val.displayName === camelName || val.name === camelName) return val;
      }
    }

    const cleanIsland = islandName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (k.toLowerCase() === cleanIsland && typeof module[k] === "function") {
        return module[k];
      }
    }

    const fnKeys = keys.filter(function (k) {
      return typeof module[k] === "function";
    });
    if (fnKeys.length === 1) return module[fnKeys[0]];

    const nonHooks = fnKeys.filter(function (k) {
      const fn = module[k];
      const fnName = fn.displayName || fn.name || k;
      return !/^use[A-Z]/.test(fnName);
    });
    if (nonHooks.length === 1) return module[nonHooks[0]];

    if (islandName.endsWith("-provider") || islandName.includes("provider")) {
      const provMatch = fnKeys.find(function (k) {
        const fnName = module[k].displayName || module[k].name || k;
        return /Provider$/i.test(fnName);
      });
      if (provMatch) return module[provMatch];
    }

    if (nonHooks.length > 0) return module[nonHooks[0]];
    if (fnKeys.length > 0) return module[fnKeys[0]];
    return undefined;
  }

  let providerComponentsPromise = null;
  function loadProviderComponents() {
    if (providerComponentsPromise) return providerComponentsPromise;
    const ids = config.providers || [];
    if (!ids.length) {
      providerComponentsPromise = Promise.resolve([]);
      return providerComponentsPromise;
    }
    providerComponentsPromise = Promise.all(ids.map(function (id) {
      const chunkPath = config.manifest && config.manifest[id];
      if (!chunkPath) return Promise.resolve(null);
      const scriptUrl = config.themeUri + "/assets/" + chunkPath.replace("assets/", "").replace("assets\\\\", "");
      return import(scriptUrl).then(function (module) {
        return resolveExport(module, id);
      }).catch(function (err) {
        console.error("[ForgeWP Hydrator] Failed to load provider " + id + ":", err);
        return null;
      });
    })).then(function (list) {
      return list.filter(function (fn) { return typeof fn === "function"; });
    });
    return providerComponentsPromise;
  }
})();`;

    writeFileSync(
      path.join(assetsOut, 'forgewp-hydrator.js'),
      hydratorScript,
      'utf8',
    );
    hydrationData = {
      mainJsFile,
      mapping,
    };
    hydrationManifestJson = JSON.stringify(hydrationData);

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

  // Load and merge keys from cms/translations.ts (preferred) or translations.json
  const transData = loadTranslationsData(themeRoot);
  for (const locale of Object.keys(transData)) {
    if (transData[locale] && typeof transData[locale] === 'object') {
      for (const key of Object.keys(transData[locale])) {
        i18nKeys.add(key);
      }
    }
  }

  // Fix nav links and split markup
  const processedApp = injectAutoHydrationMarkers(processMarkup(appHtml, config.textDomain, getRichTextKeysForSlug('front-page')));
  const processedHeader = injectAutoHydrationMarkers(processMarkup(headerHtml, config.textDomain, richTextFieldKeys));
  const processedFooter = injectAutoHydrationMarkers(processMarkup(footerHtml, config.textDomain, richTextFieldKeys));

  function extractCleanContent(markup, header, footer) {
    if (!markup) return '';
    const boundaryMatch = markup.match(/<forgewp-content-boundary\b[^>]*>([\s\S]*?)<\/forgewp-content-boundary>/i);
    let res = boundaryMatch ? boundaryMatch[1] : markup;

    // If the boundary wraps layout shells (header/main/footer), extract inner <main> content
    if (res.includes('<header') || res.includes('<footer') || res.includes('<main')) {
      const mainMatch = res.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
      if (mainMatch) {
        return mainMatch[1];
      }
    }

    if (header) {
      const replaced = res.replace(header, '');
      res = replaced !== res ? replaced : res.replace(/<header\b[^>]*>([\s\S]*?)<\/header>/i, '');
    }
    if (footer) {
      const replaced = res.replace(footer, '');
      res = replaced !== res ? replaced : res.replace(/<footer\b[^>]*>([\s\S]*?)<\/footer>/i, '');
    }
    return res;
  }

  // Extract content (App markup minus Header/Footer)
  let contentHtml = extractCleanContent(processedApp, processedHeader, processedFooter);
  contentHtml = contentHtml.replace(/<div\b[^>]*data-forgewp-hydrate="(navbar|site-header|site-footer)"[^>]*>\s*<\/div>/g, '');
  contentHtml = contentHtml.replace(/<\/?forgewp-content-boundary\b[^>]*>/gi, '');

  let cleanHeader = processedHeader.replace(/<\/?forgewp-content-boundary\b[^>]*>/gi, '');
  let cleanFooter = processedFooter.replace(/<\/?forgewp-content-boundary\b[^>]*>/gi, '');

  // Process single post template if exists
  let processedSingle = '';
  if (singleHtml) {
    processedSingle = injectAutoHydrationMarkers(processMarkup(singleHtml, config.textDomain, richTextFieldKeys));
    processedSingle = extractCleanContent(processedSingle, processedHeader, processedFooter);
    processedSingle = processedSingle.replace(/<div\b[^>]*data-forgewp-hydrate="(navbar|site-header|site-footer)"[^>]*>\s*<\/div>/g, '');
    processedSingle = processedSingle.replace(/<\/?forgewp-content-boundary\b[^>]*>/gi, '');
  }

  // Process 404 template if exists
  let processedNotFound = '';
  if (notFoundHtml) {
    processedNotFound = injectAutoHydrationMarkers(processMarkup(notFoundHtml, config.textDomain, richTextFieldKeys));
    processedNotFound = extractCleanContent(processedNotFound, processedHeader, processedFooter);
    processedNotFound = processedNotFound.replace(/<div\b[^>]*data-forgewp-hydrate="(navbar|site-header|site-footer)"[^>]*>\s*<\/div>/g, '');
    processedNotFound = processedNotFound.replace(/<\/?forgewp-content-boundary\b[^>]*>/gi, '');
  }

  const staticDir = path.join(outDir, 'forgewp-static');
  mkdirSync(staticDir, { recursive: true });
  writeFileSync(path.join(staticDir, 'content.html'), replaceAssetPlaceholders(contentHtml), 'utf8');
  writeFileSync(path.join(staticDir, 'header.html'), replaceAssetPlaceholders(cleanHeader), 'utf8');
  writeFileSync(path.join(staticDir, 'footer.html'), replaceAssetPlaceholders(cleanFooter), 'utf8');
  if (headHtml) {
    writeFileSync(path.join(staticDir, 'head.html'), replaceAssetPlaceholders(headHtml), 'utf8');
  }
  if (singleHeadHtml) {
    writeFileSync(
      path.join(staticDir, 'single-head.html'),
      replaceAssetPlaceholders(singleHeadHtml),
      'utf8',
    );
  }
  if (processedSingle) {
    writeFileSync(path.join(staticDir, 'single.html'), replaceAssetPlaceholders(processedSingle), 'utf8');
  }
  if (processedNotFound) {
    writeFileSync(path.join(staticDir, '404.html'), replaceAssetPlaceholders(processedNotFound), 'utf8');
  }

  // Archive page (category / tag / date archives)
  let processedArchive = '';
  if (archiveHtml) {
    processedArchive = injectAutoHydrationMarkers(processMarkup(archiveHtml, config.textDomain, richTextFieldKeys));
    processedArchive = extractCleanContent(processedArchive, processedHeader, processedFooter);
    processedArchive = processedArchive.replace(/<div\b[^>]*data-forgewp-hydrate="(navbar|site-header|site-footer)"[^>]*>\s*<\/div>/g, '');
    processedArchive = processedArchive.replace(/<\/?forgewp-content-boundary\b[^>]*>/gi, '');
    writeFileSync(
      path.join(staticDir, 'archive.html'),
      replaceAssetPlaceholders(processedArchive),
      'utf8',
    );
  }

  // Dynamic Gutenberg blocks compilation (Phase 5)
  // Pass strict so from/pick issues fail export only when `forgewp export --strict`
  const compiledBlocks = compileBlocks(themeRoot, outDir, { strict: !!strict });

  const iconRegistryJson = JSON.stringify(buildEditorIconRegistry());
  const defaultIconSlugsJson = JSON.stringify(FORGEWP_DEFAULT_ICON_SLUGS);

  const editorScriptContent = `
const { registerBlockType } = wp.blocks;
const { createElement, useState, Fragment } = wp.element;
const { InspectorControls, useBlockProps, MediaUpload, URLInput, InnerBlocks, useInnerBlocksProps } = wp.blockEditor;
const { PanelBody, TextControl, ToggleControl, SelectControl, RangeControl, Placeholder, Spinner, Button, ColorPalette, BaseControl } = wp.components;
const ServerSideRender = wp.serverSideRender?.default || wp.serverSideRender;

// Set only inside the block editor's customEditJsx preview environment — never true on
// the real frontend. Components can check this to distinguish "genuinely no results" from
// "this is just the editor preview, which can't run a real fetch" — e.g. rendering a
// loading skeleton instead of an empty-state message when useWpQuery's stub can only ever
// return an empty result set.
window.forgeWpIsEditorPreview = true;

// Curated Lucide SVG registry for icon fields + <WpIcon /> in the canvas
window.forgeWpIconRegistry = ${iconRegistryJson};
window.forgeWpDefaultIconSlugs = ${defaultIconSlugsJson};

function forgeWpApplyIconClass(svg, className) {
    if (!svg) return '';
    if (!className) return svg;
    if (/\\sclass="/.test(svg)) {
        return svg.replace(/\\sclass="([^"]*)"/, function(_, existing) {
            return ' class="' + existing + ' ' + className + '"';
        });
    }
    return svg.replace('<svg ', '<svg class="' + className + '" ');
}

function forgeWpRenderIcon(name, className, provider) {
    provider = provider || 'lucide';
    var slug = (name == null ? '' : String(name)).replace(/^dashicons-/, '');
    var registry = window.forgeWpIconRegistry || {};
    // Prefer provider-scoped key when present, then bare slug (lucide curated set)
    var svg = registry[provider + ':' + slug] || registry[slug] || registry[name] || '';
    if (svg && provider !== 'dashicons') {
        var html = forgeWpApplyIconClass(svg, className || '');
        return createElement('span', {
            className: 'forgewp-icon forgewp-icon--' + slug,
            style: { display: 'inline-flex', lineHeight: 0 },
            dangerouslySetInnerHTML: { __html: html }
        });
    }
    // Dashicons (explicit provider or fallback when SVG missing) — always available in wp-admin
    return createElement('span', {
        className: ('dashicons dashicons-' + slug + (className ? ' ' + className : '')).trim(),
        title: provider && provider !== 'lucide' && provider !== 'dashicons'
            ? ('Provider "' + provider + '" not in editor registry — showing dashicons fallback')
            : undefined,
        'aria-hidden': true
    });
}

function ForgeWpIconPicker({ value, onChange, options, label, provider }) {
    var slugs = Array.isArray(options) && options.length
        ? options.map(function(o) { return typeof o === 'string' ? o : (o && o.value); }).filter(Boolean)
        : (window.forgeWpDefaultIconSlugs || Object.keys(window.forgeWpIconRegistry || {}));
    var current = value || slugs[0] || 'star';
    return createElement(BaseControl, { label: label || 'Icon', className: 'forgewp-icon-picker' },
        createElement('div', {
            style: {
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
                gap: '6px',
                maxHeight: '180px',
                overflowY: 'auto',
                padding: '4px',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                background: '#fff'
            }
        },
            slugs.map(function(slug) {
                var selected = slug === current;
                return createElement('button', {
                    key: slug,
                    type: 'button',
                    title: slug,
                    onClick: function() { onChange(slug); },
                    style: {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        aspectRatio: '1',
                        padding: '6px',
                        border: selected ? '2px solid #2271b1' : '1px solid #ddd',
                        borderRadius: '4px',
                        background: selected ? '#f0f6fc' : '#fafafa',
                        cursor: 'pointer'
                    }
                }, forgeWpRenderIcon(slug, 'w-5 h-5', provider || 'lucide'));
            })
        ),
        createElement('p', {
            style: { margin: '6px 0 0', fontSize: '11px', color: '#646970' }
        }, 'Selected: ' + current)
    );
}

// Stub implementations for every hook exported by .forgewp/wordpress.tsx, so that
// arbitrary component code inlined into customEditJsx (via expandNestedComponentTags)
// can execute in the block editor's preview without throwing "X is not defined".
// Keep this list in sync with wordpress.tsx's exported useWp* hooks — a component using
// any hook missing here will crash its editor preview with a ReferenceError.
const useWpLocation = () => ['/', () => {}, () => {}];
const useWpTerms = () => ({ terms: [], loading: false });
const useWpI18n = () => ({ __: (s) => s });
// Free __ for inlined JSX that calls __(s) without a local destructure.
const __ = (s) => s;
const useWpPagePath = (name, fallback) => fallback || '/';
const useWpPageLink = (name, fallback) => fallback || '/';
const useWpQuery = () => ({ posts: [], total: 0, loading: false });
const useWpMeta = (key, fallback, postId) => fallback;
const useWpOption = (name, fallback) => fallback || '';
const useWpThemeMod = (name, fallback) => fallback || '';
const useWpThemeUri = () => '';
const useWpSearch = () => '';
const useWpSearchParams = () => new URLSearchParams();
const useWpTitle = () => '';
const useWpContent = () => '';
const useWpExcerpt = () => '';
const useWpPermalink = () => '#';
const useWpDate = () => '';
const useWpModifiedDate = () => '';
const useWpAuthor = () => '';
const useWpFeaturedImage = () => '';
const useWpCustomField = (name, fallback) => fallback || '';
const useWpField = (name, fallback) => fallback || '';
const useWpArchiveTitle = () => '';
const useWpCategories = () => '';
const useWpTaxonomyList = (taxonomy, fallback) => fallback || '';
const useWpMenu = (location) => ({ items: [], loading: false });
const useWpPrefetch = () => (to) => {};
const useWpLanguage = () => ({
    currentLanguage: ${JSON.stringify(
      config.i18n?.defaultLocale || (Array.isArray(config.i18n?.locales) && config.i18n.locales[0]) || 'en',
    )},
    languages: ${JSON.stringify(
      Array.isArray(config.i18n?.locales) && config.i18n.locales.length > 0 ? config.i18n.locales : ['en'],
    )},
    homeUrl: '/',
    urls: {},
    homeUrls: {},
    switchLanguage: () => {},
});
// Public ForgeWP helpers — prefer these over reading window.forgeWpIsEditorPreview directly.
const isEditorPreview = () => typeof window !== 'undefined' && !!window.forgeWpIsEditorPreview;
const useIsEditorPreview = () => isEditorPreview();

const WpLink = (props) => {
    // Inside the Gutenberg block editor canvas, a real navigation would take
    // the admin away from wp-admin entirely (and can 404 if the resolved
    // href doesn't correspond to a real page yet) — intercept the click so
    // any WpEditable content nested inside can still be clicked for inline
    // editing without the link itself firing a real page navigation.
    if (isEditorPreview()) {
        return createElement('a', Object.assign({}, props, {
            onClick: function (e) { e.preventDefault(); }
        }));
    }
    return createElement('a', props);
};

/**
 * Build a blank row object from a repeater field schema (editor metadata).
 */
function forgeWpBlankRepeaterRow(fields) {
    const row = {};
    const schema = fields || {};
    Object.keys(schema).forEach((subKey) => {
        const sub = schema[subKey] || {};
        if (sub.default !== undefined) {
            row[subKey] = sub.default;
        } else if (sub.control === 'image' || sub.type === 'object') {
            row[subKey] = '';
        } else if (sub.control === 'icon') {
            row[subKey] = 'star';
        } else if (sub.control === 'toggle' || sub.type === 'boolean') {
            row[subKey] = false;
        } else if (sub.control === 'number' || sub.type === 'number') {
            row[subKey] = sub.min != null ? sub.min : 0;
        } else if (sub.control === 'repeater' || sub.type === 'array') {
            row[subKey] = [];
        } else {
            row[subKey] = '';
        }
    });
    return row;
}

/**
 * Sidebar repeater control.
 * - mode: 'fixed'   → edit subfields only (no add/remove/reorder of cardinality)
 * - mode: 'dynamic' → add / remove / move up / move down within min/max
 * Canvas remains responsible for visual text via WpEditable.
 */
function ForgeWpRepeaterControl({ attrKey, config, attributes, setAttributes }) {
    const label = config.label || attrKey;
    const mode = config.mode === 'fixed' ? 'fixed' : 'dynamic';
    const fields = config.fields || {};
    const fieldKeys = Object.keys(fields);
    const defaults = Array.isArray(config.default) ? config.default : [];
    const rows = Array.isArray(attributes[attrKey]) ? attributes[attrKey] : defaults.slice();
    const fixedCount = defaults.length > 0 ? defaults.length : rows.length;
    const minRows = mode === 'fixed'
        ? fixedCount
        : (typeof config.min === 'number' ? config.min : 0);
    const maxRows = mode === 'fixed'
        ? fixedCount
        : (typeof config.max === 'number' ? config.max : Infinity);

    const commit = (next) => {
        let clamped = Array.isArray(next) ? next.slice() : [];
        if (mode === 'fixed') {
            // Lock cardinality to default length when known
            if (fixedCount > 0) {
                while (clamped.length < fixedCount) clamped.push(forgeWpBlankRepeaterRow(fields));
                if (clamped.length > fixedCount) clamped = clamped.slice(0, fixedCount);
            }
        } else {
            if (clamped.length < minRows) {
                while (clamped.length < minRows) clamped.push(forgeWpBlankRepeaterRow(fields));
            }
            if (clamped.length > maxRows) clamped = clamped.slice(0, maxRows);
        }
        setAttributes({ [attrKey]: clamped });
    };

    const updateCell = (index, subKey, value) => {
        commit(rows.map((r, i) => (i === index ? Object.assign({}, r, { [subKey]: value }) : r)));
    };

    const addRow = () => {
        if (mode !== 'dynamic' || rows.length >= maxRows) return;
        commit(rows.concat([forgeWpBlankRepeaterRow(fields)]));
    };

    const removeRow = (index) => {
        if (mode !== 'dynamic' || rows.length <= minRows) return;
        commit(rows.filter((_, i) => i !== index));
    };

    const moveRow = (index, delta) => {
        if (mode !== 'dynamic') return;
        const target = index + delta;
        if (target < 0 || target >= rows.length) return;
        const next = rows.slice();
        const tmp = next[index];
        next[index] = next[target];
        next[target] = tmp;
        commit(next);
    };

    const rowLabel = (row, index) => {
        for (const k of fieldKeys) {
            const v = row && row[k];
            if (typeof v === 'string' && v.trim()) return v.trim().slice(0, 40);
            if (v && typeof v === 'object' && v.url) return String(v.url).slice(0, 40);
        }
        return 'Item ' + (index + 1);
    };

    const renderSubField = (row, index, subKey) => {
        const sub = fields[subKey] || {};
        const subLabel = sub.label || subKey;
        const control = sub.control || (sub.type === 'boolean' ? 'toggle' : sub.type === 'number' ? 'number' : sub.type === 'object' ? 'image' : 'text');
        const value = row ? row[subKey] : undefined;

        if (control === 'image') {
            const url = typeof value === 'string' ? value : (value && value.url) || '';
            const mediaId = value && typeof value === 'object' ? value.id : undefined;
            return createElement(BaseControl, { label: subLabel, key: subKey },
                createElement(MediaUpload, {
                    onSelect: (media) => updateCell(index, subKey, media.url || ''),
                    allowedTypes: ['image'],
                    value: mediaId,
                    render: ({ open }) => createElement('div', null,
                        url
                            ? createElement('img', {
                                src: url,
                                style: { maxWidth: '100%', marginBottom: '8px', display: 'block', borderRadius: '4px' }
                            })
                            : null,
                        createElement('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
                            createElement(Button, { onClick: open, variant: 'secondary', isSmall: true },
                                url ? 'Replace Image' : 'Select Image'
                            ),
                            url
                                ? createElement(Button, {
                                    onClick: () => updateCell(index, subKey, ''),
                                    variant: 'link',
                                    isDestructive: true,
                                    isSmall: true
                                }, 'Remove')
                                : null
                        )
                    )
                })
            );
        }

        if (control === 'toggle') {
            return createElement(ToggleControl, {
                key: subKey,
                label: subLabel,
                checked: !!value,
                onChange: (val) => updateCell(index, subKey, val)
            });
        }

        if (control === 'number') {
            return createElement(RangeControl, {
                key: subKey,
                label: subLabel,
                value: typeof value === 'number' ? value : (sub.min || 0),
                onChange: (val) => updateCell(index, subKey, val),
                min: sub.min != null ? sub.min : 0,
                max: sub.max != null ? sub.max : 100
            });
        }

        if (control === 'select') {
            return createElement(SelectControl, {
                key: subKey,
                label: subLabel,
                value: value || '',
                options: (sub.options || []).map((opt) =>
                    typeof opt === 'string' ? { label: opt, value: opt } : opt
                ),
                onChange: (val) => updateCell(index, subKey, val)
            });
        }

        if (control === 'color') {
            return createElement(BaseControl, { label: subLabel, key: subKey },
                createElement(ColorPalette, {
                    value: value || '',
                    onChange: (val) => updateCell(index, subKey, val || '')
                })
            );
        }

        if (control === 'icon') {
            return createElement(ForgeWpIconPicker, {
                key: subKey,
                label: subLabel,
                value: value || sub.default || 'star',
                options: sub.options,
                provider: sub.provider || 'lucide',
                onChange: (val) => updateCell(index, subKey, val)
            });
        }

        // text, richText, url, default
        return createElement(TextControl, {
            key: subKey,
            label: subLabel,
            value: value == null ? '' : String(value),
            type: control === 'url' ? 'url' : 'text',
            onChange: (val) => updateCell(index, subKey, val)
        });
    };

    const helpText = mode === 'fixed'
        ? ('Fixed list (' + rows.length + ' item' + (rows.length === 1 ? '' : 's') + '). Edit fields below or inline on the canvas.')
        : (
            'Dynamic list' +
            (minRows > 0 ? ' · min ' + minRows : '') +
            (maxRows !== Infinity ? ' · max ' + maxRows : '') +
            '. Reorder with ↑/↓. Text is also editable on the canvas.'
        );

    return createElement('div', {
        key: attrKey,
        style: { display: 'flex', flexDirection: 'column', gap: '12px' }
    },
        createElement('p', {
            style: { margin: 0, fontSize: '12px', color: '#646970' }
        }, helpText),
        rows.map((row, index) =>
            createElement('div', {
                key: index,
                style: {
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    padding: '10px',
                    background: '#fafafa'
                }
            },
                createElement('div', {
                    style: {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        marginBottom: '8px'
                    }
                },
                    createElement('strong', {
                        style: { fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }
                    }, rowLabel(row, index)),
                    mode === 'dynamic'
                        ? createElement('div', { style: { display: 'flex', gap: '4px', flexShrink: 0 } },
                            createElement(Button, {
                                icon: 'arrow-up-alt2',
                                label: 'Move up',
                                isSmall: true,
                                disabled: index === 0,
                                onClick: () => moveRow(index, -1)
                            }),
                            createElement(Button, {
                                icon: 'arrow-down-alt2',
                                label: 'Move down',
                                isSmall: true,
                                disabled: index >= rows.length - 1,
                                onClick: () => moveRow(index, 1)
                            }),
                            createElement(Button, {
                                icon: 'trash',
                                label: 'Remove',
                                isSmall: true,
                                isDestructive: true,
                                disabled: rows.length <= minRows,
                                onClick: () => removeRow(index)
                            })
                        )
                        : null
                ),
                fieldKeys.map((subKey) => renderSubField(row, index, subKey))
            )
        ),
        mode === 'dynamic'
            ? createElement(Button, {
                variant: 'secondary',
                onClick: addRow,
                disabled: rows.length >= maxRows,
                style: { alignSelf: 'flex-start' }
            }, '+ Add ' + (label.replace(/s$/i, '') || 'item'))
            : null
    );
}

if (window.forgeWpBlocks) {
    window.forgeWpBlocks.forEach(block => {
        registerBlockType(block.name, {
            title: block.title,
            icon: block.icon,
            category: block.category,
            description: block.description || '',
            example: block.example || undefined,
            attributes: block.attributes,
            edit: function(props) {
                const { attributes, setAttributes } = props;

                // ── Parent shell: layout chrome + InnerBlocks ───────────────
                // Children stay independently insertable unless they declare WP parent.
                if (block.isParentShell && block.innerBlocks) {
                    const shellClass = ((block.shell && block.shell.className) || '').trim();
                    const gridClass = ((block.shell && block.shell.gridClassName) || '').trim();
                    const outerClass = ('forgewp-block-shell ' + shellClass).trim();
                    const innerClass = ('forgewp-block-shell__grid ' + gridClass).trim();
                    const blockProps = useBlockProps({ className: outerClass });
                    const ibConfig = {
                        allowedBlocks: block.innerBlocks.allowedBlocks,
                        template: block.innerBlocks.template,
                        templateLock: block.innerBlocks.templateLock,
                        orientation: block.innerBlocks.orientation || 'horizontal',
                    };
                    if (typeof useInnerBlocksProps === 'function') {
                        const innerProps = useInnerBlocksProps(
                            { className: innerClass, style: { minWidth: 0 } },
                            ibConfig
                        );
                        return createElement('div', blockProps, createElement('div', innerProps));
                    }
                    // Older WP fallback
                    return createElement('div', blockProps,
                        createElement('div', { className: innerClass, style: { minWidth: 0 } },
                            createElement(InnerBlocks, ibConfig)
                        )
                    );
                }

                const blockProps = useBlockProps();

                // Scalar / simple controls (sidebar). Repeaters get their own PanelBody.
                const simpleControls = Object.entries(block.attributes || {})
                    .filter(([key, config]) => key !== 'align' && config.control !== 'repeater')
                    .map(([key, config]) => {
                        const label = config.label || (key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()));
                        const control = config.control || 'text';

                        switch (control) {
                            case 'color':
                                return createElement(BaseControl, { label: label, key: key },
                                    createElement(ColorPalette, {
                                        value: attributes[key],
                                        onChange: (val) => setAttributes({ [key]: val })
                                    })
                                );

                            case 'image':
                                return createElement(BaseControl, { label: label, key: key },
                                    createElement(MediaUpload, {
                                        onSelect: (media) => setAttributes({
                                            [key]: { id: media.id, url: media.url, alt: media.alt || '' }
                                        }),
                                        allowedTypes: ['image'],
                                        value: attributes[key]?.id,
                                        render: ({ open }) => createElement('div', null,
                                            attributes[key]?.url
                                                ? createElement('img', {
                                                    src: attributes[key].url,
                                                    style: { maxWidth: '100%', marginBottom: '8px', display: 'block' }
                                                })
                                                : null,
                                            createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                                                createElement(Button, {
                                                    onClick: open,
                                                    variant: 'secondary'
                                                }, attributes[key]?.url ? 'Replace Image' : 'Select Image'),
                                                attributes[key]?.url
                                                    ? createElement(Button, {
                                                        onClick: () => setAttributes({ [key]: null }),
                                                        variant: 'link',
                                                        isDestructive: true,
                                                        style: { color: '#cc1818', textDecoration: 'none' }
                                                    }, 'Remove Image')
                                                    : null
                                            )
                                        )
                                    })
                                );

                            case 'url':
                                return createElement(TextControl, {
                                    key: key,
                                    label: label,
                                    value: attributes[key] || '',
                                    onChange: (val) => setAttributes({ [key]: val }),
                                    type: 'url'
                                });

                            case 'toggle':
                                return createElement(ToggleControl, {
                                    key: key,
                                    label: label,
                                    checked: !!attributes[key],
                                    onChange: (val) => setAttributes({ [key]: val })
                                });

                            case 'select':
                                return createElement(SelectControl, {
                                    key: key,
                                    label: label,
                                    value: attributes[key],
                                    options: (config.options || []).map(opt =>
                                        typeof opt === 'string' ? { label: opt, value: opt } : opt
                                    ),
                                    onChange: (val) => setAttributes({ [key]: val })
                                });

                            case 'number':
                                return createElement(RangeControl, {
                                    key: key,
                                    label: label,
                                    value: attributes[key] || 0,
                                    onChange: (val) => setAttributes({ [key]: val }),
                                    min: config.min || 0,
                                    max: config.max || 100
                                });

                            case 'icon':
                                return createElement(ForgeWpIconPicker, {
                                    key: key,
                                    label: label,
                                    value: attributes[key] || config.default || 'star',
                                    options: config.options,
                                    provider: config.provider || 'lucide',
                                    onChange: (val) => setAttributes({ [key]: val })
                                });

                            case 'richText':
                            case 'text':
                            default:
                                return createElement(TextControl, {
                                    key: key,
                                    label: label,
                                    value: attributes[key] || '',
                                    onChange: (val) => setAttributes({ [key]: val })
                                });
                        }
                    });

                const repeaterPanels = Object.entries(block.attributes || {})
                    .filter(([key, config]) => key !== 'align' && config.control === 'repeater')
                    .map(([key, config]) => {
                        const panelTitle = config.label || (key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()));
                        return createElement(PanelBody, {
                            title: panelTitle,
                            initialOpen: true,
                            key: 'repeater-' + key
                        },
                            createElement(ForgeWpRepeaterControl, {
                                attrKey: key,
                                config: config,
                                attributes: attributes,
                                setAttributes: setAttributes
                            })
                        );
                    });

                const inspector = (simpleControls.length > 0 || repeaterPanels.length > 0)
                    ? createElement(InspectorControls, null,
                        simpleControls.length > 0
                            ? createElement(PanelBody, { title: 'Block Settings', initialOpen: true }, simpleControls)
                            : null,
                        ...repeaterPanels
                    )
                    : null;

                if (block.customEditJsx) {
                    try {
                        // editorScope: serializable free vars (defaults, SECTION_PADDING_Y, …)
                        // bound as Function parameters so the IIFE can close over them even if
                        // string-level injections were missing.
                        const editorScope = (block.editorScope && typeof block.editorScope === 'object')
                            ? Object.assign({}, block.editorScope)
                            : {};
                        // Always ensure defaults exists so "defaults is not defined" cannot surface.
                        if (typeof editorScope.defaults === 'undefined') {
                            editorScope.defaults = {};
                        }
                        const baseParamNames = [
                            'React', 'props', 'createElement', 'useBlockProps', 'attributes', 'setAttributes', 'blockProps',
                            'useWpLocation', 'useWpTerms', 'useWpI18n', '__', 'useWpPagePath', 'useWpPageLink', 'useWpQuery', 'useWpMeta', 'useWpOption',
                            'useWpThemeMod', 'useWpThemeUri', 'useWpSearch', 'useWpSearchParams', 'useWpTitle', 'useWpContent', 'useWpExcerpt',
                            'useWpPermalink', 'useWpDate', 'useWpModifiedDate', 'useWpAuthor', 'useWpFeaturedImage', 'useWpCustomField', 'useWpField',
                            'useWpArchiveTitle', 'useWpCategories', 'useWpTaxonomyList', 'useWpMenu', 'useWpPrefetch', 'useWpLanguage', 'WpLink',
                            'isEditorPreview', 'useIsEditorPreview', 'forgeWpRenderIcon', 'WpIcon'
                        ];
                        // Never shadow the fixed hook/param names.
                        const baseParamSet = {};
                        for (let bi = 0; bi < baseParamNames.length; bi++) baseParamSet[baseParamNames[bi]] = true;
                        const scopeKeys = Object.keys(editorScope).filter(function(k) {
                            return /^[A-Za-z_$][\w$]*$/.test(k) && !baseParamSet[k];
                        });
                        const scopeVals = scopeKeys.map(function(k) { return editorScope[k]; });
                        // Bind scope keys as outer parameters. Inner IIFE may also declare
                        // the same names with var/const — nested scopes are fine; free vars
                        // resolve to these parameters via closure.
                        const renderFn = new Function(
                            ...baseParamNames,
                            ...scopeKeys,
                            'return ' + block.customEditJsx
                        );
                        const WpIcon = function(p) {
                            return forgeWpRenderIcon(p && p.name, p && (p.className || p.class), p && p.provider);
                        };
                        const element = renderFn(
                            wp.element, props, createElement, useBlockProps, attributes, setAttributes, blockProps,
                            useWpLocation, useWpTerms, useWpI18n, __, useWpPagePath, useWpPageLink, useWpQuery, useWpMeta, useWpOption,
                            useWpThemeMod, useWpThemeUri, useWpSearch, useWpSearchParams, useWpTitle, useWpContent, useWpExcerpt,
                            useWpPermalink, useWpDate, useWpModifiedDate, useWpAuthor, useWpFeaturedImage, useWpCustomField, useWpField,
                            useWpArchiveTitle, useWpCategories, useWpTaxonomyList, useWpMenu, useWpPrefetch, useWpLanguage, WpLink,
                            isEditorPreview, useIsEditorPreview, forgeWpRenderIcon, WpIcon,
                            ...scopeVals
                        );
                        return createElement('div', blockProps,
                            inspector,
                            element
                        );
                    } catch (e) {
                        console.error("[ForgeWP Editor] Custom edit render failed for block " + block.name + ":", e);
                        return createElement('div', blockProps, 'Render Error: ' + e.message);
                    }
                }

                return createElement('div', blockProps,
                    inspector,
                    createElement(ServerSideRender, {
                        block: block.name,
                        attributes: attributes
                    })
                );
            },
            save: function() {
                // Parent shells must persist InnerBlocks markup; leaf blocks stay fully dynamic.
                if (block.isParentShell) {
                    return createElement(InnerBlocks.Content);
                }
                return null;
            }
        });
    });
}

// ── ForgeWP Page Settings — "Hide page title" toggle ─────────────────────────
// Lives in the Document sidebar for Pages. Backed by the '_forgewp_hide_title'
// post meta field (registered in functions.php), read by page.php and
// template-forgewp-builder.php so both templates respect the same setting.
(function () {
    if (!window.wp || !window.wp.plugins || !window.wp.data || !window.wp.coreData) return;
    const { registerPlugin } = wp.plugins;
    const PluginDocumentSettingPanel =
        (wp.editor && wp.editor.PluginDocumentSettingPanel) ||
        (wp.editPost && wp.editPost.PluginDocumentSettingPanel);
    if (!PluginDocumentSettingPanel) return;

    const { CheckboxControl } = wp.components;
    const { useEntityProp } = wp.coreData;
    const { useSelect } = wp.data;
    const { createElement: el } = wp.element;

    function ForgeWpPageSettings() {
        const postType = useSelect(function (select) {
            return select('core/editor').getCurrentPostType();
        }, []);

        const [meta, setMeta] = useEntityProp('postType', postType || 'page', 'meta');

        if (postType !== 'page') return null;

        // Default checked when meta is unset (matches PHP + register_post_meta default).
        const hideTitle = meta && Object.prototype.hasOwnProperty.call(meta, '_forgewp_hide_title')
            ? !!meta._forgewp_hide_title
            : true;

        return el(
            PluginDocumentSettingPanel,
            { name: 'forgewp-page-settings', title: 'ForgeWP Page Settings', className: 'forgewp-page-settings' },
            el(CheckboxControl, {
                label: 'Hide page title',
                help: 'On by default for ForgeWP layouts. Uncheck to show the core page title. Applies on Default and ForgeWP Builder templates.',
                checked: hideTitle,
                onChange: function (value) {
                    setMeta(Object.assign({}, meta || {}, { _forgewp_hide_title: value }));
                },
            })
        );
    }

    registerPlugin('forgewp-page-settings', { render: ForgeWpPageSettings });
})();
`;
  writeFileSync(
    path.join(outDir, 'assets', 'forgewp-editor.js'),
    editorScriptContent,
    'utf8',
  );

  writeFileSync(path.join(outDir, 'style.css'), buildStyleCss(config), 'utf8');

  if (!hydrationData && hasHydration) {
    try {
      hydrationData = JSON.parse(hydrationManifestJson);
    } catch {}
  }

  const queries = scanForQueries(themeRoot);
  console.log(`[ForgeWP Compiler] Scanned and compiled ${queries.length} REST endpoints: ${queries.map(q => q.queryId).join(', ') || '<none>'}`);

  const WP_CORE_OPTIONS = new Set([
    'siteurl', 'blogname', 'blogdescription', 'admin_email', 'blogpublic',
    'default_role', 'timezone_string', 'date_format', 'time_format',
    'start_of_week', 'permalink_structure', 'upload_path', 'upload_url_path',
    'posts_per_page', 'posts_per_rss', 'comments_notify', 'moderation_notify',
    'comment_moderation', 'require_name_email', 'thread_comments',
    'thread_comments_depth', 'page_comments', 'default_comments_page',
    'comment_order', 'comments_per_page', 'default_ping_status',
    'default_comment_status', 'show_on_front', 'page_on_front',
    'page_for_posts', 'rss_use_excerpt', 'mailserver_url', 'mailserver_login',
    'mailserver_pass', 'mailserver_port', 'active_plugins', 'template',
    'stylesheet', 'woocommerce_shop_page_id',
  ]);

  const wpOptions = [];
  if (config.options && typeof config.options === 'object') {
    for (const [name, field] of Object.entries(config.options)) {
      if (WP_CORE_OPTIONS.has(name)) continue;

      const label = field.label || name
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());

      wpOptions.push({
        name,
        label,
        defaultValue: field.default || '',
        postType: field._type === 'postPicker' ? (field.postType || 'post') : null,
      });
    }
  }

  if (wpOptions.length > 0) {
    console.log(`[ForgeWP Compiler] Detected ${wpOptions.length} site option(s) via config.options: ${wpOptions.map(o => o.name).join(', ')}`);
  }

  // The Theme Options post-picker field (optionPostPicker) uses Select2 for its AJAX
  // search dropdown. WordPress core does NOT ship a public 'select2' script/style handle,
  // so we vendor our own copy into the exported theme rather than relying on one.
  if (wpOptions.some(o => o.postType)) {
    try {
      const vendorRequire = createRequire(import.meta.url);
      const select2JsPath = vendorRequire.resolve('select2/dist/js/select2.min.js');
      const select2CssPath = vendorRequire.resolve('select2/dist/css/select2.min.css');
      const select2VendorOut = path.join(assetsOut, 'vendor', 'select2');
      mkdirSync(select2VendorOut, { recursive: true });
      copyFileSync(select2JsPath, path.join(select2VendorOut, 'select2.min.js'));
      copyFileSync(select2CssPath, path.join(select2VendorOut, 'select2.min.css'));
    } catch (err) {
      console.warn(`[ForgeWP Compiler] Failed to vendor select2 assets for the Theme Options post-picker: ${err.message}`);
    }
  }

  let functionsPhpContent;
  try {
    functionsPhpContent = buildFunctionsPhp(
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
      wpOptions,
    );
  } catch (error) {
    console.error("CRITICAL ERROR in buildFunctionsPhp:", error.stack);
    throw error;
  }

  try {
    lintFormsUsage(themeRoot, config);
  } catch (error) {
    console.warn(`[ForgeWP Compiler] Forms usage lint failed to run: ${error.message}`);
  }

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

  // WordPress runtime reads translations.json from the theme root. Serialize
  // cms/translations.ts (preferred) or the legacy JSON file into that artifact.
  if (translationsSourcePath(themeRoot)) {
    writeFileSync(
      path.join(outDir, 'translations.json'),
      JSON.stringify(transData, null, 2),
      'utf8',
    );
  }
  // Generate priority preloads for <head> in header.php
  const effectiveAssetGraph = assetGraph || scanAssetGraph(themeRoot);
  const preloadTags = generatePreloadTags(effectiveAssetGraph, { isPhp: true });

  writeFileSync(
    path.join(outDir, 'header.php'),
    buildHeaderPhp(config, { preloadTags }),
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
  writeFileSync(
    path.join(outDir, 'page-placeholder.php'),
    buildPlaceholderPagePhp(config),
    'utf8',
  );
  writeFileSync(
    path.join(outDir, 'template-forgewp-builder.php'),
    buildBuilderPagePhp(),
    'utf8',
  );

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
        let processedHtml = injectAutoHydrationMarkers(processMarkup(rawHtml, config.textDomain, getRichTextKeysForSlug(`${name}-page`)));
        processedHtml = extractCleanContent(processedHtml, processedHeader, processedFooter);
        processedHtml = processedHtml.replace(/<div\b[^>]*data-forgewp-hydrate="(navbar|site-header|site-footer)"[^>]*>\s*<\/div>/g, '');
        processedHtml = processedHtml.replace(/<\/?forgewp-content-boundary\b[^>]*>/gi, '');

        writeFileSync(path.join(staticDir, file), replaceAssetPlaceholders(processedHtml), 'utf8');

        const headFile = file.replace('.html', '-head.html');
        if (existsSync(path.join(forgewpDir, headFile))) {
          writeFileSync(
            path.join(staticDir, headFile),
            replaceAssetPlaceholders(readFileSync(path.join(forgewpDir, headFile), 'utf8')),
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

  const authManifest = {
    protectedPages: [],
    authGates: [],
  };

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

        let isProtected = false;
        let allowedCapability = null;
        let redirectUrl = null;

        if (rawHtml.includes('<forgewp-require-auth')) {
          isProtected = true;
          const match = rawHtml.match(/<forgewp-require-auth\s+([^>]*)\/?>/i);
          if (match) {
            const attrsStr = match[1];
            const getAttr = (name) => {
              const regex = new RegExp(
                `(?:${name}|${name.toLowerCase()})=(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
                'i',
              );
              const m = attrsStr.match(regex);
              return m ? m[1] || m[2] || m[3] || '' : '';
            };
            allowedCapability = getAttr('allowed') || null;
            redirectUrl = getAttr('redirect') || null;
          }
        }

        if (isProtected) {
          authManifest.protectedPages.push({
            page: slug.replace('template-', ''),
            allowed: allowedCapability,
            redirect: redirectUrl,
          });
        }

        if (rawHtml.includes('forgewp-auth-gate-start')) {
          authManifest.authGates.push({
            page: slug.replace('template-', ''),
            type: 'logged_in',
          });
        }

        if (rawHtml.includes('forgewp-capability-gate-start')) {
          const match = rawHtml.match(/forgewp-capability-gate-start\s+allowed="([^"]*)"/);
          authManifest.authGates.push({
            page: slug.replace('template-', ''),
            type: 'capability',
            allowed: match ? match[1] : null,
          });
        }

        let redirectPhp = '';
        let cleanedRawHtml = rawHtml;
        if (rawHtml.includes('<forgewp-require-auth')) {
          const match = rawHtml.match(/<forgewp-require-auth\s+([^>]*)\/?>/i);
          if (match) {
            const attrsStr = match[1];
            const getAttr = (name) => {
              const regex = new RegExp(
                `(?:${name}|${name.toLowerCase()})=(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
                'i',
              );
              const m = attrsStr.match(regex);
              return m ? m[1] || m[2] || m[3] || '' : '';
            };

            const allowed = getAttr('allowed');
            const redirect = getAttr('redirect');

            let redirectUrlExpr = 'wp_login_url()';
            let redirectSetup = '';
            if (redirect) {
              if (redirect.startsWith('__FORGEWP_PAGELINK_')) {
                const match = redirect.match(/__FORGEWP_PAGELINK_([a-zA-Z0-9_-]+)_DEFAULT_(.*?)__/);
                if (match) {
                  const name = match[1];
                  const decoded = decodeURIComponent(match[2]);
                  redirectSetup = `    $redirect_url = home_url('${decoded.replace(/'/g, "\\'")}');
    $__fwp_id = forgewp_resolve_route_page_id('${name}');
    if ($__fwp_id) {
        $redirect_url = get_permalink($__fwp_id);
    }`;
                  redirectUrlExpr = '$redirect_url';
                } else {
                  const matchPlain = redirect.match(/__FORGEWP_PAGELINK_([a-zA-Z0-9_-]+)__/);
                  if (matchPlain) {
                    const name = matchPlain[1];
                    redirectSetup = `    $redirect_url = home_url('/');
    $__fwp_id = forgewp_resolve_route_page_id('${name}');
    if ($__fwp_id) {
        $redirect_url = get_permalink($__fwp_id);
    }`;
                    redirectUrlExpr = '$redirect_url';
                  } else {
                    redirectUrlExpr = `home_url('${redirect}')`;
                  }
                }
              } else if (redirect.startsWith('template:')) {
                const name = redirect.replace('template:', '');
                redirectSetup = `    $redirect_url = home_url('/');
    $__fwp_id = forgewp_resolve_route_page_id('${name}');
    if ($__fwp_id) {
        $redirect_url = get_permalink($__fwp_id);
    }`;
                redirectUrlExpr = '$redirect_url';
              } else {
                redirectUrlExpr = `home_url('${redirect}')`;
              }
            }

            redirectPhp = `
if ( ! is_user_logged_in() ) {
${redirectSetup ? redirectSetup + '\n' : ''}    wp_safe_redirect( ${redirectUrlExpr} );
    exit;
} else {
    $email_verification_enabled = get_option( 'forgewp_auth_email_verification_enabled' ) === '1';
    $verified_meta = get_user_meta( get_current_user_id(), 'forgewp_email_verified', true );
    $email_verified = ( $verified_meta === '' ) || ( $verified_meta === '1' ) || ( $verified_meta === true );
    if ( $email_verification_enabled && ! $email_verified ) {
        $verify_url = home_url( '/verify-email' );
        $__fwp_id = forgewp_resolve_route_page_id('verify-email-page');
        if ($__fwp_id) {
            $verify_url = get_permalink($__fwp_id);
        }
        wp_safe_redirect( $verify_url );
        exit;
    }
}`;

            if (allowed) {
              redirectPhp += `
if ( ! current_user_can( '${allowed}' ) ) {
    wp_safe_redirect( home_url( '/' ) );
    exit;
}`;
            }
          }
          cleanedRawHtml = rawHtml.replace(/<forgewp-require-auth\s*([^>]*)\/?>/gi, '');
          cleanedRawHtml = cleanedRawHtml.replace(/<\/forgewp-require-auth>/gi, '');
        }

        let pageConfigHeader = true;
        let pageConfigFooter = true;
        let pageConfigLayout = 'default';

        const configMatch = rawHtml.match(/<forgewp-page-config\s*([^>]*)\/?>/i);
        if (configMatch) {
          const attribs = configMatch[1];
          const headerAttr = attribs.match(/header="([^"]*)"/i);
          const footerAttr = attribs.match(/footer="([^"]*)"/i);
          const layoutAttr = attribs.match(/layout="([^"]*)"/i);

          if (headerAttr) {
            if (headerAttr[1] === 'false') pageConfigHeader = false;
            else if (headerAttr[1] === 'true') pageConfigHeader = true;
            else pageConfigHeader = headerAttr[1];
          }
          if (footerAttr) {
            if (footerAttr[1] === 'false') pageConfigFooter = false;
            else if (footerAttr[1] === 'true') pageConfigFooter = true;
            else pageConfigFooter = footerAttr[1];
          }
          if (layoutAttr) {
            pageConfigLayout = layoutAttr[1];
            if (pageConfigLayout === 'blank' || pageConfigLayout === 'false') {
              pageConfigHeader = false;
              pageConfigFooter = false;
            }
          }
          cleanedRawHtml = cleanedRawHtml.replace(/<forgewp-page-config\s*([^>]*)\/?>/gi, '');
          cleanedRawHtml = cleanedRawHtml.replace(/<\/forgewp-page-config>/gi, '');
        }

        let processedHtml = injectAutoHydrationMarkers(processMarkup(cleanedRawHtml, config.textDomain, getRichTextKeysForSlug(slug.replace('template-', ''))));
        processedHtml = extractCleanContent(processedHtml, processedHeader, processedFooter);
        processedHtml = processedHtml.replace(/<div\b[^>]*data-forgewp-hydrate="(navbar|site-header|site-footer)"[^>]*>\s*<\/div>/g, '');
        processedHtml = processedHtml.replace(/<\/?forgewp-content-boundary\b[^>]*>/gi, '');

        if (projectHooks && typeof projectHooks.processTemplateMarkup === 'function') {
          processedHtml = projectHooks.processTemplateMarkup(slug, processedHtml, config);
        }

        writeFileSync(path.join(staticDir, file), replaceAssetPlaceholders(processedHtml), 'utf8');

        const headFile = file.replace('.html', '-head.html');
        if (existsSync(path.join(forgewpDir, headFile))) {
          writeFileSync(
            path.join(staticDir, headFile),
            replaceAssetPlaceholders(readFileSync(path.join(forgewpDir, headFile), 'utf8')),
            'utf8',
          );
        }

        // Generate the native WordPress PHP Custom Page Template
        const templateName = slug
          .replace('template-', '')
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

        let headerCall = 'get_header();';
        let footerCall = 'get_footer();';

        if (pageConfigHeader === false) {
          headerCall = `?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
  <meta charset="<?php bloginfo('charset'); ?>">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <?php
  if ( ! forgewp_seo_plugin_active() ) {
      $target = forgewp_resolve_head_target();
      if (file_exists($target)) {
          ob_start();
          include $target;
          echo preg_replace('/<title>.*?<\\/title>/is', '', ob_get_clean());
      }
  }
  ?>
  <?php wp_head(); ?>
  <style>
    a { text-decoration: none; }
    a:hover { text-decoration: none; }
    .underline { text-decoration: underline !important; }
    .hover\\:underline:hover { text-decoration: underline !important; }
  </style>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<?php`;
        } else if (typeof pageConfigHeader === 'string') {
          headerCall = `get_header('${pageConfigHeader}');`;
        }

        if (pageConfigFooter === false) {
          footerCall = `?>
<?php wp_footer(); ?>
</body>
</html>`;
        } else if (typeof pageConfigFooter === 'string') {
          footerCall = `get_footer('${pageConfigFooter}');`;
        }

        const phpContent = `<?php
/**
 * Template Name: ${templateName}
 *
 * @package ${config.textDomain}
 */
${redirectPhp}
${headerCall}

$markup_file = get_template_directory() . '/forgewp-static/${file}';
if (file_exists($markup_file)) {
    include $markup_file;
}

${footerCall}
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

      // Smartly extract background and text colors from palette to style the WP editor canvas
      if (config.settings.color.palette && Array.isArray(config.settings.color.palette)) {
        if (!themeJson.styles) themeJson.styles = {};
        if (!themeJson.styles.color) themeJson.styles.color = {};

        const bgPreset = config.settings.color.palette.find(p => p && p.slug === 'background');
        const textPreset = config.settings.color.palette.find(p => p && (p.slug === 'text' || p.slug === 'primary'));

        if (bgPreset && !themeJson.styles.color.background) {
          themeJson.styles.color.background = bgPreset.color;
        }
        if (textPreset && !themeJson.styles.color.text) {
          themeJson.styles.color.text = textPreset.color;
        }
      }
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

  writeFileSync(
    path.join(outDir, 'auth-manifest.json'),
    JSON.stringify(authManifest, null, 2),
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

function scanForWpOptions(themeRoot) {
  const optionsPath = path.join(themeRoot, 'cms', 'site-options.ts');
  if (!existsSync(optionsPath)) return [];

  // WordPress core options that are already managed in wp-admin Settings pages —
  // exclude them from the auto-generated Theme Options page.
  const WP_CORE_OPTIONS = new Set([
    'siteurl', 'blogname', 'blogdescription', 'admin_email', 'blogpublic',
    'default_role', 'timezone_string', 'date_format', 'time_format',
    'start_of_week', 'permalink_structure', 'upload_path', 'upload_url_path',
    'posts_per_page', 'posts_per_rss', 'comments_notify', 'moderation_notify',
    'comment_moderation', 'require_name_email', 'thread_comments',
    'thread_comments_depth', 'page_comments', 'default_comments_page',
    'comment_order', 'comments_per_page', 'default_ping_status',
    'default_comment_status', 'show_on_front', 'page_on_front',
    'page_for_posts', 'rss_use_excerpt', 'mailserver_url', 'mailserver_login',
    'mailserver_pass', 'mailserver_port', 'active_plugins', 'template',
    'stylesheet', 'woocommerce_shop_page_id',
  ]);

  const optionsMap = new Map(); // name -> { name, label, defaultValue, postType? }

  const content = readFileSync(optionsPath, 'utf8');
  if (content.includes('defineWpOptions')) {
    const objText = extractDefineWpOptionsArgs(content);
    if (objText) {
      const schema = evalDefineWpOptions(objText);
      if (schema && typeof schema === 'object') {
        for (const [name, field] of Object.entries(schema)) {
          if (WP_CORE_OPTIONS.has(name)) continue;

          const label = field.label || name
            .replace(/[_-]+/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());

          optionsMap.set(name, {
            name,
            label,
            defaultValue: field.default || '',
            postType: field._type === 'postPicker' ? (field.postType || 'post') : null,
          });
        }
      }
    }
  }

  return Array.from(optionsMap.values());
}

function extractDefineWpOptionsArgs(fileContent) {
  const matchIdx = fileContent.indexOf('defineWpOptions');
  if (matchIdx === -1) return null;
  const startIdx = fileContent.indexOf('(', matchIdx);
  if (startIdx === -1) return null;

  let parenCount = 0;
  let inString = false;
  let stringChar = '';
  let endIdx = -1;

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
    return fileContent.slice(startIdx + 1, endIdx).trim();
  }
  return null;
}

function evalDefineWpOptions(objText) {
  if (!objText) return null;
  try {
    const sandbox = {
      optionText: (cfg = {}) => ({ _type: 'text', ...cfg }),
      optionUrl: (cfg = {}) => ({ _type: 'url', ...cfg }),
      optionEmail: (cfg = {}) => ({ _type: 'email', ...cfg }),
      optionTextarea: (cfg = {}) => ({ _type: 'textarea', ...cfg }),
      optionToggle: (cfg = {}) => ({ _type: 'toggle', ...cfg }),
      optionNumber: (cfg = {}) => ({ _type: 'number', ...cfg }),
      optionPostPicker: (cfg = {}) => ({ _type: 'postPicker', ...cfg }),
    };
    const fn = new Function(
      'optionText',
      'optionUrl',
      'optionEmail',
      'optionTextarea',
      'optionToggle',
      'optionNumber',
      'optionPostPicker',
      `return (${objText});`
    );
    return fn(
      sandbox.optionText,
      sandbox.optionUrl,
      sandbox.optionEmail,
      sandbox.optionTextarea,
      sandbox.optionToggle,
      sandbox.optionNumber,
      sandbox.optionPostPicker
    );
  } catch (e) {
    console.warn('[ForgeWP Options Parser] evalDefineWpOptions failed:', e.message);
    return null;
  }
}


