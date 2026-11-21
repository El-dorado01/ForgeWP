#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { createUi } from '../lib/terminal-ui.js';

import { loadProductsData } from '../lib/functions/seed-products.js';
import { loadMockData, normalizeMockSeedData } from '../lib/functions/seed-mock-data.js';
import { loadConfig } from '../lib/load-config.js';
import { findWpConfigPath } from '../lib/project-language.js';

const ui = createUi();
const { c } = ui;

const projectRoot = process.cwd();
const args = process.argv.slice(2);
const target = args[0] || 'all';

// Preview only: no configuration writes, export, network request, or database access.
if (args.includes('--dry-run')) {
  if (args.some((arg) => !['mock-data', 'mock', 'posts', '--dry-run', '--json'].includes(arg))) {
    console.error(ui.errorBlock('--dry-run only works with mock-data', `Run ${ui.command('pnpm forgewp seed mock-data --dry-run [--json]')}`));
    process.exit(1);
  }
  const config = await loadConfig(projectRoot);
  const raw = loadMockData(projectRoot);
  const seed = config.seed || {};
  const data = normalizeMockSeedData(raw, seed.mockData);
  const strategyMap = seed.mockData && typeof seed.mockData === 'object' ? seed.mockData : null;
  const report = {
    mode: 'preview-only',
    configChanged: false,
    databaseConnected: false,
    developmentOnly: seed.developmentOnly !== false,
    sideloadImages: seed.sideloadImages !== false,
    activation: 'Requires export/install; WordPress debug flag, seed markers, and database state are not inspected.',
    types: Object.entries(raw).map(([postType, entries]) => {
      const strategy = strategyMap ? strategyMap[postType] : seed.mockData;
      return {
        postType,
        fixtureCount: Array.isArray(entries) ? entries.length : 0,
        strategy: data[postType] ? (strategy === true ? 'once' : strategy) : false,
        records: data[postType] || [],
      };
    }),
  };
  if (!args.includes('--json')) console.log(`${ui.header('seed', 'mock data preview · no files changed')}${ui.detail('Disabled post types have no seed records.')}\n`);
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

console.log(ui.header('seed', 'inspect local data and configure WordPress seeding'));

const foundConfig = findWpConfigPath(projectRoot);
if (!foundConfig) {
  console.error(ui.errorBlock('No ForgeWP project found here.', 'Run seed from your theme folder (one with wp.config.ts or wp.config.js).'));
  process.exit(1);
}
const configPath = foundConfig.path;
const configFileName = foundConfig.fileName;
const productsLabel = fs.existsSync(path.join(projectRoot, 'cms', 'products.js'))
  ? 'cms/products.js'
  : 'cms/products.ts';
const mockDataLabel = fs.existsSync(path.join(projectRoot, 'cms', 'mock-data.js'))
  ? 'cms/mock-data.js'
  : 'cms/mock-data.ts';

// 1. Inspect Products
let productsCount = 0;
if (target === 'all' || target === 'products' || target === 'product') {
  const products = loadProductsData(projectRoot);
  productsCount = products.length;
  if (productsCount > 0) {
    console.log(ui.done(`${productsCount} WooCommerce product${productsCount === 1 ? '' : 's'}`, productsLabel));
  } else {
    console.log(ui.info('No WooCommerce products', productsLabel));
  }
}

// 2. Inspect Mock Data
let mockTypesCount = 0;
let totalMockPosts = 0;
if (target === 'all' || target === 'mock-data' || target === 'mock' || target === 'posts') {
  const mockData = loadMockData(projectRoot);
  const types = Object.keys(mockData);
  mockTypesCount = types.length;
  if (mockTypesCount > 0) {
    types.forEach((t) => {
      const count = Array.isArray(mockData[t]) ? mockData[t].length : 0;
      totalMockPosts += count;
      console.log(ui.done(`${count} ${t} entr${count === 1 ? 'y' : 'ies'}`, mockDataLabel));
    });
  } else {
    console.log(ui.info('No mock content', mockDataLabel));
  }
}

// 3. Check wp.config for seed settings
let configRaw = fs.readFileSync(configPath, 'utf8');
const hasSeedConfig = configRaw.includes('seed:');

if (!hasSeedConfig && (productsCount > 0 || mockTypesCount > 0)) {
  console.log(ui.step(`Enabling seeding in ${configFileName}`));
  const lines = ['  seed: {'];
  if (productsCount > 0) {
    lines.push("    products: 'once',");
  }
  if (mockTypesCount > 0) {
    lines.push("    mockData: 'once',");
  }
  lines.push('    developmentOnly: true,');
  lines.push('  },');
  const seedBlock = lines.join('\n') + '\n';

  if (configRaw.includes('defineConfig({')) {
    configRaw = configRaw.replace(/defineConfig\(\{/, `defineConfig({\n${seedBlock}`);
    fs.writeFileSync(configPath, configRaw, 'utf8');
    console.log(ui.done(`Added a seed block to ${configFileName}`, "seeds once, development only"));
  }
} else if (hasSeedConfig) {
  console.log(ui.done('Seeding already configured', configFileName));
}

console.log('');
console.log(ui.detail('This did not export the theme or connect to WordPress. The data is seeded when'));
console.log(ui.detail(`the exported theme runs, following ${configFileName}'s seed strategy and debug guard.`));
console.log(`${ui.hint('Next', `${ui.command('pnpm forgewp export')} ${c.dim('then install the theme')}`)}`);
console.log(`${ui.tip(`With WP-CLI you can seed on demand: ${ui.command('wp forgewp seed-products')} · ${ui.command('wp forgewp seed-mock-data')}`)}\n`);
