import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'out');
for (const [route, title] of [['', 'A standard Next.js app'], ['about', 'About the adapter fixture']]) {
  const htmlPath = route
    ? (fs.existsSync(path.join(out, `${route}.html`))
        ? path.join(out, `${route}.html`)
        : path.join(out, route, 'index.html'))
    : path.join(out, 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert(html.includes(title), 'Missing local CMS title: ' + route);
  assert(html.includes('data-fixture="shared-layout"'), 'Missing shared layout');
  assert(/href="\/about\/?"/.test(html), 'Missing Next link');
  const css = [...html.matchAll(/href="([^"?]+\.css)(?:[^" ]*)"/g)].map(match => match[1]);
  assert(css.length > 0, 'No stylesheet links');
  for (const asset of css) assert(fs.existsSync(path.join(out, asset)), 'Missing CSS: ' + asset);
  assert(html.includes('_next/'), 'Expected Next runtime evidence');
}
const home = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
assert(home.includes('An editable introduction'), 'Missing client block prerender');
assert(/href="\/about\/?\?from=home#details"/.test(home), 'Query/fragment link changed');
console.log('PASS: Next static output preserves fixed routes, shared layout, local CMS content, client-block prerender, links and CSS.');
console.log('This is Next output, not a native WordPress theme; its Next runtime is still present.');
