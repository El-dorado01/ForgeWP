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

  console.log(pc.cyan(`\n  ForgeWP export — ${config.name}\n`));

  const assets = options.skipBuild
    ? (await import("./build-assets.js")).readBuildManifest(themeRoot)
    : buildAssets(themeRoot, { packageManager: options.packageManager });

  console.log(pc.dim("  Rendering React app to static HTML…"));
  const markup = await renderStaticMarkup(themeRoot);

  const outDir = path.join(themeRoot, ".forgewp", "out", config.slug);
  const zipPath = path.join(themeRoot, ".forgewp", `${config.slug}.zip`);

  console.log(pc.dim("  Generating WordPress theme files…"));
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
    console.log(pc.dim('  Validating exported theme package…'));
    const validation = await validateExport({ themeRoot, outDir, assets, config, strict: !!options.strict });

    if (validation.warnings && validation.warnings.length > 0) {
      console.log(pc.yellow('  Validation warnings:'));
      for (const w of validation.warnings) console.log(pc.dim('   - ' + w));
    }

    if (validation.missing && validation.missing.length > 0) {
      console.log(pc.red('  Validation failed — missing files:'));
      for (const m of validation.missing) console.log(pc.dim('   - ' + m));
      throw new Error('Export validation failed — missing required files or assets');
    }

    console.log(pc.green('  Validation passed'));
  }

  if (options.zip !== false) {
    console.log(pc.dim("  Creating ZIP…"));
    await zipTheme(outDir, zipPath);
    assertZipCreated(zipPath);
  }

  return { config, outDir, zipPath: options.zip !== false ? zipPath : null, assets };
}
