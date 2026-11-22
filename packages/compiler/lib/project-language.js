import { existsSync, writeFileSync } from 'node:fs';
import { stripTsFromScript, stripTsFromTsx } from './ts-to-js.js';

import path from 'node:path';

export const WP_CONFIG_CANDIDATES = [
  'wp.config.ts',
  'wp.config.mts',
  'wp.config.js',
  'wp.config.mjs',
  'wp.config.cjs',
];

/**
 * Locate the ForgeWP theme config file in `themeRoot`, supporting both
 * TypeScript (`wp.config.ts`, `wp.config.mts`) and JavaScript (`wp.config.js`,
 * `wp.config.mjs`, `wp.config.cjs`).
 *
 * @param {string} themeRoot
 * @returns {{ path: string, fileName: string, ext: string } | null}
 */
export function findWpConfigPath(themeRoot) {
  if (!themeRoot) return null;
  for (const fileName of WP_CONFIG_CANDIDATES) {
    const fullPath = path.join(themeRoot, fileName);
    if (existsSync(fullPath)) {
      return {
        path: fullPath,
        fileName,
        ext: path.extname(fileName),
      };
    }
  }
  return null;
}

/**
 * Find an existing file matching `basePathWithoutExt` across `extensions`.
 *
 * @param {string} basePathWithoutExt
 * @param {string[]} [extensions]
 * @returns {string | null}
 */
export function findFileWithExtensions(
  basePathWithoutExt,
  extensions = ['.ts', '.tsx', '.mjs', '.js', '.jsx', '.json'],
) {
  for (const ext of extensions) {
    const candidate = `${basePathWithoutExt}${ext}`;
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Detect whether a ForgeWP project is authored in TypeScript or JavaScript.
 *
 * Precedence:
 *  1. `tsconfig.json` present → `'ts'`
 *  2. `wp.config.ts` / `wp.config.mts` present → `'ts'`
 *  3. `jsconfig.json` or `wp.config.{js,mjs,cjs}` present → `'js'`
 *  4. JS entry points (`src/main.jsx`, `src/app/layout.jsx`, `app/layout.jsx`)
 *     without TS equivalents → `'js'`
 *  5. Default → `'ts'` (preserves backward compatibility for empty directories)
 *
 * @param {string} themeRoot
 * @returns {'ts' | 'js'}
 */
export function detectProjectLanguage(themeRoot) {
  if (!themeRoot) return 'ts';
  if (existsSync(path.join(themeRoot, 'tsconfig.json'))) return 'ts';
  if (
    existsSync(path.join(themeRoot, 'wp.config.ts')) ||
    existsSync(path.join(themeRoot, 'wp.config.mts'))
  ) {
    return 'ts';
  }
  if (
    existsSync(path.join(themeRoot, 'jsconfig.json')) ||
    existsSync(path.join(themeRoot, 'wp.config.js')) ||
    existsSync(path.join(themeRoot, 'wp.config.mjs')) ||
    existsSync(path.join(themeRoot, 'wp.config.cjs'))
  ) {
    return 'js';
  }
  const tsEntries = [
    'src/main.tsx',
    'src/app/layout.tsx',
    'app/layout.tsx',
    'src/app/page.tsx',
    'app/page.tsx',
  ];
  const jsEntries = [
    'src/main.jsx',
    'src/main.js',
    'src/app/layout.jsx',
    'src/app/layout.js',
    'app/layout.jsx',
    'app/layout.js',
    'src/app/page.jsx',
    'src/app/page.js',
    'app/page.jsx',
    'app/page.js',
  ];
  if (tsEntries.some((rel) => existsSync(path.join(themeRoot, rel)))) {
    return 'ts';
  }
  if (jsEntries.some((rel) => existsSync(path.join(themeRoot, rel)))) {
    return 'js';
  }
  return 'ts';
}

/**
 * Convenience extension map for scaffolding commands.
 *
 * @param {string} themeRoot
 * @returns {{ lang: 'ts' | 'js', isJs: boolean, scriptExt: '.ts' | '.js', jsxExt: '.tsx' | '.jsx' }}
 */
export function getProjectExtensions(themeRoot) {
  const lang = detectProjectLanguage(themeRoot);
  const isJs = lang === 'js';
  return {
    lang,
    isJs,
    scriptExt: isJs ? '.js' : '.ts',
    jsxExt: isJs ? '.jsx' : '.tsx',
  };
}


/**
 * Write a scaffolded `.ts` or `.tsx` source file, automatically stripping
 * TypeScript syntax and adjusting the file extension to `.js` / `.jsx` when
 * `themeRoot` is a JavaScript project.
 *
 * @param {string} themeRoot
 * @param {string} tsTargetPath
 * @param {string} tsSource
 * @returns {{ writtenPath: string, isJs: boolean }}
 */
export function writeScaffoldFile(themeRoot, tsTargetPath, tsSource) {
  const { isJs } = getProjectExtensions(themeRoot);
  if (!isJs) {
    writeFileSync(tsTargetPath, tsSource, 'utf8');
    return { writtenPath: tsTargetPath, isJs: false };
  }
  const isJsx = tsTargetPath.endsWith('.tsx') || tsTargetPath.endsWith('.jsx');
  const jsTargetPath = tsTargetPath.endsWith('.tsx')
    ? tsTargetPath.slice(0, -4) + '.jsx'
    : tsTargetPath.endsWith('.ts')
      ? tsTargetPath.slice(0, -3) + '.js'
      : tsTargetPath;
  // Same converter create-forgewp uses for --js scaffolds (lib/ts-to-js.js).
  const transformed = isJsx ? stripTsFromTsx(tsSource) : stripTsFromScript(tsSource);
  writeFileSync(jsTargetPath, transformed, 'utf8');
  return { writtenPath: jsTargetPath, isJs: true };
}
