import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { transformThemeFile } from './hydration/index.js';

function polyfillImportMetaGlob(code, filePath) {
  if (!code.includes('import.meta.glob')) return code;
  let hasReplaced = false;
  const replaced = code.replace(
    /import\.meta\.glob(?:\s*<[^()]*>)?\s*\(\s*['"]([^'"]+)['"](?:\s*,\s*\{[\s\S]*?\}\s*)?\s*\)/g,
    (match, globPattern) => {
      try {
        const fileDir = path.dirname(filePath);
        const cleanGlob = globPattern.replace(/^\.\//, '');
        const globDir = path.join(fileDir, path.dirname(cleanGlob));
        if (existsSync(globDir)) {
          const extRegex = /\.(tsx|jsx|ts|js)$/;
          const entries = readdirSync(globDir)
            .filter((f) => extRegex.test(f) && !f.endsWith('.d.ts'))
            .map((f) => {
              const relKey =
                './' +
                path
                  .relative(fileDir, path.join(globDir, f))
                  .replace(/\\/g, '/');
              const absTarget = path.join(globDir, f).replace(/\\/g, '/');
              return `"${relKey}": __forgewp_require("${absTarget}")`;
            });
          hasReplaced = true;
          return `{ ${entries.join(', ')} }`;
        }
      } catch (e) {}
      return '({})';
    },
  );
  if (hasReplaced) {
    return `import { createRequire as __forgewp_createRequire } from 'node:module';\nconst __forgewp_require = __forgewp_createRequire(import.meta.url);\n${replaced}`;
  }
  return replaced;
}

const require = createRequire(import.meta.url);
let ts = null;
try {
  ts = require('typescript');
} catch (e) {
  let currentDir = process.cwd();
  while (true) {
    const tsPath = path.join(currentDir, 'node_modules', 'typescript');
    if (existsSync(tsPath)) {
      try {
        const rootRequire = createRequire(
          path.join(currentDir, 'package.json'),
        );
        ts = rootRequire('typescript');
        break;
      } catch (e2) {}
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }
}

/**
 * Vite/esbuild synthesize a named export for `export { Foo as default }`
 * (and `export default Foo`). Node native ESM does not, so
 * `import { ScrollTrigger } from 'gsap/ScrollTrigger'` works in `vite dev`
 * and fails during compile-time SSR. Mirror that interop here.
 *
 * @param {string} source
 * @returns {string|null} patched source, or null if no change is needed
 */
export function synthesizeNamedExportsFromDefault(source) {
  if (typeof source !== 'string' || source.length === 0) return null;

  const names = new Set();

  for (const block of source.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const part of block[1].split(',')) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const asDefault = trimmed.match(/^([A-Za-z_$][\w$]*)\s+as\s+default$/);
      if (asDefault) names.add(asDefault[1]);
    }
  }

  const identDefault = source.match(/export\s+default\s+([A-Za-z_$][\w$]*)\s*;/);
  if (identDefault) names.add(identDefault[1]);

  const fnDefault = source.match(
    /export\s+default\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/,
  );
  if (fnDefault) names.add(fnDefault[1]);

  const classDefault = source.match(/export\s+default\s+class\s+([A-Za-z_$][\w$]*)/);
  if (classDefault) names.add(classDefault[1]);

  const missing = [...names].filter((name) => !hasExplicitNamedExport(source, name));
  if (missing.length === 0) return null;

  return `${source}\n${missing.map((n) => `export { ${n} };`).join('\n')}\n`;
}

function hasExplicitNamedExport(source, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (
    new RegExp(
      `export\\s+(?:async\\s+)?(?:function|class|const|let|var)\\s+${escaped}\\b`,
    ).test(source)
  ) {
    return true;
  }

  for (const block of source.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const part of block[1].split(',')) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const pieces = trimmed.split(/\s+as\s+/).map((s) => s.trim());
      const local = pieces[0];
      const alias = pieces[1];
      if (alias === 'default') continue;
      if (alias === name || (!alias && local === name)) return true;
    }
  }

  return false;
}

/** True when a .js file is authored as ESM (import/export) rather than CJS. */
export function sourceLooksLikeEsm(source) {
  return (
    typeof source === 'string' &&
    (/(^|\n)\s*export\s/.test(source) ||
      /(^|\n)\s*import\s/.test(source) ||
      /(^|\n)\s*import\s*\(/.test(source))
  );
}

/**
 * Node.js ESM resolve hook to resolve alias paths (@/*) and extensionless TypeScript files.
 */
export async function resolve(specifier, context, defaultResolve) {
  // 1. Resolve @/* alias to <themeRoot>/src/*
  if (specifier.startsWith('@/')) {
    let themeRoot = process.env.INIT_CWD || process.cwd();
    if (context.parentURL) {
      try {
        const parentPath = fileURLToPath(context.parentURL);
        const norm = parentPath.replace(/\\/g, '/');
        if (norm.includes('/src/')) {
          themeRoot = parentPath.substring(0, norm.indexOf('/src/'));
        }
      } catch (e) {}
    }
    const target = path.join(themeRoot, 'src', specifier.slice(2));
    const extensions = [
      '.tsx',
      '.ts',
      '.jsx',
      '.js',
      '/index.tsx',
      '/index.ts',
      '/index.jsx',
      '/index.js',
    ];
    for (const ext of extensions) {
      const full = target + ext;
      if (existsSync(full)) {
        return {
          url: pathToFileURL(full).href,
          format: 'module',
          shortCircuit: true,
        };
      }
    }
    if (existsSync(target)) {
      return {
        url: pathToFileURL(target).href,
        format: 'module',
        shortCircuit: true,
      };
    }
  }

  // 2. Resolve relative imports without extensions (e.g. '../.forgewp/wordpress')
  if (specifier.startsWith('.') && context.parentURL) {
    try {
      const parentPath = fileURLToPath(context.parentURL);
      const target = path.resolve(path.dirname(parentPath), specifier);
      const extensions = [
        '.tsx',
        '.ts',
        '.jsx',
        '.js',
        '/index.tsx',
        '/index.ts',
        '/index.jsx',
        '/index.js',
      ];
      for (const ext of extensions) {
        const full = target + ext;
        if (existsSync(full)) {
          return {
            url: pathToFileURL(full).href,
            format: 'module',
            shortCircuit: true,
          };
        }
      }
    } catch (e) {}
  }

  return defaultResolve(specifier, context, defaultResolve);
}

/**
 * Node.js ESM Loader hook to intercept and mock static asset imports (images, styles, fonts)
 * and compile TypeScript/TSX on the fly during server-side theme compilation.
 */
export async function load(url, context, defaultLoad) {
  const cleanUrl = url.split('?')[0].split('#')[0];

  // 1. Intercept TSX/TS file imports to compile with AST transforms
  if (
    (cleanUrl.endsWith('.tsx') ||
      (cleanUrl.endsWith('.ts') && !cleanUrl.endsWith('.d.ts'))) &&
    !cleanUrl.includes('/node_modules/') &&
    (!cleanUrl.includes('/.forgewp/') || cleanUrl.includes('/src/.forgewp/'))
  ) {
    try {
      const filePath = fileURLToPath(cleanUrl);
      const code = readFileSync(filePath, 'utf8');

      const themeRoot = cleanUrl.includes('/src/')
        ? filePath.substring(0, filePath.replace(/\\/g, '/').indexOf('/src/'))
        : process.cwd();

      // Apply the JSX wrapper transformations
      let transformedCode = transformThemeFile(code, filePath, themeRoot);
      transformedCode = polyfillImportMetaGlob(transformedCode, filePath);

      if (ts) {
        const transpileResult = ts.transpileModule(transformedCode, {
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
            jsx: ts.JsxEmit.React,
            allowJs: true,
          },
        });
        return {
          format: 'module',
          source: transpileResult.outputText,
          shortCircuit: true,
        };
      }
    } catch (e) {
      console.error(
        `[ForgeWP SSR Loader Error] Failed to load/transpile ${url}:`,
        e,
      );
    }
  }

  // 2. Intercept JSON files to return valid JS modules
  if (cleanUrl.endsWith('.json')) {
    try {
      const filePath = fileURLToPath(cleanUrl);
      const jsonContent = readFileSync(filePath, 'utf8');
      return {
        format: 'module',
        source: `export default ${jsonContent};`,
        shortCircuit: true,
      };
    } catch (e) {
      console.error(`[ForgeWP SSR Loader] Failed to load JSON ${url}:`, e);
      return {
        format: 'module',
        source: 'export default {};',
        shortCircuit: true,
      };
    }
  }

  // 3. Intercept static assets to return mock values
  if (
    cleanUrl.endsWith('.css') ||
    cleanUrl.endsWith('.png') ||
    cleanUrl.endsWith('.jpg') ||
    cleanUrl.endsWith('.jpeg') ||
    cleanUrl.endsWith('.webp') ||
    cleanUrl.endsWith('.svg') ||
    cleanUrl.endsWith('.gif') ||
    cleanUrl.endsWith('.woff') ||
    cleanUrl.endsWith('.woff2') ||
    cleanUrl.endsWith('.ttf') ||
    cleanUrl.endsWith('.eot')
  ) {
    try {
      const filePath = fileURLToPath(cleanUrl);
      const themeRoot = process.cwd();
      const relPath = path.relative(themeRoot, filePath);
      if (!relPath.startsWith('..') && !path.isAbsolute(relPath)) {
        let normalized = relPath.replace(/\\/g, '/');
        if (normalized.startsWith('public/')) {
          normalized = normalized.substring(7); // Strip 'public/'
        }
        return {
          format: 'module',
          source: `export default "__FORGEWP_ASSET__${normalized}";`,
          shortCircuit: true,
        };
      }
    } catch (e) {
      // fallback to empty string on error
    }
    return {
      format: 'module',
      source: 'export default "";',
      shortCircuit: true,
    };
  }

  // Serve node_modules ESM ourselves. Downstream loaders (tsx) re-bundle some
  // packages (gsap plugins) into `export default` only, so
  // `import { ScrollTrigger } from 'gsap/ScrollTrigger'` — valid in Vite and
  // in Node native ESM — fails during compile-time SSR.
  if (
    /\/node_modules\//.test(cleanUrl) &&
    (cleanUrl.endsWith('.js') || cleanUrl.endsWith('.mjs'))
  ) {
    try {
      const filePath = fileURLToPath(cleanUrl);
      if (existsSync(filePath)) {
        const source = readFileSync(filePath, 'utf8');
        if (cleanUrl.endsWith('.mjs') || sourceLooksLikeEsm(source)) {
          const patched = synthesizeNamedExportsFromDefault(source) || source;
          return {
            format: 'module',
            source: patched,
            shortCircuit: true,
          };
        }
      }
    } catch {
      // Fall through to the next loader.
    }
  }

  return defaultLoad(url, context, defaultLoad);
}
