import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';

import path from 'node:path';
import { stripTsFromScript, stripTsFromTsx } from './ts-to-js.js';

export { stripTsFromScript, stripTsFromTsx };

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
