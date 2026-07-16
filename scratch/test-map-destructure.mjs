import {
  parseJsxToAst,
  generateReactCreateElement,
} from '../packages/compiler/lib/blocks/editor-transpiler.js';

const jsx = `<div>{(
  [
    { icon: Phone, label: 'Telefon', value: phone, href: 'tel:1', color: 'c' },
  ]
).map(({ icon: Icon, label, value, href, color }) => (
  <div key={label} className="row">
    <Icon className="w-4 h-4" />
    <span>{__(label)}</span>
  </div>
))}</div>`;

const ast = parseJsxToAst(jsx);
const out = generateReactCreateElement(ast, {
  attributes: {},
  importMap: { Phone: 'lucide-react' },
  themeRoot: process.cwd(),
});
console.log(out);
console.log('---');
try {
  new Function('createElement', 'Phone', '__', 'wp', 'return ' + out);
  console.log('PARSE_OK');
} catch (e) {
  console.log('PARSE_FAIL', e.message);
}

// socialList style
const jsx2 = `<div>{socialList.map(({ icon: Icon, label, handle, href }) => (
  <a key={label} href={href}><Icon className="i" />{handle}</a>
))}</div>`;
const out2 = generateReactCreateElement(parseJsxToAst(jsx2), {
  attributes: {},
  importMap: {},
  themeRoot: process.cwd(),
});
console.log(out2);
try {
  new Function('createElement', 'socialList', 'wp', 'return ' + out2);
  console.log('PARSE2_OK');
} catch (e) {
  console.log('PARSE2_FAIL', e.message);
}
