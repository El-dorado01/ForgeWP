'use strict';

/**
 * Zero-dependency webpack pre-loader active ONLY during `FORGEWP_NATIVE_EXPORT=1`.
 *
 * Tags verified `next/link` JSX elements with `data-forgewp-next-link="1"` so
 * `next-link-transform.js` can distinguish `<Link href="/about">` from a raw
 * `<a href="/about">` in the rendered static HTML, preventing href collisions.
 */

function parseNextLinkBindings(source) {
  const localNames = new Set();
  const namespaceNames = new Set();
  const importRe =
    /^\s*import\s+(?!type\b)([^;]*?)\s+from\s+['"]next\/link['"]\s*;?/gm;
  let match;
  while ((match = importRe.exec(source))) {
    const clause = match[1].trim();
    if (!clause) continue;

    // Namespace import: `import * as NL from 'next/link'`
    const nsMatch = clause.match(/^\*\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*)$/);
    if (nsMatch) {
      namespaceNames.add(nsMatch[1]);
      continue;
    }

    // Default import: `import Link from 'next/link'` or `import Link, { ... } from 'next/link'`
    const defaultMatch = clause.match(/^([A-Za-z_$][A-Za-z0-9_$]*)(?:\s*,|$)/);
    if (defaultMatch) {
      localNames.add(defaultMatch[1]);
    }

    // Named default import: `import { default as NextLink } from 'next/link'`
    const namedMatch = clause.match(/\{([\s\S]*?)\}/);
    if (namedMatch) {
      for (const rawPart of namedMatch[1].split(',')) {
        const part = rawPart.trim();
        const aliasMatch = part.match(
          /^default\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*)$/,
        );
        if (aliasMatch) {
          localNames.add(aliasMatch[1]);
        }
      }
    }
  }
  return { localNames, namespaceNames };
}

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
 * Tag verified `next/link` JSX elements with `data-forgewp-next-link="1"`.
 * @param {string} source
 * @returns {{ code: string, taggedCount: number }}
 */
function tagNextLinkIdentityInSource(source) {
  if (!source || !source.includes('next/link')) {
    return { code: source, taggedCount: 0 };
  }

  const { localNames, namespaceNames } = parseNextLinkBindings(source);
  if (localNames.size === 0 && namespaceNames.size === 0) {
    return { code: source, taggedCount: 0 };
  }

  const patterns = [];
  for (const name of localNames) {
    patterns.push(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  }
  for (const ns of namespaceNames) {
    patterns.push(`${ns.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.default`);
  }

  const tagRe = new RegExp(`<(${patterns.join('|')})(?=[\\s/>])`, 'g');
  const insertions = [];
  let match;
  while ((match = tagRe.exec(source))) {
    const start = match.index;
    const end = findJsxTagEnd(source, start);
    if (end === -1) continue;
    const openTag = source.slice(start, end + 1);
    if (openTag.includes('data-forgewp-next-link')) continue;
    const insertPos = start + 1 + match[1].length;
    insertions.push(insertPos);
  }

  if (insertions.length === 0) {
    return { code: source, taggedCount: 0 };
  }

  insertions.sort((a, b) => b - a);
  let output = source;
  for (const pos of insertions) {
    output =
      output.slice(0, pos) +
      ' data-forgewp-next-link="1"' +
      output.slice(pos);
  }

  return { code: output, taggedCount: insertions.length };
}

function forgewpNextLinkIdentityLoader(source) {
  return tagNextLinkIdentityInSource(source).code;
}

module.exports = forgewpNextLinkIdentityLoader;
module.exports.tagNextLinkIdentityInSource = tagNextLinkIdentityInSource;
