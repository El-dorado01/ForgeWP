import assert from 'node:assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadFrameworkAdapter,
  resolveFrameworkAdapter,
} from '../lib/framework-adapter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  console.log('Checking adapter resolution...');
  const htmlPath = resolveFrameworkAdapter('html');
  assert(
    htmlPath.endsWith('html-adapter.js'),
    'html adapter should resolve to html-adapter.js',
  );

  console.log('Loading HTML adapter...');
  const htmlAdapter = await loadFrameworkAdapter('html');
  assert.strictEqual(typeof htmlAdapter.renderStaticMarkup, 'function');
  assert.strictEqual(typeof htmlAdapter.scanForHydrationIslands, 'function');
  assert.strictEqual(typeof htmlAdapter.findComponentPath, 'function');
  assert.strictEqual(typeof htmlAdapter.getHydrationRollupInputs, 'function');

  console.log('Loading React adapter...');
  const reactAdapter = await loadFrameworkAdapter('react');
  assert.strictEqual(typeof reactAdapter.renderStaticMarkup, 'function');
  assert.strictEqual(typeof reactAdapter.scanForHydrationIslands, 'function');
  assert.strictEqual(typeof reactAdapter.findComponentPath, 'function');
  assert.strictEqual(typeof reactAdapter.getHydrationRollupInputs, 'function');

  console.log('Runtime adapter contract check passed.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
