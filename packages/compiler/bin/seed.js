#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { loadProductsData } from '../lib/functions/seed-products.js';
import { loadMockData, normalizeMockSeedData } from '../lib/functions/seed-mock-data.js';
import { loadConfig } from '../lib/load-config.js';

const projectRoot = process.cwd();
const args = process.argv.slice(2);
const target = args[0] || 'all';

// Preview only: no configuration writes, export, network request, or database access.
if (args.includes('--dry-run')) {
  if (args.some((arg) => !['mock-data', 'mock', 'posts', '--dry-run', '--json'].includes(arg))) {
    console.error('Dry-run supports mock-data only: forgewp seed mock-data --dry-run [--json]');
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
  if (!args.includes('--json')) console.log('Mock seed preview — no files changed. Disabled types have no seed records.\n');
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

console.log(`\n  ${pc.bold(pc.bgGreen(pc.black('  🌱 FORGEWP DATA SEEDER  ')))} ${pc.green('— WordPress & WooCommerce Synchronization')}\n`);

const configPath = path.join(projectRoot, 'wp.config.ts');
if (!fs.existsSync(configPath)) {
  console.error(pc.red(`❌ Error: wp.config.ts not found at ${configPath}`));
  process.exit(1);
}

// 1. Inspect Products
let productsCount = 0;
if (target === 'all' || target === 'products' || target === 'product') {
  const products = loadProductsData(projectRoot);
  productsCount = products.length;
  if (productsCount > 0) {
    console.log(`  📦 ${pc.bold('WooCommerce Products')}: Found ${pc.green(productsCount)} item(s) in ${pc.cyan('cms/products.ts')}`);
  } else {
    console.log(`  📦 ${pc.bold('WooCommerce Products')}: No products declared in ${pc.yellow('cms/products.ts')}`);
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
      console.log(`  📝 ${pc.bold(`Post Type "${t}"`)}: Found ${pc.green(count)} mock entry/entries`);
    });
  } else {
    console.log(`  📝 ${pc.bold('Mock Content')}: No mock content declared in ${pc.yellow('cms/mock-data.ts')}`);
  }
}

// 3. Check wp.config.ts for seed settings
let configRaw = fs.readFileSync(configPath, 'utf8');
const hasSeedConfig = configRaw.includes('seed:');

if (!hasSeedConfig && (productsCount > 0 || mockTypesCount > 0)) {
  console.log(`\n  ⚙️  ${pc.cyan('Enabling data seeding in wp.config.ts')}...`);
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
    console.log(pc.green(`  ✅ Added tailored seed configuration to wp.config.ts`));
  }
} else if (hasSeedConfig) {
  console.log(`\n  ✅ ${pc.bold('wp.config.ts')} has active seed configuration.`);
}

console.log(`
  ${pc.bold('🚀 Synchronization Status:')}
  • Local seed configuration has been inspected. This command has not exported PHP or connected to WordPress.
  • Review wp.config.ts, then export and install the theme to generate its configured seed routines.
  • Automatic execution depends on the configured strategy, WordPress debug guard, and existing seed markers.
  • ${pc.dim('Optional:')} If using WP-CLI, you can also run:
      ${pc.cyan('wp forgewp seed-products')}
      ${pc.cyan('wp forgewp seed-mock-data')}
`);
