import {
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
import { loadFrameworkAdapter } from './framework-adapter.js';
import {
  analyzeHydrationIslands,
  printDiagnosticsReport,
} from './diagnostics.js';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
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
  const findComponentPath =
    adapter.findComponentPath || adapter.default?.findComponentPath;
  const getHydrationRollupInputs =
    adapter.getHydrationRollupInputs ||
    adapter.default?.getHydrationRollupInputs;

  const hydrationIslands = scanForHydrationIslands
    ? scanForHydrationIslands(themeRoot)
    : [];
  const hasHydration = hydrationIslands.length > 0;

  const assetsOut = path.join(outDir, 'assets');
  const distAssets = path.join(themeRoot, 'dist', 'assets');
  mkdirSync(assetsOut, { recursive: true });
  cpSync(distAssets, assetsOut, { recursive: true });

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
        if (
          key.endsWith(`${pascalName}.tsx`) ||
          key.endsWith(`${pascalName}.ts`) ||
          key.endsWith(`${island}.tsx`) ||
          key.endsWith(`${island}.ts`) ||
          (value.file && value.file.includes(island))
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
        const Component = module.default || Object.values(module)[0];
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

  // Fix nav links and split markup
  const processedApp = processMarkup(appHtml);
  const processedHeader = processMarkup(headerHtml);
  const processedFooter = processMarkup(footerHtml);

  // Extract content (App markup minus Header/Footer)
  let contentHtml = processedApp;
  if (processedHeader) {
    contentHtml = contentHtml.replace(processedHeader, '');
  }
  if (processedFooter) {
    contentHtml = contentHtml.replace(processedFooter, '');
  }

  // Process single post template if exists
  let processedSingle = '';
  if (singleHtml) {
    processedSingle = processMarkup(singleHtml);
    if (processedHeader) {
      processedSingle = processedSingle.replace(processedHeader, '');
    }
    if (processedFooter) {
      processedSingle = processedSingle.replace(processedFooter, '');
    }
  }

  // Process 404 template if exists
  let processedNotFound = '';
  if (notFoundHtml) {
    processedNotFound = processMarkup(notFoundHtml);
    if (processedHeader) {
      processedNotFound = processedNotFound.replace(processedHeader, '');
    }
    if (processedFooter) {
      processedNotFound = processedNotFound.replace(processedFooter, '');
    }
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
    processedArchive = processMarkup(archiveHtml);
    if (processedHeader)
      processedArchive = processedArchive.replace(processedHeader, '');
    if (processedFooter)
      processedArchive = processedArchive.replace(processedFooter, '');
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

  writeFileSync(
    path.join(outDir, 'functions.php'),
    buildFunctionsPhp(
      config,
      assets,
      compiledBlocks,
      themeRoot,
      pagesToAutoCreate,
      menus,
      hydrationData,
    ),
    'utf8',
  );
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

        let processedHtml = processMarkup(rawHtml);
        if (processedHeader)
          processedHtml = processedHtml.replace(processedHeader, '');
        if (processedFooter)
          processedHtml = processedHtml.replace(processedFooter, '');

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

/**
 * Process markup: fix nav links etc.
 */
function processMarkup(html) {
  if (!html) return '';
  // Fix nav links — # → <?php echo esc_url( home_url( '/' ) ); ?>
  // We use a placeholder and replace it in the PHP file generation if needed,
  // but for now we'll do it via string replacement in the template files.
  let processed = html.replace(
    /href="#"/g,
    'href="<?php echo esc_url( home_url( \'/\' ) ); ?>"',
  );

  processed = processed.replace(
    /__FORGEWP_THE_TITLE__/g,
    '<?php the_title(); ?>',
  );

  processed = processed.replace(
    /__FORGEWP_THE_CONTENT__/g,
    '<?php the_content(); ?>',
  );

  processed = processed.replace(
    /__FORGEWP_THE_PERMALINK__/g,
    '<?php the_permalink(); ?>',
  );

  processed = processed.replace(
    /__FORGEWP_THE_EXCERPT__/g,
    '<?php the_excerpt(); ?>',
  );

  processed = processed.replace(
    /__FORGEWP_THE_DATE__/g,
    '<?php echo esc_html( get_the_date() ); ?>',
  );

  processed = processed.replace(
    /__FORGEWP_THE_AUTHOR__/g,
    '<?php echo esc_html( get_the_author() ); ?>',
  );

  processed = processed.replace(
    /__FORGEWP_THE_POST_THUMBNAIL_URL__/g,
    "<?php echo esc_url( get_the_post_thumbnail_url( null, 'large' ) ); ?>",
  );

  processed = processed.replace(
    /__FORGEWP_THE_CATEGORY_LIST__/g,
    "<?php the_category( ', ' ); ?>",
  );

  processed = processed.replace(
    /__FORGEWP_THE_ARCHIVE_TITLE__/g,
    '<?php the_archive_title(); ?>',
  );

  processed = processed.replace(
    /<forgewp-loop-start\s*\/?>/g,
    '<?php if (have_posts()) : while (have_posts()) : the_post(); ?>',
  );

  processed = processed.replace(/<\/forgewp-loop-start>/g, '');

  processed = processed.replace(
    /<forgewp-loop-end\s*\/?>/g,
    '<?php endwhile; else : echo "<p>No posts found.</p>"; endif; ?>',
  );

  processed = processed.replace(/<\/forgewp-loop-end>/g, '');

  // ── Custom Meta Fields (ACF / metadata support) ──
  processed = processed.replace(
    /__FORGEWP_CUSTOM_FIELD__([a-zA-Z0-9_-]+)__/g,
    "<?php echo esc_html( get_post_meta( get_the_ID(), '$1', true ) ); ?>",
  );

  // ── Dynamic Custom Menus ──
  processed = processed.replace(
    /<forgewp-menu\s+([^>]*)\/?>/g,
    (match, attrsStr) => {
      const getAttr = (name) => {
        const regex = new RegExp(
          `(?:${name}|${name.toLowerCase()})=(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
          'i',
        );
        const m = attrsStr.match(regex);
        return m ? m[1] || m[2] || m[3] || '' : '';
      };

      const location = getAttr('location') || 'primary';
      const className = getAttr('class') || getAttr('className') || '';
      const linkClassName =
        getAttr('linkClassName') || getAttr('linkclassname') || '';

      return `<?php
  $locations = get_nav_menu_locations();
  $menu_id = isset($locations['${location}']) ? $locations['${location}'] : null;
  $menu_items = $menu_id ? wp_get_nav_menu_items($menu_id) : array();
  if (!empty($menu_items)) {
      echo '<nav class="${className}">';
      foreach ($menu_items as $item) {
          echo '<a href="' . esc_url($item->url) . '" class="${linkClassName}">' . esc_html($item->title) . '</a>';
      }
      echo '</nav>';
  } else {
      echo '<nav class="${className}"><a href="' . esc_url(home_url('/')) . '" class="${linkClassName}">Home</a></nav>';
  }
  ?>`;
    },
  );
  processed = processed.replace(/<\/forgewp-menu>/g, '');

  // ── WordPress Shortcodes Support ──
  processed = processed.replace(
    /<forgewp-shortcode\s+[^>]*code="([^"]+)"\s*\/?>/g,
    (match, code) => {
      const decodedCode = code
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&amp;/g, '&');
      const escapedCode = decodedCode.replace(/'/g, "\\'");
      return `<?php echo do_shortcode('${escapedCode}'); ?>`;
    },
  );
  processed = processed.replace(/<\/forgewp-shortcode>/g, '');

  // ── Custom WP_Query Loop Blocks ──
  processed = processed.replace(
    /<forgewp-query-loop-start\s+([^>]*)\/?>/g,
    (match, attrsStr) => {
      const getAttr = (name) => {
        const regex = new RegExp(
          `(?:${name}|${name.toLowerCase()})=(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
          'i',
        );
        const m = attrsStr.match(regex);
        return m ? m[1] || m[2] || m[3] || '' : '';
      };

      const postType = getAttr('postType') || getAttr('posttype') || 'post';
      const postsPerPage =
        getAttr('postsPerPage') || getAttr('postsperpage') || '10';
      const categoryName =
        getAttr('categoryName') || getAttr('categoryname') || '';

      return `<?php
  $query_args = array(
      'post_type' => '${postType}',
      'posts_per_page' => ${postsPerPage},
  );
  if ('${categoryName}' !== '') {
      $query_args['category_name'] = '${categoryName}';
  }
  $custom_query = new WP_Query($query_args);
  if ($custom_query->have_posts()) : while ($custom_query->have_posts()) : $custom_query->the_post();
  ?>`;
    },
  );
  processed = processed.replace(/<\/forgewp-query-loop-start>/g, '');
  processed = processed.replace(
    /<forgewp-query-loop-end\s*\/?>/g,
    '<?php\n  endwhile;\n  wp_reset_postdata();\n  endif;\n  ?>',
  );
  processed = processed.replace(/<\/forgewp-query-loop-end>/g, '');

  // ── Custom WpImage Primitives ──
  processed = processed.replace(
    /<forgewp-image\s+([^>]*)\/?>/g,
    (match, attrsStr) => {
      const getAttr = (name) => {
        const regex = new RegExp(
          `data-${name}=(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
        );
        const m = attrsStr.match(regex);
        return m ? m[1] || m[2] || m[3] || '' : '';
      };

      const id = getAttr('id');
      const field = getAttr('field');
      const size = getAttr('size') || 'full';
      const className = getAttr('class-name');
      const alt = getAttr('alt');

      if (id) {
        return `<?php echo wp_get_attachment_image( ${id}, '${size}', false, array( 'class' => '${className}', 'alt' => '${alt}' ) ); ?>`;
      } else if (field === 'featuredImage') {
        return `<?php echo wp_get_attachment_image( get_post_thumbnail_id( get_the_ID() ), '${size}', false, array( 'class' => '${className}', 'alt' => '${alt}' ) ); ?>`;
      } else if (field) {
        return `<?php
  $img_val = get_post_meta( get_the_ID(), '${field}', true );
  if ( is_numeric( $img_val ) ) {
      echo wp_get_attachment_image( $img_val, '${size}', false, array( 'class' => '${className}', 'alt' => '${alt}' ) );
  } elseif ( ! empty( $img_val ) ) {
      echo '<img src="' . esc_url( $img_val ) . '" class="' . esc_attr( '${className}' ) . '" alt="' . esc_attr( '${alt}' ) . '" />';
  }
  ?>`;
      } else {
        return `<img class="${className}" alt="${alt}" src="<?php echo esc_url( get_theme_file_uri( 'assets/image-placeholder.png' ) ); ?>" />`;
      }
    },
  );
  processed = processed.replace(/<\/forgewp-image>/g, '');

  // ── Options & Customizer Theme Mods Support ──
  processed = processed.replace(
    /__FORGEWP_OPTION_([a-zA-Z0-9_-]+)_DEFAULT_(.*?)__/g,
    (match, name, defaultVal) => {
      const decoded = decodeURIComponent(defaultVal);
      return `<?php echo esc_html( get_option( '${name}', '${decoded}' ) ); ?>`;
    },
  );
  processed = processed.replace(
    /__FORGEWP_OPTION_([a-zA-Z0-9_-]+)__/g,
    "<?php echo esc_html( get_option( '$1' ) ); ?>",
  );

  processed = processed.replace(
    /__FORGEWP_THEME_MOD_([a-zA-Z0-9_-]+)_DEFAULT_(.*?)__/g,
    (match, name, defaultVal) => {
      const decoded = decodeURIComponent(defaultVal);
      return `<?php echo esc_html( get_theme_mod( '${name}', '${decoded}' ) ); ?>`;
    },
  );
  processed = processed.replace(
    /__FORGEWP_THEME_MOD_([a-zA-Z0-9_-]+)__/g,
    "<?php echo esc_html( get_theme_mod( '$1' ) ); ?>",
  );

  return processed;
}

/**
 * @param {import('./types.js').ForgeWPThemeConfig} config
 */
function buildStyleCss(config) {
  return `/*
Theme Name: ${config.name}
Theme URI: https://forgewp.dev
Author: ForgeWP
Description: ${config.description}
Version: ${config.version}
Requires at least: 6.0
Tested up to: 6.7
Requires PHP: 7.4
License: GNU General Public License v2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html
Text Domain: ${config.textDomain}
*/

/* Compiled styles are enqueued from assets/ via functions.php */
`;
}

/**
 * @param {import('./types.js').ForgeWPThemeConfig} config
 * @param {import('./types.js').ForgeWPBuildAssets} assets
 */
function buildFunctionsPhp(
  config,
  assets,
  blockSlugs = [],
  themeRoot = '',
  pagesToAutoCreate = [],
  menus = {},
  hydrationData = null,
) {
  const css = assets.cssFile.replace(/^assets\//, '');
  const version = config.version.replace(/'/g, "\\'");
  const googleFonts = config.settings?.typography?.googleFonts || [];
  const wpBlockStylesLine = config.presets?.wordpressCoreStyles === false
    ? ''
    : "    add_theme_support('wp-block-styles');\n";

  let cptRegistration = '';
  try {
    const mockDataPath = path.join(themeRoot, 'cms', 'mock-data.json');
    if (existsSync(mockDataPath)) {
      const mockData = JSON.parse(readFileSync(mockDataPath, 'utf8'));
      const postTypes = Object.keys(mockData).filter(
        (k) =>
          k !== 'posts' &&
          k !== 'pages' &&
          k !== 'post' &&
          k !== 'page' &&
          k !== 'menus' &&
          k !== 'attachment',
      );
      if (postTypes.length > 0) {
        cptRegistration = `
/**
 * Register dynamic Custom Post Types inferred from local mock data.
 */
function forgewp_register_custom_post_types() {
${postTypes
  .map(
    (pt) => `    register_post_type('${pt}', array(
        'labels'      => array(
            'name'               => '${pt.charAt(0).toUpperCase() + pt.slice(1)}s',
            'singular_name'      => '${pt.charAt(0).toUpperCase() + pt.slice(1)}',
            'menu_name'          => '${pt.charAt(0).toUpperCase() + pt.slice(1)}s',
            'name_admin_bar'     => '${pt.charAt(0).toUpperCase() + pt.slice(1)}',
            'add_new'            => 'Add New',
            'add_new_item'       => 'Add New ${pt.charAt(0).toUpperCase() + pt.slice(1)}',
            'new_item'           => 'New ${pt.charAt(0).toUpperCase() + pt.slice(1)}',
            'edit_item'          => 'Edit ${pt.charAt(0).toUpperCase() + pt.slice(1)}',
            'view_item'          => 'View ${pt.charAt(0).toUpperCase() + pt.slice(1)}',
            'all_items'          => 'All ${pt.charAt(0).toUpperCase() + pt.slice(1)}s',
            'search_items'       => 'Search ${pt.charAt(0).toUpperCase() + pt.slice(1)}s',
            'not_found'          => 'No ${pt.charAt(0).toUpperCase() + pt.slice(1)}s found.',
        ),
        'public'      => true,
        'has_archive' => true,
        'show_in_rest'=> true,
        'supports'    => array('title', 'editor', 'thumbnail', 'custom-fields', 'excerpt'),
        'menu_icon'   => 'dashicons-admin-post',
    ));`,
  )
  .join('\n')}
}
add_action('init', 'forgewp_register_custom_post_types');
`;
      }
    }
  } catch (e) {}

  let fontsEnqueue = '';
  let preconnectFilter = '';

  if (googleFonts.length > 0) {
    const fontsParam = googleFonts
      .map((f) => encodeURIComponent(f))
      .join('&family=');
    fontsEnqueue = `
    // Enqueue Google Fonts (dynamic preset via wp.config.ts)
    wp_enqueue_style(
        '${config.textDomain}-google-fonts',
        'https://fonts.googleapis.com/css2?family=${fontsParam}&display=swap',
        array(),
        null
    );`;

    preconnectFilter = `
/**
 * Add preconnect resource hints for Google Fonts performance.
 */
function forgewp_google_fonts_resource_hints(array $urls, string $relation_type): array {
    if (wp_style_is('${config.textDomain}-google-fonts', 'queue') && 'preconnect' === $relation_type) {
        $urls[] = array(
            'href' => 'https://fonts.googleapis.com',
            'crossorigin' => 'anonymous',
        );
        $urls[] = array(
            'href' => 'https://fonts.gstatic.com',
            'crossorigin' => 'anonymous',
        );
    }
    return $urls;
}
add_filter('wp_resource_hints', 'forgewp_google_fonts_resource_hints', 10, 2);
`;
  }

  let blocksRegistration = '';
  if (blockSlugs.length > 0) {
    const blocksArray = blockSlugs.map((s) => `'${s}'`).join(', ');
    blocksRegistration = `
/**
 * Register dynamic Gutenberg blocks compiled by ForgeWP.
 */
function forgewp_register_dynamic_blocks(): void {
    $blocks = array(${blockSlugs.map((s) => `'${s.name.replace('forgewp/', '')}'`).join(', ')});
    foreach ($blocks as $block) {
        register_block_type(__DIR__ . '/blocks/' . $block);
    }
}
add_action('init', 'forgewp_register_dynamic_blocks');

/**
 * Enqueue Block Editor JavaScript to dynamically render block interfaces.
 */
function forgewp_enqueue_block_editor_assets(): void {
    wp_enqueue_script(
        'forgewp-editor-script',
        get_template_directory_uri() . '/assets/forgewp-editor.js',
        array('wp-blocks', 'wp-element', 'wp-block-editor', 'wp-components', 'wp-server-side-render'),
        FORGEWP_THEME_VERSION,
        true
    );

    wp_localize_script(
        'forgewp-editor-script',
        'forgeWpBlocks',
        json_decode('${JSON.stringify(blockSlugs).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')
    );
}
add_action('enqueue_block_editor_assets', 'forgewp_enqueue_block_editor_assets');
`;
  }

  let registerMenusPhp = '';
  const menuLocations = Object.keys(menus).filter((k) => !k.startsWith('_'));
  if (menuLocations.length > 0) {
    registerMenusPhp = `
    // Register custom navigation menus from sitemap config
    register_nav_menus(array(
${menuLocations.map((loc) => `        '${loc}' => __('${loc.charAt(0).toUpperCase() + loc.slice(1)} Navigation', '${config.textDomain}'),`).join('\n')}
    ));`;
  }

  const pagesPhpArray = pagesToAutoCreate
    .map((p) => {
      return `        array(
            'title'    => '${p.title.replace(/'/g, "\\'")}',
            'slug'     => '${p.slug.replace(/'/g, "\\'")}',
            'template' => '${p.template.replace(/'/g, "\\'")}',
        )`;
    })
    .join(',\n');

  const menuItemsPhpArray = Object.entries(menus)
    .filter(([loc]) => !loc.startsWith('_'))
    .map(([loc, items]) => {
      const itemsPhp = items
        .map((item) => {
          return `            array(
                'title' => '${item.title.replace(/'/g, "\\'")}',
                'url'   => '${item.url.replace(/'/g, "\\'")}',
            )`;
        })
        .join(',\n');
      return `        '${loc}' => array(
${itemsPhp}
        )`;
    })
    .join(',\n');

  const autoCreationPhp = `
/**
 * Automatically create routes defined in menus.json and assign custom page templates upon theme activation.
 */
function forgewp_auto_create_pages_and_menus(): void {
    $activated_option = '${config.textDomain}_activated_' . str_replace('.', '_', FORGEWP_THEME_VERSION);
    if (get_option($activated_option) === 'yes') {
        return;
    }

    $pages = array(
${pagesPhpArray}
    );

    foreach ($pages as $p) {
        $existing_page = get_page_by_path($p['slug']);
        if (!$existing_page) {
            $page_id = wp_insert_post(array(
                'post_title'    => $p['title'],
                'post_name'     => $p['slug'],
                'post_status'   => 'publish',
                'post_type'     => 'page',
            ));
            if (!is_wp_error($page_id) && $page_id > 0) {
                update_post_meta($page_id, '_wp_page_template', $p['template']);
            }
        } else {
            update_post_meta($existing_page->ID, '_wp_page_template', $p['template']);
        }
    }

    $menu_structure = array(
${menuItemsPhpArray}
    );

    foreach ($menu_structure as $location => $items) {
        $menu_name = ucfirst($location) . ' Navigation';
        $menu_exists = wp_get_nav_menu_object($menu_name);
        
        if (!$menu_exists) {
            $menu_id = wp_create_nav_menu($menu_name);
            if (!is_wp_error($menu_id)) {
                $locations = get_theme_mod('nav_menu_locations');
                if (!is_array($locations)) {
                    $locations = array();
                }
                $locations[$location] = $menu_id;
                set_theme_mod('nav_menu_locations', $locations);
                
                foreach ($items as $item) {
                    $item_title = $item['title'];
                    $item_url = $item['url'];
                    
                    $object_id = 0;
                    $object_type = 'custom';
                    $target_url = $item_url;
                    
                    if (strpos($item_url, '/') === 0) {
                        $slug = trim($item_url, '/');
                        if ($slug === '') {
                            $target_url = home_url('/');
                        } else {
                            $page = get_page_by_path($slug);
                            if ($page) {
                                $object_id = $page->ID;
                                $object_type = 'page';
                                $target_url = get_permalink($page->ID);
                            } else {
                                $target_url = home_url($item_url);
                            }
                        }
                    }
                    
                    wp_update_nav_menu_item($menu_id, 0, array(
                        'menu-item-title'     => $item_title,
                        'menu-item-url'       => $target_url,
                        'menu-item-object-id' => $object_id,
                        'menu-item-object'    => $object_type === 'page' ? 'page' : '',
                        'menu-item-type'      => $object_type === 'page' ? 'post_type' : 'custom',
                        'menu-item-status'    => 'publish',
                    ));
                }
            }
        }
    }

    update_option($activated_option, 'yes');
}
add_action('after_switch_theme', 'forgewp_auto_create_pages_and_menus');

/**
 * Register customizer settings for theme modifications (e.g., footer_text).
 * This allows theme mods to be managed via WordPress Customizer and WP Admin.
 */
function forgewp_register_theme_customizer_settings($wp_customize): void {
    // Register footer_text theme modification
    $wp_customize->add_setting(
        'footer_text',
        array(
            'default'           => 'Proudly powered by ForgeWP & React',
            'sanitize_callback' => 'sanitize_text_field',
        )
    );

    $wp_customize->add_control(
        'footer_text',
        array(
            'label'       => __('Footer Text', '${config.textDomain}'),
            'section'     => 'title_tagline',
            'type'        => 'textarea',
            'description' => __('Custom text displayed in the theme footer.', '${config.textDomain}'),
        )
    );
}
add_action('customize_register', 'forgewp_register_theme_customizer_settings');

/**
 * Set default footer_text on theme activation if not already set.
 */
function forgewp_set_default_footer_text(): void {
    if (!get_theme_mod('footer_text')) {
        set_theme_mod('footer_text', 'Proudly powered by ForgeWP & React');
    }
}
add_action('after_switch_theme', 'forgewp_set_default_footer_text');
`;

  let hydrationEnqueue = '';
  if (hydrationData && hydrationData.mapping) {
    const mainJs = hydrationData.mainJsFile
      .replace(/^assets\//, '')
      .replace(/^assets\\/, '');
    const manifestPairs = Object.entries(hydrationData.mapping)
      .map(([key, val]) => {
        const cleanVal = val.replace(/^assets\//, '').replace(/^assets\\/, '');
        return `                    '${key}' => 'assets/${cleanVal}'`;
      })
      .join(',\n');

    // Load mock site settings for hydration payloads
    let siteSettingsJson = {};
    const siteSettingsPath = path.join(themeRoot, 'cms', 'site-settings.json');
    if (existsSync(siteSettingsPath)) {
      try {
        siteSettingsJson = JSON.parse(readFileSync(siteSettingsPath, 'utf8'));
      } catch (e) {
        console.warn(
          'Failed to parse site-settings.json for hydration:',
          e.message,
        );
      }
    }

    // Generate dynamic PHP for options collection
    const optionKeys = Object.keys(siteSettingsJson.options || {});
    const optionsPairs = optionKeys
      .map((key) => {
        const defaultVal = siteSettingsJson.options[key];
        let phpDefault = 'false';
        if (typeof defaultVal === 'string') {
          phpDefault = `'${defaultVal.replace(/'/g, "\\'")}'`;
        } else if (typeof defaultVal === 'number' || typeof defaultVal === 'boolean') {
          phpDefault = String(defaultVal);
        }
        return `                        '${key}' => get_option('${key}', ${phpDefault})`;
      })
      .join(',\n');

    // Generate dynamic PHP for theme_mods collection
    const themeModKeys = Object.keys(siteSettingsJson.theme_mods || {});
    const themeModsPairs = themeModKeys
      .map((key) => {
        const defaultVal = siteSettingsJson.theme_mods[key];
        let phpDefault = 'false';
        if (typeof defaultVal === 'string') {
          phpDefault = `'${defaultVal.replace(/'/g, "\\'")}'`;
        } else if (typeof defaultVal === 'number' || typeof defaultVal === 'boolean') {
          phpDefault = String(defaultVal);
        } else if (typeof defaultVal === 'object' && defaultVal !== null) {
          phpDefault = 'array()';
        }
        return `                        '${key}' => get_theme_mod('${key}', ${phpDefault})`;
      })
      .join(',\n');

    hydrationEnqueue = `
    // Enqueue React runtime entrypoint and dynamic Selective Hydration assets
    $js_path = get_template_directory() . '/assets/${mainJs}';
    if (file_exists($js_path)) {
        wp_enqueue_script(
            '${config.textDomain}-react-runtime',
            $theme_uri . '/assets/${mainJs}',
            array(),
            FORGEWP_THEME_VERSION,
            true
        );

        // Inject hydration manifest mappings dynamically
        wp_localize_script(
            '${config.textDomain}-react-runtime',
            'forgeWpHydration',
            array(
                'themeUri' => $theme_uri,
                'manifest' => array(
${manifestPairs}
                ),
                'siteSettings' => array(
                    'options' => array(
${optionsPairs}
                    ),
                    'theme_mods' => array(
${themeModsPairs}
                    ),
                ),
            )
        );

        // Enqueue Micro-Hydrator orchestrator script
        wp_enqueue_script(
            '${config.textDomain}-hydrator',
            $theme_uri . '/assets/forgewp-hydrator.js',
            array('${config.textDomain}-react-runtime'),
            FORGEWP_THEME_VERSION,
            true
        );
    }

    /**
     * Load ForgeWP compiled assets as ES modules.
     */
    function ${config.textDomain.replace(/-/g, '_')}_script_loader_tag($tag, $handle, $src) {
        if (in_array($handle, array('${config.textDomain}-react-runtime', '${config.textDomain}-hydrator'), true)) {
            return '<script type="module" src="' . esc_url($src) . '" id="' . esc_attr($handle) . '-js"></script>';
        }
        return $tag;
    }
    add_filter('script_loader_tag', '${config.textDomain.replace(/-/g, '_')}_script_loader_tag', 10, 3);
    `;
  }

  return `<?php
/**
 * ${config.name} — generated by ForgeWP
 *
 * @package ${config.textDomain}
 */

if (! defined('ABSPATH')) {
    exit;
}

define('FORGEWP_THEME_VERSION', '${version}');

/**
 * Enqueue compiled theme assets.
 */
function forgewp_enqueue_assets(): void {
    $theme_uri = get_template_directory_uri();
    $css_path = get_template_directory() . '/assets/${css}';
${fontsEnqueue}

    if (file_exists($css_path)) {
        wp_enqueue_style(
            '${config.textDomain}-app',
            $theme_uri . '/assets/${css}',
            array(),
            FORGEWP_THEME_VERSION
        );
    }
${hydrationEnqueue}
}
add_action('wp_enqueue_scripts', 'forgewp_enqueue_assets');

/**
 * Theme supports.
 */
function forgewp_theme_setup(): void {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('html5', array('search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script'));
${wpBlockStylesLine}    add_theme_support('editor-styles');

    // Load compiled theme stylesheet inside Gutenberg Block Editor
    add_editor_style('assets/${css}');
${registerMenusPhp}
}
add_action('after_setup_theme', 'forgewp_theme_setup');
${preconnectFilter}${blocksRegistration}${cptRegistration}${autoCreationPhp}

/**
 * Custom document title filter for ForgeWP.
 * Maps title enqueued via <WpHead /> in React to WordPress.
 */
function forgewp_custom_document_title( $title ) {
    if ( defined('WPSEO_VERSION') || class_exists('RankMath') || class_exists('All_in_One_SEO_Pack') || defined('AIOSEO_VERSION') ) {
        return $title;
    }
    $single_head = get_template_directory() . '/forgewp-static/single-head.html';
    $head_file = get_template_directory() . '/forgewp-static/head.html';
    $target = (is_single() && file_exists($single_head)) ? $single_head : $head_file;
    if ( file_exists( $target ) ) {
        $content = file_get_contents( $target );
        if ( preg_match( '/<title>(.*?)<\\/title>/is', $content, $matches ) ) {
            return html_entity_decode( trim( $matches[1] ), ENT_QUOTES, 'UTF-8' );
        }
    }
    return $title;
}
add_filter( 'pre_get_document_title', 'forgewp_custom_document_title', 999 );

/**
 * Disable WordPress legacy emoji conversion to match native client-side rendering.
 */
function forgewp_disable_emojis(): void {
    remove_action('wp_head', 'print_emoji_detection_script', 7);
    remove_action('admin_print_scripts', 'print_emoji_detection_script');
    remove_action('wp_print_styles', 'print_emoji_styles');
    remove_action('admin_print_styles', 'print_emoji_styles');
    remove_filter('the_content_feed', 'wp_staticize_emoji');
    remove_filter('comment_text_rss', 'wp_staticize_emoji');
    remove_filter('wp_mail', 'wp_staticize_emoji_for_email');
    add_filter('tiny_mce_plugins', 'forgewp_disable_emojis_tinymce');
    add_filter('wp_resource_hints', 'forgewp_disable_emojis_remove_dns_prefetch', 10, 2);
}
add_action('init', 'forgewp_disable_emojis');

function forgewp_disable_emojis_tinymce($plugins) {
    return is_array($plugins) ? array_diff($plugins, array('wpemoji')) : array();
}

function forgewp_disable_emojis_remove_dns_prefetch($urls, $relation_type) {
    if ('dns-prefetch' === $relation_type) {
        $emoji_svg_url = apply_filters('emoji_svg_url', 'https://s.w.org/images/core/emoji/2.2.1/svg/');
        $urls = array_diff($urls, array($emoji_svg_url));
    }
    return $urls;
}
`;
}

function buildHeaderPhp(config) {
  return `<?php
/**
 * Theme header
 *
 * @package ${config.textDomain}
 */
?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
  <meta charset="<?php bloginfo('charset'); ?>">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <?php
  // Yield metadata control to active SEO plugins to prevent duplication
  $seo_plugin_active = defined('WPSEO_VERSION') ||
                       class_exists('RankMath') ||
                       class_exists('All_in_One_SEO_Pack') ||
                       defined('AIOSEO_VERSION') ||
                       class_exists('SEOPress\\\\Services\\\\Title');

  if ( ! $seo_plugin_active ) {
      $single_head = get_template_directory() . '/forgewp-static/single-head.html';
      $head_file = get_template_directory() . '/forgewp-static/head.html';
      $target = (is_single() && file_exists($single_head)) ? $single_head : $head_file;
      if (file_exists($target)) {
          $content = file_get_contents($target);
          // Strip duplicate title tag so standard wp_head title-tag support outputs it cleanly
          echo preg_replace('/<title>.*?<\\/title>/is', '', $content);
      }
  }
  ?>
  <?php wp_head(); ?>
  <style>
    /* Reset WP link underlines to match React/Tailwind expected styling */
    a { text-decoration: none !important; }
    a:hover { text-decoration: none !important; }
  </style>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<?php
$header_file = get_template_directory() . '/forgewp-static/header.html';
if (file_exists($header_file)) {
    include $header_file;
}
?>
`;
}

function buildFooterPhp(config) {
  return `<?php
/**
 * Theme footer
 *
 * @package ${config.textDomain}
 */
$footer_file = get_template_directory() . '/forgewp-static/footer.html';
if (file_exists($footer_file)) {
    include $footer_file;
}
wp_footer();
?>
</body>
</html>
`;
}

function buildIndexPhp() {
  return `<?php
/**
 * Main template — displays ForgeWP compiled static markup
 *
 * @package forgewp
 */

get_header();

$markup_file = get_template_directory() . '/forgewp-static/content.html';

if (is_front_page() && file_exists($markup_file)) {
    include $markup_file;
} elseif (have_posts()) {
    echo '<main class="mx-auto max-w-3xl px-6 py-12">';
    while (have_posts()) {
        the_post();
        echo '<article class="mb-12">';
        echo '<h1 class="text-3xl font-bold mb-4">' . get_the_title() . '</h1>';
        echo '<div class="prose prose-zinc max-w-none">';
        the_content();
        echo '</div>';
        echo '</article>';
    }
    echo '</main>';
}

get_footer();
`;
}

function buildSinglePhp() {
  return `<?php
/**
 * Single post template
 *
 * @package forgewp
 */

get_header();

$single_file = get_template_directory() . '/forgewp-static/single.html';
if (file_exists($single_file)) {
    if (have_posts()) {
        while (have_posts()) {
            the_post();
            include $single_file;
        }
    }
} else {
    if (have_posts()) {
        while (have_posts()) {
            the_post();
            echo '<main class="mx-auto max-w-3xl px-6 py-12">';
            echo '<article>';
            echo '<h1 class="text-4xl font-bold mb-6">' . get_the_title() . '</h1>';
            echo '<div class="prose prose-zinc max-w-none">';
            the_content();
            echo '</div>';
            echo '</article>';
            echo '</main>';
        }
    }
}

get_footer();
`;
}

function build404Php() {
  return `<?php
/**
 * 404 template
 *
 * @package forgewp
 */

get_header();

$notFound_file = get_template_directory() . '/forgewp-static/404.html';
if (file_exists($notFound_file)) {
    include $notFound_file;
} else {
    echo '<main class="flex min-h-[60vh] flex-col items-center justify-center text-center px-6 py-24">';
    echo '<p class="text-base font-semibold text-zinc-900">404</p>';
    echo '<h1 class="mt-4 text-3xl font-bold tracking-tight text-zinc-900 sm:text-5xl">Page not found</h1>';
    echo '<p class="mt-6 text-base leading-7 text-zinc-600">Sorry, we couldn’t find the page you’re looking for.</p>';
    echo '</main>';
}

get_footer();
`;
}

function buildArchivePhp() {
  return `<?php
/**
 * Archive template — category, tag, date, and author archives.
 * Loads the ForgeWP compiled archive.html which contains the WpLoop.
 *
 * @package forgewp
 */

get_header();

$archive_file = get_template_directory() . '/forgewp-static/archive.html';

if (file_exists($archive_file)) {
    include $archive_file;
} else {
    echo '<main class="mx-auto max-w-3xl px-6 py-12">';
    the_archive_title('<h1 class="text-3xl font-bold mb-8">', '</h1>');
    if (have_posts()) {
        echo '<div class="space-y-8">';
        while (have_posts()) {
            the_post();
            echo '<article>';
            echo '<h2 class="text-xl font-bold"><a href="' . get_permalink() . '">' . get_the_title() . '</a></h2>';
            echo '<div class="text-sm text-zinc-500 mt-1">' . get_the_date() . ' by ' . get_the_author() . '</div>';
            echo '<div class="mt-3 text-zinc-600">';
            the_excerpt();
            echo '</div>';
            echo '</article>';
        }
        echo '</div>';
    } else {
        echo '<p>No posts found.</p>';
    }
    echo '</main>';
}

get_footer();
`;
}

function buildPagePhp() {
  return `<?php
/**
 * Static page template — WordPress pages (e.g. About, Contact).
 * Reuses single.html since static pages share the same title+content structure.
 *
 * @package forgewp
 */

get_header();

$page_file = get_template_directory() . '/forgewp-static/single.html';

if (file_exists($page_file)) {
    if (have_posts()) {
        while (have_posts()) {
            the_post();
            include $page_file;
        }
    }
} else {
    if (have_posts()) {
        while (have_posts()) {
            the_post();
            echo '<main class="mx-auto max-w-3xl px-6 py-12">';
            echo '<article>';
            echo '<h1 class="text-4xl font-bold mb-6">' . get_the_title() . '</h1>';
            echo '<div class="prose prose-zinc max-w-none">';
            the_content();
            echo '</div>';
            echo '</article>';
            echo '</main>';
        }
    }
}

get_footer();
`;
}

/**
 * Scans the `src/blocks/` folder, parses block settings and JSX content,
 * and compiles them into official, dynamic WordPress blocks.
 *
 * @param {string} themeRoot
 * @param {string} outDir
 * @returns {string[]} Compiled block slugs
 */
function compileBlocks(themeRoot, outDir) {
  const blocksDir = path.join(themeRoot, 'src', 'blocks');
  const blockSlugs = [];

  if (!existsSync(blocksDir)) {
    return blockSlugs;
  }

  function parseAttributes(attrStr) {
    const attrs = {};
    const regex = /([a-zA-Z0-9_-]+)(?:\s*=\s*(?:(?:"([^"]*)")|(?:'([^']*)')|(?:\{([\s\S]*?)\}))|(?=\s|$))/gi;
    let match;
    while ((match = regex.exec(attrStr)) !== null) {
      const key = match[1];
      const val = match[2] || match[3] || match[4] || true;
      attrs[key] = val;
    }
    return attrs;
  }

  function parseJsxToAst(jsx) {
    const tokens = [];
    let index = 0;
    
    while (index < jsx.length) {
      const char = jsx[index];
      
      if (char === '<') {
        let tagEnd = jsx.indexOf('>', index);
        if (tagEnd === -1) break;
        
        let tagStr = jsx.substring(index, tagEnd + 1);
        const isClosing = tagStr.startsWith('</');
        const isSelfClosing = tagStr.endsWith('/>');
        
        const tagNameMatch = tagStr.match(/<\/?([a-zA-Z0-9_-]+)/);
        const tagName = tagNameMatch ? tagNameMatch[1] : '';
        
        tokens.push({
          type: 'tag',
          name: tagName,
          raw: tagStr,
          isClosing,
          isSelfClosing
        });
        
        index = tagEnd + 1;
      } else {
        let nextTag = jsx.indexOf('<', index);
        let text = nextTag === -1 ? jsx.substring(index) : jsx.substring(index, nextTag);
        
        if (text.trim()) {
          tokens.push({
            type: 'text',
            value: text
          });
        }
        
        index = nextTag === -1 ? jsx.length : nextTag;
      }
    }
    
    const root = { type: 'root', children: [] };
    const stack = [root];
    
    for (const token of tokens) {
      if (token.type === 'tag') {
        if (token.isClosing) {
          if (stack.length > 1) {
            stack.pop();
          }
        } else {
          const node = {
            type: 'element',
            name: token.name,
            attributes: parseAttributes(token.raw.substring(token.name.length + 1, token.raw.length - (token.isSelfClosing ? 2 : 1))),
            children: []
          };
          
          stack[stack.length - 1].children.push(node);
          
          if (!token.isSelfClosing && token.name !== 'img' && token.name !== 'input' && token.name !== 'br' && token.name !== 'hr') {
            stack.push(node);
          }
        }
      } else {
        stack[stack.length - 1].children.push({
          type: 'text',
          value: token.value
        });
      }
    }
    
    return root;
  }

  function generateReactCreateElement(node) {
    if (!node) return 'null';

    if (node.type === 'root') {
      if (node.children.length === 1) {
        return generateReactCreateElement(node.children[0]);
      }
      return `[${node.children.map(generateReactCreateElement).join(', ')}]`;
    }
    
    if (node.type === 'text') {
      const val = node.value.trim();
      if (val.startsWith('{') && val.endsWith('}')) {
        return val.slice(1, -1).trim();
      }
      return JSON.stringify(val);
    }
    
    if (node.type === 'element') {
      if (node.name === 'WpEditable') {
        const tag = String(node.attributes.tagName || 'div').replace(/['"]/g, '').trim();
        const valStr = String(node.attributes.value || '').trim();
        
        let varName = 'value';
        const varMatch = valStr.match(/(?:attributes|props)?\.?([a-zA-Z0-9_-]+)$/);
        if (varMatch) {
          varName = varMatch[1];
        }
        
        const className = node.attributes.className 
          ? (node.attributes.className.startsWith('{') 
              ? node.attributes.className.slice(1, -1) 
              : JSON.stringify(node.attributes.className))
          : '""';
        
        return `createElement(wp.blockEditor.RichText, {
          tagName: ${JSON.stringify(tag)},
          value: attributes.${varName} || '',
          onChange: function(val) { setAttributes({ ${varName}: val }); },
          className: ${className}
        })`;
      }
      
      const props = {};
      for (const [key, val] of Object.entries(node.attributes)) {
        const propKey = key === 'className' ? 'className' : key;
        if (typeof val === 'string' && val.startsWith('{') && val.endsWith('}')) {
          props[propKey] = val.slice(1, -1).trim();
        } else {
          props[propKey] = JSON.stringify(val);
        }
      }
      
      const propsStr = Object.keys(props).length > 0
        ? `{ ${Object.entries(props).map(([k, v]) => `${k}: ${v}`).join(', ')} }`
        : 'null';
        
      const childrenStr = node.children.map(generateReactCreateElement).filter(Boolean).join(', ');
      
      return `createElement(${JSON.stringify(node.name)}, ${propsStr}${childrenStr ? `, ${childrenStr}` : ''})`;
    }
    return 'null';
  }

  // Robust defineBlock settings parser
  function parseDefineBlock(code, blockSlug) {
    const startIndex = code.indexOf('defineBlock(');
    if (startIndex === -1) return null;

    let depth = 1;
    let i = startIndex + 'defineBlock('.length;
    let blockContent = '';

    while (i < code.length && depth > 0) {
      const char = code[i];
      if (char === '(') depth++;
      else if (char === ')') depth--;

      if (depth > 0) {
        blockContent += char;
      }
      i++;
    }

    let cleanBlockContent = blockContent;

    // Strip the edit and save property values so we only evaluate raw block configurations
    cleanBlockContent = cleanBlockContent.replace(
      /edit\s*:\s*([\s\S]*?)(?=,\s*(?:save|name|title|category|icon|attributes)\s*:|\s*\}$)/,
      'edit: null'
    );
    cleanBlockContent = cleanBlockContent.replace(
      /save\s*:\s*([\s\S]*?)(?=,\s*(?:edit|name|title|category|icon|attributes)\s*:|\s*\}$)/,
      'save: null'
    );

    try {
      const evalFn = new Function(`return ${cleanBlockContent};`);
      return evalFn();
    } catch (e) {
      console.warn(`[Gutenberg Block Compiler] parseDefineBlock eval failed:`, e.message);
      
      const nameMatch = blockContent.match(/name\s*:\s*["']([^"']+)["']/);
      const titleMatch = blockContent.match(/title\s*:\s*["']([^"']+)["']/);
      const categoryMatch = blockContent.match(/category\s*:\s*["']([^"']+)["']/);
      const iconMatch = blockContent.match(/icon\s*:\s*["']([^"']+)["']/);

      let attributes = {};
      const attrMatch = blockContent.match(/attributes\s*:\s*(\{[\s\S]*?\})(?:\s*,\s*(?:edit|save)|\s*\})/);
      if (attrMatch) {
        try {
          const attrEval = new Function(`return ${attrMatch[1]};`);
          attributes = attrEval();
        } catch {}
      }

      return {
        name: nameMatch ? nameMatch[1] : blockSlug,
        title: titleMatch ? titleMatch[1] : blockSlug,
        category: categoryMatch ? categoryMatch[1] : 'design',
        icon: iconMatch ? iconMatch[1] : 'info',
        attributes
      };
    }
  }

  // Parenthesis-matching JSX extractor
  function extractJsx(code, propertyName) {
    const propIndex = code.indexOf(`${propertyName}:`);
    if (propIndex === -1) return null;

    const subCode = code.substring(propIndex);
    const returnIndex = subCode.indexOf('return (');
    if (returnIndex !== -1) {
      let depth = 1;
      let j = returnIndex + 'return ('.length;
      let jsxContent = '';
      while (j < subCode.length && depth > 0) {
        const c = subCode[j];
        if (c === '(') depth++;
        else if (c === ')') depth--;

        if (depth > 0) {
          jsxContent += c;
        }
        j++;
      }
      return jsxContent.trim();
    }

    const returnSingleIndex = subCode.indexOf('return ');
    if (returnSingleIndex !== -1) {
      const afterReturn = subCode.substring(returnSingleIndex + 'return '.length).trim();
      if (afterReturn.startsWith('<')) {
        const match = afterReturn.match(/^(<[\s\S]*?>)(?:\s*[,;\}]|\s*$)/);
        if (match) {
          return match[1].trim();
        }
      }
    }

    // Try standard arrow function shorthand edit: () => <div ... />
    const arrowIndex = subCode.indexOf('=>');
    if (arrowIndex !== -1 && arrowIndex < 80) {
      const afterArrow = subCode.substring(arrowIndex + 2).trim();
      if (afterArrow.startsWith('(')) {
        let depth = 1;
        let j = 1;
        let jsxContent = '';
        while (j < afterArrow.length && depth > 0) {
          const c = afterArrow[j];
          if (c === '(') depth++;
          else if (c === ')') depth--;
          if (depth > 0) jsxContent += c;
          j++;
        }
        return jsxContent.trim();
      } else if (afterArrow.startsWith('<')) {
        const match = afterArrow.match(/^(<[\s\S]*?>)(?:\s*[,;\}]|\s*$)/);
        if (match) {
          return match[1].trim();
        }
      }
    }

    return null;
  }

  // Helper to recursively parenthesize nested PHP ternaries to comply with PHP 8.0+ strict syntax requirements
  function parenthesizeTernaryExpression(expr) {
    const questionCount = (expr.match(/\?/g) || []).length;
    if (questionCount <= 1) return expr;

    let depth = 0;
    let firstQuestionIdx = -1;
    let firstColonIdx = -1;

    for (let i = 0; i < expr.length; i++) {
      const char = expr[i];
      if (char === '(' || char === '{' || char === '[') depth++;
      else if (char === ')' || char === '}' || char === ']') depth--;
      else if (depth === 0) {
        if (char === '?' && firstQuestionIdx === -1) {
          firstQuestionIdx = i;
        } else if (char === ':' && firstQuestionIdx !== -1 && firstColonIdx === -1) {
          firstColonIdx = i;
          break;
        }
      }
    }

    if (firstQuestionIdx === -1 || firstColonIdx === -1) {
      return expr;
    }

    const cond = expr.substring(0, firstQuestionIdx).trim();
    const truthy = expr.substring(firstQuestionIdx + 1, firstColonIdx).trim();
    const falsy = expr.substring(firstColonIdx + 1).trim();

    const newTruthy = parenthesizeTernaryExpression(truthy);
    const newFalsy = parenthesizeTernaryExpression(falsy);

    const wrapTruthy = (truthy.includes('?') && !truthy.startsWith('(')) ? `(${newTruthy})` : newTruthy;
    const wrapFalsy = (falsy.includes('?') && !falsy.startsWith('(')) ? `(${newFalsy})` : newFalsy;

    return `${cond} ? ${wrapTruthy} : ${wrapFalsy}`;
  }

  // ES6 string template literal to PHP expression compiler
  function translateJsExpressionToPhp(jsExpr) {
    const phpExpr = jsExpr
      .replace(/(?:attributes|props)\.([a-zA-Z0-9_-]+)/g, "$attributes['$1']")
      .replace(/\b([a-zA-Z0-9_-]+)\b/g, (name) => {
        return name;
      });
    return parenthesizeTernaryExpression(phpExpr);
  }

  const entries = readdirSync(blocksDir);
  for (const entry of entries) {
    const entryPath = path.join(blocksDir, entry);
    let blockFile = '';
    let blockSlug = '';

    if (statSync(entryPath).isDirectory()) {
      const indexPath = path.join(entryPath, 'index.tsx');
      if (existsSync(indexPath)) {
        blockFile = indexPath;
        blockSlug = entry
          .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-');
      }
    } else if (entry.endsWith('.tsx') || entry.endsWith('.jsx')) {
      blockFile = entryPath;
      blockSlug = entry
        .replace(/\.(tsx|jsx)$/, '')
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-');
    }

    if (blockFile) {
      try {
        const code = readFileSync(blockFile, 'utf8');

        const settingsMatch = code.match(
          /export\s+const\s+settings\s*=\s*(\{[\s\S]*?\});/,
        );
        let settings = {
          apiVersion: 3,
          name: `forgewp/${blockSlug}`,
          title: blockSlug
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' '),
          category: 'design',
          icon: 'admin-generic',
          attributes: {},
          render: 'file:./render.php',
        };

        let parsedSettings = null;
        if (code.includes('defineBlock(')) {
          parsedSettings = parseDefineBlock(code, blockSlug);
        } else if (settingsMatch) {
          try {
            const evalFn = new Function(`return ${settingsMatch[1]};`);
            parsedSettings = evalFn();
          } catch (e) {
            console.warn(
              `[Gutenberg Block Compiler] Error parsing legacy settings for ${blockSlug}:`,
              e.message,
            );
          }
        }

        if (parsedSettings) {
          settings = { ...settings, ...parsedSettings };
          settings.name = settings.name ? (settings.name.includes('/') ? settings.name : `forgewp/${settings.name}`) : `forgewp/${blockSlug}`;
          settings.apiVersion = 3;
          settings.render = 'file:./render.php';
        }

        // Extract JSX from save first, then edit as fallback
        let jsx = '';
        if (code.includes('save:')) {
          jsx = extractJsx(code, 'save');
        }
        if (!jsx && code.includes('edit:')) {
          jsx = extractJsx(code, 'edit');
        }

        if (!jsx) {
          const returnMatch = code.match(/return\s*\(\s*(<[\s\S]*?>)\s*\)/);
          if (returnMatch) {
            jsx = returnMatch[1];
          } else {
            const returnMatchSingle = code.match(/return\s+(<[\s\S]*?>);/);
            if (returnMatchSingle) {
              jsx = returnMatchSingle[1];
            }
          }
        }

        if (!jsx) {
          console.warn(
            `[Gutenberg Block Compiler] Skipping block ${blockSlug}: No returning JSX element found.`,
          );
          continue;
        }

        // Extract custom edit JSX for block-canvas high-fidelity controls using AST parser
        let editJsx = '';
        if (code.includes('edit:')) {
          editJsx = extractJsx(code, 'edit');
        }
        if (editJsx) {
          try {
            const ast = parseJsxToAst(editJsx);
            const customEditJsx = generateReactCreateElement(ast);
            settings.customEditJsx = customEditJsx;
          } catch (e) {
            console.warn(`[Gutenberg Block Compiler] Failed to parse custom edit JSX for ${blockSlug}:`, e.message);
          }
        }

        let phpMarkup = jsx;

        // Transpile <WpEditable> into standard JSX element so subsequent regexes can process it
        phpMarkup = phpMarkup.replace(
          /<WpEditable\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/WpEditable>)/g,
          (match, attrsStr, children) => {
            const getAttr = (name) => {
              const regex = new RegExp(
                `${name}=(?:"([^"]*)"|'([^']*)'|\\{\\s*(?:attributes\\.|props\\.)?([a-zA-Z0-9_-]+)\\s*\\})`
              );
              const m = attrsStr.match(regex);
              return m ? m[1] || m[2] || m[3] || '' : '';
            };

            const tag = getAttr('tagName') || 'div';
            const valueVar = getAttr('value');
            
            let cleanAttrs = attrsStr
              .replace(/tagName=(?:"[^"]*"|'[^']*'|\{[^\}]*\})/g, '')
              .replace(/value=(?:"[^"]*"|'[^']*'|\{[^\}]*\})/g, '')
              .replace(/onChange=(?:"[^"]*"|'[^']*'|\{[^\}]*\})/g, '')
              .trim();
              
            if (cleanAttrs) cleanAttrs = ' ' + cleanAttrs;

            const content = valueVar ? `{attributes.${valueVar}}` : (children || '');

            return `<${tag}${cleanAttrs}>${content}</${tag}>`;
          }
        );

        // className="..." -> class="..."
        phpMarkup = phpMarkup.replace(/className=/g, 'class=');

        // Transpile ES6 template literal conditional classes class={`...`}
        phpMarkup = phpMarkup.replace(/class=\{\`([\s\S]*?)\`\}/g, (match, templateLiteralContent) => {
          const processed = templateLiteralContent.replace(/\$\{\s*([\s\S]*?)\s*\}/g, (m, jsExpr) => {
            const phpExpr = translateJsExpressionToPhp(jsExpr);
            return `<?php echo esc_attr( ${phpExpr} ); ?>`;
          });
          return `class="${processed}"`;
        });

        // src={image} or src={attributes.image}
        phpMarkup = phpMarkup.replace(
          /(src|href|alt|title)=\{\s*(?:attributes\.|props\.)?([a-zA-Z0-9_-]+)\s*\}/gi,
          (match, attr, varName) => {
            const escFunc =
              attr === 'href' || attr === 'src' ? 'esc_url' : 'esc_attr';
            return `${attr}="<?php echo ${escFunc}( $attributes['${varName}'] ?? '' ); ?>"`;
          },
        );

        // {title} or {props.title}
        phpMarkup = phpMarkup.replace(
          /\{\s*(?:attributes\.|props\.)?([a-zA-Z0-9_-]+)\s*\}/g,
          (match, varName) => {
            return `<?php echo esc_html( $attributes['${varName}'] ?? '' ); ?>`;
          },
        );

        const renderPhpContent = `<?php
/**
 * Gutenberg dynamic block template — ${settings.title}
 * Autogenerated by ForgeWP Theme Compiler. Do not modify manually.
 */
?>
${phpMarkup}
`;

        const blockOutDir = path.join(outDir, 'blocks', blockSlug);
        mkdirSync(blockOutDir, { recursive: true });

        // Write block.json and render.php
        writeFileSync(
          path.join(blockOutDir, 'block.json'),
          JSON.stringify(settings, null, 2),
          'utf8',
        );
        writeFileSync(
          path.join(blockOutDir, 'render.php'),
          renderPhpContent,
          'utf8',
        );

        blockSlugs.push(settings);
      } catch (e) {
        console.error(
          `[Gutenberg Block Compiler] Failed to compile block ${blockSlug}:`,
          e.message,
        );
      }
    }
  }

  return blockSlugs;
}
