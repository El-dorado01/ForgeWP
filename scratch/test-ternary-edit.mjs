import {
  parseJsxToAst,
  generateReactCreateElement,
} from '../packages/compiler/lib/blocks/editor-transpiler.js';

const jsx = `<div>
  {setAttributes ? (
    <WpEditable
      tagName="span"
      value={contactEmail}
      onChange={(val) => setAttributes({ contactEmail: val })}
      className="text-sm font-bold text-slate-800 block"
    />
  ) : (
    <a
      href={\`mailto:\${contactEmail}\`}
      className="text-sm font-bold text-slate-800 hover:text-primary transition-colors"
    >
      {contactEmail}
    </a>
  )}
</div>`;

const ast = parseJsxToAst(jsx);
console.log(
  'children types',
  ast.children[0].children.map((c) =>
    c.type === 'text' ? `text:${JSON.stringify(c.value.trim().slice(0, 40))}` : `el:${c.name}`,
  ),
);

const out = generateReactCreateElement(ast, {
  attributes: { contactEmail: { type: 'string' } },
  importMap: {},
});
console.log(out);
console.log('has mangled', out.includes('") : ("') || out.includes('`)}`'));
try {
  new Function(
    'createElement',
    'setAttributes',
    'contactEmail',
    'wp',
    'return ' + out,
  );
  console.log('PARSE_OK');
} catch (e) {
  console.log('PARSE_FAIL', e.message);
}
