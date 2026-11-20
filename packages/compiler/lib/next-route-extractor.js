import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  normalizeStaticRoutePath,
  validateStaticMarkup,
} from './render-static.js';
import { discoverNextDynamicHierarchy } from './next-dynamic-routes.js';

const NOT_FOUND_CANDIDATES = [
  '404.html',
  '404/index.html',
  '_not-found/index.html',
];

const IGNORED_ERROR_FILES = new Set(['500.html', '500/index.html']);

/**
 * Decode common HTML entities in extracted text (e.g. <title> or <h1>).
 * @param {string} value
 * @returns {string}
 */
function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

/**
 * Parse HTML tag attributes from an opening tag string (e.g. `<link rel="stylesheet" href="...">`).
 * @param {string} tag
 * @returns {Record<string, string>}
 */
function parseTagAttributes(tag) {
  const attrs = {};
  const openBody = tag.replace(/^<[a-zA-Z0-9:-]+\s*/, '').replace(/\/?>$/, '');
  const attrRe =
    /([a-zA-Z_:][a-zA-Z0-9_.:-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = attrRe.exec(openBody))) {
    const name = match[1].toLowerCase();
    const val = match[2] ?? match[3] ?? match[4] ?? '';
    attrs[name] = val;
  }
  return attrs;
}

/**
 * Find the closing `>` of an HTML tag starting at `startIndex`, respecting quoted attribute values.
 * @param {string} html
 * @param {number} startIndex
 * @returns {number}
 */
function findTagClose(html, startIndex) {
  let quote = null;
  for (let i = startIndex; i < html.length; i++) {
    const ch = html[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '>') {
      return i;
    }
  }
  return -1;
}

/**
 * Normalize a local URL path (like '/_next/static/css/app.css?v=1') to a POSIX build-relative path.
 * Returns null for external/data/protocol URLs.
 * @param {string} url
 * @returns {string | null}
 */
function normalizeLocalAssetUrl(url) {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (
    !trimmed ||
    trimmed.startsWith('//') ||
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) ||
    trimmed.startsWith('#')
  ) {
    return null;
  }
  const clean = trimmed.split(/[?#]/, 1)[0].replace(/^\/+/, '');
  return clean ? clean.replace(/\\/g, '/') : null;
}

/**
 * Extract the inner content of a top-level container tag (`head` or `body`).
 * @param {string} html
 * @param {'head' | 'body'} tagName
 * @returns {string | null}
 */
function extractSectionInner(html, tagName) {
  const openRe = new RegExp(`<${tagName}\\b`, 'i');
  const openMatch = openRe.exec(html);
  if (!openMatch) return null;
  const openEnd = findTagClose(html, openMatch.index);
  if (openEnd === -1) return null;
  const closeRe = new RegExp(`</${tagName}\\s*>`, 'gi');
  closeRe.lastIndex = openEnd + 1;
  let lastClose = null;
  let match;
  while ((match = closeRe.exec(html))) {
    lastClose = match;
    if (tagName === 'head') break;
  }
  if (!lastClose) return null;
  return html.slice(openEnd + 1, lastClose.index);
}

/**
 * Extract balanced element starting at index 0 of trimmed HTML (e.g. leading `<header>...</header>`).
 * @param {string} html
 * @param {string} tagName
 * @returns {{ element: string, rest: string } | null}
 */
function extractLeadingBalancedElement(html, tagName) {
  const trimmed = html.trim();
  const startRe = new RegExp(`^<${tagName}\\b`, 'i');
  if (!startRe.test(trimmed)) return null;

  const tagRe = new RegExp(`<(\\/?)${tagName}\\b`, 'gi');
  let depth = 0;
  let match;
  while ((match = tagRe.exec(trimmed))) {
    const closeIdx = findTagClose(trimmed, match.index);
    if (closeIdx === -1) return null;
    const isClosing = match[1] === '/';
    const isSelfClosing = !isClosing && trimmed[closeIdx - 1] === '/';
    if (!isSelfClosing) {
      depth += isClosing ? -1 : 1;
    }
    tagRe.lastIndex = closeIdx + 1;
    if (depth === 0) {
      const element = trimmed.slice(0, closeIdx + 1);
      const rest = trimmed.slice(closeIdx + 1).trim();
      return { element, rest };
    }
  }
  return null;
}

/**
 * Extract balanced element ending at the end of trimmed HTML (e.g. trailing `<footer>...</footer>`).
 * @param {string} html
 * @param {string} tagName
 * @returns {{ element: string, rest: string } | null}
 */
function extractTrailingBalancedElement(html, tagName) {
  const trimmed = html.trim();
  const endRe = new RegExp(`</${tagName}\\s*>$`, 'i');
  if (!endRe.test(trimmed)) return null;

  const tagRe = new RegExp(`<(\\/?)${tagName}\\b`, 'gi');
  const stack = [];
  let lastMatchedStart = -1;
  let lastMatchedEnd = -1;
  let match;
  while ((match = tagRe.exec(trimmed))) {
    const closeIdx = findTagClose(trimmed, match.index);
    if (closeIdx === -1) return null;
    const isClosing = match[1] === '/';
    const isSelfClosing = !isClosing && trimmed[closeIdx - 1] === '/';
    if (!isSelfClosing) {
      if (!isClosing) {
        stack.push(match.index);
      } else if (stack.length > 0) {
        const startIdx = stack.pop();
        if (stack.length === 0) {
          lastMatchedStart = startIdx;
          lastMatchedEnd = closeIdx + 1;
        }
      }
    }
    tagRe.lastIndex = closeIdx + 1;
  }

  if (lastMatchedStart === -1 || lastMatchedEnd !== trimmed.length) {
    return null;
  }

  return {
    element: trimmed.slice(lastMatchedStart, lastMatchedEnd),
    rest: trimmed.slice(0, lastMatchedStart).trim(),
  };
}

/**
 * Extract plain text from the first `<h1>...</h1>` in an HTML snippet.
 * @param {string} html
 * @returns {string}
 */
function extractFirstHeadingText(html) {
  const match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (!match) return '';
  return decodeHtmlEntities(match[1].replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse a Next.js static-export HTML document into sanitized head metadata,
 * native body HTML (stripped of Next runtime/RSC scripts), and explicit asset/client inventories.
 *
 * @param {string} html
 * @param {{ outDir: string, sourceFile: string }} context
 */
export function parseNextExportHtml(html, { outDir, sourceFile }) {
  const htmlOpenMatch = html.match(/<html\b[^>]*>/i);
  const htmlAttrs = htmlOpenMatch ? parseTagAttributes(htmlOpenMatch[0]) : {};
  const lang = htmlAttrs.lang || undefined;

  const headInner = extractSectionInner(html, 'head');
  const bodyInner = extractSectionInner(html, 'body');
  if (headInner === null || bodyInner === null) {
    throw new Error(
      `Next.js static export document "${sourceFile}" is missing required <head> or <body> sections.`,
    );
  }

  const stylesheets = new Set();
  const clientScripts = new Set();
  const otherAssets = new Set();
  const strippedRuntime = {
    rscPayloadCount: 0,
    scriptCount: 0,
    preloadCount: 0,
  };

  // 1. Parse and classify <head> tokens.
  const keptHeadParts = [];
  let titleText = '';
  let keptTitle = false;
  let cursor = 0;

  while (cursor < headInner.length) {
    const nextLt = headInner.indexOf('<', cursor);
    if (nextLt === -1) break;
    cursor = nextLt;

    if (headInner.startsWith('<!--', cursor)) {
      const commentEnd = headInner.indexOf('-->', cursor + 4);
      cursor = commentEnd === -1 ? headInner.length : commentEnd + 3;
      continue;
    }

    const tagClose = findTagClose(headInner, cursor);
    if (tagClose === -1) break;

    const openTag = headInner.slice(cursor, tagClose + 1);
    const nameMatch = openTag.match(/^<([a-zA-Z0-9:-]+)/);
    if (!nameMatch) {
      cursor = tagClose + 1;
      continue;
    }

    const tagName = nameMatch[1].toLowerCase();
    const attrs = parseTagAttributes(openTag);
    const isSelfClosing = openTag.endsWith('/>');

    if (tagName === 'script' || tagName === 'title' || tagName === 'style') {
      let fullEnd = tagClose + 1;
      let inner = '';
      if (!isSelfClosing) {
        const closeRe = new RegExp(`</${tagName}\\s*>`, 'i');
        closeRe.lastIndex = 0;
        const remainder = headInner.slice(tagClose + 1);
        const closeMatch = closeRe.exec(remainder);
        if (closeMatch) {
          inner = remainder.slice(0, closeMatch.index);
          fullEnd = tagClose + 1 + closeMatch.index + closeMatch[0].length;
        }
      }
      const fullTag = headInner.slice(cursor, fullEnd);
      cursor = fullEnd;

      if (tagName === 'title') {
        const cleaned = decodeHtmlEntities(inner).trim();
        if (!keptTitle && cleaned) {
          titleText = cleaned;
          keptTitle = true;
          keptHeadParts.push(`<title>${inner}</title>`);
        }
        continue;
      }

      if (tagName === 'style') {
        keptHeadParts.push(fullTag);
        continue;
      }

      // <script> inside <head>
      const scriptType = (attrs.type || '').toLowerCase().trim();
      if (scriptType === 'application/ld+json') {
        keptHeadParts.push(fullTag);
        continue;
      }

      const localSrc = normalizeLocalAssetUrl(attrs.src || '');
      if (localSrc) {
        clientScripts.add(localSrc);
      }
      strippedRuntime.scriptCount += 1;
      continue;
    }

    cursor = tagClose + 1;

    if (tagName === 'meta') {
      if ('charset' in attrs || (attrs.name || '').toLowerCase() === 'viewport') {
        continue;
      }
      keptHeadParts.push(openTag);
      continue;
    }

    if (tagName === 'link') {
      const rel = (attrs.rel || '').toLowerCase().trim();
      const asAttr = (attrs.as || '').toLowerCase().trim();
      const href = attrs.href || '';
      const localHref = normalizeLocalAssetUrl(href);

      if (rel === 'stylesheet') {
        if (localHref) {
          const cssDiskPath = path.join(outDir, localHref);
          if (!existsSync(cssDiskPath)) {
            throw new Error(
              `Next.js static export "${sourceFile}" references stylesheet "${localHref}", but "${cssDiskPath}" was not found.`,
            );
          }
          stylesheets.add(localHref);
          continue;
        }
        keptHeadParts.push(openTag);
        continue;
      }

      if (
        (rel === 'preload' && asAttr === 'script') ||
        (rel === 'modulepreload' && localHref?.startsWith('_next/'))
      ) {
        if (localHref) {
          clientScripts.add(localHref);
        }
        strippedRuntime.preloadCount += 1;
        continue;
      }

      if (localHref && existsSync(path.join(outDir, localHref))) {
        otherAssets.add(localHref);
      }
      keptHeadParts.push(openTag);
      continue;
    }

    keptHeadParts.push(openTag);
  }

  // 2. Clean <body>: strip Next runtime scripts, RSC Flight payloads, and streaming markers.
  let cleanedBody = '';
  let bodyCursor = 0;
  const scriptOpenRe = /<script\b/gi;
  let scriptMatch;

  while ((scriptMatch = scriptOpenRe.exec(bodyInner))) {
    const startIdx = scriptMatch.index;
    const openEnd = findTagClose(bodyInner, startIdx);
    if (openEnd === -1) break;

    const openTag = bodyInner.slice(startIdx, openEnd + 1);
    const attrs = parseTagAttributes(openTag);
    const closeRe = /<\/script\s*>/gi;
    closeRe.lastIndex = openEnd + 1;
    const closeMatch = closeRe.exec(bodyInner);
    const fullEnd = closeMatch ? closeMatch.index + closeMatch[0].length : openEnd + 1;
    const inner = closeMatch ? bodyInner.slice(openEnd + 1, closeMatch.index) : '';
    const scriptType = (attrs.type || '').toLowerCase().trim();
    const localSrc = normalizeLocalAssetUrl(attrs.src || '');

    const isRscPayload =
      attrs.id === '__NEXT_DATA__' ||
      inner.includes('self.__next_f') ||
      inner.includes('window.__next_f');
    const isNextRuntimeScript =
      (localSrc && localSrc.startsWith('_next/')) || attrs.id === '_R_';

    if (scriptType !== 'application/ld+json' && (isRscPayload || isNextRuntimeScript)) {
      cleanedBody += bodyInner.slice(bodyCursor, startIdx);
      if (isRscPayload) {
        strippedRuntime.rscPayloadCount += 1;
      } else {
        if (localSrc) clientScripts.add(localSrc);
        strippedRuntime.scriptCount += 1;
      }
      bodyCursor = fullEnd;
      scriptOpenRe.lastIndex = fullEnd;
    } else {
      scriptOpenRe.lastIndex = fullEnd;
    }
  }
  cleanedBody += bodyInner.slice(bodyCursor);

  // Strip Next's empty hidden metadata outlet and React streaming boundary comments.
  cleanedBody = cleanedBody
    .replace(/<div\s+hidden(?:=""|='')?\s*>\s*(?:<!--\$!?-->|<!--\/\$-->|\s)*<\/div>/gi, '')
    .replace(/<!--\$[?!]?-->/g, '')
    .replace(/<!--\/\$-->/g, '')
    .trim();

  return {
    lang,
    titleText,
    headHtml: keptHeadParts.join(''),
    bodyHtml: cleanedBody,
    assets: {
      stylesheets: Array.from(stylesheets).sort(),
      clientScripts: Array.from(clientScripts).sort(),
      otherAssets: Array.from(otherAssets).sort(),
      strippedRuntime,
    },
  };
}

/**
 * Discover fixed static-export HTML files under Next's `out/` directory.
 * Supports both `trailingSlash: true` (`about/index.html`) and `trailingSlash: false` (`about.html`).
 * @param {string} outDir
 */
function discoverNextExportHtmlFiles(outDir) {
  const discovered = [];
  const walk = (dir, relDir = '') => {
    const entries = readdirSync(dir).sort();
    for (const entry of entries) {
      if (entry.startsWith('.') || entry.startsWith('_')) continue;
      const fullPath = path.join(dir, entry);
      const relPath = relDir ? `${relDir}/${entry}` : entry;
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        if (entry === '404' || entry === '500') continue;
        walk(fullPath, relPath);
      } else if (entry.endsWith('.html')) {
        if (relPath === '404.html' || IGNORED_ERROR_FILES.has(relPath)) continue;
        discovered.push({ fullPath, relPath });
      }
    }
  };

  walk(outDir);

  const routesByPath = new Map();
  for (const file of discovered) {
    if (/[\[\]]/.test(file.relPath)) {
      throw new Error(
        `Next.js native fixed-route extraction does not support dynamic route segment in "out/${file.relPath}".`,
      );
    }

    let routePath;
    let kind;
    if (file.relPath === 'index.html') {
      routePath = '/';
      kind = 'home';
    } else if (file.relPath.endsWith('/index.html')) {
      routePath = normalizeStaticRoutePath(
        '/' + file.relPath.slice(0, -'/index.html'.length),
      );
      kind = 'page';
    } else {
      routePath = normalizeStaticRoutePath(
        '/' + file.relPath.slice(0, -'.html'.length),
      );
      kind = 'page';
    }

    if (routesByPath.has(routePath)) {
      throw new Error(
        `Duplicate Next.js static export outputs for route "${routePath}": "${routesByPath.get(routePath).relPath}" and "${file.relPath}".`,
      );
    }
    routesByPath.set(routePath, { ...file, routePath, kind });
  }

  let notFound = null;
  for (const candidate of NOT_FOUND_CANDIDATES) {
    const candidatePath = path.join(outDir, candidate);
    if (existsSync(candidatePath)) {
      notFound = {
        fullPath: candidatePath,
        relPath: candidate,
        routePath: '/404',
        kind: 'not-found',
      };
      break;
    }
  }

  const ordered = [];
  const home = routesByPath.get('/');
  if (home) ordered.push(home);
  const pages = Array.from(routesByPath.values())
    .filter((entry) => entry.kind === 'page')
    .sort((a, b) => a.routePath.localeCompare(b.routePath));
  ordered.push(...pages);
  if (notFound) ordered.push(notFound);

  return ordered;
}

/**
 * Extract an adapter-owned ForgeWPStaticMarkup contract from a Next.js App Router static export (`out/`).
 *
 * Explicitly preserves route identity, shared layout/head metadata, verified CSS assets,
 * and a separate inventory of stripped Next client scripts and RSC Flight payloads.
 * Does NOT treat Next client bundles as a native WordPress runtime.
 *
 * @param {string} themeRoot
 * @param {{ outDir?: string }} [options]
 * @returns {import('./index.js').ForgeWPStaticMarkup}
 */
export function extractNextStaticMarkup(themeRoot, options = {}) {
  const resolvedRoot = path.resolve(themeRoot);
  const outDir = options.outDir
    ? path.resolve(options.outDir)
    : path.join(resolvedRoot, 'out');
  const homeHtmlPath = path.join(outDir, 'index.html');

  if (!existsSync(outDir) || !existsSync(homeHtmlPath)) {
    throw new Error(
      `Next.js static export output not found at "${homeHtmlPath}". ` +
        'Run a Next.js build with `output: "export"` before extracting fixed routes.',
    );
  }

  const discovered = discoverNextExportHtmlFiles(outDir);
  const dynamicHierarchy = discoverNextDynamicHierarchy(resolvedRoot, {
    postTypes: options.postTypes || {},
  });

  const singleByBasePath = new Map(
    dynamicHierarchy.singleRoutes.map((item) => [item.basePath, item]),
  );
  const archiveByRoutePath = new Map(
    dynamicHierarchy.archiveRoutes.map((item) => [item.routePath, item]),
  );

  const classifyDiscoveredEntry = (entry) => {
    if (entry.kind !== 'page') return { role: 'fixed' };
    const archiveMatch = archiveByRoutePath.get(entry.routePath);
    if (archiveMatch) {
      return { role: 'archive', meta: archiveMatch };
    }
    for (const [basePath, singleMeta] of singleByBasePath.entries()) {
      if (basePath === '/') {
        // Root-level /[slug] only matches single-segment non-empty paths
        if (/^\/[^/]+$/.test(entry.routePath)) {
          return { role: 'single', meta: singleMeta };
        }
      } else if (entry.routePath.startsWith(`${basePath}/`)) {
        const remainder = entry.routePath.slice(basePath.length + 1);
        if (remainder && !remainder.includes('/')) {
          return { role: 'single', meta: singleMeta };
        }
      }
    }
    return { role: 'fixed' };
  };

  const parsedRoutes = discovered.map((entry) => {
    const sourceFile = path.relative(resolvedRoot, entry.fullPath).replace(/\\/g, '/');
    const rawHtml = readFileSync(entry.fullPath, 'utf8');
    const parsed = parseNextExportHtml(rawHtml, { outDir, sourceFile });
    const classification = classifyDiscoveredEntry(entry);
    return {
      ...entry,
      sourceFile,
      classification,
      ...parsed,
    };
  });

  const primaryRoutes = parsedRoutes.filter(
    (route) => route.kind === 'home' || route.kind === 'page',
  );
  const homeParsed = parsedRoutes.find((route) => route.kind === 'home');
  if (!homeParsed) {
    throw new Error(
      `Next.js static export at "${outDir}" did not produce a root "/" route (out/index.html).`,
    );
  }

  // Detect shared leading <header> and trailing <footer> across all primary routes.
  let headerHtml = '';
  let sharedHeaderDetected = false;
  const leadingHeaders = primaryRoutes.map((route) =>
    extractLeadingBalancedElement(route.bodyHtml, 'header'),
  );
  if (
    leadingHeaders.length > 0 &&
    leadingHeaders.every(
      (item) => item && item.element === leadingHeaders[0].element,
    )
  ) {
    headerHtml = leadingHeaders[0].element;
    sharedHeaderDetected = true;
  }

  let footerHtml = '';
  let sharedFooterDetected = false;
  const trailingFooters = primaryRoutes.map((route) =>
    extractTrailingBalancedElement(route.bodyHtml, 'footer'),
  );
  if (
    trailingFooters.length > 0 &&
    trailingFooters.every(
      (item) => item && item.element === trailingFooters[0].element,
    )
  ) {
    footerHtml = trailingFooters[0].element;
    sharedFooterDetected = true;
  }

  const stripSharedChrome = (bodyHtml) => {
    let body = bodyHtml;
    let matchedHeader = !sharedHeaderDetected;
    let matchedFooter = !sharedFooterDetected;
    if (sharedHeaderDetected) {
      const leading = extractLeadingBalancedElement(body, 'header');
      if (leading && leading.element === headerHtml) {
        body = leading.rest;
        matchedHeader = true;
      }
    }
    if (sharedFooterDetected) {
      const trailing = extractTrailingBalancedElement(body, 'footer');
      if (trailing && trailing.element === footerHtml) {
        body = trailing.rest;
        matchedFooter = true;
      }
    }
    const ownsShell =
      (sharedHeaderDetected && !matchedHeader) ||
      (sharedFooterDetected && !matchedFooter);
    return { body, ownsShell };
  };

  let singleHtml = '';
  let singleHeadHtml = '';
  let archiveHtml = '';
  const hierarchyTemplates = [];
  const seenHierarchyTemplates = new Set();
  const routes = [];

  for (const entry of parsedRoutes) {
    const { body, ownsShell } = stripSharedChrome(entry.bodyHtml);

    if (entry.classification.role === 'single') {
      const meta = entry.classification.meta;
      if (meta.templateName === 'single') {
        if (!singleHtml) {
          singleHtml = body;
          singleHeadHtml = entry.headHtml || '';
        }
      } else if (!seenHierarchyTemplates.has(meta.templateName)) {
        seenHierarchyTemplates.add(meta.templateName);
        hierarchyTemplates.push({
          templateName: meta.templateName,
          kind: 'single',
          postType: meta.postType,
          html: body,
          headHtml: entry.headHtml || '',
          layoutExtracted: !ownsShell,
          sourceFile: entry.sourceFile,
        });
      }
      continue;
    }

    if (entry.classification.role === 'archive') {
      const meta = entry.classification.meta;
      if (meta.templateName === 'archive') {
        if (!archiveHtml) {
          archiveHtml = body;
        }
      } else if (!seenHierarchyTemplates.has(meta.templateName)) {
        seenHierarchyTemplates.add(meta.templateName);
        hierarchyTemplates.push({
          templateName: meta.templateName,
          kind: 'archive',
          postType: meta.postType,
          html: body,
          headHtml: entry.headHtml || '',
          layoutExtracted: !ownsShell,
          sourceFile: entry.sourceFile,
        });
      }
      continue;
    }

    const headingText = extractFirstHeadingText(body);

    let title;
    if (entry.kind === 'home') {
      title = entry.titleText || headingText || 'Home';
    } else if (entry.kind === 'not-found') {
      title = entry.titleText || headingText || 'Not Found';
    } else {
      const hasDistinctHeadTitle =
        entry.titleText && entry.titleText !== homeParsed.titleText;
      const slug = entry.routePath.replace(/^\/+|\/+$/g, '');
      const fallbackSegment = slug.split('/').filter(Boolean).pop() || slug;
      const fallbackTitle = fallbackSegment
        .split(/[-_]+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      title = hasDistinctHeadTitle
        ? entry.titleText
        : headingText || entry.titleText || fallbackTitle;
    }

    const routeRecord = {
      path: entry.routePath,
      kind: entry.kind,
      title,
      html: body,
      headHtml: entry.headHtml,
      layoutExtracted: !ownsShell,
      ...(ownsShell ? { ownsShell: true } : {}),
      assets: entry.assets,
      sourceFile: entry.sourceFile,
    };

    if (entry.kind === 'page') {
      const slug = entry.routePath.replace(/^\/+|\/+$/g, '');
      routeRecord.slug = slug;
      routeRecord.templateSlug = slug.split('/').filter(Boolean).join('-').toLowerCase();
    }

    routes.push(routeRecord);
  }

  const homeRoute = routes.find((route) => route.kind === 'home');
  const notFoundRoute = routes.find((route) => route.kind === 'not-found');

  const result = {
    appHtml: homeRoute.html,
    headerHtml,
    footerHtml,
    headHtml: homeRoute.headHtml || '',
    singleHtml,
    singleHeadHtml,
    notFoundHtml: notFoundRoute?.html || '',
    archiveHtml,
    routes,
    ...(hierarchyTemplates.length > 0 ? { hierarchyTemplates } : {}),
    layout: {
      ...(homeParsed.lang ? { lang: homeParsed.lang } : {}),
      sharedHeaderDetected,
      sharedFooterDetected,
    },
  };

  return validateStaticMarkup(result, 'nextjs');
}
