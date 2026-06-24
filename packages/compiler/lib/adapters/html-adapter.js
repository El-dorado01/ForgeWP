import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Static HTML adapter proof-of-concept.
 * This adapter reads a prebuilt static HTML entrypoint and returns it as app markup.
 */
export async function renderStaticMarkup(themeRoot) {
  const builtHtml = path.join(themeRoot, 'dist', 'index.html');
  if (!existsSync(builtHtml)) {
    throw new Error(
      `Static HTML adapter requires a built HTML entrypoint at ${builtHtml}. ` +
        'Run your static theme build first.',
    );
  }

  const appHtml = readFileSync(builtHtml, 'utf8');

  return {
    appHtml,
    headerHtml: '',
    footerHtml: '',
    headHtml: '',
    singleHtml: '',
    singleHeadHtml: '',
    notFoundHtml: '',
    archiveHtml: '',
  };
}

export function scanForHydrationIslands(themeRoot) {
  return [];
}

export function findComponentPath(themeRoot, kebabName) {
  return null;
}

export function getHydrationRollupInputs(themeRoot) {
  return {
    index: path.resolve(themeRoot, 'index.html'),
  };
}

export function getCriticalFiles(themeRoot) {
  return ['src/main.tsx'];
}

export async function onFresh(themeRoot) {
  // Static HTML adapter uses a single index.html and does not require routes.tsx or page.tsx setups.
}

export function onMakeBlock(themeRoot, { pascalCase, pc }) {
  console.log(pc.yellow(`\n⚠️  The Static HTML framework adapter does not support custom Gutenberg blocks.`));
  console.log(`   Block "${pascalCase}" was not created.\n`);
}

export function onMakeLoop(themeRoot, { pascalCase, pc }) {
  console.log(pc.yellow(`\n⚠️  The Static HTML framework adapter does not support custom loops.`));
  console.log(`   Loop "${pascalCase}" was not created.\n`);
}

export function onMakePage(themeRoot, { pascalCase, pc }) {
  console.log(pc.yellow(`\n⚠️  The Static HTML framework adapter does not support custom page templates.`));
  console.log(`   Page "${pascalCase}" was not created.\n`);
}

export function onSyncRoutes(themeRoot, { pc }) {
  console.log(pc.gray(`\nℹ️  The Static HTML framework adapter uses static HTML. Route synchronization skipped.\n`));
}
