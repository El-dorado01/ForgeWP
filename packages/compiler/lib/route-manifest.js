import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import { diagnoseNextNativeCompatibility } from './next-adapter.js';
import { discoverNextDynamicHierarchy } from './next-dynamic-routes.js';

export const VALID_DOCTOR_TARGETS = ['native', 'decoupled', 'hybrid'];

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const SOURCE_EXTENSION_SET = new Set(SOURCE_EXTENSIONS);
const IGNORED_DIRS = new Set(['node_modules', '.next', 'out', '.forgewp', 'dist', '.git']);
const PAGE_FILE_RE = /^page\.(ts|tsx|js|jsx|mjs)$/;
const ROUTE_HANDLER_FILE_RE = /^route\.(ts|tsx|js|jsx|mjs)$/;
const LAYOUT_FILE_RE = /^layout\.(ts|tsx|js|jsx|mjs)$/;

/**
 * Normalize a route path to a canonical leading-slash form without trailing slash
 * (except for root `/`).
 * @param {string} routePath
 * @returns {string}
 */
export function normalizeRoutePath(routePath) {
  if (!routePath || typeof routePath !== 'string') return '/';
  const cleaned = routePath.trim().split('?')[0].split('#')[0];
  if (!cleaned || cleaned === '/') return '/';
  const withLeading = cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
  return withLeading.length > 1 ? withLeading.replace(/\/+$/, '') : '/';
}

/**
 * Extract the shortcode tag from a raw shortcode string like `[contact-form-7 id="123"]`.
 * @param {string | null | undefined} raw
 * @returns {string | null}
 */
export function extractShortcodeTag(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const match = raw.match(/\[\s*([a-zA-Z0-9_-]+)/);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Check whether a normalized route path matches any declared `hybridRoutes` pattern.
 * Supports exact paths (`/booking`), prefix wildcards (`/events/*`), catch-all (`/*`),
 * and single-segment dynamic routes (`/events/[slug]`, `/events/:slug`).
 *
 * @param {string} routePath
 * @param {string[]} hybridRoutes
 * @returns {boolean}
 */
export function matchesHybridRoute(routePath, hybridRoutes = []) {
  if (!Array.isArray(hybridRoutes) || hybridRoutes.length === 0) return false;
  const normalizedTarget = normalizeRoutePath(routePath);
  const targetSegs = normalizedTarget === '/' ? [] : normalizedTarget.slice(1).split('/');

  for (const rawPattern of hybridRoutes) {
    if (typeof rawPattern !== 'string' || !rawPattern.trim()) continue;
    const pattern = normalizeRoutePath(rawPattern);
    if (pattern === '/*' || pattern === '*') return true;
    if (pattern === normalizedTarget) return true;

    if (pattern.endsWith('/*')) {
      const prefix = normalizeRoutePath(pattern.slice(0, -2));
      if (prefix === '/') return true;
      if (normalizedTarget === prefix || normalizedTarget.startsWith(`${prefix}/`)) {
        return true;
      }
      continue;
    }

    const patternSegs = pattern === '/' ? [] : pattern.slice(1).split('/');
    if (patternSegs.length === targetSegs.length) {
      let matched = true;
      for (let i = 0; i < patternSegs.length; i++) {
        const p = patternSegs[i];
        const t = targetSegs[i];
        const isDynamicPattern =
          (p.startsWith('[') && p.endsWith(']')) || p.startsWith(':');
        if (!isDynamicPattern && p !== t) {
          matched = false;
          break;
        }
      }
      if (matched) return true;
    }
  }

  return false;
}

function walkFiles(dir, base = dir, results = []) {
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    if (IGNORED_DIRS.has(entry)) continue;
    const full = path.join(dir, entry);
    let stat;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      walkFiles(full, base, results);
    } else {
      results.push({
        full,
        rel: path.relative(base, full).replace(/\\/g, '/'),
      });
    }
  }
  return results;
}

function resolveAppDir(projectRoot) {
  const srcApp = path.join(projectRoot, 'src', 'app');
  if (existsSync(srcApp)) return { abs: srcApp, rel: 'src/app' };
  const rootApp = path.join(projectRoot, 'app');
  if (existsSync(rootApp)) return { abs: rootApp, rel: 'app' };
  return null;
}

function resolveLocalImport(fromFileAbs, specifier, projectRoot) {
  if (!specifier || typeof specifier !== 'string') return null;
  let baseTarget = null;
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    baseTarget = path.resolve(path.dirname(fromFileAbs), specifier);
  } else if (specifier.startsWith('@/')) {
    const sub = specifier.slice(2);
    const srcCandidate = path.join(projectRoot, 'src', sub);
    const rootCandidate = path.join(projectRoot, sub);
    baseTarget = existsSync(path.dirname(srcCandidate)) ? srcCandidate : rootCandidate;
  } else {
    return null;
  }

  // Strip .js/.jsx/.mjs extension when resolving TypeScript sources (NodeNext style)
  const stripped = baseTarget.replace(/\.(js|jsx|mjs|cjs)$/, '');
  const candidates = [
    baseTarget,
    ...SOURCE_EXTENSIONS.map((ext) => `${baseTarget}${ext}`),
    ...(stripped !== baseTarget
      ? SOURCE_EXTENSIONS.map((ext) => `${stripped}${ext}`)
      : []),
    ...SOURCE_EXTENSIONS.map((ext) => path.join(baseTarget, `index${ext}`)),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      try {
        if (statSync(candidate).isFile()) return candidate;
      } catch {
        // ignore
      }
    }
  }
  return null;
}

function getStringLiteralValue(node) {
  if (!node) return null;
  if (node.type === 'StringLiteral') return node.value;
  if (node.type === 'TemplateLiteral' && node.quasis.length > 0) {
    return node.quasis.map((q) => q.value.raw).join('${...}');
  }
  if (node.type === 'JSXExpressionContainer') {
    return getStringLiteralValue(node.expression);
  }
  return null;
}

function extractOptionKeyFromExpression(node) {
  if (!node) return null;
  const expr = node.type === 'JSXExpressionContainer' ? node.expression : node;
  if (!expr) return null;
  if (expr.type === 'CallExpression') {
    const callee = expr.callee;
    const fnName =
      callee?.type === 'Identifier'
        ? callee.name
        : callee?.type === 'MemberExpression' && callee.property?.type === 'Identifier'
          ? callee.property.name
          : null;
    if (fnName === 'useWpOption' || fnName === 'getOption' || fnName === 'getLiveOption') {
      const key = getStringLiteralValue(expr.arguments[0]);
      const fallback = getStringLiteralValue(expr.arguments[1]);
      return { key, fallback };
    }
  }
  return null;
}

function parseWpModeFromObjectExpression(objNode) {
  if (!objNode || objNode.type !== 'ObjectExpression') return null;
  for (const prop of objNode.properties || []) {
    if (prop.type !== 'ObjectProperty') continue;
    const keyName =
      prop.key?.type === 'Identifier'
        ? prop.key.name
        : prop.key?.type === 'StringLiteral'
          ? prop.key.value
          : null;
    if (keyName === 'wpMode') {
      const val = getStringLiteralValue(prop.value);
      if (val === 'native' || val === 'decoupled') return val;
    }
  }
  return null;
}

function walkAst(node, visitor) {
  if (!node || typeof node !== 'object') return;
  visitor(node);
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'start' || key === 'end' || key === 'leadingComments' || key === 'trailingComments') {
      continue;
    }
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) walkAst(item, visitor);
    } else if (child && typeof child === 'object' && typeof child.type === 'string') {
      walkAst(child, visitor);
    }
  }
}

/**
 * Analyze a single JS/TS/JSX/TSX file via Babel AST for ForgeWP capabilities,
 * `<WpShortcode>` usages, form references, explicit `wpMode`, and local imports.
 */
function analyzeSourceFile(fileAbs, projectRoot, cache) {
  if (cache.has(fileAbs)) return cache.get(fileAbs);

  const rel = path.relative(projectRoot, fileAbs).replace(/\\/g, '/');
  const empty = {
    file: rel,
    uses: new Set(),
    shortcodes: [],
    forms: [],
    declaredWpMode: null,
    localImports: [],
    importBindings: new Map(), // localName -> resolvedAbsPath
  };

  if (!existsSync(fileAbs)) {
    cache.set(fileAbs, empty);
    return empty;
  }

  let code = '';
  try {
    code = readFileSync(fileAbs, 'utf8');
  } catch {
    cache.set(fileAbs, empty);
    return empty;
  }

  let ast;
  try {
    ast = parse(code, {
      sourceType: 'unambiguous',
      plugins: ['jsx', 'typescript', 'decorators-legacy'],
      errorRecovery: true,
    });
  } catch {
    cache.set(fileAbs, empty);
    return empty;
  }

  const shortcodeIdentifiers = new Set(['WpShortcode']);
  const formFieldsIdentifiers = new Set(['WpFormFields']);
  const submitFormIdentifiers = new Set(['submitWpForm']);
  const formLabelsIdentifiers = new Set(['useWpFormFieldLabels']);

  const registerCapability = (token) => {
    if (token) empty.uses.add(token);
  };

  walkAst(ast.program, (node) => {
    // 1. Track imports (local files + ForgeWP aliases)
    if (node.type === 'ImportDeclaration' && typeof node.source?.value === 'string') {
      const source = node.source.value;
      const resolved = resolveLocalImport(fileAbs, source, projectRoot);
      if (resolved) {
        empty.localImports.push(resolved);
        for (const spec of node.specifiers || []) {
          if (spec.local?.name) {
            empty.importBindings.set(spec.local.name, resolved);
          }
        }
      }
      if (source.startsWith('@forgewp/react')) {
        for (const spec of node.specifiers || []) {
          if (spec.type === 'ImportSpecifier') {
            const imported =
              spec.imported.type === 'Identifier'
                ? spec.imported.name
                : spec.imported.value;
            const local = spec.local.name;
            if (imported === 'WpShortcode') shortcodeIdentifiers.add(local);
            if (imported === 'WpFormFields') formFieldsIdentifiers.add(local);
            if (imported === 'submitWpForm') submitFormIdentifiers.add(local);
            if (imported === 'useWpFormFieldLabels') formLabelsIdentifiers.add(local);
          }
        }
      }
    }

    // 2. Track re-exports (`export { X } from './...'` or `export * from './...'`)
    if (
      (node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration') &&
      typeof node.source?.value === 'string'
    ) {
      const resolved = resolveLocalImport(fileAbs, node.source.value, projectRoot);
      if (resolved) empty.localImports.push(resolved);
    }

    // 3. Explicit per-route wpMode export:
    //    `export const wpMode = 'native' | 'decoupled'`
    //    `export const forgewpTemplate = { ..., wpMode: 'native' }`
    //    `export const pageConfig = { ..., wpMode: 'native' }`
    if (
      node.type === 'ExportNamedDeclaration' &&
      node.declaration?.type === 'VariableDeclaration'
    ) {
      for (const decl of node.declaration.declarations || []) {
        const idName = decl.id?.type === 'Identifier' ? decl.id.name : null;
        if (idName === 'wpMode') {
          const val = getStringLiteralValue(decl.init);
          if (val === 'native' || val === 'decoupled') {
            empty.declaredWpMode = val;
          }
        } else if (idName === 'forgewpTemplate' || idName === 'pageConfig') {
          const val = parseWpModeFromObjectExpression(decl.init);
          if (val) empty.declaredWpMode = val;
        }
      }
    }

    // 4. JSX elements (<WpShortcode>, <WpFormFields>, <WpHead>, <WpEditable>, <WpRepeater>, <Hydrate>, auth gates)
    if (node.type === 'JSXOpeningElement') {
      const nameNode = node.name;
      const elemName =
        nameNode?.type === 'JSXIdentifier'
          ? nameNode.name
          : nameNode?.type === 'JSXMemberExpression' && nameNode.property?.type === 'JSXIdentifier'
            ? nameNode.property.name
            : null;
      if (!elemName) return;

      const line = node.loc?.start?.line ?? null;

      if (shortcodeIdentifiers.has(elemName) || elemName === 'forgewp-shortcode') {
        let rawCode = null;
        let optionKey = null;
        for (const attr of node.attributes || []) {
          if (attr.type !== 'JSXAttribute' || attr.name?.type !== 'JSXIdentifier') continue;
          const attrName = attr.name.name;
          if (attrName === 'code' || attrName === 'shortcode' || attrName === 'tag' || attrName === 'name') {
            const lit = getStringLiteralValue(attr.value);
            if (lit) rawCode = lit;
            const opt = extractOptionKeyFromExpression(attr.value);
            if (opt) {
              optionKey = opt.key;
              if (!rawCode && opt.fallback) rawCode = opt.fallback;
            }
          }
        }
        const tag = extractShortcodeTag(rawCode) || (rawCode && !rawCode.includes('[') ? rawCode.toLowerCase() : null) || 'dynamic';
        registerCapability(`shortcode:${tag}`);
        empty.shortcodes.push({
          tag,
          raw: rawCode,
          optionKey,
          file: rel,
          line,
        });
      } else if (formFieldsIdentifiers.has(elemName)) {
        for (const attr of node.attributes || []) {
          if (
            attr.type === 'JSXAttribute' &&
            attr.name?.type === 'JSXIdentifier' &&
            attr.name.name === 'form'
          ) {
            const formName = getStringLiteralValue(attr.value);
            if (formName) {
              registerCapability(`form:${formName}`);
              empty.forms.push({ form: formName, via: 'WpFormFields', file: rel, line });
            }
          }
        }
      } else if (elemName === 'WpHead') {
        registerCapability('seo');
      } else if (elemName === 'WpEditable') {
        registerCapability('editables');
      } else if (elemName === 'WpRepeater') {
        registerCapability('repeaters');
      } else if (elemName === 'Hydrate') {
        registerCapability('island');
      } else if (
        elemName === 'WpServerRequireAuth' ||
        elemName === 'WpServerAuthGate' ||
        elemName === 'WpRequireAuth' ||
        elemName === 'WpAuthGate'
      ) {
        registerCapability('auth');
      }
    }

    // 5. Call expressions (hooks & wpClient calls)
    if (node.type === 'CallExpression') {
      const callee = node.callee;
      const fnName =
        callee?.type === 'Identifier'
          ? callee.name
          : callee?.type === 'MemberExpression' && callee.property?.type === 'Identifier'
            ? callee.property.name
            : null;
      if (!fnName) return;

      const line = node.loc?.start?.line ?? null;
      const firstArgStr = getStringLiteralValue(node.arguments?.[0]);

      if (submitFormIdentifiers.has(fnName) || fnName === 'getForm') {
        if (firstArgStr) {
          registerCapability(`form:${firstArgStr}`);
          empty.forms.push({ form: firstArgStr, via: fnName, file: rel, line });
        } else {
          registerCapability('forms');
        }
      } else if (formLabelsIdentifiers.has(fnName)) {
        if (firstArgStr) {
          registerCapability(`form:${firstArgStr}`);
          empty.forms.push({ form: firstArgStr, via: fnName, file: rel, line });
        } else {
          registerCapability('forms');
        }
      } else if (
        fnName === 'useWpOption' ||
        fnName === 'useWpThemeMod' ||
        fnName === 'getSiteSettings' ||
        fnName === 'getOption' ||
        fnName === 'getLiveOption' ||
        fnName === 'getThemeMod' ||
        fnName === 'getLiveThemeMod'
      ) {
        registerCapability('site-settings');
      } else if (fnName === 'useWpMenu' || fnName === 'getMenu' || fnName === 'getMenus') {
        registerCapability(firstArgStr ? `menus:${firstArgStr}` : 'menus');
      } else if (
        fnName === 'useWpPosts' ||
        fnName === 'useWpQuery' ||
        fnName === 'useWpPost' ||
        fnName === 'getPosts' ||
        fnName === 'getPostBySlug'
      ) {
        registerCapability('posts');
      } else if (fnName === 'useWpI18n' || fnName === 'useWpLanguage') {
        registerCapability('i18n');
      } else if (fnName === 'getWpEditable') {
        registerCapability('editables');
      } else if (fnName === 'useWpAuth' || fnName === 'getWpSession') {
        registerCapability('auth');
      } else if (
        fnName === 'useWpCart' ||
        fnName === 'useWpProducts' ||
        fnName === 'useWpCheckout'
      ) {
        registerCapability('woocommerce');
      }
    }
  });

  cache.set(fileAbs, empty);
  return empty;
}

/**
 * Collect transitive capabilities starting from an entry file by following local imports.
 */
function collectTransitiveAnalysis(entryFileAbs, projectRoot, fileCache) {
  const visited = new Set();
  const uses = new Set();
  const shortcodes = [];
  const forms = [];
  const files = [];
  let declaredWpMode = null;

  const visit = (fileAbs, isEntry) => {
    if (!fileAbs || visited.has(fileAbs)) return;
    visited.add(fileAbs);
    const info = analyzeSourceFile(fileAbs, projectRoot, fileCache);
    files.push(info.file);
    for (const u of info.uses) uses.add(u);
    for (const sc of info.shortcodes) shortcodes.push(sc);
    for (const f of info.forms) forms.push(f);
    if (isEntry && info.declaredWpMode) {
      declaredWpMode = info.declaredWpMode;
    }
    for (const dep of info.localImports) {
      visit(dep, false);
    }
  };

  visit(entryFileAbs, true);

  return {
    uses,
    shortcodes,
    forms,
    files,
    declaredWpMode,
  };
}

/**
 * Convert a Next.js App Router file relative path (inside app dir) into a route path.
 * Ignores route groups like `(marketing)` and parallel slots like `@modal`.
 */
function nextAppFileToRoutePath(relFromAppDir) {
  const dir = path.dirname(relFromAppDir).replace(/\\/g, '/');
  if (dir === '.' || dir === '') return '/';
  const segments = dir
    .split('/')
    .filter((seg) => seg && !seg.startsWith('(') && !seg.startsWith('@'));
  return segments.length === 0 ? '/' : `/${segments.join('/')}`;
}

/**
 * Discover React/Vite routes from `src/app/routes.(tsx|jsx|ts|js)`, `src/routes.(tsx|jsx|ts|js)`,
 * and/or `src/app/pages/*` / `src/pages/*`.
 */
function discoverReactRoutes(projectRoot, fileCache) {
  const routes = [];
  const seenRoutes = new Set();

  const routesFile = [
    path.join(projectRoot, 'src', 'app', 'routes.tsx'),
    path.join(projectRoot, 'src', 'app', 'routes.jsx'),
    path.join(projectRoot, 'src', 'app', 'routes.ts'),
    path.join(projectRoot, 'src', 'app', 'routes.js'),
    path.join(projectRoot, 'src', 'routes.tsx'),
    path.join(projectRoot, 'src', 'routes.jsx'),
    path.join(projectRoot, 'src', 'routes.ts'),
    path.join(projectRoot, 'src', 'routes.js'),
  ].find((p) => existsSync(p));

  if (routesFile) {
    const routesInfo = analyzeSourceFile(routesFile, projectRoot, fileCache);
    try {
      const source = readFileSync(routesFile, 'utf8');
      const ast = parse(source, {
        sourceType: 'unambiguous',
        plugins: ['jsx', 'typescript'],
        errorRecovery: true,
      });

      walkAst(ast.program, (node) => {
        if (node.type !== 'JSXOpeningElement') return;
        if (node.name?.type !== 'JSXIdentifier' || node.name.name !== 'Route') return;

        let routePath = null;
        const referencedFiles = [];
        for (const attr of node.attributes || []) {
          if (attr.type !== 'JSXAttribute' || attr.name?.type !== 'JSXIdentifier') continue;
          if (attr.name.name === 'path') {
            routePath = getStringLiteralValue(attr.value);
          } else if (attr.name.name === 'element' || attr.name.name === 'component') {
            // Walk expression to capture component identifiers inside `withLayout(Comp)`, `<Comp />`, etc.
            walkAst(attr.value, (exprNode) => {
              let idName = null;
              if (exprNode.type === 'Identifier') idName = exprNode.name;
              else if (exprNode.type === 'JSXIdentifier') idName = exprNode.name;
              if (idName && routesInfo.importBindings.has(idName)) {
                const target = routesInfo.importBindings.get(idName);
                if (target && !referencedFiles.includes(target)) {
                  referencedFiles.push(target);
                }
              }
            });
          }
        }

        if (!routePath || !routePath.startsWith('/')) return;
        const normalized = normalizeRoutePath(routePath);
        if (seenRoutes.has(normalized)) return;
        seenRoutes.add(normalized);

        routes.push({
          routePath: normalized,
          fileAbs: referencedFiles[0] || null,
          displayFileAbs: referencedFiles[0] || routesFile,
          extraFilesAbs: referencedFiles.slice(1),
          kind: 'page',
        });
      });
    } catch {
      // Fall back to pages discovery below
    }
  }

  // Fallback: scan src/app/pages/* or src/pages/* if no routes were parsed from routes.*
  if (routes.length === 0) {
    const pagesDir = [
      path.join(projectRoot, 'src', 'app', 'pages'),
      path.join(projectRoot, 'src', 'pages'),
    ].find((p) => existsSync(p));
    if (pagesDir) {
      for (const f of walkFiles(pagesDir, pagesDir)) {
        if (!SOURCE_EXTENSION_SET.has(path.extname(f.rel))) continue;
        const base = f.rel.replace(/\.[^.]+$/, '');
        const lower = base.toLowerCase();
        const routePath =
          lower === 'home' || lower === 'index' || lower === 'frontpage'
            ? '/'
            : normalizeRoutePath(`/${lower.replace(/page$/, '') || lower}`);
        if (seenRoutes.has(routePath)) continue;
        seenRoutes.add(routePath);
        routes.push({
          routePath,
          fileAbs: f.full,
          kind: 'page',
        });
      }
    }
  }

  return routes;
}

/**
 * Scan `src/server/**\/*.php` to classify backend escape hatches into
 * plugin-owned, theme-only, or legacy flat-directory files.
 */
function scanServerPhpFiles(projectRoot) {
  const serverDir = path.join(projectRoot, 'src', 'server');
  const result = { plugin: [], theme: [], legacy: [] };
  if (!existsSync(serverDir)) return result;

  for (const f of walkFiles(serverDir, projectRoot)) {
    if (!f.rel.endsWith('.php')) continue;
    if (f.rel.startsWith('src/server/plugin/')) {
      result.plugin.push(f.rel);
    } else if (f.rel.startsWith('src/server/theme/')) {
      result.theme.push(f.rel);
    } else {
      result.legacy.push(f.rel);
    }
  }

  result.plugin.sort();
  result.theme.sort();
  result.legacy.sort();
  return result;
}

function detectFrameworkAdapter(projectRoot, config) {
  if (config?.frameworkAdapter) return config.frameworkAdapter;
  const hasNextConfig = ['next.config.ts', 'next.config.mjs', 'next.config.js', 'next.config.cjs'].some(
    (f) => existsSync(path.join(projectRoot, f)),
  );
  if (hasNextConfig) return 'nextjs';
  const hasViteReactRoutes = [
    'src/app/routes.tsx',
    'src/app/routes.jsx',
    'src/routes.tsx',
    'src/routes.jsx',
  ].some((f) => existsSync(path.join(projectRoot, f)));
  if (hasViteReactRoutes) return 'react';
  const appDir = resolveAppDir(projectRoot);
  return appDir ? 'nextjs' : 'react';
}

/**
 * Build the canonical Route Capability Manifest (`forgewp-manifest.json`) for a
 * ForgeWP project (Next.js App Router or React/Vite).
 *
 * Builds directly on `diagnoseNextNativeCompatibility()` for Next.js native blockers
 * and adds AST-level `<WpShortcode>`, `mode: 'shortcode'` form, capability, and
 * `hybridRoutes` analysis across both adapters.
 *
 * @param {string} projectRoot
 * @param {{ config?: Record<string, any> | null }} [options]
 */
export function buildRouteCapabilityManifest(projectRoot, options = {}) {
  const resolvedRoot = path.resolve(projectRoot);
  const config = options.config || {};
  const appDir = resolveAppDir(resolvedRoot);
  const frameworkAdapter = detectFrameworkAdapter(resolvedRoot, config);

  const rawHybridRoutes = Array.isArray(config.hybridRoutes)
    ? config.hybridRoutes
    : Array.isArray(config.deployment?.hybridRoutes)
      ? config.deployment.hybridRoutes
      : [];
  const hybridRoutes = Array.from(
    new Set(rawHybridRoutes.map((r) => normalizeRoutePath(r))),
  );

  const formsConfig = config.forms && typeof config.forms === 'object' ? config.forms : {};
  const shortcodeForms = {};
  for (const [formName, formCfg] of Object.entries(formsConfig)) {
    if (formCfg && formCfg.mode === 'shortcode') {
      shortcodeForms[formName] = {
        name: formName,
        shortcode: formCfg.shortcode || null,
        tag: extractShortcodeTag(formCfg.shortcode) || null,
      };
    }
  }

  const fileCache = new Map();
  const discoveredEntries = [];
  const rootLayoutFiles = [];

  if (frameworkAdapter === 'nextjs' && appDir) {
    const appFiles = walkFiles(appDir.abs, appDir.abs);
    for (const f of appFiles) {
      const baseName = path.basename(f.rel);
      if (PAGE_FILE_RE.test(baseName)) {
        discoveredEntries.push({
          routePath: nextAppFileToRoutePath(f.rel),
          fileAbs: f.full,
          kind: 'page',
        });
      } else if (ROUTE_HANDLER_FILE_RE.test(baseName)) {
        discoveredEntries.push({
          routePath: nextAppFileToRoutePath(f.rel),
          fileAbs: f.full,
          kind: 'route-handler',
        });
      } else if (LAYOUT_FILE_RE.test(baseName) && path.dirname(f.rel) === '.') {
        rootLayoutFiles.push(f.full);
      }
    }
  } else {
    discoveredEntries.push(...discoverReactRoutes(resolvedRoot, fileCache));
    // Root shell candidates for React adapter
    for (const candidate of ['src/App.tsx', 'src/App.jsx', 'src/App.js']) {
      const abs = path.join(resolvedRoot, candidate);
      if (existsSync(abs)) rootLayoutFiles.push(abs);
    }
  }

  // Run Next.js native compatibility diagnostics (reused as single source of truth)
  const nextNativeCompat =
    frameworkAdapter === 'nextjs'
      ? diagnoseNextNativeCompatibility(resolvedRoot)
      : { ok: true, errors: [], warnings: [], diagnostics: [] };

  // Build route entries
  const routes = {};
  const routeFileIndex = new Map(); // relFile -> routePath
  const allMappedSourceFiles = new Set();

  // Sort deterministically by routePath
  discoveredEntries.sort((a, b) => a.routePath.localeCompare(b.routePath));

  for (const entry of discoveredEntries) {
    const relFile = path.relative(resolvedRoot, entry.displayFileAbs || entry.fileAbs).replace(/\\/g, '/');
    const analysis = entry.fileAbs
      ? collectTransitiveAnalysis(entry.fileAbs, resolvedRoot, fileCache)
      : { uses: new Set(), shortcodes: [], forms: [], files: [], declaredWpMode: null };
    for (const extraAbs of entry.extraFilesAbs || []) {
      const extraAnalysis = collectTransitiveAnalysis(extraAbs, resolvedRoot, fileCache);
      for (const f of extraAnalysis.files) {
        if (!analysis.files.includes(f)) analysis.files.push(f);
      }
      for (const u of extraAnalysis.uses) analysis.uses.add(u);
      for (const sc of extraAnalysis.shortcodes) analysis.shortcodes.push(sc);
      for (const fm of extraAnalysis.forms) analysis.forms.push(fm);
    }
    for (const f of analysis.files) allMappedSourceFiles.add(f);
    if (entry.fileAbs) {
      routeFileIndex.set(relFile, entry.routePath);
    }

    const uses = new Set(analysis.uses);
    const nativeBlockers = [];
    const decoupledBlockers = [];
    const matchedShortcodeForms = new Set();

    if (entry.kind === 'route-handler') {
      uses.add('route-handler');
    }

    // 1. Direct <WpShortcode> usages on this route (or its transitive imports)
    for (const sc of analysis.shortcodes) {
      decoupledBlockers.push({
        code: 'SHORTCODE_NATIVE_PINNED',
        severity: 'error',
        route: entry.routePath,
        file: sc.file,
        line: sc.line,
        shortcode: sc.tag,
        message: `<WpShortcode${sc.raw ? ` code="${sc.raw}"` : ''}> on route "${entry.routePath}" (${sc.file}) requires WordPress PHP do_shortcode() and cannot run in Pure Decoupled mode.`,
        suggestion: `Add "${entry.routePath}" to hybridRoutes in wp.config.ts for Hybrid delegation, or replace the shortcode with a dual-mode ForgeWP primitive.`,
      });

      // Match against declared mode: 'shortcode' forms via option key or shortcode tag
      for (const [formName, sf] of Object.entries(shortcodeForms)) {
        const optionMatches =
          sc.optionKey &&
          sc.optionKey.toLowerCase() === `form_${formName.toLowerCase()}_shortcode`;
        const tagMatches = sf.tag && sc.tag && sf.tag === sc.tag;
        if (optionMatches || tagMatches) {
          matchedShortcodeForms.add(formName);
          uses.add(`shortcode-form:${formName}`);
        }
      }
    }

    // 2. Direct form references pointing to a mode: 'shortcode' form
    for (const formRef of analysis.forms) {
      if (shortcodeForms[formRef.form]) {
        matchedShortcodeForms.add(formRef.form);
        uses.add(`shortcode-form:${formRef.form}`);
        decoupledBlockers.push({
          code: 'SHORTCODE_FORM_NATIVE_PINNED',
          severity: 'error',
          route: entry.routePath,
          file: formRef.file,
          line: formRef.line,
          form: formRef.form,
          message: `Form "${formRef.form}" on route "${entry.routePath}" uses mode: 'shortcode' and cannot run in Pure Decoupled mode.`,
          suggestion: `Add "${entry.routePath}" to hybridRoutes in wp.config.ts, or migrate "${formRef.form}" to mode: 'native'.`,
        });
      }
    }

    // 3. Explicit wpMode declaration on the route
    if (analysis.declaredWpMode === 'native') {
      decoupledBlockers.push({
        code: 'ROUTE_NATIVE_PINNED',
        severity: 'error',
        route: entry.routePath,
        file: relFile,
        message: `Route "${entry.routePath}" (${relFile}) explicitly declares wpMode: 'native'.`,
        suggestion: `Add "${entry.routePath}" to hybridRoutes in wp.config.ts for Hybrid mode, or remove wpMode: 'native'.`,
      });
    } else if (analysis.declaredWpMode === 'decoupled') {
      nativeBlockers.push({
        code: 'ROUTE_DECOUPLED_PINNED',
        severity: 'error',
        route: entry.routePath,
        file: relFile,
        message: `Route "${entry.routePath}" (${relFile}) explicitly declares wpMode: 'decoupled' and cannot be exported as a Native WordPress template.`,
        suggestion: `Deploy in decoupled or hybrid mode, or remove wpMode: 'decoupled'.`,
      });
    }

    const isHybrid = matchesHybridRoute(entry.routePath, hybridRoutes);

    routes[entry.routePath] = {
      file: relFile,
      kind: entry.kind,
      uses: Array.from(uses).sort(),
      declaredWpMode: analysis.declaredWpMode,
      hybrid: isHybrid,
      pinned: null, // finalized after Next.js native diagnostics attach
      wpMode: 'portable',
      shortcodes: analysis.shortcodes,
      shortcodeForms: Array.from(matchedShortcodeForms).sort(),
      nativeBlockers,
      decoupledBlockers,
      warnings: [],
      _sourceFiles: analysis.files,
    };
  }

  // Attach Next.js native compatibility diagnostics onto their respective routes (or global)
  const globalNativeBlockers = [];
  const globalNativeWarnings = [];
  const middlewareFiles = [];

  for (const diag of nextNativeCompat.diagnostics || []) {
    if (diag.code === 'NEXT_NATIVE_MIDDLEWARE') {
      middlewareFiles.push(diag.file);
    }

    // Match diagnostic file to route directly or via transitive imports
    let matchedRouteKey = routeFileIndex.get(diag.file) || null;
    if (!matchedRouteKey) {
      for (const [routeKey, routeObj] of Object.entries(routes)) {
        if (routeObj._sourceFiles.includes(diag.file)) {
          matchedRouteKey = routeKey;
          break;
        }
      }
    }

    const mappedUse =
      diag.code === 'NEXT_NATIVE_ROUTE_HANDLER'
        ? 'route-handler'
        : diag.code === 'NEXT_NATIVE_SERVER_ACTION'
          ? 'server-action'
          : diag.code === 'NEXT_NATIVE_DYNAMIC_RUNTIME_API'
            ? 'dynamic-runtime-api'
            : diag.code === 'NEXT_NATIVE_DYNAMIC_ROUTE'
              ? 'unsupported-dynamic-route'
              : diag.code === 'NEXT_NATIVE_ISR_REVALIDATE'
                ? 'isr-revalidate'
                : null;

    if (matchedRouteKey && routes[matchedRouteKey]) {
      const r = routes[matchedRouteKey];
      if (mappedUse && !r.uses.includes(mappedUse)) {
        r.uses = [...r.uses, mappedUse].sort();
      }
      if (diag.severity === 'error') {
        r.nativeBlockers.push({ ...diag, route: matchedRouteKey });
      } else {
        r.warnings.push({ ...diag, route: matchedRouteKey });
      }
    } else if (diag.severity === 'error') {
      globalNativeBlockers.push(diag);
    } else {
      globalNativeWarnings.push(diag);
    }
  }

  // Analyze root layout files for shared shortcodes (affecting every route!)
  const layoutShortcodes = [];
  for (const layoutAbs of rootLayoutFiles) {
    const layoutInfo = collectTransitiveAnalysis(layoutAbs, resolvedRoot, fileCache);
    for (const f of layoutInfo.files) allMappedSourceFiles.add(f);
    for (const sc of layoutInfo.shortcodes) {
      layoutShortcodes.push(sc);
    }
  }

  // Scan any remaining source files under src/ (and app/) for unmapped <WpShortcode> usages
  const unmappedShortcodes = [];
  const scanRoots = [
    existsSync(path.join(resolvedRoot, 'src')) ? path.join(resolvedRoot, 'src') : null,
    appDir && !appDir.rel.startsWith('src/') ? appDir.abs : null,
  ].filter(Boolean);

  const seenScanFiles = new Set();
  for (const root of scanRoots) {
    for (const f of walkFiles(root, resolvedRoot)) {
      if (seenScanFiles.has(f.rel)) continue;
      seenScanFiles.add(f.rel);
      if (!SOURCE_EXTENSION_SET.has(path.extname(f.rel))) continue;
      if (allMappedSourceFiles.has(f.rel)) continue;

      const info = analyzeSourceFile(f.full, resolvedRoot, fileCache);
      for (const sc of info.shortcodes) {
        unmappedShortcodes.push(sc);
      }
    }
  }

  // Finalize `pinned`, `wpMode`, and `suggestedHybridRoutes` for each route
  const suggestedHybridRoutes = [];
  for (const [routeKey, r] of Object.entries(routes)) {
    const hasNativeBlockers = r.nativeBlockers.length > 0;
    const hasDecoupledBlockers = r.decoupledBlockers.length > 0;

    if (hasNativeBlockers && hasDecoupledBlockers) {
      r.pinned = 'conflict';
      r.wpMode = 'conflict';
    } else if (hasDecoupledBlockers) {
      r.pinned = 'native';
      r.wpMode = 'native';
    } else if (hasNativeBlockers) {
      r.pinned = 'decoupled';
      r.wpMode = 'decoupled';
    } else {
      r.pinned = null;
      r.wpMode = r.hybrid ? 'native' : 'portable';
    }

    if (hasDecoupledBlockers && !r.hybrid) {
      suggestedHybridRoutes.push(routeKey);
    }

    // Remove internal tracking field from serialized manifest
    delete r._sourceFiles;
  }

  // Check declared shortcode-mode forms against covered hybrid routes
  const coveredShortcodeForms = new Set();
  const uncoveredShortcodeForms = [];
  for (const [formName, sf] of Object.entries(shortcodeForms)) {
    const referencingRoutes = Object.entries(routes).filter(([, r]) =>
      r.shortcodeForms.includes(formName),
    );
    const allCoveredByHybrid =
      referencingRoutes.length > 0 && referencingRoutes.every(([, r]) => r.hybrid);

    // Also allow if user explicitly put a route in hybridRoutes that renders a dynamic <WpShortcode>
    const hybridRouteHasDynamicShortcode =
      referencingRoutes.length === 0 &&
      Object.values(routes).some(
        (r) => r.hybrid && r.shortcodes.some((sc) => sc.tag === 'dynamic' || sc.tag === sf.tag),
      );

    if (allCoveredByHybrid || hybridRouteHasDynamicShortcode) {
      coveredShortcodeForms.add(formName);
    } else if (referencingRoutes.length === 0) {
      uncoveredShortcodeForms.push(sf);
    }
  }

  const serverPhpFiles = scanServerPhpFiles(resolvedRoot);
  const redirects = Array.isArray(config.redirects)
    ? config.redirects
        .filter((r) => r && typeof r === 'object' && typeof r.from === 'string' && typeof r.to === 'string')
        .map((r) => ({
          from: normalizeRoutePath(r.from),
          to: r.to,
          status: r.status ?? 301,
          ifNotFound: r.ifNotFound === true,
        }))
    : [];

  const dynamicHierarchy =
    frameworkAdapter === 'nextjs'
      ? discoverNextDynamicHierarchy(resolvedRoot, { postTypes: config.postTypes || {} })
      : { singleRoutes: [], archiveRoutes: [], unsupportedDynamic: [] };
  const postArchiveRoute = dynamicHierarchy.archiveRoutes.find(
    (r) => r.postType === 'post',
  );
  const postsArchivePath = postArchiveRoute
    ? normalizeRoutePath(postArchiveRoute.routePath)
    : null;

  return {
    schemaVersion: 1,
    project: {
      name: config.name || path.basename(resolvedRoot),
      slug: config.slug || path.basename(resolvedRoot),
      frameworkAdapter,
    },
    postsArchivePath,
    hybridRoutes,
    routes,
    global: {
      middleware: middlewareFiles,
      nextNativeBlockers: globalNativeBlockers,
      nextNativeWarnings: globalNativeWarnings,
      layoutShortcodes,
      unmappedShortcodes,
      shortcodeForms: Object.values(shortcodeForms),
      uncoveredShortcodeForms,
      coveredShortcodeForms: Array.from(coveredShortcodeForms).sort(),
      serverPhpFiles,
      redirects,
    },
    suggestedHybridRoutes: suggestedHybridRoutes.sort(),
  };
}

/**
 * Evaluate a Route Capability Manifest against a deployment target:
 * `'native' | 'decoupled' | 'hybrid'`.
 *
 * Rules (per `docs/dual-mode-portability-architecture.md` §9 & `docs/parallel-workstreams.md`):
 * - `native`: Next.js server-only APIs (`middleware`, `route.ts`, `use server`,
 *   `next/headers`, `force-dynamic`, unsupported dynamic segments) and explicit
 *   `wpMode: 'decoupled'` are hard errors (`compatible: false`). Shortcodes are allowed.
 * - `decoupled`: `<WpShortcode>`, `mode: 'shortcode'` forms, and `wpMode: 'native'`
 *   are **hard errors (`compatible: false`)** unless the affected route is declared
 *   in `hybridRoutes`.
 * - `hybrid`: Native-pinned routes must be listed in `hybridRoutes` (otherwise hard error);
 *   routes listed in `hybridRoutes` must NOT use Next.js server-only APIs (conflict = hard error).
 * - Vite React (`frameworkAdapter === 'react'`) targeting `decoupled` or `hybrid`
 *   emits a clear SPA/CSR trade-off warning per Locked Decision #3.
 *
 * @param {ReturnType<typeof buildRouteCapabilityManifest>} manifest
 * @param {'native' | 'decoupled' | 'hybrid'} target
 */
export function evaluateTargetCompatibility(manifest, target) {
  if (!VALID_DOCTOR_TARGETS.includes(target)) {
    throw new Error(
      `Invalid doctor target "${target}". Expected one of: ${VALID_DOCTOR_TARGETS.join(', ')}.`,
    );
  }

  const errors = [];
  const warnings = [];
  const hybridDelegatedRoutes = [];
  const frameworkAdapter = manifest.project?.frameworkAdapter || 'react';
  const routesEntries = Object.entries(manifest.routes || {});

  let portableRoutes = 0;
  let nativePinnedRoutes = 0;
  let decoupledPinnedRoutes = 0;

  for (const [routePath, route] of routesEntries) {
    if (route.pinned === 'native') nativePinnedRoutes++;
    else if (route.pinned === 'decoupled') decoupledPinnedRoutes++;
    else if (route.pinned === null) portableRoutes++;
    if (route.hybrid) hybridDelegatedRoutes.push(routePath);
  }

  if (target === 'native') {
    for (const blocker of manifest.global?.nextNativeBlockers || []) {
      errors.push(blocker);
    }
    for (const w of manifest.global?.nextNativeWarnings || []) {
      warnings.push(w);
    }
    for (const [, route] of routesEntries) {
      for (const blocker of route.nativeBlockers || []) {
        errors.push(blocker);
      }
      for (const w of route.warnings || []) {
        warnings.push(w);
      }
    }
  } else if (target === 'decoupled' || target === 'hybrid') {
    // 1. Vite React decoupled CSR trade-off warning (Section 9 Locked Decision #3)
    if (frameworkAdapter === 'react') {
      warnings.push({
        code: 'VITE_DECOUPLED_CSR_TRADEOFF',
        severity: 'warning',
        feature: 'Vite React CSR decoupled mode',
        affectedMode: target,
        message:
          'This project uses the Vite React adapter (frameworkAdapter: "react"). Decoupled deployment runs as a static/CSR SPA without SSR HTML, ISR, or server-side auth guards.',
        suggestion:
          'Use the Next.js App Router adapter (frameworkAdapter: "nextjs") for full-parity Decoupled & Hybrid hosting (SSR/ISR, Draft Mode, server auth, Hybrid route delegation).',
      });
    }

    // 2. Root layout shortcodes affect decoupled routes globally -> hard error
    for (const sc of manifest.global?.layoutShortcodes || []) {
      errors.push({
        code: 'SHORTCODE_LAYOUT_NATIVE_PINNED',
        severity: 'error',
        file: sc.file,
        line: sc.line,
        shortcode: sc.tag,
        affectedMode: target,
        message: `<WpShortcode${sc.raw ? ` code="${sc.raw}"` : ''}> in root layout (${sc.file}) executes on every route and cannot run in ${target} mode.`,
        suggestion:
          'Move <WpShortcode> out of the root layout into a dedicated page listed in hybridRoutes, or replace it with a dual-mode ForgeWP primitive.',
      });
    }

    // 3. Unmapped shortcodes in source files not linked to a hybrid route -> hard error
    for (const sc of manifest.global?.unmappedShortcodes || []) {
      errors.push({
        code: 'SHORTCODE_NATIVE_PINNED',
        severity: 'error',
        file: sc.file,
        line: sc.line,
        shortcode: sc.tag,
        affectedMode: target,
        message: `<WpShortcode${sc.raw ? ` code="${sc.raw}"` : ''}> in "${sc.file}" cannot be mapped to a route in hybridRoutes and cannot run in ${target} mode.`,
        suggestion:
          'Move this shortcode onto a route listed in hybridRoutes in wp.config.ts, or replace it with a dual-mode ForgeWP primitive.',
      });
    }

    // 4. Declared mode: 'shortcode' forms not exclusively on hybridRoutes -> hard error
    for (const sf of manifest.global?.uncoveredShortcodeForms || []) {
      errors.push({
        code: 'SHORTCODE_FORM_NATIVE_PINNED',
        severity: 'error',
        form: sf.name,
        affectedMode: target,
        message: `Form "${sf.name}" is configured with mode: 'shortcode'${sf.shortcode ? ` (${sf.shortcode})` : ''} and is not delegated to any route in hybridRoutes.`,
        suggestion: `Render this form on a route listed in hybridRoutes in wp.config.ts, or switch forms.${sf.name}.mode to 'native'.`,
      });
    }

    // 5. Per-route checks
    for (const [routePath, route] of routesEntries) {
      if (route.decoupledBlockers.length > 0 && !route.hybrid) {
        for (const blocker of route.decoupledBlockers) {
          errors.push({
            ...blocker,
            affectedMode: target,
            ...(target === 'hybrid'
              ? {
                  suggestion: `Add "${routePath}" to hybridRoutes in wp.config.ts so the edge router delegates it to WordPress.`,
                }
              : {}),
          });
        }
      }

      // In Hybrid mode, a route delegated to WordPress cannot also use Next.js server-only APIs
      if (route.hybrid && route.nativeBlockers.length > 0) {
        for (const nb of route.nativeBlockers) {
          errors.push({
            code: 'HYBRID_ROUTE_DECOUPLED_CONFLICT',
            severity: 'error',
            route: routePath,
            file: nb.file || route.file,
            affectedMode: target,
            message: `Hybrid route "${routePath}" is delegated to WordPress native PHP via hybridRoutes, but also uses Next.js server-only feature "${nb.code}" (${nb.file || route.file}).`,
            suggestion: `Remove "${routePath}" from hybridRoutes or remove the Next.js server-only feature from that route.`,
          });
        }
      }
    }

    // 6. Hybrid mode with empty hybridRoutes -> helpful warning
    if (target === 'hybrid' && (manifest.hybridRoutes || []).length === 0 && errors.length === 0) {
      warnings.push({
        code: 'HYBRID_NO_ROUTES_DECLARED',
        severity: 'warning',
        affectedMode: 'hybrid',
        message: 'No hybridRoutes are configured in wp.config.ts.',
        suggestion:
          'All routes appear decoupled-ready — you can deploy in Pure Decoupled mode (--target decoupled) without running a dual Hybrid build.',
      });
    }

    // 7. Server PHP escape-hatch warnings for Decoupled / Hybrid
    const serverPhp = manifest.global?.serverPhpFiles || { plugin: [], theme: [], legacy: [] };
    if (serverPhp.theme.length > 0) {
      warnings.push({
        code: 'THEME_PHP_DECOUPLED_SKIPPED',
        severity: 'warning',
        affectedMode: target,
        files: serverPhp.theme,
        message: `Theme-only PHP file(s) (${serverPhp.theme.join(', ')}) only run on Native/Hybrid WordPress routes, not on decoupled routes.`,
        suggestion:
          'Move backend REST/CPT/hook logic to src/server/plugin/*.php so it runs in all deployment modes.',
      });
    }
    if (serverPhp.legacy.length > 0) {
      warnings.push({
        code: 'LEGACY_SERVER_PHP_SPLIT',
        severity: 'warning',
        affectedMode: target,
        files: serverPhp.legacy,
        message: `Legacy src/server/*.php file(s) (${serverPhp.legacy.join(', ')}) are treated as theme-only and will not execute on decoupled routes.`,
        suggestion:
          'Split backend logic into src/server/plugin/*.php (Companion Plugin, all modes) and presentation hooks into src/server/theme/*.php (Native/Hybrid only).',
      });
    }

    // 8. Declarative ifNotFound redirects that match an app route are skipped in Next.js redirects()
    for (const rule of manifest.global?.redirects || []) {
      if (rule.ifNotFound && Object.prototype.hasOwnProperty.call(manifest.routes || {}, rule.from)) {
        warnings.push({
          code: 'REDIRECT_IF_NOT_FOUND_SHADOWED',
          severity: 'warning',
          route: rule.from,
          affectedMode: target,
          message: `Redirect "${rule.from}" -> "${rule.to}" has ifNotFound: true, which matches existing route "${rule.from}". Next.js redirects() has no 404-fallback equivalent, so withForgeWP() skips this rule in ${target} mode.`,
          suggestion:
            'Remove ifNotFound: true if the redirect should always fire, or handle the fallback inside the route component when the WordPress page is missing.',
        });
      }
    }
  }

  return {
    target,
    compatible: errors.length === 0,
    frameworkAdapter,
    hybridRoutes: manifest.hybridRoutes || [],
    hybridDelegatedRoutes: hybridDelegatedRoutes.sort(),
    suggestedHybridRoutes: manifest.suggestedHybridRoutes || [],
    errors,
    warnings,
    summary: {
      totalRoutes: routesEntries.length,
      portableRoutes,
      nativePinnedRoutes,
      decoupledPinnedRoutes,
      hybridDelegatedRoutes: hybridDelegatedRoutes.length,
      errorCount: errors.length,
      warningCount: warnings.length,
    },
  };
}

/**
 * Write the Route Capability Manifest JSON to `.forgewp/forgewp-manifest.json`
 * (or a custom output path).
 *
 * @param {string} projectRoot
 * @param {ReturnType<typeof buildRouteCapabilityManifest>} manifest
 * @param {string} [customOutPath]
 * @returns {string} Absolute path written
 */
export function writeRouteCapabilityManifest(projectRoot, manifest, customOutPath) {
  const resolvedRoot = path.resolve(projectRoot);
  const targetPath = customOutPath
    ? path.resolve(resolvedRoot, customOutPath)
    : path.join(resolvedRoot, '.forgewp', 'forgewp-manifest.json');
  mkdirSync(path.dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return targetPath;
}
