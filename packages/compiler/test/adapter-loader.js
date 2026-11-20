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
  assert.strictEqual(typeof htmlAdapter.buildAssets, 'function');
  assert.strictEqual(typeof htmlAdapter.readBuildAssets, 'function');
  assert.strictEqual(typeof htmlAdapter.packageAssets, 'function');
  assert.strictEqual(typeof htmlAdapter.scanForHydrationIslands, 'function');
  assert.strictEqual(typeof htmlAdapter.findComponentPath, 'function');
  assert.strictEqual(typeof htmlAdapter.getHydrationRollupInputs, 'function');

  console.log('Loading React adapter...');
  const reactAdapter = await loadFrameworkAdapter('react');
  assert.strictEqual(typeof reactAdapter.renderStaticMarkup, 'function');
  assert.strictEqual(typeof reactAdapter.buildAssets, 'function');
  assert.strictEqual(typeof reactAdapter.readBuildAssets, 'function');
  assert.strictEqual(typeof reactAdapter.packageAssets, 'function');
  assert.strictEqual(typeof reactAdapter.scanForHydrationIslands, 'function');
  assert.strictEqual(typeof reactAdapter.findComponentPath, 'function');
  assert.strictEqual(typeof reactAdapter.getHydrationRollupInputs, 'function');

  console.log('Loading Next.js adapter...');
  const nextPath = resolveFrameworkAdapter('nextjs');
  assert(
    nextPath.endsWith('next-adapter.js'),
    'nextjs adapter should resolve to next-adapter.js',
  );
  const nextAdapter = await loadFrameworkAdapter('nextjs');
  assert.strictEqual(typeof nextAdapter.renderStaticMarkup, 'function');
  assert.strictEqual(typeof nextAdapter.buildAssets, 'function');
  assert.strictEqual(typeof nextAdapter.readBuildAssets, 'function');
  assert.strictEqual(typeof nextAdapter.packageAssets, 'function');
  assert.strictEqual(typeof nextAdapter.scanForHydrationIslands, 'function');
  assert.strictEqual(typeof nextAdapter.findComponentPath, 'function');
  assert.strictEqual(typeof nextAdapter.getHydrationRollupInputs, 'function');
  assert.strictEqual(typeof nextAdapter.getCriticalFiles, 'function');

  console.log('Runtime adapter contract check passed.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
