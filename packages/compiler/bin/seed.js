#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { loadProductsData } from '../lib/functions/seed-products.js';
import { loadMockData } from '../lib/functions/seed-mock-data.js';

const projectRoot = process.cwd();
const args = process.argv.slice(2);
const target = args[0] || 'all';

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
  • Products and mock data have been compiled into your theme's PHP seeders.
  • On theme activation or WP Admin load, WordPress will safely execute the idempotent seeder.
  • ${pc.dim('Optional:')} If using WP-CLI, you can also run:
      ${pc.cyan('wp forgewp seed-products')}
      ${pc.cyan('wp forgewp seed-mock-data')}
`);
