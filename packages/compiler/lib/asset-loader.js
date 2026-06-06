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
    return {
      format: 'module',
      source: 'export default "";',
      shortCircuit: true,
    };
  }
  return defaultLoad(url, context, defaultLoad);
}
