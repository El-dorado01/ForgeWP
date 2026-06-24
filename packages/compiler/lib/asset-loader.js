import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Node.js ESM Loader hook to intercept and mock static asset imports (images, styles, fonts)
 * during server-side theme compilation.
 */
export async function load(url, context, defaultLoad) {
  const cleanUrl = url.split('?')[0].split('#')[0];
  if (
    cleanUrl.endsWith('.css') ||
    cleanUrl.endsWith('.png') ||
    cleanUrl.endsWith('.jpg') ||
    cleanUrl.endsWith('.jpeg') ||
    cleanUrl.endsWith('.webp') ||
    cleanUrl.endsWith('.svg') ||
    cleanUrl.endsWith('.gif') ||
    cleanUrl.endsWith('.woff') ||
    cleanUrl.endsWith('.woff2') ||
    cleanUrl.endsWith('.ttf') ||
    cleanUrl.endsWith('.eot')
  ) {
    try {
      const filePath = fileURLToPath(cleanUrl);
      const themeRoot = process.cwd();
      const relPath = path.relative(themeRoot, filePath);
      if (!relPath.startsWith('..') && !path.isAbsolute(relPath)) {
        let normalized = relPath.replace(/\\/g, '/');
        if (normalized.startsWith('public/')) {
          normalized = normalized.substring(7); // Strip 'public/'
        }
        return {
          format: 'module',
          source: `export default "__FORGEWP_ASSET__${normalized}";`,
          shortCircuit: true,
        };
      }
    } catch (e) {
      // fallback to empty string on error
    }
    return {
      format: 'module',
      source: 'export default "";',
      shortCircuit: true,
    };
  }
  return defaultLoad(url, context, defaultLoad);
}

