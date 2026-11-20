import { loadFrameworkAdapter } from './framework-adapter.js';

/** Build through the selected adapter; never assume an unknown adapter uses Vite. */
export async function buildAdapterAssets(themeRoot, adapterName = 'react', options = {}) {
  const adapter = options.adapter || (await loadFrameworkAdapter(adapterName));
  const hookName = options.skipBuild ? 'readBuildAssets' : 'buildAssets';
  if (typeof adapter[hookName] !== 'function') {
    throw new Error(`Framework adapter "${adapterName}" does not implement ${hookName}().`);
  }
  const assets = await adapter[hookName](themeRoot, {
    packageManager: options.packageManager,
    verbose: options.verbose,
  });
  if (!assets || typeof assets.cssFile !== 'string' || !assets.cssFile.trim() ||
      (assets.jsFile !== undefined && (typeof assets.jsFile !== 'string' || !assets.jsFile.trim()))) {
    throw new Error(`Framework adapter "${adapterName}" returned invalid build assets: expected cssFile and optional jsFile paths.`);
  }
  return assets;
}
