import path from 'node:path';

/**
 * Example adapter stub for a non-React framework.
 * Replace these methods with framework-specific rendering and hydration logic.
 */

export async function renderStaticMarkup(themeRoot) {
  throw new Error(
    'Stub adapter cannot render static markup. Implement renderStaticMarkup() for your framework.',
  );
}

export function scanForHydrationIslands(themeRoot) {
  // Return a list of kebab-case hydration island identifiers.
  return [];
}

export function findComponentPath(themeRoot, kebabName) {
  // Resolve a component source path for hydration input generation.
  return null;
}

export function getHydrationRollupInputs(themeRoot) {
  // Provide default Vite entrypoints for the theme build.
  return {
    index: path.resolve(themeRoot, 'index.html'),
  };
}

export function getCriticalFiles(themeRoot) {
  return [];
}

export async function onFresh(themeRoot) {
  // Stub adapter onFresh no-op.
}

export function onMakeBlock(themeRoot, { pascalCase, pc }) {
  console.log(pc.yellow(`\n⚠️  The Stub framework adapter does not support custom Gutenberg blocks.`));
}

export function onMakeComponent(themeRoot, { pascalCase, pc }) {
  console.log(pc.yellow(`\n⚠️  The Stub framework adapter does not support custom loop components.`));
}

export function onSyncRoutes(themeRoot, { pc }) {
  console.log(pc.gray(`\nℹ️  The Stub framework adapter route synchronization skipped.\n`));
}
