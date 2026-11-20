import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { extractNextStaticMarkup } from './next-route-extractor.js';
import { applyVerifiedNextLinksToMarkup } from './next-link-transform.js';
import { generateTheme } from './generate-theme.js';
import { validateExport } from './validate-export.js';
import { assertZipCreated, zipTheme } from './zip-theme.js';

/**
 * Determine the primary theme-relative CSS file path produced by packageNextAssets().
 * @param {string[]} stylesheets
 */
function resolvePackagedCssPath(stylesheets) {
  if (stylesheets.length === 0) return 'assets/next-empty.css';
  if (stylesheets.length === 1) return `assets/${path.basename(stylesheets[0])}`;
  return 'assets/next-bundle.css';
}

/**
 * Package verified CSS and non-JS metadata assets from a Next.js static export (`out/`)
 * into a WordPress theme output directory.
 *
 * Explicitly skips Next client runtime chunks (`_next/static/chunks/*.js`) so raw Next
 * bundles are never enqueued as a fake native WordPress runtime.
 *
 * @param {string} themeRoot
 * @param {string} outDir
 * @param {{ routes?: import('./index.js').ForgeWPStaticRoute[], outExportDir?: string }} [options]
 */
export function packageNextAssets(themeRoot, outDir, options = {}) {
  const resolvedRoot = path.resolve(themeRoot);
  const outExportDir = options.outExportDir
    ? path.resolve(options.outExportDir)
    : path.join(resolvedRoot, 'out');
  const routes = Array.isArray(options.routes)
    ? options.routes
    : extractNextStaticMarkup(resolvedRoot, { outDir: outExportDir }).routes;

  const stylesheetSet = new Set();
  const otherAssetSet = new Set();
  const skippedClientScriptSet = new Set();

  for (const route of routes) {
    for (const css of route.assets?.stylesheets || []) stylesheetSet.add(css);
    for (const other of route.assets?.otherAssets || []) otherAssetSet.add(other);
    for (const script of route.assets?.clientScripts || []) skippedClientScriptSet.add(script);
  }

  const stylesheets = Array.from(stylesheetSet).sort();
  const assetsOut = path.join(outDir, 'assets');
  mkdirSync(assetsOut, { recursive: true });

  const assetFiles = {};
  const cssFile = resolvePackagedCssPath(stylesheets);

  if (stylesheets.length === 0) {
    writeFileSync(path.join(outDir, cssFile), '/* No CSS emitted by Next.js build */\n', 'utf8');
  } else if (stylesheets.length === 1) {
    const srcCss = path.join(outExportDir, stylesheets[0]);
    copyFileSync(srcCss, path.join(outDir, cssFile));
    assetFiles[stylesheets[0]] = cssFile;
  } else {
    const combined = stylesheets
      .map((rel) => `/* Source: ${rel} */\n${readFileSync(path.join(outExportDir, rel), 'utf8')}`)
      .join('\n\n');
    writeFileSync(path.join(outDir, cssFile), combined, 'utf8');
    for (const rel of stylesheets) {
      assetFiles[rel] = cssFile;
    }
  }

  for (const rel of Array.from(otherAssetSet).sort()) {
    if (rel.startsWith('_next/') || rel.endsWith('.js') || rel.endsWith('.js.map')) continue;
    const src = path.join(outExportDir, rel);
    if (!existsSync(src)) continue;
    const dest = path.join(outDir, rel);
    mkdirSync(path.dirname(dest), { recursive: true });
    copyFileSync(src, dest);
    assetFiles[rel] = rel;
  }

  return {
    cssFile,
    assetFiles,
    clientEntries: {},
    runtimeEntry: undefined,
    skippedClientScripts: Array.from(skippedClientScriptSet).sort(),
  };
}

/**
 * Inspect compiled Gutenberg block definitions emitted under `<outDir>/blocks/`.
 * Useful for verifying block namespace, attribute schema, PHP render template, and editorStyle parity.
 * @param {string} outDir
 */
export function readCompiledBlockIdentities(outDir) {
  const blocksDir = path.join(outDir, 'blocks');
  if (!existsSync(blocksDir)) return [];

  const records = [];
  for (const slug of readdirSync(blocksDir).sort()) {
    const blockDir = path.join(blocksDir, slug);
    const blockJsonPath = path.join(blockDir, 'block.json');
    if (!existsSync(blockJsonPath)) continue;
    const metadata = JSON.parse(readFileSync(blockJsonPath, 'utf8'));
    const editorStyleRel =
      typeof metadata.editorStyle === 'string' && metadata.editorStyle.startsWith('file:')
        ? metadata.editorStyle.slice('file:'.length)
        : null;
    const renderRel =
      typeof metadata.render === 'string' && metadata.render.startsWith('file:')
        ? metadata.render.slice('file:'.length)
        : null;

    records.push({
      slug,
      name: metadata.name,
      title: metadata.title,
      category: metadata.category,
      attributes: metadata.attributes || {},
      editorStyle: metadata.editorStyle || null,
      editorStyleExists: editorStyleRel ? existsSync(path.resolve(blockDir, editorStyleRel)) : false,
      render: metadata.render || null,
      renderPhpExists: renderRel ? existsSync(path.resolve(blockDir, renderRel)) : false,
    });
  }
  return records;
}

/**
 * Experimental internal harness for native WordPress theme export from a built Next.js static export (`out/`).
 *
 * NOT a public supported adapter yet (`SUPPORTED_ADAPTERS` remains unchanged).
 * Combines fixed-route extraction, import-binding-aware `next/link` & `useWpPageLink` permalink rewriting,
 * CSS-only asset packaging, shared Gutenberg block compilation (`defineBlock` / `WpEditable`),
 * theme generation, export validation, and optional ZIP packaging.
 *
 * @param {{
 *   themeRoot: string,
 *   outDir: string,
 *   config: import('./index.js').ForgeWPThemeConfig,
 *   zipPath?: string | null,
 *   strict?: boolean,
 * }} options
 */
export async function exportNextExperimentalTheme({
  themeRoot,
  outDir,
  config,
  zipPath = null,
  strict = false,
}) {
  const resolvedRoot = path.resolve(themeRoot);
  const extracted = extractNextStaticMarkup(resolvedRoot);
  const rewritten = applyVerifiedNextLinksToMarkup(extracted, {
    themeRoot: resolvedRoot,
  });

  const stylesheets = Array.from(
    new Set(
      rewritten.markup.routes.flatMap((route) => route.assets?.stylesheets || []),
    ),
  ).sort();
  const cssFile = resolvePackagedCssPath(stylesheets);
  let packagedInfo = null;

  const experimentalAdapter = {
    scanForHydrationIslands: () => [],
    packageAssets: async (root, targetOutDir) => {
      packagedInfo = packageNextAssets(root, targetOutDir, {
        routes: rewritten.markup.routes,
      });
      return {
        assetFiles: packagedInfo.assetFiles,
        clientEntries: packagedInfo.clientEntries,
        runtimeEntry: packagedInfo.runtimeEntry,
      };
    },
  };

  await generateTheme({
    themeRoot: resolvedRoot,
    outDir,
    config,
    appHtml: rewritten.markup.appHtml,
    headerHtml: rewritten.markup.headerHtml,
    footerHtml: rewritten.markup.footerHtml,
    headHtml: rewritten.markup.headHtml,
    notFoundHtml: rewritten.markup.notFoundHtml,
    routes: rewritten.markup.routes,
    layout: rewritten.markup.layout,
    adapter: experimentalAdapter,
    assets: { cssFile },
    strict,
  });

  const validation = await validateExport({
    themeRoot: resolvedRoot,
    outDir,
    assets: { cssFile },
    config,
    strict,
    routes: rewritten.markup.routes,
    adapter: experimentalAdapter,
  });

  if (validation.missing.length > 0) {
    throw new Error(
      `Next.js experimental export validation failed — missing files:\n  - ${validation.missing.join('\n  - ')}`,
    );
  }

  let createdZip = null;
  if (zipPath) {
    await zipTheme(outDir, zipPath);
    assertZipCreated(zipPath);
    createdZip = zipPath;
  }

  return {
    outDir,
    zipPath: createdZip,
    assets: { cssFile },
    packaged: packagedInfo,
    markup: rewritten.markup,
    links: rewritten.links,
    diagnostics: rewritten.diagnostics,
    validation,
    blocks: readCompiledBlockIdentities(outDir),
  };
}
