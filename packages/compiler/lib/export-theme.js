import path from 'node:path';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import pc from 'picocolors';
import { buildAdapterAssets } from './adapter-build.js';
import { loadFrameworkAdapter } from './framework-adapter.js';
import { generateTheme } from './generate-theme.js';
import { loadConfig } from './load-config.js';
import { findWpConfigPath } from './project-language.js';
import { renderStaticMarkup } from './render-static.js';
import { assertZipCreated, zipTheme } from './zip-theme.js';
import { companionPluginSlug } from './companion-plugin.js';
import { findUnreferencedPublicFiles, pruneOptimizedOriginals, removeExcludedPublicFiles } from './assets/prune-originals.js';
import { globToRegExp } from './companion-sources.js';
import { runLosslessPass } from './assets/lossless-pass.js';

import { validateCriticalFiles } from './validate.js';
import { validateExport } from './validate-export.js';
import { scanAndGenerateBlocks } from './blocks/index.js';
import { splitInteractiveIslands } from './hydration/island-split.js';
import {
  scanAssetGraph,
  runAssetPipeline,
  orchestrateFonts,
  generateAssetManifest,
  printAssetDiagnosticsReport,
} from './assets/index.js';

/**
 * @param {Object} options
 * @param {string} options.themeRoot
 * @param {boolean} [options.skipBuild]
 * @param {boolean} [options.zip]
 * @param {boolean} [options.validate]
 * @param {boolean} [options.strict] Treat editable from/pick issues (and --validate warnings) as failures
 * @param {string} [options.packageManager]
 * @param {(progress: { stage: string, message: string }) => void} [options.onProgress]
 */
export async function exportTheme(options) {
  const themeRoot = path.resolve(options.themeRoot);
  const strict = !!options.strict;
  const verbose = process.env.FORGEWP_VERBOSE === '1';

  if (!options.config && !findWpConfigPath(themeRoot)) {
    throw new Error(
      `Critical project file is missing: wp.config.ts (or wp.config.js)\n` +
        `  Description: Theme configuration file\n\n` +
        `  👉 To fix this, please restore the file from your version control (Git) or re-create it from the original ForgeWP theme template.`,
    );
  }

  const config = options.config || (await loadConfig(themeRoot));
  const adapter =
    options.adapter || (await loadFrameworkAdapter(config.frameworkAdapter));

  // Run adapter-aware Preflight Safeguards and Self-Healing checks
  validateCriticalFiles(themeRoot, { adapter });

  if (!adapter.skipPreExportScaffolding) {
    // Auto-split components mixing static/attribute-driven content with genuine
    // interactivity into a static shell + extracted islands, before anything
    // below (block wrapper generation, Vite's Rollup entry resolution) reads
    // component source or decides what needs a hydration bundle.
    splitInteractiveIslands(themeRoot);

    // Pre-scaffold block wrappers so Vite receives them in Rollup inputs.
    // Defer editable-issue flush to compileBlocks (generateTheme) so --strict applies once.
    scanAndGenerateBlocks(themeRoot, {
      strict: false,
      resetIssues: true,
      flush: false,
    });
  }

  // Warnings the CLI prints after the summary (never shown as a finished step).
  const exportWarnings = [];

  function report(stage, message, level = 'dim') {
    if (options.onProgress && typeof options.onProgress === 'function') {
      try {
        options.onProgress({ stage, message });
      } catch (e) {
        // swallow errors from callbacks
      }
    }
    const fn =
      level === 'dim'
        ? pc.dim
        : level === 'yellow'
          ? pc.yellow
          : level === 'red'
            ? pc.red
            : level === 'green'
              ? pc.green
              : pc.white;
    if (!options.onProgress) {
      console.log(fn(`  ${message}`));
    }
  }

  // The CLI (bin/export.js) prints its own header; keep this for programmatic callers.
  if (!options.onProgress) console.log(pc.cyan(`\n  ForgeWP export — ${config.name}\n`));

  report(
    'build',
    options.skipBuild
      ? 'Using existing build (skipBuild)'
      : `Building assets with the ${config.frameworkAdapter || 'react'} adapter…`,
  );
  const assets = await buildAdapterAssets(themeRoot, config.frameworkAdapter, {
    skipBuild: options.skipBuild,
    packageManager: options.packageManager,
    verbose,
    adapter,
  });

  report(
    'render',
    `Rendering ${config.frameworkAdapter || 'React'} app to static HTML…`,
  );
  const markup = await renderStaticMarkup(themeRoot, config.frameworkAdapter, {
    adapter,
  });

  const outDir = path.join(themeRoot, '.forgewp', 'out', config.slug);
  const zipPath = path.join(themeRoot, '.forgewp', `${config.slug}.zip`);
  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
  }
  mkdirSync(outDir, { recursive: true });

  // Generate image variants before rendering markup so srcset and preload URLs match.
  report('assets', 'Optimizing static image assets with Sharp…');
  const assetGraph = scanAssetGraph(themeRoot);
  const assetResults = await runAssetPipeline(themeRoot, assetGraph, {
    outDir,
    quality: config.assets?.images?.quality || 80,
  });
  if (assetResults.processedCount > 0) {
    report(
      'assets-done',
      `Optimized ${assetResults.processedCount} image(s) (${assetResults.totalVariants} responsive WebP variants generated, ${assetResults.cachedCount} cached)`,
      'green',
    );
  }

  // Web Font Orchestration (self-host WOFF2 with local @font-face)
  const fontResults = await orchestrateFonts(themeRoot, config, assetGraph, {
    outDir,
  });
  if (fontResults.strategy === 'self-host' && fontResults.downloadedCount > 0) {
    report(
      'fonts-done',
      `Self-hosted ${fontResults.downloadedCount} WOFF2 font file(s) in assets/fonts/ with local @font-face`,
      'green',
    );
  }

  report('generate', 'Generating WordPress theme files…');
  await generateTheme({
    themeRoot,
    outDir,
    config,
    appHtml: markup.appHtml,
    headerHtml: markup.headerHtml,
    footerHtml: markup.footerHtml,
    headHtml: markup.headHtml,
    singleHeadHtml: markup.singleHeadHtml,
    notFoundHtml: markup.notFoundHtml,
    archiveHtml: markup.archiveHtml,
    archiveHeadHtml: markup.archiveHeadHtml,
    singleHtml: markup.singleHtml,
    routes: markup.routes,
    hierarchyTemplates: markup.hierarchyTemplates,
    layout: markup.layout,
    adapter,
    assets,
    assetGraph,
    preserveOutDir: true,
    strict,
  });

  // Asset Manifest & Performance Diagnostics CLI Report
  const assetManifest = generateAssetManifest(themeRoot, assetGraph, {
    outDir,
    config,
    fontRules: fontResults.enrichedRules || [],
  });
  printAssetDiagnosticsReport(assetManifest);

  // Originals whose WebP variants replaced every reference (validation below
  // fails the export if a file that is still referenced went missing).
  if (config.assets?.images?.keepOriginals !== true) {
    const pruned = pruneOptimizedOriginals(themeRoot, outDir, assetGraph);
    if (pruned.removed.length > 0) {
      report(
        'assets-pruned',
        `Left out ${pruned.removed.length} original image(s) replaced by WebP variants (${(pruned.bytesSaved / 1048576).toFixed(1)} MB)` +
          (pruned.kept.length > 0 ? `; kept ${pruned.kept.length} still referenced` : ''),
        'green',
      );
    }
  }

  // Lossless size pass (pixel-identical images, merged identical fonts).
  if (config.assets?.lossless !== false) {
    report('lossless', 'Compressing images and fonts losslessly…');
    const lossless = await runLosslessPass(outDir);
    const parts = [];
    if (lossless.converted.length) parts.push(`${lossless.converted.length} PNG → lossless WebP`);
    if (lossless.recompressed.length) parts.push(`${lossless.recompressed.length} PNG recompressed`);
    if (lossless.fontsMerged) parts.push(`${lossless.fontsMerged} duplicate font file(s) merged`);
    report(
      'lossless-done',
      parts.length
        ? `Lossless compression: ${parts.join(', ')} (${(lossless.bytesSaved / 1048576).toFixed(1)} MB, pixel-identical)`
        : 'Lossless compression: nothing to gain',
      'green',
    );
  }

  const excludedPublic = removeExcludedPublicFiles(themeRoot, outDir, config.assets?.exclude, globToRegExp);
  if (excludedPublic.length > 0) {
    report('assets-excluded', `Left out ${excludedPublic.length} file(s) from public/ (assets.exclude)`, 'green');
  }
  const unreferenced = findUnreferencedPublicFiles(themeRoot, outDir);
  if (unreferenced.length > 0) {
    const total = unreferenced.reduce((sum, f) => sum + f.bytes, 0);
    const shown = unreferenced.slice(0, 8).map((f) => `${f.rel}  ${(f.bytes / 1024).toFixed(0)} KB`);
    if (unreferenced.length > 8) shown.push(`…and ${unreferenced.length - 8} more`);
    exportWarnings.push({
      code: 'unreferenced-public-files',
      message: `${unreferenced.length} large file(s) in public/ (${(total / 1048576).toFixed(1)} MB) are not used by the theme but are still in the export.`,
      details: [
        ...shown,
        'Delete them from public/, or list them under assets.exclude in wp.config.ts.',
        'Keep a file only if a post or page links to it directly.',
      ],
      files: unreferenced,
    });
  }
  if (!options.onProgress) {
    for (const w of exportWarnings) {
      console.log(pc.yellow(`  ! ${w.message}`));
      for (const d of w.details) console.log(pc.dim(`      ${d}`));
    }
  }

  // Optional export validation
  if (options.validate) {
    report('validate', 'Validating exported theme package…');
    const validation = await validateExport({
      themeRoot,
      outDir,
      assets,
      config,
      strict,
      routes: markup.routes,
      adapter,
    });

    if (validation.warnings && validation.warnings.length > 0) {
      report('validate-warnings', 'Validation warnings:', 'yellow');
      for (const w of validation.warnings)
        report('validate-warnings-item', ' - ' + w, 'dim');
    }

    if (validation.missing && validation.missing.length > 0) {
      report('validate-failed', 'Validation failed — missing files:', 'red');
      for (const m of validation.missing)
        report('validate-failed-item', ' - ' + m, 'dim');
      throw new Error(
        'Export validation failed — missing required files or assets',
      );
    }

    report('validate-passed', 'Validation passed', 'green');
  }

  if (options.zip !== false) {
    report('zip', 'Creating ZIP…');
    await zipTheme(outDir, zipPath);
    assertZipCreated(zipPath);
    // Companion Plugin ZIP next to the theme ZIP (see companion-plugin.js).
    const companionDir = path.join(path.dirname(outDir), companionPluginSlug(config.slug));
    if (existsSync(companionDir)) {
      const companionZip = path.join(path.dirname(zipPath), `${companionPluginSlug(config.slug)}.zip`);
      await zipTheme(companionDir, companionZip);
      assertZipCreated(companionZip);
    }
    report('zip-done', 'ZIP created', 'green');
  }

  return {
    config,
    outDir,
    zipPath: options.zip !== false ? zipPath : null,
    assets,
    warnings: exportWarnings,
  };
}
