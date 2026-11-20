'use strict';

const fs = require('node:fs');
const path = require('node:path');

const INTERACTIVE_HOOK_RE =
  /\b(?:useState|useEffect|useReducer|useRef|useLayoutEffect|useTransition|useOptimistic|useActionState)\s*\(/;
const INTERACTIVE_EVENT_RE =
  /\bon(?:Click|Change|Submit|Input|KeyDown|KeyUp|MouseEnter|MouseLeave|Focus|Blur|PointerDown|PointerUp|TouchStart)\s*=/;
const BROWSER_GLOBAL_RE =
  /\b(?:window|document|localStorage|sessionStorage|IntersectionObserver|ResizeObserver)\b/;
const RESOLVE_EXTS = ['.tsx', '.ts', '.jsx', '.js'];

function toKebabCase(name) {
  return String(name || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

function resolveLocalImport(specifier, fromFile, projectRoot) {
  let base = null;
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    base = path.resolve(path.dirname(fromFile), specifier);
  } else if (specifier.startsWith('@/')) {
    const srcCandidate = path.join(projectRoot, 'src', specifier.slice(2));
    const rootCandidate = path.join(projectRoot, specifier.slice(2));
    base = fs.existsSync(path.dirname(srcCandidate)) ? srcCandidate : rootCandidate;
  } else {
    return null;
  }

  // Strip .js/.jsx extension if importing TS via ESM extension
  const stripped = base.replace(/\.(?:js|jsx|mjs|cjs)$/, '');
  const candidates = [
    base,
    ...RESOLVE_EXTS.map((ext) => `${stripped}${ext}`),
    ...RESOLVE_EXTS.map((ext) => path.join(stripped, `index${ext}`)),
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch {}
  }
  return null;
}

/**
 * Determine whether a Next.js module file is an interactive `'use client'` component
 * eligible for automatic ForgeWP hydration island wrapping.
 *
 * Excludes:
 * - Server Components (no `'use client'` directive)
 * - Gutenberg blocks (`src/blocks/` or `defineBlock(`)
 * - Explicit opt-out (`@forgewp-no-hydrate` or `forgewpNoHydrate`)
 * - Purely presentational `'use client'` wrappers with no hooks, DOM events, or browser globals
 */
function isInteractiveClientFile(filePath, providedSource) {
  const normalized = String(filePath || '').replace(/\\/g, '/');
  if (/(?:^|\/)blocks\//.test(normalized)) {
    return false;
  }
  const source =
    typeof providedSource === 'string'
      ? providedSource
      : fs.existsSync(filePath)
        ? fs.readFileSync(filePath, 'utf8')
        : '';

  if (!/^\s*['"]use client['"]\s*;?/m.test(source)) {
    return false;
  }
  if (/\bdefineBlock\s*\(/.test(source)) {
    return false;
  }
  if (/@forgewp-no-hydrate\b|\bforgewpNoHydrate\b/.test(source)) {
    return false;
  }
  return (
    INTERACTIVE_HOOK_RE.test(source) ||
    INTERACTIVE_EVENT_RE.test(source) ||
    BROWSER_GLOBAL_RE.test(source)
  );
}

/**
 * Parse local component imports (`import Foo from '...'`, `import { Foo, Bar as Baz } from '...'`).
 * @param {string} source
 * @returns {Array<{ localName: string, specifier: string }>}
 */
function parseLocalImports(source) {
  const results = [];
  const importRe =
    /^\s*import\s+(?!type\b)([\s\S]*?)\s+from\s+['"]([^'"]+)['"]\s*;?/gm;
  let match;
  while ((match = importRe.exec(source))) {
    const clause = match[1].trim();
    const specifier = match[2].trim();
    if (
      !specifier.startsWith('./') &&
      !specifier.startsWith('../') &&
      !specifier.startsWith('@/')
    ) {
      continue;
    }

    // Default import (e.g. `Foo` or `Foo, { Bar }`)
    const defaultMatch = clause.match(/^([A-Z][A-Za-z0-9_$]*)(?:\s*,|$)/);
    if (defaultMatch) {
      results.push({ localName: defaultMatch[1], specifier });
    }

    // Named imports (e.g. `{ Foo, Bar as Baz }`)
    const namedMatch = clause.match(/\{([\s\S]*?)\}/);
    if (namedMatch) {
      for (const rawPart of namedMatch[1].split(',')) {
        const part = rawPart.trim();
        if (!part || part.startsWith('type ')) continue;
        const aliasMatch = part.match(
          /^[A-Za-z0-9_$]+\s+as\s+([A-Z][A-Za-z0-9_$]*)$/,
        );
        if (aliasMatch) {
          results.push({ localName: aliasMatch[1], specifier });
          continue;
        }
        if (/^[A-Z][A-Za-z0-9_$]*$/.test(part)) {
          results.push({ localName: part, specifier });
        }
      }
    }
  }
  return results;
}

/**
 * Find the closing `>` of a JSX opening/self-closing tag starting at `tagStart`,
 * respecting nested `{ ... }` expressions and quoted strings.
 */
function findJsxTagEnd(source, tagStart) {
  let braceDepth = 0;
  let quote = null;
  for (let i = tagStart + 1; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (ch === '\\') {
        i++;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') {
      braceDepth++;
      continue;
    }
    if (ch === '}') {
      if (braceDepth > 0) braceDepth--;
      continue;
    }
    if (braceDepth === 0 && ch === '>') {
      return i;
    }
  }
  return -1;
}

/**
 * Find all spans covered by `<Hydrate ...>...</Hydrate>` (or `__ForgeWPAutoHydrate`)
 * so we never double-wrap components that already have an explicit `<Hydrate>` boundary,
 * and can infer missing `id` attributes on explicit `<Hydrate>` wrappers around Next.js
 * Client Reference proxies.
 */
function findHydrateSpans(source) {
  const spans = [];
  const openRe = /<(Hydrate|__ForgeWPAutoHydrate)(?=[\s/>])/g;
  let match;
  while ((match = openRe.exec(source))) {
    const tagName = match[1];
    const start = match.index;
    const openEnd = findJsxTagEnd(source, start);
    if (openEnd === -1) continue;
    if (source[openEnd - 1] === '/') {
      spans.push({ start, end: openEnd + 1, openEnd, tagName });
      continue;
    }
    const closeRe = new RegExp(`</${tagName}\\s*>`, 'g');
    closeRe.lastIndex = openEnd + 1;
    const closeMatch = closeRe.exec(source);
    if (closeMatch) {
      spans.push({
        start,
        end: closeMatch.index + closeMatch[0].length,
        openEnd,
        tagName,
      });
    }
  }
  return spans;
}

/**
 * Transform a Next.js App Router page/layout source file during `FORGEWP_NATIVE_EXPORT=1`
 * to automatically wrap unwrapped interactive `'use client'` component usages in
 * `<__ForgeWPAutoHydrate id="..." trigger="...">`.
 *
 * @param {string} source
 * @param {string} filePath
 * @param {{ projectRoot?: string, defaultTrigger?: string }} [options]
 * @returns {{ code: string, wrapped: string[] }}
 */
function transformAutoHydrateSource(source, filePath, options = {}) {
  const normalizedPath = String(filePath || '').replace(/\\/g, '/');
  if (
    !normalizedPath ||
    normalizedPath.includes('/node_modules/') ||
    /(?:^|\/)blocks\//.test(normalizedPath)
  ) {
    return { code: source, wrapped: [] };
  }

  // Only auto-wrap inside App Router entry files (src/app/ or app/)
  if (!/(?:^|\/)(?:src\/)?app\//.test(normalizedPath)) {
    return { code: source, wrapped: [] };
  }

  const projectRoot = options.projectRoot || process.cwd();
  const defaultTrigger = options.defaultTrigger || 'visible';
  const imports = parseLocalImports(source);
  if (imports.length === 0) {
    return { code: source, wrapped: [] };
  }

  const interactiveComponents = new Map();
  for (const imp of imports) {
    const resolved = resolveLocalImport(imp.specifier, filePath, projectRoot);
    if (resolved && isInteractiveClientFile(resolved)) {
      const fileStem = path.basename(resolved, path.extname(resolved));
      const islandId = toKebabCase(
        fileStem === 'index' ? imp.localName : fileStem,
      );
      interactiveComponents.set(imp.localName, islandId);
    }
  }

  if (interactiveComponents.size === 0) {
    return { code: source, wrapped: [] };
  }

  const hydrateSpans = findHydrateSpans(source);
  const isInsideHydrate = (index) =>
    hydrateSpans.some((span) => index >= span.start && index <= span.end);

  /** @type {Array<{ start: number, end: number, islandId: string, kind: 'wrap' | 'inject-id' }>} */
  const replacements = [];

  // Infer `id="..."` on explicit `<Hydrate>` boundaries that omit `id` (since Next.js
  // Server Components see `'use client'` children as Client Reference proxies without `.name`).
  for (const span of hydrateSpans) {
    if (span.tagName !== 'Hydrate') continue;
    const openTag = source.slice(span.start, span.openEnd + 1);
    if (/\bid\s*=/.test(openTag)) continue;
    const inner = source.slice(span.openEnd + 1, span.end);
    const childMatch = inner.match(/<([A-Z][A-Za-z0-9_$]*)(?=[\s/>])/);
    if (childMatch && interactiveComponents.has(childMatch[1])) {
      const insertPos = span.start + 1 + span.tagName.length;
      replacements.push({
        start: insertPos,
        end: insertPos,
        islandId: interactiveComponents.get(childMatch[1]),
        kind: 'inject-id',
      });
    }
  }

  for (const [compName, islandId] of interactiveComponents.entries()) {
    const tagRe = new RegExp(`<${compName}(?=[\\s/>])`, 'g');
    let match;
    while ((match = tagRe.exec(source))) {
      const start = match.index;
      if (isInsideHydrate(start)) continue;
      const openEnd = findJsxTagEnd(source, start);
      if (openEnd === -1) continue;

      if (source[openEnd - 1] === '/') {
        replacements.push({ start, end: openEnd + 1, islandId, kind: 'wrap' });
        tagRe.lastIndex = openEnd + 1;
        continue;
      }

      // Paired tag `<Comp ...>...</Comp>`
      const closeRe = new RegExp(`</${compName}\\s*>`, 'g');
      closeRe.lastIndex = openEnd + 1;
      const closeMatch = closeRe.exec(source);
      if (closeMatch) {
        const end = closeMatch.index + closeMatch[0].length;
        replacements.push({ start, end, islandId, kind: 'wrap' });
        tagRe.lastIndex = end;
      }
    }
  }

  if (replacements.length === 0) {
    return { code: source, wrapped: [] };
  }

  // Deduplicate nested/overlapping spans (keep outermost island boundary)
  replacements.sort((a, b) => a.start - b.start || b.end - a.end);
  const topLevel = [];
  for (const rep of replacements) {
    const prev = topLevel[topLevel.length - 1];
    if (
      prev &&
      prev.kind === 'wrap' &&
      rep.start >= prev.start &&
      rep.end <= prev.end
    ) {
      continue;
    }
    topLevel.push(rep);
  }

  // Apply replacements from back to front so offsets stay valid
  topLevel.sort((a, b) => b.start - a.start);
  let output = source;
  const wrappedIds = new Set();
  let didAutoWrap = false;
  for (const rep of topLevel) {
    if (rep.kind === 'inject-id') {
      output =
        output.slice(0, rep.start) +
        ` id="${rep.islandId}"` +
        output.slice(rep.end);
      continue;
    }
    const original = output.slice(rep.start, rep.end);
    const wrappedJsx = `<__ForgeWPAutoHydrate id="${rep.islandId}" trigger="${defaultTrigger}">${original}</__ForgeWPAutoHydrate>`;
    output = output.slice(0, rep.start) + wrappedJsx + output.slice(rep.end);
    wrappedIds.add(rep.islandId);
    didAutoWrap = true;
  }

  // Inject import for __ForgeWPAutoHydrate after any leading 'use client'/'use server' directive
  if (didAutoWrap && !/^\s*import\s+[^;]*\b__ForgeWPAutoHydrate\b/m.test(output)) {
    const importStmt = `import { Hydrate as __ForgeWPAutoHydrate } from '@forgewp/react/server';\n`;
    const directiveMatch = output.match(/^\s*(['"])use (?:client|server)\1\s*;?\s*\n/);
    if (directiveMatch) {
      const insertAt = directiveMatch[0].length;
      output = output.slice(0, insertAt) + importStmt + output.slice(insertAt);
    } else {
      output = importStmt + output;
    }
  }

  return {
    code: output,
    wrapped: Array.from(wrappedIds).sort(),
  };
}

/**
 * Webpack loader entrypoint — active only during `FORGEWP_NATIVE_EXPORT=1`
 * when `withForgeWP({}, { autoHydrate: true })` is enabled.
 */
function forgewpNextAutoHydrateLoader(source) {
  const options =
    typeof this.getOptions === 'function' ? this.getOptions() || {} : {};
  const { code } = transformAutoHydrateSource(source, this.resourcePath, {
    projectRoot: options.projectRoot || this.rootContext || process.cwd(),
    defaultTrigger: options.defaultTrigger || 'visible',
  });
  return code;
}

module.exports = forgewpNextAutoHydrateLoader;
module.exports.isInteractiveClientFile = isInteractiveClientFile;
module.exports.transformAutoHydrateSource = transformAutoHydrateSource;
