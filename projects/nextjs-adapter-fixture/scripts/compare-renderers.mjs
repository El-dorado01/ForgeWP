// Research only: deliberately tests a fixed-route subset, not a general RSC renderer.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRequire = createRequire(path.resolve(root, '../../package.json'));
const { build } = createRequire(fs.realpathSync(workspaceRequire.resolve('vite/package.json')))('esbuild');
const resultDir = path.join(root, '.forgewp');
fs.mkdirSync(resultDir, { recursive: true });
const outfile = path.join(resultDir, 'render-probe.cjs');
await build({
  stdin: {
    contents: `import React from 'react';
      import { renderToString } from 'react-dom/server';
      import Layout from './src/app/layout';
      import Home from './src/app/page';
      import About from './src/app/about/page';
      export async function render() {
        return { home: renderToString(<Layout>{await Home()}</Layout>),
          about: renderToString(<Layout>{await About()}</Layout>) };
      }`,
    loader: 'tsx', resolveDir: root,
  },
  bundle: true, platform: 'node', format: 'cjs', outfile,
  tsconfig: path.join(root, 'tsconfig.json'),
  external: ['react', 'react/*', 'react-dom', 'react-dom/*', 'next/*'],
  loader: { '.css': 'empty' },
  define: { 'import.meta': '{"env":{}}', 'process.env.NODE_ENV': '"production"' },
  plugins: [{
    name: 'research-server-only-boundary',
    setup(builder) {
      // This bundle is executed only in Node. It is NOT a replacement for Next's RSC checks.
      builder.onResolve({ filter: /^server-only$/ }, () => ({ path: 'server-only', namespace: 'research' }));
      builder.onLoad({ filter: /.*/, namespace: 'research' }, () => ({ contents: 'export {};', loader: 'js' }));
    },
  }],
});
const { render } = createRequire(import.meta.url)(outfile);
const rendered = await render();
const nextHome = fs.readFileSync(path.join(root, 'out/index.html'), 'utf8');
for (const [route, html] of Object.entries(rendered)) {
  assert(html.includes('data-fixture="shared-layout"'));
  assert(html.includes(route === 'home' ? 'A standard Next.js app' : 'About the adapter fixture'));
  assert(!html.includes('self.__next_f'), 'Unexpected RSC flight bootstrap');
  fs.writeFileSync(path.join(resultDir, `${route}-render-probe.html`), html);
}
assert(/href="\/about\/?\?from=home#details"/.test(rendered.home));
assert(rendered.home.includes('An editable introduction'));
const comparison = {
  scope: 'Two fixed App Router pages; root layout; local async reads; next/link; client component prerender only.',
  nextBuild: { containsFlightBootstrap: nextHome.includes('self.__next_f'), containsStylesheet: nextHome.includes('rel="stylesheet"'), containsMetadata: nextHome.includes('<title>ForgeWP Next.js research fixture</title>'), preservesAuthoredLink: nextHome.includes('href="/about?from=home#details"') },
  separateRenderer: { containsFlightBootstrap: rendered.home.includes('self.__next_f'), containsStylesheet: rendered.home.includes('rel="stylesheet"'), containsMetadata: rendered.home.includes('<title>ForgeWP Next.js research fixture</title>'), preservesAuthoredLink: rendered.home.includes('href="/about?from=home#details"') },
  limits: ['No native PHP or WordPress runtime generated.', 'Separate renderer ignores CSS, metadata exports and server/client boundaries; it is not production-safe.', 'Neither approach preserves editable/live binding identity from HTML alone.', 'No dynamic routes, request APIs, async nested components or Next navigation hooks verified.'],
};
fs.writeFileSync(path.join(resultDir, 'renderer-comparison.json'), JSON.stringify(comparison, null, 2));
console.log(JSON.stringify(comparison, null, 2));
