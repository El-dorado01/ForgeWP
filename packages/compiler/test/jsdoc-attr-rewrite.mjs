/**
 * Quick regression checks for block JSDoc boundary + safe attr rewrite.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseJsdocMetaLine } from '../lib/blocks/scanner.js';
import { rewriteAttrRefsSafely } from '../lib/blocks/source-sanitize.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');

const hero = readFileSync(
  path.join(root, 'hotelchecker24/src/components/HeroSection.tsx'),
  'utf8',
);

const blockRegex =
  /\/\*\*((?:(?!\*\/)[\s\S])*?@forgewp-block(?:(?!\*\/)[\s\S])*?)\*\/[\s\r\n]*(?:export\s+(?:interface|type)\s+[A-Za-z0-9_$-]+\s*=?\s*\{[\s\S]*?\}[\s\r\n]*)?export\s+(?:default\s+)?(?:function|const)\s+([A-Za-z0-9_$-]+)/g;

let m;
let n = 0;
while ((m = blockRegex.exec(hero)) !== null) {
  n++;
  const jsdoc = m[1];
  const title = parseJsdocMetaLine(jsdoc, 'title');
  const desc = parseJsdocMetaLine(jsdoc, 'description');
  console.log(`Hero match #${n} component=${m[2]} title=${JSON.stringify(title)} desc=${JSON.stringify(desc)}`);
  if (title === 'Hero Section') console.log('  ✅ title OK');
  else console.error('  ❌ expected title "Hero Section"');
  if (title.includes('hero_title')) console.error('  ❌ stole pick map key');
}
if (n !== 1) console.error(`❌ expected 1 match, got ${n}`);

const sample = [
  "const title = setAttributes ? (titleProp ?? titleMeta) : titleMeta;",
  "const x = title + 'a';",
  "setAttributes({ title: val });",
  "fn(title)",
].join('\n');

const rewritten = rewriteAttrRefsSafely(sample, ['title']);
console.log('--- rewrite ---');
console.log(rewritten);

const checks = [
  [rewritten.includes('const title ='), 'keeps const title binding'],
  [rewritten.includes("const x = attributes.title + 'a'"), 'rewrites read of title'],
  [rewritten.includes('setAttributes({ title: val })'), 'keeps object key title:'],
  [rewritten.includes('fn(attributes.title)'), 'rewrites call arg'],
  [!rewritten.includes('const attributes.title'), 'never const attributes.title'],
];
for (const [ok, label] of checks) {
  console.log(ok ? `✅ ${label}` : `❌ ${label}`);
}
