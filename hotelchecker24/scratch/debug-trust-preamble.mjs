import { readFileSync } from 'fs';
import {
  stripTypeScriptSyntax,
  rewriteAttrRefsSafely,
} from '../../packages/compiler/lib/blocks/source-sanitize.js';
import { transpileJsxInPreamble } from '../../packages/compiler/lib/blocks/editor-transpiler.js';

const src = readFileSync('hotelchecker24/src/components/TrustStrip.tsx', 'utf8');
const fnIdx = src.indexOf('export function TrustStrip');
const sub = src.slice(fnIdx);
const retIdx = sub.search(/return\s*\(?\s*</);
const header = sub.slice(0, retIdx);
const closeParen = header.indexOf(')');
const bodyBrace = header.indexOf('{', closeParen);
let bodyHeader = bodyBrace !== -1 ? header.slice(bodyBrace + 1) : header;

console.log('--- raw bodyHeader slice (first 800) ---');
console.log(bodyHeader.slice(0, 800));

bodyHeader = stripTypeScriptSyntax(bodyHeader);
console.log('\n--- after TS strip (onChange lines) ---');
const onLines = bodyHeader.split('\n').filter((l) => l.includes('onChange') || l.includes('valueKey'));
console.log(onLines.join('\n'));

const attrKeys = [
  'stat1Value',
  'stat1Label',
  'stat2Value',
  'stat2Label',
  'stat3Value',
  'stat3Label',
  'stat4Value',
  'stat4Label',
  'paddingY',
];
bodyHeader = rewriteAttrRefsSafely(bodyHeader, attrKeys);
console.log('\n--- after rewrite (onChange) ---');
console.log(
  bodyHeader
    .split('\n')
    .filter((l) => l.includes('onChange') || l.includes('valueKey'))
    .join('\n'),
);

const settings = {
  attributes: Object.fromEntries(attrKeys.map((k) => [k, { type: 'string' }])),
};
const converted = transpileJsxInPreamble(bodyHeader, settings);
console.log('\n--- after transpileJsx ---');
console.log(converted.slice(0, 1200));
console.log('\nhas JSX?', /<[A-Za-z]/.test(converted));
try {
  new Function(converted + '\nreturn null;');
  console.log('preamble parses OK');
} catch (e) {
  console.log('preamble parse fail', e.message);
}
