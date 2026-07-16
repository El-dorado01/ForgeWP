import fs from 'fs';
import {
  extractTopLevelHelper,
  stripTypeScriptSyntax,
  extractSameFileHelpers,
} from '../packages/compiler/lib/blocks/source-sanitize.js';
import { transpileJsxInPreamble } from '../packages/compiler/lib/blocks/editor-transpiler.js';
import { buildEditorScopeInjections } from '../packages/compiler/lib/blocks/editor-scope.js';

const src = fs.readFileSync(
  'hotelchecker24/src/components/AboutValues.tsx',
  'utf8',
);

const raw = extractTopLevelHelper(src, 'ValueIcon');
console.log('RAW full:\n', raw);
console.log('---');
const cleaned = stripTypeScriptSyntax(raw);
const out = transpileJsxInPreamble(cleaned, { attributes: {}, importMap: {} });
console.log('TRANSPILED:\n', out);
try {
  new Function('createElement', 'WpIcon', 'VALUE_ICONS', 'forgeWpRenderIcon', out);
  console.log('PARSE_OK');
} catch (e) {
  console.log('FAIL', e.message);
}

const helpers = extractSameFileHelpers(src, 'ValueIcon rows.map', new Set(['AboutValues']));
console.log(
  'helpers',
  helpers.map((h) => h.name),
);
