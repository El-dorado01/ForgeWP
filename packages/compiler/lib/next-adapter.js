import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { extractNextStaticMarkup } from './next-route-extractor.js';
import { applyVerifiedNextLinksToMarkup } from './next-link-transform.js';
import {
  injectRouteScopedStylesheetLinks,
  packageNextAssets,
  partitionNextStylesheets,
  resolvePackagedCssPath,
  rewriteNextMediaUrlsInMarkup,
} from './next-export-experimental.js';
import {
  bundleNextIslands,
  findNextIslandComponentPath,
  scanNextHydrationIslands,
} from './next-islands.js';
import { discoverNextDynamicHierarchy } from './next-dynamic-routes.js';
import { loadConfig } from './load-config.js';
import { getProjectExtensions } from './project-language.js';

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

/**
 * Single-pass `out/` extraction cache keyed by themeRoot + out/index.html fingerprint
 * so `readBuildAssets`, `renderStaticMarkup`, and `packageAssets` share one validated
 * route & asset inventory per export run instead of re-parsing `out/` three times.
 */
const extractionCache = new Map();

function getOutDirFingerprint(resolvedRoot) {
  const outDir = path.join(resolvedRoot, 'out');
  const indexHtml = path.join(outDir, 'index.html');
  if (!existsSync(indexHtml)) return null;
  try {
    const dirStat = statSync(outDir);
    const idxStat = statSync(indexHtml);
    return `${dirStat.mtimeMs}:${idxStat.mtimeMs}:${idxStat.size}`;
  } catch {
    return null;
  }
}

export function clearNextExtractionCache(themeRoot) {
  if (themeRoot) {
    extractionCache.delete(path.resolve(themeRoot));
  } else {
    extractionCache.clear();
  }
}

function getCachedNextStaticMarkup(resolvedRoot) {
  const fingerprint = getOutDirFingerprint(resolvedRoot);
  const cached = extractionCache.get(resolvedRoot);
  if (cached && fingerprint && cached.fingerprint === fingerprint) {
    return cached.extracted;
  }
  const extracted = extractNextStaticMarkup(resolvedRoot);
  if (fingerprint) {
    extractionCache.set(resolvedRoot, { fingerprint, extracted });
  }
  return extracted;
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
    const dynamicHierarchy = discoverNextDynamicHierarchy(resolvedRoot);
    for (const unsupported of dynamicHierarchy.unsupportedDynamic) {
      diagnostics.push({
        code: 'NEXT_NATIVE_DYNAMIC_ROUTE',
        severity: 'error',
        file: unsupported.file,
        feature: 'Dynamic App Router segment',
        affectedMode: 'native',
        message: unsupported.reason,
        suggestion: unsupported.suggestion,
      });
    }

    const appFiles = walkSourceFiles(appDir.abs, resolvedRoot);
    for (const file of appFiles) {
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
 * Next.js App Router adapter implementing ForgeWPFrameworkAdapter.
 * Registered under `frameworkAdapter: 'nextjs'` for fixed-route native WordPress
 * theme export alongside decoupled Next.js deployment.
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
  const extracted = getCachedNextStaticMarkup(resolvedRoot);
  const { sharedStylesheets } = partitionNextStylesheets(extracted.routes);
  return {
    cssFile: resolvePackagedCssPath(sharedStylesheets),
  };
}

export async function buildAssets(themeRoot, options = {}) {
  const resolvedRoot = path.resolve(themeRoot);
  assertNativeCompatible(resolvedRoot);

  if (process.env.FORGEWP_DEPLOYMENT_MODE === 'decoupled') {
    throw new Error(
      `FORGEWP_NEXT_MODE_CONFLICT: Cannot run native WordPress theme export while FORGEWP_DEPLOYMENT_MODE=decoupled is set in the environment. Unset FORGEWP_DEPLOYMENT_MODE (or set it to "native") before running forgewp export.`,
    );
  }

  // Clear any stale out/ directory and cached extraction before running Next build
  // so a non-export build can never silently reuse stale static HTML from a prior run.
  const outDir = path.join(resolvedRoot, 'out');
  clearNextExtractionCache(resolvedRoot);
  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
  }

  const pm = options.packageManager || 'pnpm';
  const result = spawnSync(pm, ['run', 'build'], {
    cwd: resolvedRoot,
    env: {
      ...process.env,
      FORGEWP_NATIVE_EXPORT: '1',
      FORGEWP_DEPLOYMENT_MODE: 'native',
      NEXT_TELEMETRY_DISABLED: '1',
    },
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    const detail = result.stderr?.trim() || result.stdout?.trim() || 'Unknown Next.js build error';
    throw new Error(`Next.js build failed during native WordPress export:\n${detail}`);
  }

  if (!existsSync(path.join(outDir, 'index.html'))) {
    throw new Error(
      `FORGEWP_NEXT_STATIC_EXPORT_MISSING: Next.js build completed without producing a fresh "out/index.html" static export. Verify next.config.* uses withForgeWP() without overriding output to a non-export mode.`,
    );
  }

  return readBuildAssets(resolvedRoot);
}

export async function renderStaticMarkup(themeRoot) {
  const resolvedRoot = path.resolve(themeRoot);
  assertNativeCompatible(resolvedRoot);
  let postTypes = {};
  try {
    const cfg = await loadConfig(resolvedRoot);
    if (cfg && cfg.postTypes) postTypes = cfg.postTypes;
  } catch {
    // Optional when called without wp.config.ts (e.g. unit fixtures)
  }
  const extracted =
    Object.keys(postTypes).length > 0
      ? extractNextStaticMarkup(resolvedRoot, { postTypes })
      : getCachedNextStaticMarkup(resolvedRoot);
  const withScopedCss = injectRouteScopedStylesheetLinks(extracted);
  const withMediaRewritten = rewriteNextMediaUrlsInMarkup(withScopedCss);
  const rewritten = applyVerifiedNextLinksToMarkup(withMediaRewritten, {
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

export async function packageAssets(themeRoot, outDir, options = {}) {
  const resolvedRoot = path.resolve(themeRoot);
  const extracted = getCachedNextStaticMarkup(resolvedRoot);
  const packaged = packageNextAssets(resolvedRoot, outDir, {
    routes: extracted.routes,
  });
  const islands = Array.isArray(options?.islands)
    ? options.islands
    : scanNextHydrationIslands(resolvedRoot);
  const bundled = await bundleNextIslands(resolvedRoot, outDir, islands);
  return {
    assetFiles: {
      ...packaged.assetFiles,
      ...bundled.assetFiles,
    },
    clientEntries: bundled.clientEntries,
    runtimeEntry: bundled.runtimeEntry,
  };
}

export function scanForHydrationIslands(themeRoot) {
  return scanNextHydrationIslands(themeRoot);
}

export function findComponentPath(themeRoot, kebabName) {
  return findNextIslandComponentPath(themeRoot, kebabName);
}

export function getHydrationRollupInputs() {
  return {};
}

function toKebabCase(name) {
  return String(name || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

/**
 * Scaffold a Next.js-compatible Gutenberg block (`'use client'` + `defineBlock` + `WpEditable`)
 * in `src/blocks/<Name>.{tsx,jsx}`.
 */
export async function onMakeBlock(
  themeRoot,
  { pascalCase, readableTitle, attributesList = ['title', 'description'], pc },
) {
  const { mkdirSync, writeFileSync } = await import('node:fs');
  const resolvedRoot = path.resolve(themeRoot);
  const { isJs, jsxExt } = getProjectExtensions(resolvedRoot);
  const blocksDir = path.join(resolvedRoot, 'src', 'blocks');
  mkdirSync(blocksDir, { recursive: true });

  const slug = toKebabCase(pascalCase);
  const filePath = path.join(blocksDir, `${pascalCase}${jsxExt}`);
  if (existsSync(filePath)) {
    throw new Error(`Block already exists at ${path.relative(resolvedRoot, filePath)}.`);
  }

  const attrEntries = attributesList
    .map(
      (attr) =>
        `    ${attr}: { type: ${isJs ? "'string'" : "'string' as const"}, default: ${JSON.stringify(`Default ${attr}`)} },`,
    )
    .join('\n');

  const editFields = attributesList
    .map(
      (attr, idx) =>
        `      <WpEditable\n        tagName="${idx === 0 ? 'h2' : 'p'}"\n        value={attributes.${attr}}\n        onChange={(value) => setAttributes({ ${attr}: value })}\n      />`,
    )
    .join('\n');

  const saveFields = attributesList
    .map((attr, idx) =>
      idx === 0
        ? `      <h2>{attributes.${attr}}</h2>`
        : `      <p>{attributes.${attr}}</p>`,
    )
    .join('\n');

  const source = `'use client';

import { defineBlock, WpEditable } from '@forgewp/react';

export const ${pascalCase} = defineBlock({
  name: ${JSON.stringify(slug)},
  title: ${JSON.stringify(readableTitle || pascalCase)},
  category: 'text',
  attributes: {
${attrEntries}
  },
  edit: ({ attributes, setAttributes }) => (
    <section className="forgewp-block-${slug}">
${editFields}
    </section>
  ),
  save: ({ attributes }) => (
    <section className="forgewp-block-${slug}">
${saveFields}
    </section>
  ),
});

export default ${pascalCase};
`;

  writeFileSync(filePath, source, 'utf8');
  if (pc) {
    console.log(pc.green(`\n✅ Created Next.js Gutenberg block: ${path.relative(resolvedRoot, filePath)}`));
    console.log(pc.dim(`   Block slug: forgewp/${slug} — compiled automatically on \`pnpm export\`.`));
  }
}

/**
 * Scaffold a Next.js App Router fixed page (`src/app/<slug>/page.{tsx,jsx}` or `app/<slug>/page.{tsx,jsx}`)
 * wired to `@forgewp/react/server` (`BlockArea`) and `getPageContent`.
 */
export async function onMakePage(themeRoot, { pascalCase, pc }) {
  const { mkdirSync, writeFileSync } = await import('node:fs');
  const resolvedRoot = path.resolve(themeRoot);
  const { jsxExt } = getProjectExtensions(resolvedRoot);
  const appDir = resolveAppDir(resolvedRoot) || {
    abs: path.join(resolvedRoot, 'src', 'app'),
    rel: 'src/app',
  };
  const slug = toKebabCase(pascalCase);
  const pageDir = path.join(appDir.abs, slug);
  const pageFile = path.join(pageDir, `page${jsxExt}`);
  if (existsSync(pageFile)) {
    throw new Error(`Page already exists at ${path.relative(resolvedRoot, pageFile)}.`);
  }

  mkdirSync(pageDir, { recursive: true });
  const hasContentHelper = ['.ts', '.js', '.mjs'].some(
    (ext) =>
      existsSync(path.join(resolvedRoot, 'src', 'lib', `content${ext}`)) ||
      existsSync(path.join(resolvedRoot, 'lib', `content${ext}`)),
  );

  const source = hasContentHelper
    ? `import Link from 'next/link';
import { BlockArea } from '@forgewp/react/server';
import { getPageContent } from '@/lib/content';

export default async function ${pascalCase}Page() {
  const page = await getPageContent(${JSON.stringify(slug)});

  return (
    <main className="site-main">
      <h1>{page.title}</h1>
      <BlockArea name=${JSON.stringify(`${slug}-content`)} content={page.content} />
      <p>
        <Link href="/">Back to Home</Link>
      </p>
    </main>
  );
}
`
    : `import Link from 'next/link';
import { BlockArea } from '@forgewp/react/server';

export default function ${pascalCase}Page() {
  return (
    <main className="site-main">
      <h1>${pascalCase}</h1>
      <BlockArea name=${JSON.stringify(`${slug}-content`)} />
      <p>
        <Link href="/">Back to Home</Link>
      </p>
    </main>
  );
}
`;

  writeFileSync(pageFile, source, 'utf8');
  if (pc) {
    console.log(pc.green(`\n✅ Created Next.js App Router page: ${path.relative(resolvedRoot, pageFile)}`));
    console.log(pc.dim(`   Route: /${slug} — compiles to page-${slug}.php on \`pnpm export\`.`));
  }
}

/**
 * Scaffold a Next.js `'use client'` hydration island component in `src/components/<Name>.{tsx,jsx}`.
 */
export async function onMakeIsland(themeRoot, { pascalCase, pc }) {
  const { mkdirSync, writeFileSync } = await import('node:fs');
  const resolvedRoot = path.resolve(themeRoot);
  const { isJs, jsxExt } = getProjectExtensions(resolvedRoot);
  const componentsDir = path.join(resolvedRoot, 'src', 'components');
  mkdirSync(componentsDir, { recursive: true });

  const slug = toKebabCase(pascalCase);
  const filePath = path.join(componentsDir, `${pascalCase}${jsxExt}`);
  if (existsSync(filePath)) {
    throw new Error(`Island already exists at ${path.relative(resolvedRoot, filePath)}.`);
  }

  const source = isJs
    ? `'use client';

import { useState } from 'react';

export function ${pascalCase}({ initialCount = 0 }) {
  const [count, setCount] = useState(initialCount);

  return (
    <div className="forgewp-island-${slug}">
      <button type="button" onClick={() => setCount((c) => c + 1)}>
        ${pascalCase} count: {count}
      </button>
    </div>
  );
}

export default ${pascalCase};
`
    : `'use client';

import { useState } from 'react';

export interface ${pascalCase}Props {
  initialCount?: number;
}

export function ${pascalCase}({ initialCount = 0 }: ${pascalCase}Props) {
  const [count, setCount] = useState(initialCount);

  return (
    <div className="forgewp-island-${slug}">
      <button type="button" onClick={() => setCount((c) => c + 1)}>
        ${pascalCase} count: {count}
      </button>
    </div>
  );
}

export default ${pascalCase};
`;

  writeFileSync(filePath, source, 'utf8');
  if (pc) {
    console.log(pc.green(`\n✅ Created Next.js client island: ${path.relative(resolvedRoot, filePath)}`));
    console.log(
      pc.dim(
        `   Use in any Server Component page:\n` +
          `     import { Hydrate } from '@forgewp/react/server';\n` +
          `     import { ${pascalCase} } from '@/components/${pascalCase}';\n` +
          `     <Hydrate id="${slug}"><${pascalCase} /></Hydrate>`,
      ),
    );
  }
}

/**
 * Scaffold a Native Form (`cms/forms/<slug>.{ts,js}`) and a Next.js `'use client'`
 * form island component in `src/components/<Name>Form.{tsx,jsx}`.
 */
export async function onMakeForm(
  themeRoot,
  { slug, pascalCase, fields = ['name', 'email', 'message'], mailTo = 'admin', pc },
) {
  const { mkdirSync, writeFileSync } = await import('node:fs');
  const resolvedRoot = path.resolve(themeRoot);
  const { isJs, scriptExt, jsxExt } = getProjectExtensions(resolvedRoot);

  const formsDir = path.join(resolvedRoot, 'cms', 'forms');
  const componentsDir = path.join(resolvedRoot, 'src', 'components');
  mkdirSync(formsDir, { recursive: true });
  mkdirSync(componentsDir, { recursive: true });

  const schemaPath = path.join(formsDir, `${slug}${scriptExt}`);
  const componentName = pascalCase.endsWith('Form') ? pascalCase : `${pascalCase}Form`;
  const componentPath = path.join(componentsDir, `${componentName}${jsxExt}`);

  if (existsSync(schemaPath)) {
    throw new Error(`Form schema already exists at ${path.relative(resolvedRoot, schemaPath)}.`);
  }
  if (existsSync(componentPath)) {
    throw new Error(`Form component already exists at ${path.relative(resolvedRoot, componentPath)}.`);
  }

  const normalizedFields = fields.map((f) => {
    if (typeof f === 'string') {
      return {
        name: f,
        type: f === 'email' ? 'email' : f === 'message' ? 'textarea' : 'text',
        required: true,
      };
    }
    return {
      name: f.name,
      type: f.type || 'text',
      required: f.required !== false,
    };
  });

  const fieldDefs = normalizedFields
    .map((f) => {
      const label = f.name.charAt(0).toUpperCase() + f.name.slice(1);
      return `    ${f.name}: { type: '${f.type}', label: '${label}', required: ${f.required} },`;
    })
    .join('\n');

  const schemaCode = `import { defineWpForm } from '@forgewp/react/config';

export const form = defineWpForm({
  mailTo: ${JSON.stringify(mailTo)},
  subject: ${JSON.stringify(`New ${pascalCase} submission`)},
  fields: {
${fieldDefs}
  },
});

export default form;
`;

  const inputsJsx = normalizedFields
    .map((f) => {
      const label = f.name.charAt(0).toUpperCase() + f.name.slice(1);
      const req = f.required ? ' required' : '';
      if (f.type === 'textarea') {
        return `      <label>\n        ${label}\n        <textarea name="${f.name}"${req} rows={4} />\n      </label>`;
      }
      const inputType = f.type === 'email' ? 'email' : 'text';
      return `      <label>\n        ${label}\n        <input type="${inputType}" name="${f.name}"${req} />\n      </label>`;
    })
    .join('\n');

  const componentCode = isJs
    ? `'use client';

import { useState } from 'react';
import { submitWpForm } from '@forgewp/react';

export function ${componentName}() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('submitting');
    setError('');
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const res = await submitWpForm(${JSON.stringify(slug)}, data);
    if (res.ok) {
      setStatus('sent');
      event.currentTarget.reset();
    } else {
      setStatus('error');
      setError(res.message || 'Submission failed.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="forgewp-form-${slug}">
${inputsJsx}
      <button type="submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Sending...' : 'Send'}
      </button>
      {status === 'sent' && <p>Thank you! Your submission was received.</p>}
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

export default ${componentName};
`
    : `'use client';

import { useState, type FormEvent } from 'react';
import { submitWpForm } from '@forgewp/react';

export function ${componentName}() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setError('');
    const formEl = event.currentTarget;
    const data = Object.fromEntries(new FormData(formEl)) as Record<string, string>;
    const res = await submitWpForm(${JSON.stringify(slug)}, data);
    if (res.ok) {
      setStatus('sent');
      formEl.reset();
    } else {
      setStatus('error');
      setError(res.message || 'Submission failed.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="forgewp-form-${slug}">
${inputsJsx}
      <button type="submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Sending...' : 'Send'}
      </button>
      {status === 'sent' && <p>Thank you! Your submission was received.</p>}
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

export default ${componentName};
`;

  writeFileSync(schemaPath, schemaCode, 'utf8');
  writeFileSync(componentPath, componentCode, 'utf8');
  if (pc) {
    console.log(pc.green(`\n✅ Created Next.js Native Form:`));
    console.log(pc.dim(`   Schema:    ${path.relative(resolvedRoot, schemaPath)}`));
    console.log(pc.dim(`   Component: ${path.relative(resolvedRoot, componentPath)}`));
  }
}

/**
 * Scaffold a Next.js Server Component loop (`src/components/<Name>.{tsx,jsx}`)
 * backed by `wpClient.getPosts(postType)` and `<WpServerLoop />`.
 */
export async function onMakeLoop(
  themeRoot,
  { pascalCase, postType = 'post', pc },
) {
  const { mkdirSync, writeFileSync } = await import('node:fs');
  const resolvedRoot = path.resolve(themeRoot);
  const { isJs, jsxExt } = getProjectExtensions(resolvedRoot);
  const componentsDir = path.join(resolvedRoot, 'src', 'components');
  mkdirSync(componentsDir, { recursive: true });

  const filePath = path.join(componentsDir, `${pascalCase}${jsxExt}`);
  if (existsSync(filePath)) {
    throw new Error(`Loop component already exists at ${path.relative(resolvedRoot, filePath)}.`);
  }

  const propsSig = isJs
    ? '{ postsPerPage = 6 }'
    : '{ postsPerPage = 6 }: { postsPerPage?: number }';

  const source = `import { WpServerLoop } from '@forgewp/react/server';
import { wpClient } from '@/lib/content';

export async function ${pascalCase}(${propsSig}) {
  const posts = await wpClient.getPosts(${JSON.stringify(postType)}, { perPage: postsPerPage });

  return (
    <section className="forgewp-loop-${toKebabCase(postType)}">
      <WpServerLoop
        postType=${JSON.stringify(postType)}
        useMainQuery={false}
        postsPerPage={postsPerPage}
        posts={posts}
        renderItem={(post) => (
          <article key={post.id}>
            <h3>
              <a href={post.permalink}>{post.title}</a>
            </h3>
            {post.excerpt ? <p>{post.excerpt}</p> : null}
          </article>
        )}
      />
    </section>
  );
}

export default ${pascalCase};
`;

  writeFileSync(filePath, source, 'utf8');
  if (pc) {
    console.log(pc.green(`\n✅ Created Next.js server loop component: ${path.relative(resolvedRoot, filePath)}`));
    console.log(pc.dim(`   Post type: ${postType} — compiles to WP_Query in native export and fetches REST in decoupled mode.`));
  }
}

/**
 * Scaffold a Next.js-compatible Gutenberg InnerBlocks parent shell block
 * in `src/blocks/<Name>.{tsx,jsx}`.
 */
export async function onMakeShell(
  themeRoot,
  { pascalCase, nameSlug, readableTitle, shell = {}, innerBlocks = {}, pc },
) {
  const { mkdirSync, writeFileSync } = await import('node:fs');
  const resolvedRoot = path.resolve(themeRoot);
  const { isJs, jsxExt } = getProjectExtensions(resolvedRoot);
  const blocksDir = path.join(resolvedRoot, 'src', 'blocks');
  mkdirSync(blocksDir, { recursive: true });

  const slug = nameSlug || toKebabCase(pascalCase);
  const filePath = path.join(blocksDir, `${pascalCase}${jsxExt}`);
  if (existsSync(filePath)) {
    throw new Error(`Shell block already exists at ${path.relative(resolvedRoot, filePath)}.`);
  }

  const className = shell.className || `forgewp-shell-${slug}`;
  const gridClassName = shell.gridClassName || 'grid gap-8 md:grid-cols-2';
  const propsSig = isJs ? '{ children }' : '{ children }: { children?: React.ReactNode }';
  const reactImport = isJs ? '' : `import type React from 'react';\n`;

  const source = `'use client';

${reactImport}import { defineBlock } from '@forgewp/react';

export const ${pascalCase} = defineBlock({
  name: ${JSON.stringify(slug)},
  title: ${JSON.stringify(readableTitle || pascalCase)},
  category: 'design',
  innerBlocks: ${JSON.stringify(innerBlocks, null, 2).replace(/\n/g, '\n  ')},
  edit: () => (
    <section className=${JSON.stringify(className)}>
      <div className=${JSON.stringify(gridClassName)} />
    </section>
  ),
  save: (${propsSig}) => (
    <section className=${JSON.stringify(className)}>
      <div className=${JSON.stringify(gridClassName)}>{children}</div>
    </section>
  ),
});

export default ${pascalCase};
`;

  writeFileSync(filePath, source, 'utf8');
  if (pc) {
    console.log(pc.green(`\n✅ Created Next.js InnerBlocks shell: ${path.relative(resolvedRoot, filePath)}`));
    console.log(pc.dim(`   Shell slug: forgewp/${slug}`));
  }
}
