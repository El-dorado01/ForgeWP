import { loadFrameworkAdapter } from './framework-adapter.js';

const VALID_ROUTE_KINDS = new Set(['home', 'page', 'not-found']);
const OPTIONAL_HTML_FIELDS = [
  'headerHtml',
  'footerHtml',
  'headHtml',
  'singleHtml',
  'singleHeadHtml',
  'notFoundHtml',
  'archiveHtml',
];
const VALID_TEMPLATE_SLUG = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

/**
 * Normalize a route pathname into canonical leading-slash form without trailing slash (except '/').
 * @param {string} routePath
 * @returns {string}
 */
export function normalizeStaticRoutePath(routePath) {
  if (typeof routePath !== 'string') return '';
  const trimmed = routePath.trim().split(/[?#]/, 1)[0];
  if (!trimmed.startsWith('/')) return '';
  const stripped = trimmed.replace(/^\/+|\/+$/g, '');
  return stripped ? `/${stripped}` : '/';
}

/**
 * Derive WordPress slug, templateSlug, and title for an adapter-owned static page route.
 * @param {import('./index.js').ForgeWPStaticRoute} route
 */
export function resolveStaticPageRoute(route) {
  const normalizedPath = normalizeStaticRoutePath(route.path);
  const rawSlug =
    typeof route.slug === 'string' && route.slug.trim()
      ? route.slug.trim().replace(/^\/+|\/+$/g, '')
      : normalizedPath.replace(/^\/+|\/+$/g, '');
  const templateSlug = (
    typeof route.templateSlug === 'string' && route.templateSlug.trim()
      ? route.templateSlug.trim()
      : rawSlug.split('/').filter(Boolean).join('-')
  ).toLowerCase();
  const fallbackSegment = rawSlug.split('/').filter(Boolean).pop() || templateSlug;
  const fallbackTitle = fallbackSegment
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  const title =
    typeof route.title === 'string' && route.title.trim()
      ? route.title.trim()
      : fallbackTitle;

  return {
    path: normalizedPath,
    slug: rawSlug,
    templateSlug,
    title,
    html: route.html,
    headHtml: typeof route.headHtml === 'string' ? route.headHtml : '',
    ownsShell: route.ownsShell === true,
    layoutExtracted: route.layoutExtracted === true,
    assets: route.assets,
    sourceFile: route.sourceFile,
  };
}

/**
 * Validate the static markup contract returned by a framework adapter.
 * Preserves legacy React/HTML markup objects while validating additive route records when provided.
 * @param {unknown} markup
 * @param {string} [adapterName]
 */
export function validateStaticMarkup(markup, adapterName = 'react') {
  if (!markup || typeof markup !== 'object' || typeof markup.appHtml !== 'string') {
    throw new Error(
      `Framework adapter "${adapterName}" returned invalid static markup: expected an object with string appHtml.`,
    );
  }

  for (const field of OPTIONAL_HTML_FIELDS) {
    if (markup[field] !== undefined && typeof markup[field] !== 'string') {
      throw new Error(
        `Framework adapter "${adapterName}" returned invalid static markup: "${field}" must be a string when provided.`,
      );
    }
  }

  if (markup.routes !== undefined) {
    if (!Array.isArray(markup.routes)) {
      throw new Error(
        `Framework adapter "${adapterName}" returned invalid static markup: "routes" must be an array when provided.`,
      );
    }

    const seenPaths = new Set();
    const seenTemplateSlugs = new Map();

    for (let i = 0; i < markup.routes.length; i++) {
      const route = markup.routes[i];
      if (!route || typeof route !== 'object') {
        throw new Error(
          `Framework adapter "${adapterName}" returned invalid route at index ${i}: expected a route object.`,
        );
      }

      const normalizedPath = normalizeStaticRoutePath(route.path);
      if (!normalizedPath) {
        throw new Error(
          `Framework adapter "${adapterName}" returned invalid route at index ${i}: "path" must start with "/".`,
        );
      }

      if (!VALID_ROUTE_KINDS.has(route.kind)) {
        throw new Error(
          `Framework adapter "${adapterName}" returned invalid route "${normalizedPath}": unsupported kind "${route.kind}".`,
        );
      }

      if (typeof route.html !== 'string') {
        throw new Error(
          `Framework adapter "${adapterName}" returned invalid route "${normalizedPath}": "html" must be a string.`,
        );
      }

      if (route.headHtml !== undefined && typeof route.headHtml !== 'string') {
        throw new Error(
          `Framework adapter "${adapterName}" returned invalid route "${normalizedPath}": "headHtml" must be a string when provided.`,
        );
      }

      if (seenPaths.has(normalizedPath)) {
        throw new Error(
          `Framework adapter "${adapterName}" returned duplicate route path "${normalizedPath}".`,
        );
      }
      seenPaths.add(normalizedPath);

      if (route.assets !== undefined) {
        const isStringArray = (value) =>
          Array.isArray(value) && value.every((item) => typeof item === 'string');
        if (
          !route.assets ||
          typeof route.assets !== 'object' ||
          !isStringArray(route.assets.stylesheets) ||
          !isStringArray(route.assets.clientScripts)
        ) {
          throw new Error(
            `Framework adapter "${adapterName}" returned invalid assets for route "${normalizedPath}": expected stylesheets and clientScripts string arrays.`,
          );
        }
      }

      if (route.kind === 'page') {
        const resolved = resolveStaticPageRoute(route);
        if (!resolved.slug || resolved.slug.includes('..') || /[\[\]]/.test(resolved.slug)) {
          throw new Error(
            `Framework adapter "${adapterName}" returned invalid page route "${normalizedPath}": fixed slug "${resolved.slug}" is not supported.`,
          );
        }
        if (!VALID_TEMPLATE_SLUG.test(resolved.templateSlug)) {
          throw new Error(
            `Framework adapter "${adapterName}" returned invalid page route "${normalizedPath}": templateSlug "${resolved.templateSlug}" must contain only letters, digits, and hyphens.`,
          );
        }
        if (seenTemplateSlugs.has(resolved.templateSlug)) {
          throw new Error(
            `Framework adapter "${adapterName}" returned colliding templateSlug "${resolved.templateSlug}" for routes "${seenTemplateSlugs.get(resolved.templateSlug)}" and "${normalizedPath}".`,
          );
        }
        seenTemplateSlugs.set(resolved.templateSlug, normalizedPath);
      }
    }
  }

  return markup;
}

/**
 * Server-render the theme App to static HTML (no client JS in WordPress for v1).
 * @param {string} themeRoot
 * @param {string} [adapterName]
 */
export async function renderStaticMarkup(themeRoot, adapterName = 'react') {
  const adapter = await loadFrameworkAdapter(adapterName);
  if (typeof adapter.renderStaticMarkup !== 'function') {
    throw new Error(
      `Framework adapter must expose renderStaticMarkup() - adapter=${adapterName}`,
    );
  }

  const markup = await adapter.renderStaticMarkup(themeRoot);
  return validateStaticMarkup(markup, adapterName);
}
