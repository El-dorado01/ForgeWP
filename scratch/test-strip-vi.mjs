import { stripTypeScriptSyntax } from '../packages/compiler/lib/blocks/source-sanitize.js';
import { transpileJsxInPreamble } from '../packages/compiler/lib/blocks/editor-transpiler.js';
import { extractTopLevelHelper } from '../packages/compiler/lib/blocks/source-sanitize.js';
import fs from 'fs';

const s = `function ValueIcon({ name, className }: { name?: string; className?: string }) {
  const slug = (name || 'award').toLowerCase();
  const Static = VALUE_ICONS[slug];
  if (Static) return <Static className={className} aria-hidden />;
  return <WpIcon name={slug} className={className} provider='lucide' />;
}`;

const stripped = stripTypeScriptSyntax(s);
console.log('STRIPPED:\n', stripped);
const out = transpileJsxInPreamble(stripped, { attributes: {}, importMap: {} });
console.log('JSX:\n', out);
try {
  new Function('createElement', 'WpIcon', 'VALUE_ICONS', 'forgeWpRenderIcon', out);
  console.log('PARSE_OK');
} catch (e) {
  console.log('FAIL', e.message);
}

const src = fs.readFileSync('hotelchecker24/src/components/AboutValues.tsx', 'utf8');
const raw = extractTopLevelHelper(src, 'ValueIcon');
const full = transpileJsxInPreamble(stripTypeScriptSyntax(raw), {
  attributes: {},
  importMap: {},
});
console.log('FROM FILE:\n', full);
try {
  new Function('createElement', 'WpIcon', 'VALUE_ICONS', full);
  console.log('FILE_PARSE_OK');
} catch (e) {
  console.log('FILE_FAIL', e.message);
}
