import path from "node:path";
import pc from "picocolors";
import { buildAssets } from "./build-assets.js";
import { generateTheme } from "./generate-theme.js";
import { loadConfig } from "./load-config.js";
import { renderStaticMarkup } from "./render-static.js";
import { assertZipCreated, zipTheme } from "./zip-theme.js";

import { validateCriticalFiles } from "./validate.js";
import { validateExport } from "./validate-export.js";

/**
 * @param {Object} options
 * @param {string} options.themeRoot
 * @param {boolean} [options.skipBuild]
 * @param {boolean} [options.zip]
 * @param {string} [options.packageManager]
 */
export async function exportTheme(options) {
  const themeRoot = path.resolve(options.themeRoot);
  
  // Run Preflight Safeguards and Self-Healing checks
  validateCriticalFiles(themeRoot);

  const config = await loadConfig(themeRoot);

  function report(stage, message, level = 'dim') {
    if (options.onProgress && typeof options.onProgress === 'function') {
      try {
        options.onProgress({ stage, message });
      } catch (e) {
        // swallow errors from callbacks
      }
    }
    const fn = level === 'dim' ? pc.dim : level === 'yellow' ? pc.yellow : level === 'red' ? pc.red : level === 'green' ? pc.green : pc.white;
    console.log(fn(`  ${message}`));
  }

  console.log(pc.cyan(`\n  ForgeWP export — ${config.name}\n`));

  report('build', options.skipBuild ? 'Using existing build (skipBuild)' : 'Building assets with Vite…');
  const assets = options.skipBuild
    ? (await import("./build-assets.js")).readBuildManifest(themeRoot)
    : buildAssets(themeRoot, { packageManager: options.packageManager });

  report('render', 'Rendering React app to static HTML…');
  const markup = await renderStaticMarkup(themeRoot);

  const outDir = path.join(themeRoot, ".forgewp", "out", config.slug);
  const zipPath = path.join(themeRoot, ".forgewp", `${config.slug}.zip`);

  report('generate', 'Generating WordPress theme files…');
  generateTheme({
    themeRoot,
    outDir,
    config,
    appHtml: markup.appHtml,
    headerHtml: markup.headerHtml,
    footerHtml: markup.footerHtml,
    headHtml: markup.headHtml,
    singleHeadHtml: markup.singleHeadHtml,
    singleHtml: markup.singleHtml,
    notFoundHtml: markup.notFoundHtml,
    archiveHtml: markup.archiveHtml,
    assets,
  });

  // Optional export validation
  if (options.validate) {
    report('validate', 'Validating exported theme package…');
    const validation = await validateExport({ themeRoot, outDir, assets, config, strict: !!options.strict });

    if (validation.warnings && validation.warnings.length > 0) {
      report('validate-warnings', 'Validation warnings:', 'yellow');
      for (const w of validation.warnings) report('validate-warnings-item', ' - ' + w, 'dim');
    }

    if (validation.missing && validation.missing.length > 0) {
      report('validate-failed', 'Validation failed — missing files:', 'red');
      for (const m of validation.missing) report('validate-failed-item', ' - ' + m, 'dim');
      throw new Error('Export validation failed — missing required files or assets');
    }

    report('validate-passed', 'Validation passed', 'green');
  }

  if (options.zip !== false) {
    report('zip', 'Creating ZIP…');
    await zipTheme(outDir, zipPath);
    assertZipCreated(zipPath);
    report('zip-done', 'ZIP created', 'green');
  }

  return { config, outDir, zipPath: options.zip !== false ? zipPath : null, assets };
}
