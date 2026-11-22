/**
 * TypeScript -> JavaScript conversion for scaffolded ForgeWP source.
 *
 * Shared by create-forgewp (`--js` scaffolds) and the compiler (make:* and fresh in
 * JavaScript projects), so both produce identical output. The two copies,
 * packages/create-forgewp/lib/ts-to-js.js and packages/compiler/lib/ts-to-js.js,
 * are kept identical by test/functions/ts-to-js.test.js.
 */
import { stripTypeScriptTypes } from 'node:module';

/**
 * node:module stripTypeScriptTypes prints an ExperimentalWarning on first use.
 * Users of ForgeWP's CLIs shouldn't see Node internals, so silence exactly that
 * warning around the call and leave every other warning untouched.
 */
function stripTypesQuietly(code) {
  const emitWarning = process.emitWarning;
  process.emitWarning = (warning, ...rest) => {
    const type = typeof rest[0] === 'string' ? rest[0] : rest[0]?.type;
    if (type === 'ExperimentalWarning' && String(warning).includes('stripTypeScriptTypes')) return;
    return emitWarning.call(process, warning, ...rest);
  };
  try {
    return stripTypeScriptTypes(code, { mode: 'transform' });
  } finally {
    process.emitWarning = emitWarning;
  }
}

/**
 * Strip TypeScript-only syntax from a `.ts` file using Node's built-in
 * `stripTypeScriptTypes` and clean up whitespace left behind by erased lines.
 *
 * @param {string} code
 * @returns {string}
 */
export function stripTsFromScript(code) {
  let out = stripTypesQuietly(code);
  // Remove leftover empty lines created by stripped `import type` / `interface` blocks
  out = out.replace(/^[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n');
  return out.trimStart();
}

/**
 * Strip TypeScript-only syntax from a `.tsx` file while preserving JSX verbatim.
 * Covers all TS constructs used in ForgeWP templates:
 *  - `import type ...` and inline `type Foo` specifiers
 *  - `export interface ... { ... }` and `export type ... = ...;`
 *  - Parameter type annotations (`({ a, b }: Props)`, `(e: React.FormEvent<...>)`, `(slug: string)`)
 *  - Return type annotations (`): React.ReactNode {`)
 *  - Hook/call generics (`useState<string>('')`, `useRef<HTMLDivElement | null>(null)`)
 *  - `as const` / `as Type` assertions
 *  - Variable type annotations (`const nextConfig: NextConfig = ...`)
 *
 * @param {string} code
 * @returns {string}
 */
export function stripTsFromTsx(code) {
  let out = code;

  // 1. Remove standalone `import type ...;` lines
  out = out.replace(/^\s*import\s+type\s+[^;\n]+;?\s*\n?/gm, '');

  // 2. Remove inline `type ` specifiers inside named imports: `import { useState, type FormEvent } from 'react'`
  out = out.replace(
    /import\s*\{([^}]+)\}\s*from/g,
    (match, specifiers) => {
      const cleaned = specifiers
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s && !/^type\s+/.test(s));
      if (cleaned.length === 0) return '';
      return `import { ${cleaned.join(', ')} } from`;
    },
  );
  // Clean up any empty import statements left if all specifiers were `type`
  out = out.replace(/^\s*['"][^'"]+['"];?\s*$/gm, '');

  // 3. Remove `export interface Name { ... }` / `interface Name { ... }` blocks (balanced braces)
  out = stripBalancedDeclarations(out, /^(?:export\s+)?interface\s+[A-Za-z_$][\w$]*(?:\s+extends\s+[^{]+)?\s*\{/gm);

  // 4. Remove `export type Name = ...;` / `type Name = ...;` declarations
  out = out.replace(/^(?:export\s+)?type\s+[A-Za-z_$][\w$]*(?:<[^>]+>)?\s*=\s*[\s\S]*?;\s*\n?/gm, '');

  // 5. Remove `as const` and `as TypeName` (never touching `import * as Foo` or `export * as Foo`)
  out = out.replace(/(?<!\*\s)\s+as\s+const\b/g, '');
  out = out.replace(
    /^(\s*(?:import|export)\b.*$)|\s+as\s+(?:[A-Za-z_$][\w$.]*(?:<(?:[^<>\n]|<[^<>\n]*>)*>)?(?:\[\])?(?:\s*\|\s*[A-Za-z_$][\w$.]*(?:<(?:[^<>\n]|<[^<>\n]*>)*>)?(?:\[\])?)*)/gm,
    (match, importExportLine) => (importExportLine ? importExportLine : ''),
  );

  // 6. Remove React hook / call generics: `useState<...>(`, `import.meta.glob<...>(`
  out = out.replace(
    /\b(useState|useRef|useCallback|useMemo|useReducer|createContext|forwardRef|glob)<((?:[^<>\n]|<[^<>\n]*>)*)>\s*\(/g,
    '$1(',
  );

  // 7. Remove variable type annotations: `const foo: Type =`
  out = out.replace(
    /\b(const|let|var)\s+([A-Za-z_$][\w$]*)\s*:\s*[^=\n;]+(?=\s*=)/g,
    '$1 $2',
  );

  // 8. Remove destructured parameter type annotations: `({ a, b }: Readonly<{ ... }>)` or `({ a, b }: Props)`
  out = stripDestructuredParamTypes(out);

  // 9. Remove simple typed arrow/function parameters: `(slug: string)`, `(e: React.FormEvent<HTMLFormElement>)`
  out = out.replace(
    /\(([^()\n]*)\)/g,
    (match, inner) => {
      if (!inner.includes(':')) return match;
      // Skip object literals like `({ a: 1 })`
      if (inner.trim().startsWith('{')) return match;
      const parts = inner.split(',').map((part) => {
        const trimmed = part.trim();
        // Match `paramName?: Type` or `paramName: Type = default`
        const m = trimmed.match(
          /^(\.\.\.)?([A-Za-z_$][\w$]*)(\?)?\s*:\s*[^=]+(\s*=\s*[\s\S]+)?$/,
        );
        if (!m) return part;
        return `${m[1] || ''}${m[2]}${m[4] || ''}`;
      });
      return `(${parts.join(', ')})`;
    },
  );

  // 10. Remove function return type annotations: `): React.ReactNode {` or `): Promise<...> {`
  out = out.replace(/\)\s*:\s*[A-Za-z_$][\w$.<>,\s|[\]{}:?]+(?=\s*(?:\{|=>))/g, ')');

  // 11. Remove non-null assertions like `document.getElementById('root')!`
  out = out.replace(/\)\s*!/g, ')');

  // 12. Normalize `.tsx` / `.ts` relative import specifiers if any
  out = out.replace(/(from\s+['"][^'"]+)\.tsx(['"])/g, '$1.jsx$2');
  out = out.replace(/(from\s+['"][^'"]+)\.ts(['"])/g, '$1.js$2');

  // 13. In a JavaScript project the welcome page is page.jsx; keep its "Edit ..." hint accurate.
  out = out.replace(/src\/app\/page\.tsx/g, 'src/app/page.jsx');

  out = out.replace(/\n{3,}/g, '\n\n');
  return out.trimStart();
}

function stripBalancedDeclarations(source, startRegex) {
  let result = source;
  let match;
  startRegex.lastIndex = 0;
  while ((match = startRegex.exec(result)) !== null) {
    const startIdx = match.index;
    const braceStart = startIdx + match[0].length - 1;
    let depth = 1;
    let pos = braceStart + 1;
    while (pos < result.length && depth > 0) {
      if (result[pos] === '{') depth++;
      else if (result[pos] === '}') depth--;
      pos++;
    }
    while (pos < result.length && (result[pos] === ';' || result[pos] === ' ' || result[pos] === '\t')) pos++;
    if (result[pos] === '\n') pos++;
    result = result.slice(0, startIdx) + result.slice(pos);
    startRegex.lastIndex = startIdx;
  }
  return result;
}

function stripDestructuredParamTypes(source) {
  let out = '';
  let i = 0;
  while (i < source.length) {
    if (source[i] === '}' && source[i + 1] === ':') {
      // Check if we're closing a destructured parameter inside `(...)`
      // Walk forward past the type annotation until matching `)` or `,` at depth 0
      let pos = i + 2;
      let braceDepth = 0;
      let angleDepth = 0;
      let parenDepth = 0;
      while (pos < source.length) {
        const ch = source[pos];
        if (ch === '{') braceDepth++;
        else if (ch === '}') {
          if (braceDepth === 0) break;
          braceDepth--;
        } else if (ch === '<') angleDepth++;
        else if (ch === '>') {
          if (angleDepth > 0) angleDepth--;
        } else if (ch === '(') parenDepth++;
        else if (ch === ')') {
          if (braceDepth === 0 && angleDepth === 0 && parenDepth === 0) break;
          if (parenDepth > 0) parenDepth--;
        } else if (ch === ',' && braceDepth === 0 && angleDepth === 0 && parenDepth === 0) {
          break;
        }
        pos++;
      }
      out += '}';
      i = pos;
      continue;
    }
    out += source[i];
    i++;
  }
  return out;
}
