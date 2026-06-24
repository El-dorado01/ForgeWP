import path from 'node:path';

/**
 * Custom Vite Plugin to statically parse "export const page = { ... }" configs in pages,
 * and dynamically inject useWpPageProtect(page) hook call at component startup.
 */
export function forgewpPageConfigPlugin() {
  return {
    name: 'forgewp-page-config',
    transform(code, id) {
      // Check if it's a page component inside src/app/pages/
      const normalizedPath = id.replace(/\\/g, '/');
      if (!normalizedPath.includes('/src/app/pages/') || !normalizedPath.endsWith('.tsx')) {
        return null;
      }
      if (!code.includes('export const pageConfig')) {
        return null;
      }

      // Prepend hook import
      let transformed = `import { useWpPageProtect as _useWpPageProtect } from '@forgewp/auth';\n` + code;

      // Match functional components
      const funcRegex = /export\s+(default\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(([\s\S]*?)\)\s*\{/g;
      if (funcRegex.test(transformed)) {
        transformed = transformed.replace(funcRegex, `export $1function $2($3) {\n  _useWpPageProtect(pageConfig);`);
        return { code: transformed, map: null };
      }

      // Match arrow function component exports
      const arrowRegex = /export\s+(const|let|var)\s+([a-zA-Z0-9_$]+)(\s*:\s*[a-zA-Z0-9_$.<>]+)?\s*=\s*\(([\s\S]*?)\)\s*=>\s*\{/g;
      if (arrowRegex.test(transformed)) {
        transformed = transformed.replace(arrowRegex, `export $1 $2$3 = ($4) => {\n  _useWpPageProtect(pageConfig);`);
        return { code: transformed, map: null };
      }

      return null;
    }
  };
}
