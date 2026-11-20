import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { extractNextStaticMarkup } from './next-route-extractor.js';
import { applyVerifiedNextLinksToMarkup } from './next-link-transform.js';
import { packageNextAssets } from './next-export-experimental.js';

const NEXT_CONFIG_CANDIDATES = [
  'next.config.ts',
  'next.config.mjs',
  'next.config.js',
  'next.config.cjs',
];

const NEXT_LAYOUT_CANDIDATES = [
  'src/app/layout.tsx',
  'src/app/layout.jsx',
  'src/app/layout.ts',
  'src/app/layout.js',
  'app/layout.tsx',
  'app/layout.jsx',
  'app/layout.ts',
  'app/layout.js',
];

const MIDDLEWARE_CANDIDATES = [
  'middleware.ts',
  'middleware.js',
  'middleware.mjs',
  'src/middleware.ts',
  'src/middleware.js',
  'src/middleware.mjs',
  'proxy.ts',
  'proxy.js',
  'src/proxy.ts',
  'src/proxy.js',
];

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const IGNORED_DIRS = new Set(['node_modules', '.next', 'out', '.forgewp', 'dist', '.git']);

function walkSourceFiles(dir, base = dir, results = []) {
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    if (IGNORED_DIRS.has(entry)) continue;
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkSourceFiles(full, base, results);
    } else {
      results.push({
        full,
        rel: path.relative(base, full).replace(/\\/g, '/'),
      });
    }
  }
  return results;
}

function resolveAppDir(themeRoot) {
  const srcApp = path.join(themeRoot, 'src', 'app');
  if (existsSync(srcApp)) return { abs: srcApp, rel: 'src/app' };
  const rootApp = path.join(themeRoot, 'app');
  if (existsSync(rootApp)) return { abs: rootApp, rel: 'app' };
  return null;
}

function resolvePackagedCssPath(stylesheets) {
  if (stylesheets.length === 0) return 'assets/next-empty.css';
  if (stylesheets.length === 1) return `assets/${path.basename(stylesheets[0])}`;
  return 'assets/next-bundle.css';
}

/**
 * Scan a Next.js App Router project for features that require a Next.js server runtime
 * and cannot be silently compiled into a static/PHP native WordPress theme.
 *
 * Reports file location, feature, affected mode, and supported path forward.
 *
 * @param {string} themeRoot
 */
export function diagnoseNextNativeCompatibility(themeRoot) {
  const resolvedRoot = path.resolve(themeRoot);
  const diagnostics = [];

  // 1. Middleware / proxy files
  for (const rel of MIDDLEWARE_CANDIDATES) {
    if (existsSync(path.join(resolvedRoot, rel))) {
      diagnostics.push({
        code: 'NEXT_NATIVE_MIDDLEWARE',
        severity: 'error',
        file: rel,
        feature: 'Next.js middleware/proxy',
        affectedMode: 'native',
        message: `Next.js middleware "${rel}" requires a request-time server runtime and is not supported in native WordPress theme export.`,
        suggestion:
          'Deploy in decoupled mode to keep Next.js middleware, or move WordPress request hooks into src/server/*.php for native themes.',
      });
    }
  }

  // 2. App Router structure (dynamic segments, route handlers)
  const appDir = resolveAppDir(resolvedRoot);
  if (appDir) {
    const appFiles = walkSourceFiles(appDir.abs, resolvedRoot);
    const reportedDynamicDirs = new Set();
    for (const file of appFiles) {
      const relWithinApp = file.rel.slice(appDir.rel.length + 1);
      const segments = relWithinApp.split('/');
      const dynamicSeg = segments.find((seg) => /^\[.+\]$/.test(seg));
      if (dynamicSeg) {
        const dynamicKey = segments.slice(0, segments.indexOf(dynamicSeg) + 1).join('/');
        if (!reportedDynamicDirs.has(dynamicKey)) {
          reportedDynamicDirs.add(dynamicKey);
          diagnostics.push({
            code: 'NEXT_NATIVE_DYNAMIC_ROUTE',
            severity: 'error',
            file: `${appDir.rel}/${dynamicKey}`,
            feature: 'Dynamic App Router segment',
            affectedMode: 'native',
            message: `Dynamic route segment "${appDir.rel}/${dynamicKey}" is not supported by the fixed-route native WordPress exporter yet.`,
            suggestion:
              'Keep dynamic App Router segments in decoupled mode, or wait for WordPress single/archive hierarchy template mapping.',
          });
        }
      }

      const baseName = path.basename(file.rel);
      if (/^route\.(ts|tsx|js|jsx|mjs)$/.test(baseName)) {
        diagnostics.push({
          code: 'NEXT_NATIVE_ROUTE_HANDLER',
          severity: 'error',
          file: file.rel,
          feature: 'App Router Route Handler',
          affectedMode: 'native',
          message: `Route handler "${file.rel}" requires a Next.js server runtime and cannot execute in a native WordPress theme.`,
          suggestion:
            'Keep route handlers in decoupled mode, or register WordPress REST endpoints via ForgeWP forms/auth or src/server/*.php.',
        });
      }
    }
  }

  // 3. Source-level directives & dynamic server APIs across src/ (or app/)
  const scanRoots = [
    existsSync(path.join(resolvedRoot, 'src')) ? path.join(resolvedRoot, 'src') : null,
    appDir && !appDir.rel.startsWith('src/') ? appDir.abs : null,
  ].filter(Boolean);

  const seenFiles = new Set();
  for (const scanRoot of scanRoots) {
    for (const file of walkSourceFiles(scanRoot, resolvedRoot)) {
      if (seenFiles.has(file.rel)) continue;
      seenFiles.add(file.rel);
      if (!SOURCE_EXTENSIONS.has(path.extname(file.rel))) continue;

      const code = readFileSync(file.full, 'utf8');
      if (/^\s*['"]use server['"]\s*;?/m.test(code)) {
        diagnostics.push({
          code: 'NEXT_NATIVE_SERVER_ACTION',
          severity: 'error',
          file: file.rel,
          feature: 'Next.js Server Actions ("use server")',
          affectedMode: 'native',
          message: `Server Action directive ("use server") in "${file.rel}" requires a Next.js server and cannot run in a native WordPress theme.`,
          suggestion:
            'Use decoupled mode for Next.js Server Actions, or use ForgeWP native Forms / WordPress REST endpoints for native themes.',
        });
      }

      if (
        /from\s+['"]next\/headers['"]/.test(code) ||
        /\bexport\s+const\s+dynamic\s*=\s*['"]force-dynamic['"]/.test(code)
      ) {
        diagnostics.push({
          code: 'NEXT_NATIVE_DYNAMIC_RUNTIME_API',
          severity: 'error',
          file: file.rel,
          feature: 'Request-time Next.js SSR API (next/headers or force-dynamic)',
          affectedMode: 'native',
          message: `Request-time Next.js server API in "${file.rel}" is incompatible with static native WordPress theme export.`,
          suggestion:
            'Use decoupled mode for request-time Next.js SSR, or gate dynamic behavior behind decoupled deployment configuration.',
        });
      }

      const revalidateMatch = code.match(/\bexport\s+const\s+revalidate\s*=\s*(\d+)/);
      if (revalidateMatch && Number(revalidateMatch[1]) > 0) {
        diagnostics.push({
          code: 'NEXT_NATIVE_ISR_REVALIDATE',
          severity: 'warning',
          file: file.rel,
          feature: 'Incremental Static Regeneration (revalidate)',
          affectedMode: 'native',
          message: `ISR "export const revalidate = ${revalidateMatch[1]}" in "${file.rel}" does not run in native WordPress themes; native PHP templates read live from WordPress directly.`,
          suggestion:
            'Keep revalidate for decoupled Next.js caching only; use ForgeWP Gutenberg blocks or live WordPress bindings for native updates.',
        });
      }
    }
  }

  const errors = diagnostics.filter((d) => d.severity === 'error');
  const warnings = diagnostics.filter((d) => d.severity === 'warning');
  return {
    ok: errors.length === 0,
    errors,
    warnings,
    diagnostics,
  };
}

function assertNativeCompatible(themeRoot) {
  const report = diagnoseNextNativeCompatibility(themeRoot);
  if (!report.ok) {
    const formatted = report.errors
      .map((err) => `  - [${err.code}] ${err.file}: ${err.message}\n    Next step: ${err.suggestion}`)
      .join('\n');
    throw new Error(
      `Next.js native WordPress export blocked by unsupported server-only feature(s):\n${formatted}`,
    );
  }
  return report;
}

/**
 * Internal experimental Next.js App Router adapter implementing ForgeWPFrameworkAdapter.
 * NOT yet registered in SUPPORTED_ADAPTERS until fixture DX, live data bindings, and
 * client island contracts are complete.
 */
export const skipSystemBlueprints = true;
export const skipPreExportScaffolding = true;

export function getCriticalFiles(themeRoot) {
  const resolvedRoot = path.resolve(themeRoot);
  const nextConfig =
    NEXT_CONFIG_CANDIDATES.find((rel) => existsSync(path.join(resolvedRoot, rel))) ||
    'next.config.ts';
  const layoutFile =
    NEXT_LAYOUT_CANDIDATES.find((rel) => existsSync(path.join(resolvedRoot, rel))) ||
    'src/app/layout.tsx';
  return ['package.json', nextConfig, layoutFile];
}

export async function readBuildAssets(themeRoot) {
  const resolvedRoot = path.resolve(themeRoot);
  assertNativeCompatible(resolvedRoot);
  const extracted = extractNextStaticMarkup(resolvedRoot);
  const stylesheets = Array.from(
    new Set(extracted.routes.flatMap((route) => route.assets?.stylesheets || [])),
  ).sort();
  return {
    cssFile: resolvePackagedCssPath(stylesheets),
  };
}

export async function buildAssets(themeRoot, options = {}) {
  const resolvedRoot = path.resolve(themeRoot);
  assertNativeCompatible(resolvedRoot);

  const pm = options.packageManager || 'pnpm';
  const result = spawnSync(pm, ['run', 'build'], {
    cwd: resolvedRoot,
    env: {
      ...process.env,
      FORGEWP_NATIVE_EXPORT: '1',
      NEXT_TELEMETRY_DISABLED: '1',
    },
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    const detail = result.stderr?.trim() || result.stdout?.trim() || 'Unknown Next.js build error';
    throw new Error(`Next.js build failed during native WordPress export:\n${detail}`);
  }

  return readBuildAssets(resolvedRoot);
}

export async function renderStaticMarkup(themeRoot) {
  const resolvedRoot = path.resolve(themeRoot);
  assertNativeCompatible(resolvedRoot);
  const extracted = extractNextStaticMarkup(resolvedRoot);
  const rewritten = applyVerifiedNextLinksToMarkup(extracted, {
    themeRoot: resolvedRoot,
  });

  const linkErrors = (rewritten.diagnostics || []).filter((d) => d.severity === 'error');
  if (linkErrors.length > 0) {
    const formatted = linkErrors
      .map((err) => `  - [${err.code}] ${err.file || ''}: ${err.message}`)
      .join('\n');
    throw new Error(`Next.js native link transformation failed:\n${formatted}`);
  }

  return rewritten.markup;
}

export async function packageAssets(themeRoot, outDir) {
  const resolvedRoot = path.resolve(themeRoot);
  const packaged = packageNextAssets(resolvedRoot, outDir);
  return {
    assetFiles: packaged.assetFiles,
    clientEntries: packaged.clientEntries,
    runtimeEntry: packaged.runtimeEntry,
  };
}

export function scanForHydrationIslands() {
  return [];
}

export function findComponentPath() {
  return null;
}

export function getHydrationRollupInputs() {
  return {};
}
