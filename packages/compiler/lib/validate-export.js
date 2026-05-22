import fs from 'node:fs';
import path from 'node:path';
import { scanForHydrationIslands } from './hydration-scanner.js';

/**
 * Validate exported theme package output.
 * @param {{ themeRoot: string, outDir: string, assets: any, config: any, strict?: boolean }} opts
 */
export async function validateExport({ themeRoot, outDir, assets, config, strict = false }) {
  const summary = { missing: [], warnings: [] };
  const staticDir = path.join(outDir, 'forgewp-static');

  const requiredThemeFiles = [
    path.join(outDir, 'functions.php'),
    path.join(outDir, 'style.css'),
    path.join(outDir, 'header.php'),
    path.join(outDir, 'footer.php'),
    path.join(outDir, 'index.php'),
    path.join(outDir, 'single.php'),
    path.join(outDir, '404.php'),
    path.join(outDir, 'front-page.php'),
    path.join(outDir, 'archive.php'),
    path.join(outDir, 'page.php'),
    path.join(outDir, 'theme.json'),
  ];

  for (const p of requiredThemeFiles) {
    if (!fs.existsSync(p)) summary.missing.push(p.replace(process.cwd() + path.sep, ''));
  }

  const staticFiles = [
    path.join(staticDir, 'content.html'),
    path.join(staticDir, 'header.html'),
    path.join(staticDir, 'footer.html'),
  ];

  for (const p of staticFiles) {
    if (!fs.existsSync(p)) {
      summary.missing.push(p.replace(process.cwd() + path.sep, ''));
    } else if (fs.readFileSync(p, 'utf8').trim().length === 0) {
      const relative = p.replace(process.cwd() + path.sep, '');
      if (p.endsWith('content.html')) summary.missing.push(relative);
      else summary.warnings.push(relative);
    }
  }

  const assetsDir = path.join(outDir, 'assets');
  if (!fs.existsSync(assetsDir) || fs.readdirSync(assetsDir).length === 0) {
    summary.missing.push(assetsDir.replace(process.cwd() + path.sep, ''));
  } else {
    const expectedAssets = [path.join(assetsDir, 'forgewp-editor.js')];
    if (assets?.cssFile) expectedAssets.push(path.join(assetsDir, path.basename(assets.cssFile)));

    // Hydration-related expectations
    const islands = scanForHydrationIslands(themeRoot);

    if (islands.length > 0 && assets?.jsFile) {
      expectedAssets.push(path.join(assetsDir, path.basename(assets.jsFile)));
      expectedAssets.push(path.join(assetsDir, 'forgewp-hydrator.js'));
    }

    for (const assetPath of expectedAssets) {
      if (!fs.existsSync(assetPath)) summary.missing.push(assetPath.replace(process.cwd() + path.sep, ''));
    }

    const hydrationManifestCandidates = [
      path.join(themeRoot, 'dist', '.vite', 'manifest.json'),
      path.join(themeRoot, 'dist', 'manifest.json'),
    ];
    const hydrationManifestPath = hydrationManifestCandidates.find((candidate) => fs.existsSync(candidate));
    let viteManifest = null;

    if (islands.length > 0) {
      if (!hydrationManifestPath) {
        summary.missing.push('dist/.vite/manifest.json');
      } else {
        try {
          viteManifest = JSON.parse(fs.readFileSync(hydrationManifestPath, 'utf8'));
        } catch (err) {
          summary.missing.push(`${hydrationManifestPath.replace(process.cwd() + path.sep, '')} (invalid JSON)`);
        }
      }
    }

    if (viteManifest && islands.length > 0) {
      for (const island of islands) {
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

        if (!resolvedChunk) {
          summary.missing.push(`hydration asset for ${island}`);
          continue;
        }

        const assetFile = path.join(assetsDir, path.basename(resolvedChunk));
        if (!fs.existsSync(assetFile)) {
          summary.missing.push(assetFile.replace(process.cwd() + path.sep, ''));
        }
      }
    }

    // functions.php should reference compiled assets when present
    const functionsPhpPath = path.join(outDir, 'functions.php');
    if (fs.existsSync(functionsPhpPath)) {
      const functionsPhp = fs.readFileSync(functionsPhpPath, 'utf8');
      if (assets?.cssFile && !functionsPhp.includes(path.basename(assets.cssFile))) summary.warnings.push(`${functionsPhpPath.replace(process.cwd() + path.sep, '')} (missing CSS asset reference)`);
      if (islands.length > 0 && assets?.jsFile && !functionsPhp.includes(path.basename(assets.jsFile))) summary.warnings.push(`${functionsPhpPath.replace(process.cwd() + path.sep, '')} (missing JS asset reference)`);
      if (islands.length > 0 && !functionsPhp.includes('forgewp-hydrator.js')) summary.warnings.push(`${functionsPhpPath.replace(process.cwd() + path.sep, '')} (missing forgewp-hydrator enqueue)`);
      if (islands.length > 0 && !functionsPhp.includes('forgeWpHydration')) summary.warnings.push(`${functionsPhpPath.replace(process.cwd() + path.sep, '')} (missing hydration manifest localization)`);
    }
  }

  // Validate style.css metadata
  const styleCssPath = path.join(outDir, 'style.css');
  if (fs.existsSync(styleCssPath)) {
    const styleCss = fs.readFileSync(styleCssPath, 'utf8');
    if (!/Theme Name:/i.test(styleCss)) summary.warnings.push(styleCssPath.replace(process.cwd() + path.sep, ''));
    if (!/Text Domain:/i.test(styleCss)) summary.warnings.push(`${styleCssPath.replace(process.cwd() + path.sep, '')} (missing Text Domain)`);
  }

  // Validate theme.json
  try {
    const themeJsonPath = path.join(outDir, 'theme.json');
    if (fs.existsSync(themeJsonPath)) {
      const json = JSON.parse(fs.readFileSync(themeJsonPath, 'utf8'));
      if (!json.version) summary.warnings.push('theme.json (missing version)');
    }
  } catch (err) {
    summary.missing.push('theme.json');
  }

  // Validate generated page templates from .forgewp/template-*.html
  const templateDir = path.join(themeRoot, '.forgewp');
  if (fs.existsSync(templateDir)) {
    const templateFiles = fs.readdirSync(templateDir).filter((file) => /^template-.*\.html$/.test(file));
    for (const templateFile of templateFiles) {
      const slug = templateFile.replace(/^template-(.*)\.html$/, '$1');
      const templatePhp = path.join(outDir, `page-${slug}.php`);
      if (!fs.existsSync(templatePhp)) summary.missing.push(templatePhp.replace(process.cwd() + path.sep, ''));

      const expectedStaticTemplate = path.join(staticDir, templateFile);
      if (!fs.existsSync(expectedStaticTemplate)) summary.missing.push(expectedStaticTemplate.replace(process.cwd() + path.sep, ''));

      const headSource = path.join(templateDir, `template-${slug}-head.html`);
      const headOutput = path.join(staticDir, `template-${slug}-head.html`);
      if (fs.existsSync(headSource) && !fs.existsSync(headOutput)) summary.missing.push(headOutput.replace(process.cwd() + path.sep, ''));
    }
  }

  // Screenshot copy
  const screenshotSrc = path.join(themeRoot, 'cms', 'screenshot.png');
  if (fs.existsSync(screenshotSrc)) {
    const screenshotOut = path.join(outDir, 'screenshot.png');
    if (!fs.existsSync(screenshotOut)) summary.missing.push(screenshotOut.replace(process.cwd() + path.sep, ''));
  }

  // If strict, treat warnings as missing
  if (strict && summary.warnings.length > 0) {
    summary.missing.push(...summary.warnings);
    summary.warnings = [];
  }

  return summary;
}
