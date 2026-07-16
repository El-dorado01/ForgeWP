/**
 * Regression: editor customEditJsx for dual-host ternaries must parse as JS.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseJsxToAst, generateReactCreateElement } from '../lib/blocks/editor-transpiler.js';
import { stripTypeScriptSyntax, rewriteAttrRefsSafely } from '../lib/blocks/source-sanitize.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sampleJsx = `
<section className={\`w-full \${sectionPaddingY(paddingY)}\`}>
  <h2>
    {setAttributes ? (
      <WpEditable tagName="span" value={heading} onChange={(val) => setAttributes({ heading: val })} />
    ) : (
      heading
    )}
  </h2>
  {setAttributes ? (
    <WpEditable
      tagName="p"
      value={subtitle}
      onChange={(val) => setAttributes({ subtitle: val })}
      className="text-slate-500 text-sm mt-2"
    />
  ) : (
    <p className="text-slate-500 text-sm mt-2">{subtitle}</p>
  )}
</section>
`;

const attrKeys = ['heading', 'subtitle', 'paddingY'];
let jsx = sampleJsx;
// Simulate index.js rewrite of ={...} expressions
let rebuilt = '';
let scan = 0;
while (scan < jsx.length) {
  const eqBrace = jsx.indexOf('={', scan);
  if (eqBrace === -1) {
    rebuilt += jsx.slice(scan);
    break;
  }
  rebuilt += jsx.slice(scan, eqBrace + 2);
  let depth = 1;
  let pos = eqBrace + 2;
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  while (pos < jsx.length && depth > 0) {
    const c = jsx[pos];
    if (inSingle) {
      if (c === '\\') {
        pos += 2;
        continue;
      }
      if (c === "'") inSingle = false;
    } else if (inDouble) {
      if (c === '\\') {
        pos += 2;
        continue;
      }
      if (c === '"') inDouble = false;
    } else if (inBacktick) {
      if (c === '\\') {
        pos += 2;
        continue;
      }
      if (c === '`') inBacktick = false;
    } else {
      if (c === "'") inSingle = true;
      else if (c === '"') inDouble = true;
      else if (c === '`') inBacktick = true;
      else if (c === '{') depth++;
      else if (c === '}') depth--;
    }
    pos++;
  }
  const expr = jsx.slice(eqBrace + 2, pos - 1);
  rebuilt += rewriteAttrRefsSafely(expr, attrKeys) + '}';
  scan = pos;
}
jsx = rebuilt;

const settings = {
  attributes: {
    heading: { type: 'string', control: 'text', default: 'Hi' },
    subtitle: { type: 'string', control: 'text', default: 'Sub' },
    paddingY: { type: 'string', control: 'select', default: 'md' },
  },
};

const ast = parseJsxToAst(jsx);
const code = generateReactCreateElement(ast, settings);
const iife = `(() => {\n  const heading = attributes.heading;\n  const subtitle = attributes.subtitle;\n  const paddingY = attributes.paddingY;\n  const setAttributes = () => {};\n  return ${code};\n})()`;

console.log('--- generated ---');
console.log(code.slice(0, 800));
console.log('---');

try {
  // eslint-disable-next-line no-new-func
  new Function(
    'createElement',
    'attributes',
    'wp',
    'sectionPaddingY',
    'return ' + iife,
  );
  console.log('✅ IIFE parses');
} catch (e) {
  console.error('❌', e.message);
  process.exitCode = 1;
}

// as cast
const castSample = `
function handleClickOutside(event) {
  if (!categoryRef.current.contains(event.target as Node)) {
    setCategoryOpen(false);
  }
}
`;
const stripped = stripTypeScriptSyntax(castSample);
console.log('--- cast strip ---');
console.log(stripped);
if (stripped.includes(' as ')) {
  console.error('❌ as cast not stripped');
  process.exitCode = 1;
} else {
  console.log('✅ as Node stripped');
}
