import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
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
import path from 'node:path';

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

function walkDir(dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === 'dist') continue;
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      results.push(...walkDir(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

/**
 * Convert a freshly scaffolded ForgeWP TypeScript project in `targetDir` to a
 * clean JavaScript + JSX project (for both `react` and `nextjs` adapters).
 *
 * @param {string} targetDir
 * @param {'react' | 'nextjs' | 'html'} adapter
 */
export function convertProjectToJs(targetDir, adapter) {
  if (adapter === 'html') return;

  const files = walkDir(targetDir);
  for (const filePath of files) {
    const rel = path.relative(targetDir, filePath).replace(/\\/g, '/');

    // Remove `.d.ts` declaration files
    if (rel.endsWith('.d.ts')) {
      rmSync(filePath, { force: true });
      continue;
    }

    if (rel === 'next.config.ts') {
      const raw = readFileSync(filePath, 'utf8');
      let js = stripTsFromScript(raw);
      if (!js.includes('@type')) {
        js = js.replace(
          /const nextConfig\b/,
          `/** @type {import('next').NextConfig} */\nconst nextConfig`,
        );
      }
      writeFileSync(path.join(targetDir, 'next.config.mjs'), js, 'utf8');
      rmSync(filePath, { force: true });
      continue;
    }

    if (rel === 'wp.config.ts') {
      const raw = readFileSync(filePath, 'utf8');
      let js = stripTsFromScript(raw);
      if (!js.includes('@type')) {
        js = js.replace(
          /export default\b/,
          `/** @type {import('@forgewp/compiler').ForgeWPThemeConfig} */\nexport default`,
        );
      }
      writeFileSync(path.join(targetDir, 'wp.config.js'), js, 'utf8');
      rmSync(filePath, { force: true });
      continue;
    }

    if (rel.endsWith('.ts')) {
      const raw = readFileSync(filePath, 'utf8');
      const js = stripTsFromScript(raw);
      const nextPath = filePath.slice(0, -3) + '.js';
      writeFileSync(nextPath, js, 'utf8');
      rmSync(filePath, { force: true });
      continue;
    }

    if (rel.endsWith('.tsx')) {
      const raw = readFileSync(filePath, 'utf8');
      const jsx = stripTsFromTsx(raw);
      const nextPath = filePath.slice(0, -4) + '.jsx';
      writeFileSync(nextPath, jsx, 'utf8');
      rmSync(filePath, { force: true });
    }
  }

  // Replace tsconfig.json with jsconfig.json preserving @/* path alias
  const tsconfigPath = path.join(targetDir, 'tsconfig.json');
  if (existsSync(tsconfigPath)) {
    rmSync(tsconfigPath, { force: true });
    const jsconfig = {
      compilerOptions: {
        baseUrl: '.',
        jsx: 'react-jsx',
        moduleResolution: 'bundler',
        paths: {
          '@/*': ['./src/*'],
        },
      },
      include: ['src/**/*', 'cms/**/*', 'wp.config.js'],
      exclude: ['node_modules', '.next', 'dist', 'out'],
    };
    writeFileSync(
      path.join(targetDir, 'jsconfig.json'),
      JSON.stringify(jsconfig, null, 2) + '\n',
      'utf8',
    );
  }

  // Update index.html (Vite React template) to point to src/main.jsx
  const indexHtmlPath = path.join(targetDir, 'index.html');
  if (existsSync(indexHtmlPath)) {
    const html = readFileSync(indexHtmlPath, 'utf8').replace(
      '/src/main.tsx',
      '/src/main.jsx',
    );
    writeFileSync(indexHtmlPath, html, 'utf8');
  }

  // Update components.json (`tsx: false`) if present
  const componentsJsonPath = path.join(targetDir, 'components.json');
  if (existsSync(componentsJsonPath)) {
    try {
      const cj = JSON.parse(readFileSync(componentsJsonPath, 'utf8'));
      cj.tsx = false;
      writeFileSync(componentsJsonPath, JSON.stringify(cj, null, 2) + '\n', 'utf8');
    } catch {}
  }

  // Remove TypeScript-only devDependencies & typecheck script from package.json
  const pkgPath = path.join(targetDir, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      if (pkg.devDependencies) {
        delete pkg.devDependencies.typescript;
        delete pkg.devDependencies['@types/react'];
        delete pkg.devDependencies['@types/react-dom'];
        delete pkg.devDependencies['@types/node'];
      }
      if (pkg.scripts && pkg.scripts.typecheck) {
        delete pkg.scripts.typecheck;
      }
      writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    } catch {}
  }
}
