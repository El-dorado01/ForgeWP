import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const PAGE_FILE_RE = /^page\.(ts|tsx|js|jsx|mjs)$/;
const IGNORED_DIRS = new Set(['node_modules', '.next', 'out', '.forgewp', 'dist', '.git']);
const BLOG_BASE_ALIASES = new Set(['blog', 'posts', 'post', 'news', 'articles']);

function walkAppDir(dir, base = dir, results = []) {
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    if (IGNORED_DIRS.has(entry)) continue;
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkAppDir(full, base, results);
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
 * Parse an optional `export const forgewpTemplate = { kind: 'single' | 'archive', postType: '...' }`
 * declaration from a Next.js App Router page file.
 * @param {string} source
 * @returns {{ kind?: 'single' | 'archive', postType?: string } | null}
 */
export function parseForgeWpTemplateExport(source) {
  const match = source.match(
    /export\s+const\s+forgewpTemplate\s*(?::[^=]+)?=\s*\{([\s\S]*?)\}/,
  );
  if (!match) return null;
  const body = match[1];
  const kindMatch = body.match(/\bkind\s*:\s*['"](single|archive)['"]/);
  const postTypeMatch = body.match(/\bpostType\s*:\s*['"]([a-z0-9_-]+)['"]/i);
  if (!kindMatch && !postTypeMatch) return null;
  return {
    ...(kindMatch ? { kind: kindMatch[1] } : {}),
    ...(postTypeMatch ? { postType: postTypeMatch[1].toLowerCase() } : {}),
  };
}

/**
 * Check whether a Next.js dynamic route file exports `generateStaticParams`.
 * @param {string} source
 */
export function hasGenerateStaticParamsExport(source) {
  return (
    /\bexport\s+(?:async\s+)?function\s+generateStaticParams\b/.test(source) ||
    /\bexport\s+const\s+generateStaticParams\b/.test(source) ||
    /\bexport\s*\{[^}]*\bgenerateStaticParams\b[^}]*\}/.test(source)
  );
}

function singularizeBaseSegment(segment) {
  const clean = String(segment || '').toLowerCase().trim();
  if (!clean) return 'post';
  if (BLOG_BASE_ALIASES.has(clean)) return 'post';
  if (clean.endsWith('ies') && clean.length > 4) {
    return `${clean.slice(0, -3)}y`;
  }
  if (clean.endsWith('s') && !clean.endsWith('ss') && clean.length > 2) {
    return clean.slice(0, -1);
  }
  return clean;
}

/**
 * Resolve WordPress post type for a Next.js route base segment (e.g. 'blog' -> 'post',
 * 'projects' -> 'project', or matching declared `config.postTypes`).
 * @param {string} baseSegment
 * @param {Record<string, any>} [postTypes]
 * @param {string} [explicitPostType]
 */
export function resolvePostTypeForBase(baseSegment, postTypes = {}, explicitPostType) {
  if (explicitPostType) return explicitPostType.toLowerCase();
  const normalizedBase = String(baseSegment || '').toLowerCase().trim();
  if (!normalizedBase) return 'post';

  // 1. Match declared wp.config.ts postTypes by key, plural, or rewrite.slug
  for (const [cptKey, cptCfg] of Object.entries(postTypes || {})) {
    const keyLower = cptKey.toLowerCase();
    const rewriteSlug =
      cptCfg && typeof cptCfg.rewrite === 'object' && typeof cptCfg.rewrite.slug === 'string'
        ? cptCfg.rewrite.slug.replace(/^\/+|\/+$/g, '').toLowerCase()
        : '';
    if (
      normalizedBase === keyLower ||
      normalizedBase === `${keyLower}s` ||
      (keyLower.endsWith('y') && normalizedBase === `${keyLower.slice(0, -1)}ies`) ||
      (rewriteSlug && normalizedBase === rewriteSlug)
    ) {
      return keyLower;
    }
  }

  return singularizeBaseSegment(normalizedBase);
}

/**
 * Inspect Next.js App Router source files (`src/app/` or `app/`) to discover
 * dynamic single routes (`<base>/[param]/page.tsx`) and paired/explicit archive
 * routes (`<base>/page.tsx`) that map to WordPress `single.php` / `single-<cpt>.php`
 * and `archive.php` / `archive-<cpt>.php` templates.
 *
 * Also returns unsupported dynamic routes (catch-all `[...slug]`, multi-dynamic,
 * or missing `generateStaticParams`) so `diagnoseNextNativeCompatibility()` can
 * still fail loudly with actionable errors.
 *
 * @param {string} themeRoot
 * @param {{ postTypes?: Record<string, any> }} [options]
 */
export function discoverNextDynamicHierarchy(themeRoot, options = {}) {
  const resolvedRoot = path.resolve(themeRoot);
  const appDir = resolveAppDir(resolvedRoot);
  const postTypes = options.postTypes || {};

  /** @type {Array<{ file: string, basePath: string, baseSegment: string, paramName: string, postType: string, templateName: string }>} */
  const singleRoutes = [];
  /** @type {Array<{ file: string, routePath: string, baseSegment: string, postType: string, templateName: string }>} */
  const archiveRoutes = [];
  /** @type {Array<{ file: string, dynamicDir: string, reason: string, suggestion: string }>} */
  const unsupportedDynamic = [];

  if (!appDir) {
    return { singleRoutes, archiveRoutes, unsupportedDynamic };
  }

  const allFiles = walkAppDir(appDir.abs, resolvedRoot);
  const pageFiles = allFiles.filter((f) => PAGE_FILE_RE.test(path.basename(f.rel)));

  // First pass: find all dynamic page routes
  const singleBaseMap = new Map(); // basePath (e.g. '/blog') -> singleRoute
  const reportedUnsupportedDirs = new Set();

  for (const file of pageFiles) {
    const relWithinApp = file.rel.slice(appDir.rel.length + 1);
    const dirSegments = path.dirname(relWithinApp) === '.'
      ? []
      : path.dirname(relWithinApp).split('/').filter((seg) => !/^\(.+\)$/.test(seg));

    const dynamicIndices = [];
    for (let i = 0; i < dirSegments.length; i++) {
      if (/^\[.+\]$/.test(dirSegments[i])) {
        dynamicIndices.push(i);
      }
    }

    if (dynamicIndices.length === 0) continue;

    const code = readFileSync(file.full, 'utf8');
    const firstDynIdx = dynamicIndices[0];
    const dynamicDir = `${appDir.rel}/${dirSegments.slice(0, firstDynIdx + 1).join('/')}`;

    // Catch-all [...slug] / [[...slug]] or multi-dynamic [cat]/[slug]
    const seg = dirSegments[firstDynIdx];
    const isCatchAll = /^\[\.{3}.+\]$/.test(seg) || /^\[\[\.{3}.+\]\]$/.test(seg);
    if (isCatchAll || dynamicIndices.length > 1 || firstDynIdx !== dirSegments.length - 1) {
      if (!reportedUnsupportedDirs.has(dynamicDir)) {
        reportedUnsupportedDirs.add(dynamicDir);
        unsupportedDynamic.push({
          file: dynamicDir,
          dynamicDir,
          reason: isCatchAll
            ? `Catch-all dynamic route "${dynamicDir}" cannot map to a single WordPress hierarchy template yet.`
            : `Nested/multi-segment dynamic route "${dynamicDir}" is not supported by native WordPress hierarchy mapping yet.`,
          suggestion:
            'Use a single-segment dynamic route like src/app/blog/[slug]/page.tsx with generateStaticParams() for native WordPress single.php/single-<cpt>.php export, or deploy in decoupled mode.',
        });
      }
      continue;
    }

    // Must export generateStaticParams for Next.js static export (`output: 'export'`)
    if (!hasGenerateStaticParamsExport(code)) {
      if (!reportedUnsupportedDirs.has(dynamicDir)) {
        reportedUnsupportedDirs.add(dynamicDir);
        unsupportedDynamic.push({
          file: file.rel,
          dynamicDir,
          reason: `Dynamic route "${file.rel}" is missing \`export async function generateStaticParams()\` required for native WordPress template extraction.`,
          suggestion:
            'Export `generateStaticParams()` (e.g. `return wpClient.getStaticParams("post")`) so ForgeWP can compile this route into WordPress single.php / single-<cpt>.php, or use decoupled mode.',
        });
      }
      continue;
    }

    const paramName = seg.slice(1, -1);
    const baseSegments = dirSegments.slice(0, firstDynIdx);
    const baseSegment = baseSegments[baseSegments.length - 1] || 'post';
    const basePath = baseSegments.length > 0 ? `/${baseSegments.join('/')}` : '/';
    const explicit = parseForgeWpTemplateExport(code);
    const postType = resolvePostTypeForBase(baseSegment, postTypes, explicit?.postType);
    const templateName = postType === 'post' ? 'single' : `single-${postType}`;

    const record = {
      file: file.rel,
      basePath,
      baseSegment,
      paramName,
      postType,
      templateName,
    };
    singleRoutes.push(record);
    if (basePath !== '/') {
      singleBaseMap.set(basePath, record);
    }
  }

  // Second pass: find paired archive routes (<base>/page.tsx) or explicit archive declarations
  for (const file of pageFiles) {
    const relWithinApp = file.rel.slice(appDir.rel.length + 1);
    const dirSegments = path.dirname(relWithinApp) === '.'
      ? []
      : path.dirname(relWithinApp).split('/').filter((seg) => !/^\(.+\)$/.test(seg));

    if (dirSegments.some((seg) => /^\[.+\]$/.test(seg))) continue;
    if (dirSegments.length === 0) continue;

    const routePath = `/${dirSegments.join('/')}`;
    const code = readFileSync(file.full, 'utf8');
    const explicit = parseForgeWpTemplateExport(code);
    const pairedSingle = singleBaseMap.get(routePath);

    if (explicit?.kind === 'archive' || pairedSingle) {
      const baseSegment = dirSegments[dirSegments.length - 1];
      const postType =
        explicit?.postType ||
        pairedSingle?.postType ||
        resolvePostTypeForBase(baseSegment, postTypes);
      const templateName = postType === 'post' ? 'archive' : `archive-${postType}`;

      archiveRoutes.push({
        file: file.rel,
        routePath,
        baseSegment,
        postType,
        templateName,
      });
    }
  }

  return { singleRoutes, archiveRoutes, unsupportedDynamic };
}
