import path from "node:path";
import pc from "picocolors";
import { buildAssets } from "./build-assets.js";
import { generateTheme } from "./generate-theme.js";
import { loadConfig } from "./load-config.js";
import { renderStaticMarkup } from "./render-static.js";
import { assertZipCreated, zipTheme } from "./zip-theme.js";

/**
 * @param {Object} options
 * @param {string} options.themeRoot
 * @param {boolean} [options.skipBuild]
 * @param {boolean} [options.zip]
 * @param {string} [options.packageManager]
 */
export async function exportTheme(options) {
  const themeRoot = path.resolve(options.themeRoot);
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
    assets,
  });

  if (options.zip !== false) {
    console.log(pc.dim("  Creating ZIP…"));
    await zipTheme(outDir, zipPath);
    assertZipCreated(zipPath);
  }

  return { config, outDir, zipPath: options.zip !== false ? zipPath : null, assets };
}
