/**
 * Generate <link rel="preload"> tags for high-priority / LCP assets.
 *
 * @param {import('./asset-graph.js').AssetGraph} assetGraph
 * @param {Object} [options]
 * @param {boolean} [options.isPhp=true] - True if generating PHP get_theme_file_uri() tags
 * @returns {string[]} Array of HTML/PHP <link rel="preload"> tag strings
 */
export function generatePreloadTags(assetGraph, options = {}) {
  if (!assetGraph) return [];

  const isPhp = options.isPhp !== false;
  const priorityAssets = assetGraph.getPriorityAssets();
  const preloadTags = [];

  for (const node of priorityAssets) {
    if (node.type === 'image') {
      if (node.classification === 'external-url') {
        preloadTags.push(
          `<link rel="preload" as="image" href="${node.source}" fetchpriority="high">`,
        );
      } else if (node.classification === 'local-static') {
        const cleanPath = node.source.replace(/^(\/|\.\/|@\/)+/, '');

        if (node.variants && node.variants.length > 0) {
          // Choose largest or default variant for fallback href
          const primaryVariant = node.variants[node.variants.length - 1];
          const primaryRel = primaryVariant.publicUrl;
          const hrefExpr = isPhp
            ? `<?php echo esc_url( get_theme_file_uri( '${primaryRel}' ) ); ?>`
            : primaryRel;

          // Build imagesrcset with get_theme_file_uri if in PHP mode
          let imagesrcsetExpr = node.srcset;
          if (isPhp && node.variants.length > 0) {
            const phpSrcsetParts = node.variants.map((v) => {
              return `<?php echo esc_url( get_theme_file_uri( '${v.publicUrl}' ) ); ?> ${v.width}w`;
            });
            imagesrcsetExpr = phpSrcsetParts.join(', ');
          }

          const sizesAttr = node.sizes ? ` imagesizes="${node.sizes}"` : '';

          preloadTags.push(
            `<link rel="preload" as="image" href="${hrefExpr}" fetchpriority="high" imagesrcset="${imagesrcsetExpr}"${sizesAttr}>`,
          );
        } else {
          const hrefExpr = isPhp
            ? `<?php echo esc_url( get_theme_file_uri( '${cleanPath}' ) ); ?>`
            : cleanPath;

          preloadTags.push(
            `<link rel="preload" as="image" href="${hrefExpr}" fetchpriority="high">`,
          );
        }
      }
    } else if (node.type === 'font') {
      const cleanPath = node.source.replace(/^(\/|\.\/|@\/)+/, '');
      const hrefExpr = isPhp
        ? `<?php echo esc_url( get_theme_file_uri( '${cleanPath}' ) ); ?>`
        : cleanPath;

      preloadTags.push(
        `<link rel="preload" as="font" type="font/woff2" crossorigin href="${hrefExpr}">`,
      );
    }
  }

  return preloadTags;
}
