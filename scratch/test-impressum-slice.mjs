import fs from 'fs';
import {
  parseJsxToAst,
  generateReactCreateElement,
} from '../packages/compiler/lib/blocks/editor-transpiler.js';
import { stripTypeScriptSyntax } from '../packages/compiler/lib/blocks/source-sanitize.js';

const src = fs.readFileSync(
  'hotelchecker24/src/components/ImpressumContent.tsx',
  'utf8',
);
const stripped = stripTypeScriptSyntax(src);

// Extract the contact block div (from flex gap-4 with Mail through its close)
const start = stripped.indexOf(
  'className="w-10 h-10 rounded-xl bg-blue-50',
);
// go back to parent flex
const flexStart = stripped.lastIndexOf('<div className="flex gap-4">', start);
// find matching - rough: take until register section
const end = stripped.indexOf('className="h-px bg-slate-100"', start + 50);
// better: take a large chunk from flexStart
const chunk = stripped.slice(flexStart, flexStart + 2500);
// close with enough divs
const jsx = chunk + '\n</div></div>';

const settings = {
  attributes: {
    contactHeading: { type: 'string' },
    contactEmail: { type: 'string' },
    contactWebsiteLabel: { type: 'string' },
    contactWebsiteDisplay: { type: 'string' },
    contactWebsiteUrl: { type: 'string' },
  },
};

console.log('chunk head', jsx.slice(0, 200));
const ast = parseJsxToAst(jsx);
function dump(n, d = 0) {
  if (n.type === 'text') {
    console.log('  '.repeat(d) + 'T', JSON.stringify(n.value.trim().slice(0, 50)));
  } else if (n.type === 'element') {
    console.log('  '.repeat(d) + 'E', n.name, 'kids', n.children.length);
    n.children.forEach((c) => dump(c, d + 1));
  } else if (n.children) n.children.forEach((c) => dump(c, d));
}
dump(ast);

const out = generateReactCreateElement(ast, settings);
console.log('mangled', out.includes('") : ("'));
console.log(out.slice(0, 800));
