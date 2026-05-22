import { loadFrameworkAdapter } from './framework-adapter.js';

/**
 * Server-render the theme App to static HTML (no client JS in WordPress for v1).
 * @param {string} themeRoot
 * @param {string} [adapterName]
 */
export async function renderStaticMarkup(themeRoot, adapterName) {
  const adapter = await loadFrameworkAdapter(adapterName);
  if (typeof adapter.renderStaticMarkup !== 'function') {
    throw new Error(
      `Framework adapter must expose renderStaticMarkup() - adapter=${adapterName}`,
    );
  }

  return adapter.renderStaticMarkup(themeRoot);
}
