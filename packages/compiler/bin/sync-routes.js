#!/usr/bin/env node

import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { createUi } from '../lib/terminal-ui.js';

import { loadConfig } from '../lib/load-config.js';
import { loadFrameworkAdapter } from '../lib/framework-adapter.js';
import { loadMenusData } from '../lib/functions/load-menus.js';

const ui = createUi();
const { c } = ui;

console.log(ui.header('sync:routes', 'scaffold pages from your menus'));

const projectRoot = process.cwd();
const args = process.argv.slice(2);
const isForce = args.includes('--force') || args.includes('--override');

// 1. Locate menus configuration file (cms/menus.ts preferred, cms/menus.json fallback)
const menusTsPath = path.join(projectRoot, 'cms', 'menus.ts');
const menusPath = path.join(projectRoot, 'cms', 'menus.json');
let menus = loadMenusData(projectRoot);

const hasMenuLocations = Object.keys(menus).some(
  (k) => !k.startsWith('_') && Array.isArray(menus[k]),
);

if (hasMenuLocations) {
  if (existsSync(menusTsPath)) {
    console.log(ui.info('Reading menus', 'cms/menus.ts'));
  } else {
    console.log(ui.info('Reading menus', 'cms/menus.json'));
  }
} else {
  menus = {
    _comment:
      "⚡ ForgeWP Navigation Menus — Edit this file to add/remove links in local dev. Run 'pnpm forgewp sync:routes' to auto-scaffold corresponding React pages!",
    primary: [
      { title: 'Home', url: '/' },
      { title: 'New', url: '/new' },
      { title: 'Men', url: '/men' },
      { title: 'Women', url: '/women' },
    ],
    utility: [
      { title: 'Help', url: '/help' },
      { title: 'Sign In', url: '/login' },
    ],
  };

  const dir = path.dirname(menusPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(menusPath, JSON.stringify(menus, null, 2), 'utf8');
  console.log(ui.done('Created a starter menu', 'cms/menus.json'));
}

// 2. Extract unique local paths and sanitize them recursively
const routesToScaffold = [];
const seenUrls = new Set(['/', '']);

function extractRoutesFromItems(items) {
  if (!Array.isArray(items)) return;
  for (const item of items) {
    if (item && item.url && typeof item.url === 'string') {
      let url = item.url.trim();

      // Skip external, anchors, mailto, etc.
      if (
        !url.startsWith('http://') &&
        !url.startsWith('https://') &&
        !url.startsWith('#') &&
        !url.startsWith('mailto:') &&
        !url.startsWith('tel:')
      ) {
        // Menu fragments navigate within an existing page; they are not pages
        // that should be scaffolded by route synchronization.
        url = url.split(/[?#]/)[0] || '/';

        // Normalize starting slash
        if (!url.startsWith('/')) {
          url = '/' + url;
        }

        if (url === '/') {
          if (item && Array.isArray(item.children)) {
            extractRoutesFromItems(item.children);
          }
          continue;
        }

        if (!seenUrls.has(url)) {
          seenUrls.add(url);
          routesToScaffold.push({
            path: url,
            title: item.title || url.replace('/', ''),
          });
        }
      }
    }

    if (item && Array.isArray(item.children)) {
      extractRoutesFromItems(item.children);
    }
  }
}

for (const [location, items] of Object.entries(menus)) {
  if (!location.startsWith('_')) {
    extractRoutesFromItems(items);
  }
}

if (routesToScaffold.length === 0) {
  console.log(`${ui.info('Nothing to sync', 'your menus have no local page links')}\n`);
  process.exit(0);
}

// Load configuration and invoke adapter
let frameworkAdapter = 'react';
try {
  const config = await loadConfig(projectRoot);
  frameworkAdapter = config.frameworkAdapter || 'react';
} catch (err) {
  // Use default
}

try {
  const adapterModule = await loadFrameworkAdapter(frameworkAdapter);
  const adapter = adapterModule.default || adapterModule;
  if (typeof adapter.onSyncRoutes === 'function') {
    await adapter.onSyncRoutes(projectRoot, {
      routesToScaffold,
      isForce,
      pc: c,
    });
  } else {
    console.log(ui.warn(`The ${frameworkAdapter} adapter does not support sync:routes`));
  }
} catch (err) {
  console.error(ui.errorBlock('sync:routes failed', err.message));
  process.exit(1);
}
