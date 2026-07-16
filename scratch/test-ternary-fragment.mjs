import {
  parseJsxToAst,
  generateReactCreateElement,
} from '../packages/compiler/lib/blocks/editor-transpiler.js';

const cases = {
  fragment: `<div>
  {setAttributes ? (
    <>
      <WpEditable tagName="span" value={a} onChange={(v) => setAttributes({ a: v })} />
      {' '}
      <WpEditable tagName="span" value={b} onChange={(v) => setAttributes({ b: v })} />
    </>
  ) : (
    <>
      {a}{' '}
      <a href={url}>{b}</a>
    </>
  )}
</div>`,
  nestedHtml: `<div>
  {setAttributes ? (
    <WpEditable tagName="div" value={businessPurpose} onChange={(val) => setAttributes({ businessPurpose: val })} className="text-xs" />
  ) : (
    <div className="text-xs" dangerouslySetInnerHTML={{ __html: businessPurpose }} />
  )}
</div>`,
  arrayEditText: `<div>
  {[editText(x, 'x', 'c', 'span'), editText(y, 'y', 'c', 'span')]}
</div>`,
};

for (const [name, jsx] of Object.entries(cases)) {
  console.log('\\n====', name, '====');
  try {
    const out = generateReactCreateElement(parseJsxToAst(jsx), {
      attributes: {
        a: { type: 'string' },
        b: { type: 'string' },
        businessPurpose: { type: 'string' },
      },
    });
    console.log(out.slice(0, 400));
    console.log('mangled', out.includes('") : ("') || out.includes('`)}`'));
    new Function(
      'createElement',
      'setAttributes',
      'a',
      'b',
      'url',
      'businessPurpose',
      'editText',
      'x',
      'y',
      'wp',
      'return ' + out,
    );
    console.log('PARSE_OK');
  } catch (e) {
    console.log('FAIL', e.message);
  }
}
