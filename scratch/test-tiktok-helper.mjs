import {
  extractSameFileHelpers,
  findCalledHelperNames,
  stripTypeScriptSyntax,
} from '../packages/compiler/lib/blocks/source-sanitize.js';
import { transpileJsxInPreamble } from '../packages/compiler/lib/blocks/editor-transpiler.js';
import fs from 'fs';

const src = fs.readFileSync(
  'hotelchecker24/src/components/ContactDetails.tsx',
  'utf8',
);
const usage = `
  icon: TiktokIcon,
  icon: PinterestIcon,
  getSocialHandle(url, 'x')
`;

console.log('names', [...findCalledHelperNames(usage)]);
const helpers = extractSameFileHelpers(src, usage, new Set(['ContactDetails']));
console.log(
  'helpers',
  helpers.map((h) => h.name),
);
for (const h of helpers) {
  let code = h.code;
  if (/<[A-Za-z/$]/.test(code)) {
    code = transpileJsxInPreamble(code, { attributes: {}, importMap: {} });
  }
  console.log('---', h.name, '---');
  console.log(code.slice(0, 200));
  try {
    new Function(code);
    console.log('PARSE_OK');
  } catch (e) {
    console.log('PARSE_FAIL', e.message);
    // try after strip only
    try {
      new Function(stripTypeScriptSyntax(h.code).replace(/<[^>]+>/g, 'null'));
    } catch {}
  }
}
