import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';

const traverse = traverseModule.default || traverseModule;

const IGNORED_DIRS = new Set(['node_modules', '.next', 'out', '.forgewp', 'dist', '.git']);
const SOURCE_EXTS = ['.tsx', '.jsx', '.ts', '.js'];

function toKebabCase(name) {
  return String(name || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

function toPascalCase(kebab) {
  return String(kebab || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function walkFiles(dir, filterExt, results = []) {
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    if (IGNORED_DIRS.has(entry)) continue;
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkFiles(full, filterExt, results);
    } else if (!filterExt || filterExt.has(path.extname(entry))) {
      results.push(full);
    }
  }
  return results;
}

function loadEsbuild(themeRoot) {
  const candidates = [
    path.join(themeRoot, 'package.json'),
    path.resolve(import.meta.dirname, '..', 'package.json'),
    path.resolve(import.meta.dirname, '..', '..', '..', 'package.json'),
  ];
  for (const pkgPath of candidates) {
    if (!existsSync(pkgPath)) continue;
    const req = createRequire(pkgPath);
    try {
      return req('esbuild');
    } catch {}
    try {
      const vitePkg = req.resolve('vite/package.json');
      return createRequire(vitePkg)('esbuild');
    } catch {}
  }
  throw new Error(
    'FORGEWP_ESBUILD_NOT_FOUND: Could not resolve esbuild for Next.js hydration island bundling.',
  );
}

function resolveLocalImportPath(specifier, fromFile, resolvedRoot) {
  let base = null;
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    base = path.resolve(path.dirname(fromFile), specifier);
  } else if (specifier.startsWith('@/')) {
    const srcCandidate = path.join(resolvedRoot, 'src', specifier.slice(2));
    const rootCandidate = path.join(resolvedRoot, specifier.slice(2));
    base = existsSync(path.dirname(srcCandidate)) ? srcCandidate : rootCandidate;
  } else {
    return null;
  }

  const stripped = base.replace(/\.(?:js|jsx|mjs|cjs)$/, '');
  const candidates = [
    base,
    ...SOURCE_EXTS.map((ext) => `${stripped}${ext}`),
    ...SOURCE_EXTS.map((ext) => path.join(stripped, `index${ext}`)),
  ];

  for (const candidate of candidates) {
    try {
      if (existsSync(candidate) && statSync(candidate).isFile()) {
        return candidate;
      }
    } catch {}
  }
  return null;
}

/**
 * Discover explicit `<Hydrate>` island identifiers and their resolved source component
 * file mappings via AST import-binding analysis (supporting aliased/namespace `Hydrate`
 * imports, custom `id`s that differ from component filenames, conflict detection, and
 * parse-error diagnostics).
 *
 * @param {string} themeRoot
 * @returns {{
 *   islands: string[],
 *   mappings: Map<string, { id: string, filePath: string, componentName: string, sourceFile: string }>,
 *   diagnostics: Array<{ code: string, severity: 'error' | 'warning', file: string, message: string }>
 * }}
 */
export function scanNextHydrationIslandMappings(themeRoot) {
  const resolvedRoot = path.resolve(themeRoot);
  const islands = new Set();
  const mappings = new Map();
  const diagnostics = [];

  const scanDirs = [
    path.join(resolvedRoot, 'src'),
    path.join(resolvedRoot, 'app'),
    path.join(resolvedRoot, 'components'),
  ].filter((d) => existsSync(d));

  const seenFiles = new Set();
  for (const dir of scanDirs) {
    for (const file of walkFiles(dir, new Set(SOURCE_EXTS))) {
      if (seenFiles.has(file)) continue;
      seenFiles.add(file);
      const code = readFileSync(file, 'utf8');
      if (!code.includes('Hydrate')) continue;

      const relFile = path.relative(resolvedRoot, file).replace(/\\/g, '/');
      let ast;
      try {
        ast = parse(code, {
          sourceType: 'module',
          plugins: ['typescript', 'jsx'],
        });
      } catch (err) {
        const msg = `FORGEWP_NEXT_ISLAND_PARSE_ERROR: Failed to parse "${relFile}" while scanning <Hydrate> islands: ${err?.message || err}`;
        diagnostics.push({
          code: 'FORGEWP_NEXT_ISLAND_PARSE_ERROR',
          severity: 'error',
          file: relFile,
          message: msg,
        });
        throw new Error(msg);
      }

      // 1. Collect verified Hydrate import bindings and local component imports
      const hydrateLocalNames = new Set();
      const hydrateNamespaces = new Set();
      const localComponentImports = new Map(); // localName -> resolvedFilePath

      for (const node of ast.program.body) {
        if (node.type !== 'ImportDeclaration') continue;
        const src = node.source?.value || '';
        const isForgeHydrateSource =
          src === '@forgewp/react' ||
          src === '@forgewp/react/server' ||
          src.endsWith('/Hydrate') ||
          src.endsWith('/Hydrate.tsx') ||
          src.endsWith('/Hydrate.js');

        if (isForgeHydrateSource) {
          for (const spec of node.specifiers) {
            if (
              spec.type === 'ImportSpecifier' &&
              spec.imported?.type === 'Identifier' &&
              spec.imported.name === 'Hydrate'
            ) {
              hydrateLocalNames.add(spec.local.name);
            } else if (spec.type === 'ImportDefaultSpecifier' && src.includes('Hydrate')) {
              hydrateLocalNames.add(spec.local.name);
            } else if (spec.type === 'ImportNamespaceSpecifier') {
              hydrateNamespaces.add(spec.local.name);
            }
          }
          continue;
        }

        const resolvedComp = resolveLocalImportPath(src, file, resolvedRoot);
        if (resolvedComp) {
          for (const spec of node.specifiers) {
            if (
              spec.type === 'ImportDefaultSpecifier' ||
              spec.type === 'ImportSpecifier'
            ) {
              localComponentImports.set(spec.local.name, resolvedComp);
            }
          }
        }
      }

      // If no import declaration was found (e.g. ambient/synthetic snippet), fall back to literal `Hydrate`
      const allowLiteralFallback =
        hydrateLocalNames.size === 0 && hydrateNamespaces.size === 0;

      traverse(ast, {
        JSXElement(nodePath) {
          const opening = nodePath.node.openingElement;
          let isHydrateTag = false;
          if (opening.name.type === 'JSXIdentifier') {
            isHydrateTag =
              hydrateLocalNames.has(opening.name.name) ||
              (allowLiteralFallback && opening.name.name === 'Hydrate');
          } else if (
            opening.name.type === 'JSXMemberExpression' &&
            opening.name.object.type === 'JSXIdentifier' &&
            opening.name.property.type === 'JSXIdentifier'
          ) {
            isHydrateTag =
              hydrateNamespaces.has(opening.name.object.name) &&
              opening.name.property.name === 'Hydrate';
          }
          if (!isHydrateTag) return;

          let explicitId = null;
          for (const attr of opening.attributes) {
            if (
              attr.type === 'JSXAttribute' &&
              attr.name.type === 'JSXIdentifier' &&
              attr.name.name === 'id' &&
              attr.value?.type === 'StringLiteral'
            ) {
              explicitId = attr.value.value;
            }
          }

          const childEl = nodePath.node.children.find((c) => c.type === 'JSXElement');
          const childName =
            childEl?.openingElement?.name?.type === 'JSXIdentifier'
              ? childEl.openingElement.name.name
              : null;

          const resolvedId = explicitId
            ? toKebabCase(explicitId)
            : childName
              ? toKebabCase(childName)
              : null;

          if (!resolvedId) return;
          islands.add(resolvedId);

          if (childName && localComponentImports.has(childName)) {
            const compFilePath = localComponentImports.get(childName);
            const existing = mappings.get(resolvedId);
            if (existing && existing.filePath !== compFilePath) {
              throw new Error(
                `FORGEWP_NEXT_ISLAND_CONFLICT: Hydration island id "${resolvedId}" maps to multiple components: "${path.relative(resolvedRoot, existing.filePath)}" (in ${existing.sourceFile}) and "${path.relative(resolvedRoot, compFilePath)}" (in ${relFile}). Assign distinct <Hydrate id="..."> values.`,
              );
            }
            mappings.set(resolvedId, {
              id: resolvedId,
              filePath: compFilePath,
              componentName: childName,
              sourceFile: relFile,
            });
          }
        },
      });
    }
  }

  // 2. Also inspect built static HTML under out/ for emitted data-forgewp-hydrate attributes.
  const outDir = path.join(resolvedRoot, 'out');
  if (existsSync(outDir)) {
    for (const htmlFile of walkFiles(outDir, new Set(['.html']))) {
      const html = readFileSync(htmlFile, 'utf8');
      for (const match of html.matchAll(/data-forgewp-hydrate="([a-z0-9-]+)"/gi)) {
        islands.add(match[1].toLowerCase());
      }
    }
  }

  return {
    islands: Array.from(islands).sort(),
    mappings,
    diagnostics,
  };
}

/**
 * Discover explicit `<Hydrate>` island identifiers in a Next.js App Router project.
 *
 * Returns `[]` when no explicit `<Hydrate>` boundaries exist, keeping exported themes
 * zero-JS by default.
 *
 * @param {string} themeRoot
 * @returns {string[]}
 */
export function scanNextHydrationIslands(themeRoot) {
  return scanNextHydrationIslandMappings(themeRoot).islands;
}

const INTERACTIVE_CLIENT_HOOK_RE =
  /\b(?:useState|useEffect|useReducer|useRef|useLayoutEffect|useTransition|useOptimistic|useActionState)\s*\(/;
const INTERACTIVE_CLIENT_EVENT_RE =
  /\bon(?:Click|Change|Submit|Input|KeyDown|KeyUp|MouseEnter|MouseLeave|Focus|Blur|PointerDown|PointerUp|TouchStart)\s*=/;
const INTERACTIVE_BROWSER_GLOBAL_RE =
  /\b(?:window|document|localStorage|sessionStorage|IntersectionObserver|ResizeObserver)\b/;

/**
 * Determine whether a Next.js source file is an interactive `'use client'` component
 * eligible for automatic hydration island bundling (excluding `src/blocks/`, `defineBlock`,
 * and explicit `@forgewp-no-hydrate` opt-outs).
 *
 * @param {string} filePath
 * @param {string} [source]
 */
export function isInteractiveNextClientFile(filePath, source) {
  const normalized = String(filePath || '').replace(/\\/g, '/');
  if (/(?:^|\/)blocks\//.test(normalized)) return false;
  const code =
    typeof source === 'string'
      ? source
      : existsSync(filePath)
        ? readFileSync(filePath, 'utf8')
        : '';
  if (!/^\s*['"]use client['"]\s*;?/m.test(code)) return false;
  if (/\bdefineBlock\s*\(/.test(code)) return false;
  if (/@forgewp-no-hydrate\b|\bforgewpNoHydrate\b/.test(code)) return false;
  return (
    INTERACTIVE_CLIENT_HOOK_RE.test(code) ||
    INTERACTIVE_CLIENT_EVENT_RE.test(code) ||
    INTERACTIVE_BROWSER_GLOBAL_RE.test(code)
  );
}

/**
 * Scan a Next.js project for interactive `'use client'` components (outside `src/blocks/`)
 * that are candidates for `withForgeWP({}, { autoHydrate: true })`.
 *
 * @param {string} themeRoot
 */
export function scanNextAutoHydrationIslands(themeRoot) {
  const resolvedRoot = path.resolve(themeRoot);
  const dirs = [
    path.join(resolvedRoot, 'src', 'components'),
    path.join(resolvedRoot, 'components'),
  ].filter((d) => existsSync(d));

  const found = [];
  const seen = new Set();
  for (const dir of dirs) {
    for (const file of walkFiles(dir, new Set(SOURCE_EXTS))) {
      if (!isInteractiveNextClientFile(file)) continue;
      const stem = path.basename(file, path.extname(file));
      const id = toKebabCase(stem === 'index' ? path.basename(path.dirname(file)) : stem);
      if (seen.has(id)) continue;
      seen.add(id);
      found.push({
        id,
        file: path.relative(resolvedRoot, file).replace(/\\/g, '/'),
      });
    }
  }
  return found.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Resolve a kebab-case hydration island identifier to its component source file
 * inside a Next.js App Router project. Checks explicit import-binding mappings first
 * before falling back to filename conventions.
 *
 * @param {string} themeRoot
 * @param {string} kebabName
 * @param {Map<string, { filePath: string }>} [knownMappings]
 * @returns {string | null}
 */
export function findNextIslandComponentPath(themeRoot, kebabName, knownMappings) {
  const resolvedRoot = path.resolve(themeRoot);
  const mapped = knownMappings
    ? knownMappings.get(kebabName)
    : scanNextHydrationIslandMappings(resolvedRoot).mappings.get(kebabName);
  if (mapped?.filePath && existsSync(mapped.filePath)) {
    return mapped.filePath;
  }

  const pascal = toPascalCase(kebabName);
  const candidateDirs = [
    path.join(resolvedRoot, 'src', 'components'),
    path.join(resolvedRoot, 'components'),
    path.join(resolvedRoot, 'src', 'app', 'components'),
  ];

  // Direct lookup first.
  for (const dir of candidateDirs) {
    if (!existsSync(dir)) continue;
    for (const base of [pascal, kebabName]) {
      for (const ext of SOURCE_EXTS) {
        const full = path.join(dir, `${base}${ext}`);
        if (existsSync(full)) return full;
        const idx = path.join(dir, base, `index${ext}`);
        if (existsSync(idx)) return idx;
      }
    }
  }

  // Recursive fallback under component directories.
  const targets = new Set([pascal.toLowerCase(), kebabName.toLowerCase()]);
  for (const dir of candidateDirs) {
    for (const file of walkFiles(dir, new Set(SOURCE_EXTS))) {
      const stem = path.basename(file, path.extname(file)).toLowerCase();
      if (targets.has(stem) || toKebabCase(path.basename(file, path.extname(file))) === kebabName) {
        return file;
      }
    }
  }

  return null;
}

/**
 * Bundle declared `'use client'` ForgeWP hydration islands into lightweight standalone
 * browser ESM chunks + shared React runtime entry using esbuild — without shipping
 * Next.js's `_next/static/chunks/*` RSC runtime into WordPress.
 *
 * @param {string} themeRoot
 * @param {string} outDir
 * @param {string[]} islands
 */
export async function bundleNextIslands(themeRoot, outDir, islands = []) {
  const uniqueIslands = Array.from(new Set(islands)).filter(Boolean).sort();
  if (uniqueIslands.length === 0) {
    return {
      assetFiles: {},
      clientEntries: {},
      runtimeEntry: undefined,
    };
  }

  const resolvedRoot = path.resolve(themeRoot);
  const esbuild = loadEsbuild(resolvedRoot);
  const islandsOutDir = path.join(outDir, 'assets', 'islands');
  mkdirSync(islandsOutDir, { recursive: true });

  const resolveCandidates = [
    resolvedRoot,
    path.resolve(import.meta.dirname, '..'),
    path.resolve(import.meta.dirname, '..', '..', '..'),
  ];
  const resolveBase =
    resolveCandidates.find((dir) => existsSync(path.join(dir, 'node_modules', 'react'))) ||
    resolvedRoot;

  // 1. Build a shared React/ReactDOM runtime entry exposing window.React & window.ReactDOM
  //    for assets/forgewp-hydrator.js.
  const runtimeRel = 'assets/islands/react-runtime.js';
  await esbuild.build({
    stdin: {
      contents: `import * as React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
if (typeof window !== 'undefined') {
  window.React = React;
  window.ReactDOM = Object.assign(window.ReactDOM || {}, { createRoot, hydrateRoot });
}
export { React, createRoot, hydrateRoot };
`,
      resolveDir: resolveBase,
      loader: 'js',
    },
    bundle: true,
    format: 'esm',
    platform: 'browser',
    minify: true,
    define: { 'process.env.NODE_ENV': '"production"' },
    outfile: path.join(outDir, runtimeRel),
  });

  // 2. Shared plugin so island bundles reuse window.React (avoiding duplicate React copies),
  //    map `@/` -> `src/`, resolve `.js` -> `.ts`/`.tsx`, map `next/link` -> plain `<a>`,
  //    and reject server-only modules inside client islands.
  const islandPlugin = {
    name: 'forgewp-next-island-bridge',
    setup(build) {
      build.onResolve({ filter: /^(server-only|next\/headers)$/ }, (args) => {
        throw new Error(
          `FORGEWP_ISLAND_SERVER_IMPORT: Client hydration island cannot import server-only module "${args.path}".`,
        );
      });

      build.onResolve({ filter: /^react$/ }, () => ({
        path: 'react',
        namespace: 'forgewp-window-react',
      }));
      build.onLoad({ filter: /^react$/, namespace: 'forgewp-window-react' }, () => ({
        contents: `const R = globalThis.React;
export default R;
export const {
  useState, useEffect, useRef, useMemo, useCallback, useContext, useReducer,
  useLayoutEffect, useId, useTransition, useDeferredValue,
  createElement, Fragment, createContext, forwardRef, memo, Component, Children, cloneElement, isValidElement
} = R;
`,
        loader: 'js',
      }));

      build.onResolve({ filter: /^react\/jsx-(dev-)?runtime$/ }, () => ({
        path: 'react-jsx-runtime',
        namespace: 'forgewp-window-jsx',
      }));
      build.onLoad({ filter: /.*/, namespace: 'forgewp-window-jsx' }, () => ({
        contents: `const R = globalThis.React;
export const Fragment = R.Fragment;
export function jsx(type, props, key) {
  const next = key !== undefined ? Object.assign({}, props, { key }) : props;
  return R.createElement(type, next);
}
export const jsxs = jsx;
export const jsxDEV = jsx;
`,
        loader: 'js',
      }));

      build.onResolve({ filter: /^next\/link$/ }, () => ({
        path: 'next/link',
        namespace: 'forgewp-next-link-shim',
      }));
      build.onLoad({ filter: /.*/, namespace: 'forgewp-next-link-shim' }, () => ({
        contents: `const R = globalThis.React;
export default function Link({ href, prefetch, scroll, shallow, replace, passHref, legacyBehavior, as, locale, ...rest }) {
  const resolvedHref = typeof href === 'string' ? href : (href && href.pathname) || '#';
  return R.createElement('a', Object.assign({ href: resolvedHref }, rest));
}
`,
        loader: 'js',
      }));

      build.onResolve({ filter: /^@\// }, (args) => {
        const base = path.join(resolvedRoot, 'src', args.path.slice(2));
        for (const candidate of [base, ...SOURCE_EXTS.map((e) => base + e), ...SOURCE_EXTS.map((e) => path.join(base, 'index' + e))]) {
          if (existsSync(candidate) && statSync(candidate).isFile()) {
            return { path: candidate };
          }
        }
        return null;
      });

      build.onResolve({ filter: /\.js$/ }, (args) => {
        if (!args.importer) return null;
        const resolved = path.resolve(path.dirname(args.importer), args.path);
        if (existsSync(resolved)) return null;
        for (const ext of ['.ts', '.tsx']) {
          const tsCandidate = resolved.slice(0, -3) + ext;
          if (existsSync(tsCandidate)) return { path: tsCandidate };
        }
        return null;
      });
    },
  };

  const { mappings } = scanNextHydrationIslandMappings(resolvedRoot);
  const clientEntries = {};
  const assetFiles = { [runtimeRel]: runtimeRel };

  for (const island of uniqueIslands) {
    const compPath = findNextIslandComponentPath(resolvedRoot, island, mappings);
    if (!compPath) {
      throw new Error(
        `FORGEWP_NEXT_ISLAND_NOT_FOUND: Could not find source component for <Hydrate> island "${island}" under src/components/ or via <Hydrate> import bindings.`,
      );
    }

    const islandRel = `assets/islands/${island}.js`;
    await esbuild.build({
      entryPoints: [compPath],
      bundle: true,
      format: 'esm',
      platform: 'browser',
      jsx: 'automatic',
      minify: true,
      define: { 'process.env.NODE_ENV': '"production"' },
      plugins: [islandPlugin],
      outfile: path.join(outDir, islandRel),
    });

    clientEntries[island] = islandRel;
    assetFiles[islandRel] = islandRel;
  }

  return {
    assetFiles,
    clientEntries,
    runtimeEntry: runtimeRel,
  };
}
