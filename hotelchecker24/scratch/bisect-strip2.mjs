import { readFileSync } from 'fs';
import { stripTypeScriptSyntax } from '../../packages/compiler/lib/blocks/source-sanitize.js';

const cellSrc = readFileSync('hotelchecker24/src/components/TrustStrip.tsx', 'utf8');
const start = cellSrc.indexOf('const cell');
const end = cellSrc.indexOf('return (', start);
const cell = cellSrc.slice(start, end);
const lines = cell.split('\n');

let acc = '';
for (let i = 0; i < lines.length; i++) {
  acc += lines[i] + '\n';
  const out = stripTypeScriptSyntax(acc);
  const idx = out.indexOf('[valueKey]');
  if (idx < 0) continue;
  const snippet = out.slice(idx, idx + 40);
  const bad = snippet.startsWith('[valueKey]}') || snippet.startsWith('[valueKey]})');
  if (bad) {
    console.log('Corruption after adding line', i + 1, ':', JSON.stringify(lines[i]));
    console.log('snippet:', JSON.stringify(snippet));
    console.log('--- context lines ---');
    console.log(lines.slice(Math.max(0, i - 10), i + 1).join('\n'));
    break;
  }
}
