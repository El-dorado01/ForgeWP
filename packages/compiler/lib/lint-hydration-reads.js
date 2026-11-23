import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';

const traverse = _traverse.default || _traverse;

const FORBIDDEN_GLOBALS = new Set(['forgeWpHydration', 'forgeWpTranslations']);
const ALLOWED_RELATIVE_FILES = new Set([
  'runtime/native-source.ts',
  'types.ts',
]);

function walkSourceFiles(dir, baseDir = dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSourceFiles(abs, baseDir, out);
    } else if (/\.(?:ts|tsx|js|jsx|mts|mjs)$/.test(entry.name)) {
      out.push({
        abs,
        rel: path.relative(baseDir, abs).split(path.sep).join('/'),
      });
    }
  }
  return out;
}

/**
 * Inspect a single JS/TS/JSX/TSX source string for direct runtime reads of
 * `forgeWpHydration` or `forgeWpTranslations`. TypeScript-only type declarations
 * and comments are ignored by AST inspection.
 *
 * @param {string} source
 * @param {string} filePath
 * @returns {Array<{ file: string, line: number, column: number, symbol: string, message: string }>}
 */
export function lintHydrationReadsInSource(source, filePath = '<inline>') {
  if (
    !source.includes('forgeWpHydration') &&
    !source.includes('forgeWpTranslations')
  ) {
    return [];
  }

  const ast = parse(source, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });

  const violations = [];
  const report = (node, symbol) => {
    const loc = node.loc?.start || { line: 0, column: 0 };
    violations.push({
      file: filePath,
      line: loc.line,
      column: loc.column + 1,
      symbol,
      message: `Direct access to "${symbol}" is forbidden outside packages/react/src/runtime/native-source.ts. Route reads through ForgeWpRuntime or native-source helpers instead.`,
    });
  };

  traverse(ast, {
    MemberExpression(p) {
      const prop = p.node.property;
      if (!p.node.computed && prop.type === 'Identifier' && FORBIDDEN_GLOBALS.has(prop.name)) {
        report(prop, prop.name);
      } else if (
        p.node.computed &&
        prop.type === 'StringLiteral' &&
        FORBIDDEN_GLOBALS.has(prop.value)
      ) {
        report(prop, prop.value);
      }
    },
    OptionalMemberExpression(p) {
      const prop = p.node.property;
      if (!p.node.computed && prop.type === 'Identifier' && FORBIDDEN_GLOBALS.has(prop.name)) {
        report(prop, prop.name);
      } else if (
        p.node.computed &&
        prop.type === 'StringLiteral' &&
        FORBIDDEN_GLOBALS.has(prop.value)
      ) {
        report(prop, prop.value);
      }
    },
    Identifier(p) {
      if (!FORBIDDEN_GLOBALS.has(p.node.name)) return;
      if (!p.isReferencedIdentifier()) return;
      // MemberExpression property identifiers are already checked above.
      if (
        (p.parent.type === 'MemberExpression' || p.parent.type === 'OptionalMemberExpression') &&
        p.parent.property === p.node &&
        !p.parent.computed
      ) {
        return;
      }
      report(p.node, p.node.name);
    },
  });

  return violations;
}

/**
 * Scan all source files under `reactSrcDir` (typically `packages/react/src`)
 * and return any forbidden direct reads of `forgeWpHydration` / `forgeWpTranslations`
 * outside `runtime/native-source.ts` and `types.ts`.
 *
 * @param {string} reactSrcDir
 */
export function lintReactHydrationReads(reactSrcDir) {
  const files = walkSourceFiles(reactSrcDir);
  const violations = [];

  for (const { abs, rel } of files) {
    if (ALLOWED_RELATIVE_FILES.has(rel)) continue;
    const source = fs.readFileSync(abs, 'utf8');
    violations.push(...lintHydrationReadsInSource(source, rel));
  }

  return violations;
}
