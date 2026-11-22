import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { parseSource, traverse } from './blocks/ast-parser.js';
import {
  normalizeStaticRoutePath,
  resolveStaticPageRoute,
} from './render-static.js';
import { discoverNextDynamicHierarchy } from './next-dynamic-routes.js';

const NEXT_ONLY_LINK_PROPS = new Set([
  'prefetch',
  'scroll',
  'shallow',
  'replace',
  'passHref',
  'legacyBehavior',
  'as',
]);

const NEXT_DIAGNOSTIC_PROPS = new Set(['locale']);

const ROUTELINK_TOKEN_RE =
  /^__FORGEWP_ROUTELINK:([~a-zA-Z0-9_-]+):([^:_"'\s<>]*):([^:_"'\s<>]*):([^:_"'\s<>]*)__$/;

function encodeTokenPart(value) {
  return encodeURIComponent(String(value || '')).replace(/_/g, '%5F');
}

/**
 * Encode a fixed-route WordPress permalink resolution token safe for HTML attributes.
 * @param {{ routeSlug: string, fallbackPath: string, query?: string, hash?: string }} spec
 * @returns {string}
 */
export function encodeRouteLinkToken({
  routeSlug,
  fallbackPath,
  query = '',
  hash = '',
}) {
  const cleanQuery = String(query || '').replace(/^\?/, '');
  const cleanHash = String(hash || '').replace(/^#/, '');
  return (
    `__FORGEWP_ROUTELINK:${routeSlug}` +
    `:${encodeTokenPart(fallbackPath)}` +
    `:${encodeTokenPart(cleanQuery)}` +
    `:${encodeTokenPart(cleanHash)}__`
  );
}

/**
 * Decode a `__FORGEWP_ROUTELINK:...__` token back into its structured fields.
 * @param {string} token
 */
export function decodeRouteLinkToken(token) {
  if (typeof token !== 'string') return null;
  const match = token.match(ROUTELINK_TOKEN_RE);
  if (!match) return null;
  return {
    routeSlug: match[1],
    fallbackPath: decodeURIComponent(match[2] || ''),
    query: decodeURIComponent(match[3] || ''),
    hash: decodeURIComponent(match[4] || ''),
  };
}

/**
 * Parse a destination string into external, hash-only, query-only, or internal route parts.
 * @param {string} href
 */
export function parseNextHrefDestination(href) {
  const raw = String(href ?? '').trim();
  if (!raw) {
    return { kind: 'external', raw, pathname: '', normalizedPath: '', search: '', hash: '' };
  }
  if (raw.startsWith('#')) {
    return { kind: 'hash-only', raw, pathname: '', normalizedPath: '', search: '', hash: raw };
  }
  if (raw.startsWith('?')) {
    const hashIdx = raw.indexOf('#');
    const search = hashIdx === -1 ? raw : raw.slice(0, hashIdx);
    const hash = hashIdx === -1 ? '' : raw.slice(hashIdx);
    return { kind: 'query-only', raw, pathname: '', normalizedPath: '', search, hash };
  }
  if (
    raw.startsWith('//') ||
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw) ||
    !raw.startsWith('/')
  ) {
    return { kind: 'external', raw, pathname: raw, normalizedPath: '', search: '', hash: '' };
  }

  const hashIdx = raw.indexOf('#');
  const beforeHash = hashIdx === -1 ? raw : raw.slice(0, hashIdx);
  const hash = hashIdx === -1 ? '' : raw.slice(hashIdx);
  const queryIdx = beforeHash.indexOf('?');
  const pathname = queryIdx === -1 ? beforeHash : beforeHash.slice(0, queryIdx);
  const search = queryIdx === -1 ? '' : beforeHash.slice(queryIdx);
  const normalizedPath = normalizeStaticRoutePath(pathname);

  return {
    kind: 'internal',
    raw,
    pathname,
    normalizedPath,
    search,
    hash,
  };
}

/**
 * Build a normalized path lookup table from ForgeWPStaticRoute records and discovered archive routes.
 * @param {import('./index.js').ForgeWPStaticRoute[]} [routes]
 * @param {Array<{ routePath?: string, path?: string, postType?: string }>} [archiveRoutes]
 */
export function buildKnownRouteIndex(routes = [], archiveRoutes = []) {
  const index = new Map();
  if (Array.isArray(routes)) {
    for (const route of routes) {
      if (!route || typeof route !== 'object') continue;
      const normalizedPath = normalizeStaticRoutePath(route.path);
      if (!normalizedPath) continue;
      if (route.kind === 'home') {
        index.set('/', {
          path: '/',
          kind: 'home',
          slug: '',
          templateSlug: '~home',
        });
      } else if (route.kind === 'page') {
        const resolved = resolveStaticPageRoute(route);
        index.set(normalizedPath, {
          path: resolved.path,
          kind: 'page',
          slug: resolved.slug,
          templateSlug: resolved.templateSlug,
        });
      }
    }
  }
  if (Array.isArray(archiveRoutes)) {
    for (const ar of archiveRoutes) {
      if (!ar || typeof ar !== 'object') continue;
      const normalizedPath = normalizeStaticRoutePath(ar.routePath || ar.path);
      if (!normalizedPath || index.has(normalizedPath)) continue;
      const postType =
        String(ar.postType || 'post')
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9_-]/g, '') || 'post';
      index.set(normalizedPath, {
        path: normalizedPath,
        kind: 'archive',
        slug: normalizedPath.replace(/^\/+|\/+$/g, ''),
        postType,
        templateSlug: `~archive-${postType}`,
      });
    }
  }
  return index;
}

/**
 * Map a parsed destination against known fixed routes into a WordPress permalink token or preserve action.
 * @param {ReturnType<typeof parseNextHrefDestination>} dest
 * @param {Map<string, { path: string, kind: string, slug: string, templateSlug: string }>} knownRouteIndex
 */
export function resolveNextDestinationToWordPress(dest, knownRouteIndex) {
  if (dest.kind !== 'internal') {
    return {
      action: 'preserve',
      routeKind: dest.kind,
      routeSlug: null,
      fallbackPath: dest.raw,
      query: dest.search,
      hash: dest.hash,
      token: null,
    };
  }

  if (dest.normalizedPath === '/') {
    const token = encodeRouteLinkToken({
      routeSlug: '~home',
      fallbackPath: '/',
      query: dest.search,
      hash: dest.hash,
    });
    return {
      action: 'rewrite',
      routeKind: 'home',
      routeSlug: '~home',
      fallbackPath: '/',
      query: dest.search,
      hash: dest.hash,
      token,
    };
  }

  const matched = knownRouteIndex.get(dest.normalizedPath);
  if (matched && matched.kind === 'page') {
    const fallbackPath = `/${matched.slug}/`;
    const token = encodeRouteLinkToken({
      routeSlug: matched.templateSlug,
      fallbackPath,
      query: dest.search,
      hash: dest.hash,
    });
    return {
      action: 'rewrite',
      routeKind: 'fixed-route',
      routeSlug: matched.templateSlug,
      fallbackPath,
      query: dest.search,
      hash: dest.hash,
      token,
    };
  }

  if (matched && matched.kind === 'archive') {
    const fallbackPath = `/${matched.slug}/`;
    const token = encodeRouteLinkToken({
      routeSlug: matched.templateSlug,
      fallbackPath,
      query: dest.search,
      hash: dest.hash,
    });
    return {
      action: 'rewrite',
      routeKind: 'archive',
      routeSlug: matched.templateSlug,
      fallbackPath,
      query: dest.search,
      hash: dest.hash,
      token,
    };
  }

  const fallbackPath = dest.pathname || dest.normalizedPath;
  const token = encodeRouteLinkToken({
    routeSlug: '~unknown',
    fallbackPath,
    query: dest.search,
    hash: dest.hash,
  });
  return {
    action: 'rewrite-unknown',
    routeKind: 'unknown-internal',
    routeSlug: '~unknown',
    fallbackPath,
    query: dest.search,
    hash: dest.hash,
    token,
  };
}

/**
 * Resolve a lexical identifier binding to a known framework link/hook symbol.
 */
function classifyIdentifierBinding(scope, name) {
  if (!scope || !name) return null;
  const binding = scope.getBinding(name);
  if (!binding) return null;
  const specPath = binding.path;
  if (!specPath || !specPath.parentPath || !specPath.parentPath.isImportDeclaration()) {
    return null;
  }
  const source = specPath.parentPath.node.source.value;
  if (source === 'next/link') {
    if (specPath.isImportDefaultSpecifier()) {
      return { owner: 'next-link', module: 'next/link', imported: 'default' };
    }
    if (specPath.isImportSpecifier()) {
      const imported =
        specPath.node.imported.type === 'Identifier'
          ? specPath.node.imported.name
          : specPath.node.imported.value;
      if (imported === 'default') {
        return { owner: 'next-link', module: 'next/link', imported: 'default' };
      }
    }
    if (specPath.isImportNamespaceSpecifier()) {
      return { owner: 'next-link-namespace', module: 'next/link', imported: '*' };
    }
    return null;
  }

  if (source === '@forgewp/react' || source.startsWith('@forgewp/react/')) {
    if (specPath.isImportSpecifier()) {
      const imported =
        specPath.node.imported.type === 'Identifier'
          ? specPath.node.imported.name
          : specPath.node.imported.value;
      if (imported === 'Link' || imported === 'WpLink') {
        return { owner: 'forgewp-link', module: source, imported };
      }
      if (imported === 'useWpPageLink') {
        return { owner: 'forgewp-page-link-hook', module: source, imported };
      }
    }
  }

  return null;
}

/**
 * Classify a JSX element tag name (`<Link>`, `<NextLink>`, `<NextLinkNs.default>`, `<WpLink>`).
 */
function classifyJsxElementOwner(scope, nameNode) {
  if (!nameNode) return null;
  if (nameNode.type === 'JSXIdentifier') {
    const cls = classifyIdentifierBinding(scope, nameNode.name);
    if (cls && cls.owner !== 'next-link-namespace') {
      return { ...cls, tagName: nameNode.name };
    }
    return null;
  }
  if (
    nameNode.type === 'JSXMemberExpression' &&
    nameNode.object.type === 'JSXIdentifier' &&
    nameNode.property.type === 'JSXIdentifier' &&
    nameNode.property.name === 'default'
  ) {
    const cls = classifyIdentifierBinding(scope, nameNode.object.name);
    if (cls && cls.owner === 'next-link-namespace') {
      return {
        owner: 'next-link',
        module: 'next/link',
        imported: 'default',
        tagName: `${nameNode.object.name}.${nameNode.property.name}`,
      };
    }
  }
  return null;
}

/**
 * Evaluate a static string or primitive AST node (for static href/query/hash literals).
 */
function evaluateStaticPrimitive(node) {
  if (!node) return { ok: false };
  if (node.type === 'StringLiteral') return { ok: true, value: node.value };
  if (node.type === 'NumericLiteral' || node.type === 'BooleanLiteral') {
    return { ok: true, value: String(node.value) };
  }
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return { ok: true, value: node.quasis.map((q) => q.value.cooked ?? q.value.raw).join('') };
  }
  return { ok: false };
}

/**
 * Evaluate a static `next/link` `href` attribute (string literal, static template, or static URL object).
 */
function evaluateStaticNextHref(attrNode) {
  if (!attrNode || !attrNode.value) return { ok: false, reason: 'missing' };
  const val = attrNode.value;
  if (val.type === 'StringLiteral') {
    return { ok: true, href: val.value };
  }
  if (val.type !== 'JSXExpressionContainer') {
    return { ok: false, reason: 'unsupported' };
  }
  const expr = val.expression;
  const prim = evaluateStaticPrimitive(expr);
  if (prim.ok) {
    return { ok: true, href: prim.value };
  }
  if (expr.type === 'ObjectExpression') {
    let pathname = '';
    let queryStr = '';
    let hashStr = '';
    for (const prop of expr.properties) {
      if (prop.type !== 'ObjectProperty' || prop.computed) {
        return { ok: false, reason: 'dynamic-object' };
      }
      const key =
        prop.key.type === 'Identifier'
          ? prop.key.name
          : prop.key.type === 'StringLiteral'
            ? prop.key.value
            : null;
      if (!key) return { ok: false, reason: 'dynamic-object' };
      if (key === 'pathname') {
        const evaluated = evaluateStaticPrimitive(prop.value);
        if (!evaluated.ok) return { ok: false, reason: 'dynamic-pathname' };
        pathname = evaluated.value;
      } else if (key === 'hash') {
        const evaluated = evaluateStaticPrimitive(prop.value);
        if (!evaluated.ok) return { ok: false, reason: 'dynamic-hash' };
        hashStr = evaluated.value ? `#${evaluated.value.replace(/^#/, '')}` : '';
      } else if (key === 'query') {
        if (prop.value.type === 'StringLiteral' || prop.value.type === 'TemplateLiteral') {
          const evaluated = evaluateStaticPrimitive(prop.value);
          if (!evaluated.ok) return { ok: false, reason: 'dynamic-query' };
          queryStr = evaluated.value ? `?${evaluated.value.replace(/^\?/, '')}` : '';
        } else if (prop.value.type === 'ObjectExpression') {
          const params = new URLSearchParams();
          for (const qp of prop.value.properties) {
            if (qp.type !== 'ObjectProperty' || qp.computed) {
              return { ok: false, reason: 'dynamic-query' };
            }
            const qKey =
              qp.key.type === 'Identifier'
                ? qp.key.name
                : qp.key.type === 'StringLiteral'
                  ? qp.key.value
                  : null;
            if (!qKey) return { ok: false, reason: 'dynamic-query' };
            const qVal = evaluateStaticPrimitive(qp.value);
            if (!qVal.ok) return { ok: false, reason: 'dynamic-query' };
            params.append(qKey, qVal.value);
          }
          const serialized = params.toString();
          queryStr = serialized ? `?${serialized}` : '';
        } else {
          return { ok: false, reason: 'dynamic-query' };
        }
      } else {
        return { ok: false, reason: `unsupported-href-field:${key}` };
      }
    }
    if (!pathname) return { ok: false, reason: 'missing-pathname' };
    return { ok: true, href: `${pathname}${queryStr}${hashStr}` };
  }
  return { ok: false, reason: 'dynamic-expression' };
}

/**
 * Compute all HTML `href` renderings Next.js may emit for a given static internal destination
 * (both with and without trailing slash on the pathname).
 */
function buildCandidateRenderedHrefs(dest) {
  if (dest.kind !== 'internal') return [dest.raw];
  const candidates = new Set([dest.raw]);
  if (dest.normalizedPath === '/') {
    candidates.add(`/${dest.search}${dest.hash}`);
  } else {
    candidates.add(`${dest.normalizedPath}${dest.search}${dest.hash}`);
    candidates.add(`${dest.normalizedPath}/${dest.search}${dest.hash}`);
  }
  return Array.from(candidates);
}

/**
 * Analyze a TSX/TS/JSX/JS source module using Babel lexical import bindings to locate:
 * - `next/link` elements (including aliases & namespace imports, ignoring shadowed/custom `<Link>`)
 * - `@forgewp/react` `Link`/`WpLink` elements (classified separately, never treated as `next/link`)
 * - `@forgewp/react` `useWpPageLink(slug, fallback)` calls (including aliases)
 *
 * @param {string} code
 * @param {{ filePath?: string, knownRoutes?: import('./index.js').ForgeWPStaticRoute[], knownArchiveRoutes?: Array<{ routePath?: string, path?: string, postType?: string }> }} [options]
 */
export function analyzeNextLinks(
  code,
  { filePath = '<inline>', knownRoutes = [], knownArchiveRoutes = [] } = {},
) {
  const ast = parseSource(code);
  const knownRouteIndex = buildKnownRouteIndex(knownRoutes, knownArchiveRoutes);
  const links = [];
  const diagnostics = [];
  const pageLinkBindings = new Map(); // Babel Binding -> { routeSlug, fallback }

  // Pass 1: locate lexical `const href = useWpPageLink('slug', '/fallback')` bindings from @forgewp/react.
  traverse(ast, {
    CallExpression(callPath) {
      const callee = callPath.node.callee;
      if (callee.type !== 'Identifier') return;
      const cls = classifyIdentifierBinding(callPath.scope, callee.name);
      if (!cls || cls.owner !== 'forgewp-page-link-hook') return;

      const slugEval = evaluateStaticPrimitive(callPath.node.arguments[0]);
      const fallbackEval = evaluateStaticPrimitive(callPath.node.arguments[1]);
      if (!slugEval.ok) return;

      const fallback = fallbackEval.ok ? fallbackEval.value : '/';
      const fallbackDest = parseNextHrefDestination(fallback);
      const token = encodeRouteLinkToken({
        routeSlug: slugEval.value,
        fallbackPath: fallbackDest.pathname || fallback || '/',
        query: fallbackDest.search,
        hash: fallbackDest.hash,
      });

      const entry = {
        owner: 'forgewp-page-link',
        filePath,
        loc: callPath.node.loc?.start || null,
        routeSlug: slugEval.value,
        rawHref: fallback,
        renderedHrefs: buildCandidateRenderedHrefs(fallbackDest),
        resolution: {
          action: 'rewrite',
          routeKind: 'wp-page-link',
          routeSlug: slugEval.value,
          fallbackPath: fallbackDest.pathname || fallback || '/',
          query: fallbackDest.search,
          hash: fallbackDest.hash,
          token,
        },
      };
      links.push(entry);

      if (
        callPath.parentPath?.isVariableDeclarator() &&
        callPath.parentPath.node.id.type === 'Identifier'
      ) {
        const varBinding = callPath.scope.getBinding(callPath.parentPath.node.id.name);
        if (varBinding) {
          pageLinkBindings.set(varBinding, entry);
        }
      }
    },
  });

  // Pass 2: inspect JSX elements by resolved lexical import binding.
  traverse(ast, {
    JSXElement(jsxPath) {
      const opening = jsxPath.node.openingElement;
      const ownerInfo = classifyJsxElementOwner(jsxPath.scope, opening.name);
      if (!ownerInfo) return;

      if (ownerInfo.owner === 'forgewp-link') {
        links.push({
          owner: 'forgewp-link',
          tagName: ownerInfo.tagName,
          imported: ownerInfo.imported,
          filePath,
          loc: opening.loc?.start || null,
          resolution: { action: 'preserve', routeKind: 'forgewp-link', token: null },
        });
        return;
      }

      if (ownerInfo.owner !== 'next-link') return;

      const loc = opening.loc?.start || { line: 1, column: 0 };
      const hrefAttr = opening.attributes.find(
        (attr) =>
          attr.type === 'JSXAttribute' &&
          attr.name.type === 'JSXIdentifier' &&
          attr.name.name === 'href',
      );
      const strippedProps = [];
      const strippedAttrNodes = [];

      for (const attr of opening.attributes) {
        if (attr.type !== 'JSXAttribute' || attr.name.type !== 'JSXIdentifier') continue;
        const propName = attr.name.name;
        if (NEXT_ONLY_LINK_PROPS.has(propName)) {
          strippedProps.push(propName);
          strippedAttrNodes.push(attr);
        } else if (NEXT_DIAGNOSTIC_PROPS.has(propName)) {
          strippedProps.push(propName);
          strippedAttrNodes.push(attr);
          diagnostics.push({
            level: 'warning',
            code: 'NEXT_LINK_UNSUPPORTED_PROP',
            api: 'next/link',
            mode: 'native',
            file: filePath,
            line: attr.loc?.start?.line ?? loc.line,
            column: attr.loc?.start?.column ?? loc.column,
            message: `next/link prop "${propName}" is not supported in native WordPress mode and is omitted from the native anchor.`,
            suggestion:
              'Configure WordPress multilingual routing (Polylang) or keep Next.js locale routing in decoupled mode.',
          });
        }
      }

      // Check if href references a `useWpPageLink(...)` variable directly.
      if (
        hrefAttr?.value?.type === 'JSXExpressionContainer' &&
        hrefAttr.value.expression.type === 'Identifier'
      ) {
        const refBinding = jsxPath.scope.getBinding(hrefAttr.value.expression.name);
        if (refBinding && pageLinkBindings.has(refBinding)) {
          const bound = pageLinkBindings.get(refBinding);
          links.push({
            owner: 'next-link',
            tagName: ownerInfo.tagName,
            filePath,
            loc,
            rawHref: bound.rawHref,
            renderedHrefs: bound.renderedHrefs,
            strippedProps,
            resolution: bound.resolution,
            _nodes: { opening, closing: jsxPath.node.closingElement, hrefAttr, strippedAttrNodes },
          });
          return;
        }
      }

      const evaluated = evaluateStaticNextHref(hrefAttr);
      if (!evaluated.ok) {
        diagnostics.push({
          level: 'error',
          code: 'NEXT_LINK_DYNAMIC_HREF',
          api: 'next/link',
          mode: 'native',
          file: filePath,
          line: loc.line,
          column: loc.column,
          message: `Cannot statically resolve next/link <${ownerInfo.tagName}> href (${evaluated.reason}) for native WordPress export.`,
          suggestion:
            'Use a static internal route path, a static URL object, useWpPageLink(slug, fallback), or deploy in decoupled mode.',
        });
        links.push({
          owner: 'next-link',
          tagName: ownerInfo.tagName,
          filePath,
          loc,
          rawHref: null,
          renderedHrefs: [],
          strippedProps,
          resolution: { action: 'diagnostic', routeKind: 'dynamic', token: null },
          _nodes: { opening, closing: jsxPath.node.closingElement, hrefAttr, strippedAttrNodes },
        });
        return;
      }

      const parsed = parseNextHrefDestination(evaluated.href);
      const resolution = resolveNextDestinationToWordPress(parsed, knownRouteIndex);

      if (resolution.action === 'rewrite-unknown') {
        diagnostics.push({
          level: 'warning',
          code: 'NEXT_LINK_UNKNOWN_ROUTE',
          api: 'next/link',
          mode: 'native',
          file: filePath,
          line: loc.line,
          column: loc.column,
          message: `next/link <${ownerInfo.tagName} href="${evaluated.href}"> does not match a known fixed Next route; falling back to WordPress home_url("${resolution.fallbackPath}") at runtime.`,
          suggestion:
            'Add the fixed route under src/app, use useWpPageLink(routeSlug, fallback) for a WordPress-managed Page, or verify the WordPress URL exists.',
        });
      }

      links.push({
        owner: 'next-link',
        tagName: ownerInfo.tagName,
        filePath,
        loc,
        rawHref: evaluated.href,
        destination: parsed,
        renderedHrefs: buildCandidateRenderedHrefs(parsed),
        strippedProps,
        resolution,
        _nodes: { opening, closing: jsxPath.node.closingElement, hrefAttr, strippedAttrNodes },
      });
    },
  });

  return { links, diagnostics };
}

/**
 * Transform import-verified `next/link` JSX elements in TSX/JSX source into native `<a>`
 * elements carrying fixed-route WordPress permalink tokens, stripping Next-only props.
 *
 * Non-`next/link` components (shadowed `Link`, custom `./Link`, `@forgewp/react` `Link`/`WpLink`)
 * and external URLs are preserved untouched.
 *
 * @param {string} code
 * @param {{ filePath?: string, knownRoutes?: import('./index.js').ForgeWPStaticRoute[], knownArchiveRoutes?: Array<{ routePath?: string, path?: string, postType?: string }> }} [options]
 */
export function transformNextLinksInSource(
  code,
  { filePath = '<inline>', knownRoutes = [], knownArchiveRoutes = [] } = {},
) {
  const { links, diagnostics } = analyzeNextLinks(code, {
    filePath,
    knownRoutes,
    knownArchiveRoutes,
  });
  const edits = [];

  for (const link of links) {
    if (link.owner !== 'next-link' || !link._nodes) continue;
    const { opening, closing, hrefAttr, strippedAttrNodes } = link._nodes;

    // Rewrite opening/closing tag names to native <a> when href is resolved (or external/preserved).
    if (link.resolution.action === 'diagnostic') continue;

    edits.push({
      start: opening.name.start,
      end: opening.name.end,
      text: 'a',
    });
    if (closing) {
      edits.push({
        start: closing.name.start,
        end: closing.name.end,
        text: 'a',
      });
    }

    for (const attr of strippedAttrNodes) {
      let start = attr.start;
      while (start > 0 && (code[start - 1] === ' ' || code[start - 1] === '\t')) {
        start--;
      }
      edits.push({ start, end: attr.end, text: '' });
    }

    if (hrefAttr) {
      if (link.resolution.token) {
        edits.push({
          start: hrefAttr.start,
          end: hrefAttr.end,
          text: `href="${link.resolution.token}"`,
        });
      } else if (hrefAttr.value?.type === 'JSXExpressionContainer' && link.rawHref !== null) {
        edits.push({
          start: hrefAttr.start,
          end: hrefAttr.end,
          text: `href=${JSON.stringify(link.rawHref)}`,
        });
      }
    }
  }

  edits.sort((a, b) => b.start - a.start);
  let transformed = code;
  for (const edit of edits) {
    transformed =
      transformed.slice(0, edit.start) + edit.text + transformed.slice(edit.end);
  }

  const publicLinks = links.map(({ _nodes, ...rest }) => rest);
  return {
    code: transformed,
    changed: transformed !== code,
    links: publicLinks,
    diagnostics,
  };
}

/**
 * Scan all source modules under `<themeRoot>/src` as well as root-level `app/`,
 * `components/`, `lib/`, and `pages/` directories for import-verified `next/link`,
 * `@forgewp/react` `Link`/`WpLink`, and `useWpPageLink` usages.
 *
 * @param {string} themeRoot
 * @param {import('./index.js').ForgeWPStaticRoute[]} [knownRoutes]
 * @param {{ knownArchiveRoutes?: Array<{ routePath?: string, path?: string, postType?: string }>, postTypes?: Record<string, any> }} [options]
 */
export function scanProjectNextLinks(themeRoot, knownRoutes = [], options = {}) {
  const resolvedRoot = path.resolve(themeRoot);
  const knownArchiveRoutes = Array.isArray(options?.knownArchiveRoutes)
    ? options.knownArchiveRoutes
    : discoverNextDynamicHierarchy(resolvedRoot, {
        postTypes: options?.postTypes || {},
      }).archiveRoutes;
  const scanDirs = [
    path.join(resolvedRoot, 'src'),
    path.join(resolvedRoot, 'app'),
    path.join(resolvedRoot, 'components'),
    path.join(resolvedRoot, 'lib'),
    path.join(resolvedRoot, 'pages'),
  ].filter((d) => existsSync(d));

  const allLinks = [];
  const allDiagnostics = [];

  if (scanDirs.length === 0) {
    return { links: allLinks, diagnostics: allDiagnostics };
  }

  const seenFiles = new Set();
  const walk = (dir) => {
    const entries = readdirSync(dir).sort();
    for (const entry of entries) {
      if (
        entry.startsWith('.') ||
        entry === 'node_modules' ||
        entry === '.next' ||
        entry === 'out' ||
        entry === 'dist'
      ) {
        continue;
      }
      const fullPath = path.join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (/\.(?:tsx|ts|jsx|js)$/.test(entry) && !entry.endsWith('.d.ts')) {
        if (seenFiles.has(fullPath)) continue;
        seenFiles.add(fullPath);
        const relPath = path.relative(resolvedRoot, fullPath).replace(/\\/g, '/');
        const source = readFileSync(fullPath, 'utf8');
        if (
          !source.includes('next/link') &&
          !source.includes('@forgewp/react')
        ) {
          continue;
        }
        const { links, diagnostics } = analyzeNextLinks(source, {
          filePath: relPath,
          knownRoutes,
          knownArchiveRoutes,
        });
        for (const { _nodes, ...clean } of links) {
          allLinks.push(clean);
        }
        allDiagnostics.push(...diagnostics);
      }
    }
  };

  for (const dir of scanDirs) {
    walk(dir);
  }
  return { links: allLinks, diagnostics: allDiagnostics };
}

function decodeHtmlAttrEntities(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'");
}

const NEXT_LINK_MARKER_RE = /\s*\bdata-forgewp-next-link=(["'])1\1/i;

/**
 * Rewrite `<a ... href="...">` attributes in HTML ONLY for destinations verified by AST
 * import-binding analysis (`next/link` or `@forgewp/react` `useWpPageLink`).
 *
 * When build-time `data-forgewp-next-link="1"` identity markers are present in the HTML
 * (emitted by `withForgeWP()` during `FORGEWP_NATIVE_EXPORT=1`), ONLY marked anchors are
 * rewritten and the internal marker attribute is stripped — leaving raw `<a href="...">`
 * tags completely untouched even when they share the exact same `href`.
 */
function rewriteVerifiedAnchorsInHtml(html, tokenMaps) {
  if (!html) {
    return { html, count: 0 };
  }
  const nextLinkHrefToToken =
    tokenMaps instanceof Map ? tokenMaps : tokenMaps?.nextLinkHrefToToken || new Map();
  const wpPageLinkHrefToToken =
    tokenMaps instanceof Map ? new Map() : tokenMaps?.wpPageLinkHrefToToken || new Map();
  const hasIdentityMarkers = NEXT_LINK_MARKER_RE.test(html);
  if (
    nextLinkHrefToToken.size === 0 &&
    wpPageLinkHrefToToken.size === 0 &&
    !hasIdentityMarkers
  ) {
    return { html, count: 0 };
  }

  let count = 0;
  let rewritten = html.replace(
    /<a\b([^>]*?)\bhref=(["'])([^"']*)\2([^>]*)>/gi,
    (fullMatch, before, quote, rawAttrVal, after) => {
      const hasMarker =
        NEXT_LINK_MARKER_RE.test(before) || NEXT_LINK_MARKER_RE.test(after);
      const cleanBefore = before.replace(NEXT_LINK_MARKER_RE, '');
      const cleanAfter = after.replace(NEXT_LINK_MARKER_RE, '');
      const decoded = decodeHtmlAttrEntities(rawAttrVal);

      if (hasIdentityMarkers && !hasMarker) {
        // Preserve raw <a href="..."> even when its href matches a <Link>; still allow
        // unmarked @forgewp/react useWpPageLink() anchors on the same page to rewrite.
        const pageLinkToken = wpPageLinkHrefToToken.get(decoded);
        if (!pageLinkToken) {
          return fullMatch;
        }
        count += 1;
        return `<a${before}href=${quote}${pageLinkToken}${quote}${after}>`;
      }

      const token =
        nextLinkHrefToToken.get(decoded) || wpPageLinkHrefToToken.get(decoded);
      if (!token) {
        return hasMarker
          ? `<a${cleanBefore}href=${quote}${rawAttrVal}${quote}${cleanAfter}>`
          : fullMatch;
      }
      count += 1;
      return `<a${cleanBefore}href=${quote}${token}${quote}${cleanAfter}>`;
    },
  );
  if (NEXT_LINK_MARKER_RE.test(rewritten)) {
    rewritten = rewritten.replace(/<a\b[^>]*>/gi, (tag) =>
      NEXT_LINK_MARKER_RE.test(tag) ? tag.replace(NEXT_LINK_MARKER_RE, '') : tag,
    );
  }
  return { html: rewritten, count };
}

/**
 * Apply import-binding-verified `next/link` and `useWpPageLink` permalink mappings to an
 * extracted `ForgeWPStaticMarkup` object. Unverified raw `<a>` links and external URLs
 * remain untouched.
 *
 * @param {import('./index.js').ForgeWPStaticMarkup} markup
 * @param {{ themeRoot?: string, links?: any[], diagnostics?: any[], knownArchiveRoutes?: any[], postTypes?: Record<string, any> }} [options]
 */
export function applyVerifiedNextLinksToMarkup(markup, options = {}) {
  let scanned;
  if (options.links) {
    scanned = { links: options.links, diagnostics: options.diagnostics || [] };
  } else if (options.themeRoot) {
    const hierarchyArchives = Array.isArray(markup.hierarchyTemplates)
      ? markup.hierarchyTemplates
          .filter((tpl) => tpl && tpl.kind === 'archive' && tpl.routePath)
          .map((tpl) => ({ routePath: tpl.routePath, postType: tpl.postType }))
      : [];
    const discoveredArchives = discoverNextDynamicHierarchy(options.themeRoot, {
      postTypes: options.postTypes || {},
    }).archiveRoutes;
    const knownArchiveRoutes = [
      ...(Array.isArray(options.knownArchiveRoutes) ? options.knownArchiveRoutes : []),
      ...hierarchyArchives,
      ...discoveredArchives,
    ];
    scanned = scanProjectNextLinks(options.themeRoot, markup.routes || [], {
      knownArchiveRoutes,
      postTypes: options.postTypes || {},
    });
  } else {
    scanned = { links: [], diagnostics: [] };
  }

  const nextLinkHrefToToken = new Map();
  const wpPageLinkHrefToToken = new Map();
  for (const link of scanned.links) {
    if (!link.resolution?.token || !Array.isArray(link.renderedHrefs)) continue;
    const targetMap =
      link.owner === 'forgewp-page-link'
        ? wpPageLinkHrefToToken
        : link.owner === 'next-link'
          ? nextLinkHrefToToken
          : null;
    if (!targetMap) continue;
    for (const candidate of link.renderedHrefs) {
      if (!targetMap.has(candidate)) {
        targetMap.set(candidate, link.resolution.token);
      }
    }
  }

  let rewrittenCount = 0;
  const tokenMaps = { nextLinkHrefToToken, wpPageLinkHrefToToken };
  const rewriteField = (value) => {
    if (typeof value !== 'string' || !value) return value;
    const res = rewriteVerifiedAnchorsInHtml(value, tokenMaps);
    rewrittenCount += res.count;
    return res.html;
  };

  const nextMarkup = {
    ...markup,
    appHtml: rewriteField(markup.appHtml),
    headerHtml: rewriteField(markup.headerHtml),
    footerHtml: rewriteField(markup.footerHtml),
    notFoundHtml: rewriteField(markup.notFoundHtml),
    singleHtml: rewriteField(markup.singleHtml),
    archiveHtml: rewriteField(markup.archiveHtml),
    routes: Array.isArray(markup.routes)
      ? markup.routes.map((route) => ({
          ...route,
          html: rewriteField(route.html),
        }))
      : markup.routes,
    hierarchyTemplates: Array.isArray(markup.hierarchyTemplates)
      ? markup.hierarchyTemplates.map((tpl) => ({
          ...tpl,
          html: rewriteField(tpl.html),
        }))
      : markup.hierarchyTemplates,
  };

  return {
    markup: nextMarkup,
    links: scanned.links,
    diagnostics: scanned.diagnostics,
    rewrittenCount,
  };
}
