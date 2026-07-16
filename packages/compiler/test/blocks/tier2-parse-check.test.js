/**
 * Tier 2 — parse-check fixtures, promoted from scratch/ scripts that only
 * asserted "this still parses / doesn't mangle", not exact expected strings.
 * Snapshots capture the current regex engine's output as the new baseline;
 * pass/fail is gated on the same targeted checks the original scripts used
 * (parses via `new Function`, no known mangled-ternary markers).
 *
 * Source: scratch/test-strip-vi.mjs, test-valueicon.mjs, test-impressum-return.mjs,
 * test-ternary-fragment.mjs, test-ternary-edit.mjs, test-edittext-jsx.mjs,
 * test-map-destructure.mjs, test-tiktok-helper.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  stripTypeScriptSyntax,
  extractTopLevelHelper,
  extractSameFileHelpers,
  findCalledHelperNames,
} from '../../lib/blocks/source-sanitize.js';
import {
  parseJsxToAst,
  generateReactCreateElement,
  transpileJsxInPreamble,
} from '../../lib/blocks/editor-transpiler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../..');
const hc24 = (rel) => fs.readFileSync(path.join(repoRoot, 'hotelchecker24', rel), 'utf8');

const isMangled = (out) => out.includes('") : ("') || out.includes('`)}`');

describe('editor-transpiler: ValueIcon helper (AboutValues.tsx)', () => {
  it('parses the inline ValueIcon function after strip + preamble transpile', () => {
    const s = `function ValueIcon({ name, className }: { name?: string; className?: string }) {
  const slug = (name || 'award').toLowerCase();
  const Static = VALUE_ICONS[slug];
  if (Static) return <Static className={className} aria-hidden />;
  return <WpIcon name={slug} className={className} provider='lucide' />;
}`;
    const stripped = stripTypeScriptSyntax(s);
    const out = transpileJsxInPreamble(stripped, { attributes: {}, importMap: {} });
    expect(() =>
      new Function('createElement', 'WpIcon', 'VALUE_ICONS', 'forgeWpRenderIcon', out),
    ).not.toThrow();
    expect(out).toMatchSnapshot();
  });

  it('parses ValueIcon extracted directly from the real AboutValues.tsx source', () => {
    const src = hc24('src/components/AboutValues.tsx');
    const raw = extractTopLevelHelper(src, 'ValueIcon');
    expect(raw).toBeTruthy();
    const full = transpileJsxInPreamble(stripTypeScriptSyntax(raw), { attributes: {}, importMap: {} });
    expect(() => new Function('createElement', 'WpIcon', 'VALUE_ICONS', full)).not.toThrow();
    expect(full).toMatchSnapshot();
  });

  it('resolves same-file helpers referenced by the ValueIcon rows.map usage', () => {
    const src = hc24('src/components/AboutValues.tsx');
    const helpers = extractSameFileHelpers(src, 'ValueIcon rows.map', new Set(['AboutValues']));
    expect(helpers.map((h) => h.name)).toMatchSnapshot();
  });
});

describe('editor-transpiler: ImpressumContent.tsx return JSX', () => {
  const src = hc24('src/components/ImpressumContent.tsx');
  const retIdx = src.lastIndexOf('return (');
  const returnJsx = src.slice(retIdx + 'return ('.length);
  const end = returnJsx.lastIndexOf(');\n}');
  const jsx = returnJsx.slice(0, end).trim();

  const attrs = [
    'companyHeading', 'companyName', 'companyLegalForm', 'addressHeading',
    'addressLine1', 'addressLine2', 'addressCountry', 'contactHeading',
    'contactEmail', 'contactWebsiteLabel', 'contactWebsiteUrl', 'contactWebsiteDisplay',
    'registerHeading', 'registerNumberLabel', 'registerNumber', 'vatLabel', 'vatId',
    'courtLabel', 'courtName', 'legalHeading', 'businessPurposeLabel', 'businessPurpose',
    'authorityLabel', 'authority', 'trademarkLabel', 'trademark', 'paddingY',
  ];
  const settings = {
    attributes: Object.fromEntries(attrs.map((k) => [k, { type: 'string' }])),
    importMap: { MapPin: 'lucide-react', Mail: 'lucide-react', Landmark: 'lucide-react', ShieldCheck: 'lucide-react' },
  };

  function compile(cleaned) {
    return generateReactCreateElement(parseJsxToAst(cleaned), settings);
  }

  it('compiles cleanly with only TS-stripping applied', () => {
    const out = compile(stripTypeScriptSyntax(jsx));
    expect(isMangled(out)).toBe(false);
    expect(() =>
      new Function(
        'createElement', 'setAttributes', 'editText', 'sectionPaddingY', 'paddingY', 'wp',
        'MapPin', 'Mail', 'Landmark', 'ShieldCheck', ...attrs, 'return ' + out,
      ),
    ).not.toThrow();
    expect(out).toMatchSnapshot();
  });
});

describe('editor-transpiler: nested-fragment / dangerouslySetInnerHTML / array-of-editText ternaries', () => {
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
    it(`compiles the "${name}" ternary shape without mangling`, () => {
      const out = generateReactCreateElement(parseJsxToAst(jsx), {
        attributes: { a: { type: 'string' }, b: { type: 'string' }, businessPurpose: { type: 'string' } },
      });
      expect(isMangled(out)).toBe(false);
      expect(() =>
        new Function(
          'createElement', 'setAttributes', 'a', 'b', 'url', 'businessPurpose',
          'editText', 'x', 'y', 'wp', 'return ' + out,
        ),
      ).not.toThrow();
      expect(out).toMatchSnapshot();
    });
  }
});

describe('editor-transpiler: contact-email dual-host ternary (WpEditable vs. <a>)', () => {
  it('produces the expected element-tree shape and parses', () => {
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
    // Real-AST path: ast.node IS the <div> JSXElement directly (no extra
    // wrapping level the legacy tokenizer's `{type:'root',children:[div]}`
    // shape needed) — its own .children are JSXText/JSXExpressionContainer/
    // JSXElement nodes rather than the legacy {type:'text'|'element'} shape.
    const divChildren = ast.realAst ? ast.node.children : ast.children[0].children;
    const childTypes = divChildren.map((c) => {
      if (ast.realAst) {
        if (c.type === 'JSXText') return `text:${JSON.stringify(c.value.trim().slice(0, 40))}`;
        if (c.type === 'JSXExpressionContainer') return `expr:${c.expression.type}`;
        if (c.type === 'JSXElement') return `el:${c.openingElement.name.name}`;
        return c.type;
      }
      return c.type === 'text' ? `text:${JSON.stringify(c.value.trim().slice(0, 40))}` : `el:${c.name}`;
    });
    expect(childTypes).toMatchSnapshot();

    const out = generateReactCreateElement(ast, { attributes: { contactEmail: { type: 'string' } }, importMap: {} });
    expect(isMangled(out)).toBe(false);
    expect(() => new Function('createElement', 'setAttributes', 'contactEmail', 'wp', 'return ' + out)).not.toThrow();
    expect(out).toMatchSnapshot();
  });
});

describe('editor-transpiler: editText helper preamble (ImpressumContent.tsx)', () => {
  it('transpiles the editText helper to createElement calls with no raw JSX left over', () => {
    const src = hc24('src/components/ImpressumContent.tsx');
    const start = src.indexOf('const editText =');
    const end = src.indexOf('return (', start);
    const helper = stripTypeScriptSyntax(src.slice(start, end).trim());
    expect(helper).toBeTruthy();

    const out = transpileJsxInPreamble(helper, { attributes: { companyHeading: { type: 'string' } }, importMap: {} });
    expect(/<[A-Za-z]/.test(out)).toBe(false);
    expect(() => new Function('createElement', 'WpEditable', 'setAttributes', 'wp', out)).not.toThrow();
    expect(out).toMatchSnapshot();
  });
});

describe('editor-transpiler: .map() over a destructured-and-renamed icon object', () => {
  it('compiles an inline array literal .map(({ icon: Icon, ... }) => ...)', () => {
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
    const out = generateReactCreateElement(parseJsxToAst(jsx), {
      attributes: {},
      importMap: { Phone: 'lucide-react' },
      themeRoot: repoRoot,
    });
    expect(() => new Function('createElement', 'Phone', '__', 'wp', 'return ' + out)).not.toThrow();
    expect(out).toMatchSnapshot();
  });

  it('compiles a bound-variable .map(({ icon: Icon, ... }) => ...) ("socialList" style)', () => {
    const jsx = `<div>{socialList.map(({ icon: Icon, label, handle, href }) => (
  <a key={label} href={href}><Icon className="i" />{handle}</a>
))}</div>`;
    const out = generateReactCreateElement(parseJsxToAst(jsx), { attributes: {}, importMap: {}, themeRoot: repoRoot });
    expect(() => new Function('createElement', 'socialList', 'wp', 'return ' + out)).not.toThrow();
    expect(out).toMatchSnapshot();
  });
});

describe('source-sanitize: same-file helper extraction (ContactDetails.tsx TikTok/Pinterest icons)', () => {
  it('finds the called helper names and extracts matching same-file helpers', () => {
    const src = hc24('src/components/ContactDetails.tsx');
    const usage = `
  icon: TiktokIcon,
  icon: PinterestIcon,
  getSocialHandle(url, 'x')
`;
    const names = [...findCalledHelperNames(usage)];
    expect(names).toMatchSnapshot();

    const helpers = extractSameFileHelpers(src, usage, new Set(['ContactDetails']));
    expect(helpers.map((h) => h.name)).toMatchSnapshot();
  });
});
