import path from 'node:path';

const SUPPORTED_ADAPTERS = ['react', 'html', 'stub'];

/**
 * Resolve the adapter module path for a known framework adapter.
 * @param {string} adapterName
 */
export function resolveFrameworkAdapter(adapterName = 'react') {
  if (adapterName === 'react') {
    return './react-adapter.js';
  }

  if (adapterName === 'html') {
    return './adapters/html-adapter.js';
  }

  if (adapterName === 'stub') {
    return './adapters/stub-adapter.js';
  }

  throw new Error(
    `Unsupported framework adapter "${adapterName}". Supported adapters: ${SUPPORTED_ADAPTERS.join(', ')}`,
  );
}

/**
 * Load the selected framework adapter module.
 * @param {string} adapterName
 */
export async function loadFrameworkAdapter(adapterName = 'react') {
  const modulePath = resolveFrameworkAdapter(adapterName);
  return import(modulePath);
}
