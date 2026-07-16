import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { transformThemeFile } from './hydration/index.js';

const require = createRequire(import.meta.url);
let ts = null;
try {
  ts = require("typescript");
} catch (e) {
  let currentDir = process.cwd();
  while (true) {
    const tsPath = path.join(currentDir, "node_modules", "typescript");
    if (existsSync(tsPath)) {
      try {
        const rootRequire = createRequire(path.join(currentDir, "package.json"));
        ts = rootRequire("typescript");
        break;
      } catch (e2) {}
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }
}

/**
 * Node.js ESM Loader hook to intercept and mock static asset imports (images, styles, fonts)
 * during server-side theme compilation.
 *
 * It also intercepts .tsx / .ts files inside the theme's src/ directory to apply
 * AST transformations (Selective Hydration wrapping and page config protection hooks)
 * and transpiles them on-the-fly, ensuring the SSR HTML and client bundles are identical.
 */
export async function load(url, context, defaultLoad) {
  const cleanUrl = url.split('?')[0].split('#')[0];

  // 1. Intercept TSX/TS file imports to compile with AST transforms
  if (
    (cleanUrl.endsWith('.tsx') || (cleanUrl.endsWith('.ts') && !cleanUrl.endsWith('.d.ts'))) &&
    !cleanUrl.includes('/node_modules/') &&
    !cleanUrl.includes('/.forgewp/')
  ) {
    try {
      const filePath = fileURLToPath(cleanUrl);
      const code = readFileSync(filePath, 'utf8');

      const themeRoot = cleanUrl.includes('/src/')
        ? filePath.substring(0, filePath.replace(/\\/g, '/').indexOf('/src/'))
        : process.cwd();

      // Apply the JSX wrapper transformations
      const transformedCode = transformThemeFile(code, filePath, themeRoot);

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
      console.error(`[ForgeWP SSR Loader Error] Failed to load/transpile ${url}:`, e);
    }
  }

  // 2. Intercept static assets to return mock values
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

  return defaultLoad(url, context, defaultLoad);
}

