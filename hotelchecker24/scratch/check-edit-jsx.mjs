import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const fn = readFileSync(
  path.resolve('hotelchecker24/.forgewp/out/hotelchecker24/functions.php'),
  'utf8',
);

// Block registry is embedded as a JSON array starting with [{"apiVersion":3
const start = fn.indexOf('[{"apiVersion":3');
if (start < 0) {
  console.error('No block JSON found');
  process.exit(1);
}
// Find matching end — JSON array of blocks
let depth = 0;
let end = -1;
let inStr = false;
let esc = false;
for (let i = start; i < fn.length; i++) {
  const c = fn[i];
  if (inStr) {
    if (esc) esc = false;
    else if (c === '\\') esc = true;
    else if (c === '"') inStr = false;
    continue;
  }
  if (c === '"') {
    inStr = true;
    continue;
  }
  if (c === '[') depth++;
  else if (c === ']') {
    depth--;
    if (depth === 0) {
      end = i + 1;
      break;
    }
  }
}
const blocks = JSON.parse(fn.slice(start, end));
mkdirSync('hotelchecker24/scratch/edit-jsx', { recursive: true });

const interesting = blocks.filter((b) =>
  /hero-section|featured-hotels|destinations|trust-strip|editorial|latest-listicles/.test(
    b.name || '',
  ),
);

for (const b of interesting) {
  const code = b.customEditJsx || '';
  const file = `hotelchecker24/scratch/edit-jsx/${b.name.replace(/\//g, '_')}.js`;
  writeFileSync(file, code);
  console.log(`\n=== ${b.name} (${code.length} chars) ===`);
  try {
    // Mimic generate-theme editor: return + code
    // eslint-disable-next-line no-new-func
    new Function(
      'React',
      'props',
      'createElement',
      'useBlockProps',
      'attributes',
      'setAttributes',
      'blockProps',
      'return ' + code,
    );
    console.log('  ✅ parses');
  } catch (e) {
    console.log('  ❌', e.message);
    // Try to locate rough position via acorn-less approach: binary search
    // Print lines with issues near common patterns
    const bad = [
      /const attributes\./,
      /as Partial/,
      /as const/,
      /:\s*[A-Z]/,
      /keyof /,
      /\?\./,
      /satisfies /,
    ];
    for (const re of bad) {
      if (re.test(code)) console.log('  pattern', re, 'present');
    }
    // Show a window around first syntax-ish issues
    const lines = code.split('\n');
    console.log('  --- first 40 lines ---');
    lines.slice(0, 40).forEach((l, i) => console.log(String(i + 1).padStart(3) + '| ' + l));
  }
}
