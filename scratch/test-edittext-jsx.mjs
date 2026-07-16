import { stripTypeScriptSyntax } from '../packages/compiler/lib/blocks/source-sanitize.js';
import { transpileJsxInPreamble } from '../packages/compiler/lib/blocks/editor-transpiler.js';
import fs from 'fs';

const src = fs.readFileSync(
  'hotelchecker24/src/components/ImpressumContent.tsx',
  'utf8',
);
// Extract editText helper roughly
const start = src.indexOf('const editText =');
const end = src.indexOf('return (', start);
const helper = stripTypeScriptSyntax(src.slice(start, end).trim());
console.log('INPUT ---');
console.log(helper.slice(0, 300));
const out = transpileJsxInPreamble(helper, {
  attributes: {
    companyHeading: { type: 'string' },
  },
  importMap: {},
});
console.log('OUTPUT ---');
console.log(out.slice(0, 600));
console.log('has raw JSX', /<[A-Za-z]/.test(out));
try {
  new Function('createElement', 'WpEditable', 'setAttributes', 'wp', out);
  console.log('PARSE_OK');
} catch (e) {
  console.log('PARSE_FAIL', e.message);
}
