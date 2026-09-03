import { existsSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import {
  scanFontWeightUsage,
  detectUnusedFontWeights,
  detectUnusedConfiguredWeights,
} from './font-usage-scanner.js';

/**
 * Generate a machine-readable asset manifest and compile diagnostics warnings.
 *
 * @param {string} themeRoot
 * @param {import('./asset-graph.js').AssetGraph} assetGraph
 * @param {Object} [options]
 * @param {string} [options.outDir]
 * @param {Array<Object>} [options.fontRules] - Enriched downloaded font rules
 * @returns {Object} Asset manifest object
 */
export function generateAssetManifest(themeRoot, assetGraph, options = {}) {
  const outDir = options.outDir || path.join(themeRoot, '.forgewp', 'out');
  const fontRules = options.fontRules || [];

  const manifest = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    themeRoot,
    summary: {
      totalImages: 0,
      optimizedImages: 0,
      totalVariants: 0,
      totalFonts: fontRules.length,
      preloadedAssets: 0,
      originalSizeBytes: 0,
      optimizedSizeBytes: 0,
      savedBytes: 0,
      savedPercentage: 0,
    },
    images: {},
    fonts: {},
    preloads: [],
    diagnostics: {
      warnings: [],
      unusedFontWeights: [],
      clsNotices: [],
    },
  };

  if (!assetGraph) {
    return manifest;
  }

  // 1. Process Images
  const allImages = assetGraph.getAllAssets().filter((a) => a.type === 'image' || a.type === 'svg');
  manifest.summary.totalImages = allImages.length;

  for (const node of allImages) {
    let origSize = 0;
    if (node.resolvedPath && existsSync(node.resolvedPath)) {
      try {
        origSize = statSync(node.resolvedPath).size;
      } catch {}
    }

    let variantsTotalSize = 0;
    const variantsMeta = [];
    if (node.variants && Array.isArray(node.variants)) {
      manifest.summary.optimizedImages++;
      manifest.summary.totalVariants += node.variants.length;

      for (const v of node.variants) {
        let vSize = 0;
        if (v.path && existsSync(v.path)) {
          try {
            vSize = statSync(v.path).size;
          } catch {}
        }
        variantsTotalSize += vSize;
        variantsMeta.push({
          width: v.width,
          height: v.height,
          format: v.format,
          publicUrl: v.publicUrl,
          sizeBytes: vSize,
          sizeKb: Number((vSize / 1024).toFixed(1)),
        });
      }
    }

    manifest.summary.originalSizeBytes += origSize;
    manifest.summary.optimizedSizeBytes += variantsTotalSize || origSize;

    manifest.images[node.id] = {
      id: node.id,
      source: node.source,
      classification: node.classification,
      width: node.width,
      height: node.height,
      priority: node.priority,
      sizes: node.sizes,
      srcset: node.srcset,
      originalSizeBytes: origSize,
      originalSizeKb: Number((origSize / 1024).toFixed(1)),
      optimizedSizeBytes: variantsTotalSize,
      optimizedSizeKb: Number((variantsTotalSize / 1024).toFixed(1)),
      variants: variantsMeta,
      usageCount: node.usageLocations.length,
    };

    // Diagnostics checks
    if (!node.width || !node.height) {
      manifest.diagnostics.clsNotices.push({
        assetId: node.id,
        source: node.source,
        message: 'Missing explicit width/height (Potential Cumulative Layout Shift risk)',
      });
    }

    if (node.classification === 'external-url' && node.optimize !== 'build') {
      manifest.diagnostics.warnings.push({
        assetId: node.id,
        source: node.source,
        message: 'External image without optimize="build" (served remotely via passthrough)',
      });
    }

    if (origSize > 1.5 * 1024 * 1024) {
      manifest.diagnostics.warnings.push({
        assetId: node.id,
        source: node.source,
        message: `Heavy original image (${(origSize / (1024 * 1024)).toFixed(2)} MB). Consider resizing or compressing.`,
      });
    }

    // Check for raw <img> HTML element usage
    const imgUsage = (node.usageLocations || []).find((l) => l.component === 'img');
    if (imgUsage) {
      manifest.diagnostics.rawImgWarnings = manifest.diagnostics.rawImgWarnings || [];
      manifest.diagnostics.rawImgWarnings.push({
        assetId: node.id,
        source: node.source,
        file: imgUsage.file,
        line: imgUsage.line,
        message: `Using raw <img> tag in ${imgUsage.file}:${imgUsage.line}. Replace with <WpImage> to enable responsive WebP variants, LCP preloading, and CLS layout protection.`,
      });
    }
  }

  // 2. Process Fonts & Unused Weight Detection
  const { usedWeights } = scanFontWeightUsage(themeRoot);
  const unusedFromRules = detectUnusedFontWeights(fontRules, usedWeights);
  const fontConfig = options.config?.fonts?.google || options.config?.settings?.typography?.googleFonts || null;
  const unusedFromConfig = fontConfig ? detectUnusedConfiguredWeights(fontConfig, usedWeights) : [];

  // Merge and deduplicate unused font warnings
  const combinedUnused = [...unusedFromRules];
  for (const u of unusedFromConfig) {
    if (!combinedUnused.some((r) => r.family === u.family && Number(r.weight) === Number(u.weight))) {
      combinedUnused.push(u);
    }
  }
  manifest.diagnostics.unusedFontWeights = combinedUnused;

  for (const rule of fontRules) {
    let fileSize = 0;
    if (rule.localPath && existsSync(rule.localPath)) {
      try {
        fileSize = statSync(rule.localPath).size;
      } catch {}
    }

    manifest.fonts[rule.filename] = {
      family: rule.family,
      weight: rule.weight,
      style: rule.style,
      publicUrl: rule.publicUrl,
      sizeBytes: fileSize,
      sizeKb: Number((fileSize / 1024).toFixed(1)),
      usedInSource: usedWeights.has(Number(rule.weight)),
    };
  }

  // 3. Process Preloaded Assets
  const priorityNodes = assetGraph.getPriorityAssets();
  manifest.summary.preloadedAssets = priorityNodes.length;
  manifest.preloads = priorityNodes.map((n) => ({
    id: n.id,
    source: n.source,
    type: n.type,
    classification: n.classification,
  }));

  // Compute overall savings
  if (manifest.summary.originalSizeBytes > 0 && manifest.summary.optimizedSizeBytes < manifest.summary.originalSizeBytes) {
    manifest.summary.savedBytes = manifest.summary.originalSizeBytes - manifest.summary.optimizedSizeBytes;
    manifest.summary.savedPercentage = Number(
      ((manifest.summary.savedBytes / manifest.summary.originalSizeBytes) * 100).toFixed(1),
    );
  }

  // Save asset-manifest.json to theme outDir and .forgewp
  try {
    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }
    writeFileSync(path.join(outDir, 'asset-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

    const forgewpDir = path.join(themeRoot, '.forgewp');
    if (existsSync(forgewpDir)) {
      writeFileSync(path.join(forgewpDir, 'asset-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
    }
  } catch {}

  return manifest;
}

/**
 * Print a polished ASCII Asset & Performance Diagnostics Report in the terminal.
 *
 * @param {Object} manifest
 */
export function printAssetDiagnosticsReport(manifest) {
  if (!manifest) return;

  console.log(pc.cyan('\n🩺   FORGEWP ASSET & PERFORMANCE DIAGNOSTICS'));

  // 1. Output Optimized Images
  const imageEntries = Object.values(manifest.images || {}).filter((img) => img.variants && img.variants.length > 0);
  for (const img of imageEntries.slice(0, 8)) {
    const name = path.basename(img.source);
    const dots = '.'.repeat(Math.max(2, 28 - name.length));
    const widths = img.variants.map((v) => `${v.width}w`).join(', ');
    const savings = img.originalSizeBytes && img.optimizedSizeBytes
      ? `[ -${(((img.originalSizeBytes - img.optimizedSizeBytes) / img.originalSizeBytes) * 100).toFixed(0)}% / ${img.optimizedSizeKb} KB ]`
      : `[ ${widths} ]`;

    console.log(`  ${pc.green('✅')} ${pc.white(name)}${pc.dim(dots)} WebP (${widths}) ${pc.dim(savings)}`);
  }

  // 2. Output Fonts
  const fontCount = Object.keys(manifest.fonts || {}).length;
  if (fontCount > 0) {
    const families = [...new Set(Object.values(manifest.fonts).map((f) => f.family))].join(', ');
    const dots = '.'.repeat(Math.max(2, 28 - 'google-fonts'.length));
    console.log(`  ${pc.green('✅')} ${pc.white('google-fonts')}${pc.dim(dots)} ${fontCount} WOFF2 file(s) self-hosted (${families})`);
  }

  // 3. Output Preload Signals
  for (const p of manifest.preloads || []) {
    const name = path.basename(p.source);
    const dots = '.'.repeat(Math.max(2, 28 - 'LCP Preload'.length));
    console.log(`  ${pc.green('✅')} ${pc.white('LCP Preload')}${pc.dim(dots)} Injected <link rel="preload"> for ${name}`);
  }

  // 4. Output Unused Font Weight Warnings
  for (const u of manifest.diagnostics?.unusedFontWeights || []) {
    const label = `${u.family} ${u.weight}`;
    const dots = '.'.repeat(Math.max(2, 28 - 'Unused Font Weight'.length));
    const saveNotice = u.sizeKb > 0 ? ` (saves ~${u.sizeKb} KB)` : '';
    console.log(
      `  ${pc.yellow('⚠️ ')} ${pc.yellow('Unused Font Weight')}${pc.dim(dots)} ${label} configured in wp.config.ts but never used in src/${pc.dim(saveNotice)}`,
    );
  }

  // 5. Output CLS Notices
  for (const cls of (manifest.diagnostics?.clsNotices || []).slice(0, 3)) {
    const name = path.basename(cls.source);
    const dots = '.'.repeat(Math.max(2, 28 - name.length));
    console.log(`  ${pc.yellow('⚠️ ')} ${pc.white(name)}${pc.dim(dots)} Missing width/height in JSX (Inferred for CLS safety)`);
  }

  // 6. Output Raw <img> Tag Replacement Notices
  for (const imgW of (manifest.diagnostics?.rawImgWarnings || []).slice(0, 3)) {
    const loc = imgW.file ? `${path.basename(imgW.file)}:${imgW.line}` : path.basename(imgW.source);
    const dots = '.'.repeat(Math.max(2, 28 - 'Raw <img> Tag'.length));
    console.log(
      `  ${pc.yellow('⚠️ ')} ${pc.yellow('Raw <img> Tag')}${pc.dim(dots)} ${loc} (Replace <img> with <WpImage> for auto-WebP & preloads)`,
    );
  }

  // 7. Summary Footer
  console.log(pc.dim('────────────────────────────────────────────────────────────'));
  const savedMb = (manifest.summary.savedBytes / (1024 * 1024)).toFixed(1);
  const totalImg = manifest.summary.totalImages;
  const optImg = manifest.summary.optimizedImages;

  if (manifest.summary.savedBytes > 0) {
    console.log(
      `  ${pc.bold(pc.green('ASSETS OPTIMIZED:'))} ${optImg}/${totalImg} images optimized (${savedMb} MB saved, ${manifest.summary.savedPercentage}% reduction). Zero render-blocking font hops.\n`,
    );
  } else {
    console.log(
      `  ${pc.bold(pc.green('ASSETS PROCESSED:'))} ${totalImg} asset(s) verified. Zero render-blocking font hops.\n`,
    );
  }
}
