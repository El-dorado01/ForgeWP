'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Zero-dependency Turbopack loader that mirrors webpack's `resolve.extensionAlias`
 * (`.js` -> `.ts` / `.tsx`, `.jsx` -> `.tsx`) for NodeNext-style relative imports inside
 * transpiled TypeScript packages such as `@forgewp/react`.
 */
function rewriteRelativeTsExtensions(source, resourcePath) {
  if (!source || !resourcePath) return source;
  // Fast path: only inspect files that contain relative .js/.jsx import/export specifiers
  if (!/['"]\.\.?\/[^'"]+\.jsx?['"]/.test(source)) {
    return source;
  }

  const dir = path.dirname(resourcePath);
  return source.replace(
    /((?:from|import)\s*['"]|import\(\s*['"])(\.\.?\/[^'"]+)(\.jsx?)(['"])/g,
    (fullMatch, prefix, relBase, ext, quote) => {
      const exactPath = path.resolve(dir, `${relBase}${ext}`);
      if (fs.existsSync(exactPath)) {
        return fullMatch;
      }
      const candidates = ext === '.jsx' ? ['.tsx'] : ['.ts', '.tsx'];
      for (const tsExt of candidates) {
        if (fs.existsSync(path.resolve(dir, `${relBase}${tsExt}`))) {
          return `${prefix}${relBase}${tsExt}${quote}`;
        }
      }
      return fullMatch;
    },
  );
}

function forgewpNextTsExtLoader(source) {
  return rewriteRelativeTsExtensions(source, this.resourcePath);
}

module.exports = forgewpNextTsExtLoader;
module.exports.rewriteRelativeTsExtensions = rewriteRelativeTsExtensions;
