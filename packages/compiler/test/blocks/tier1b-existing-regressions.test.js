/**
 * Tier 1 (bonus) — three already-golden regression checks that were already
 * sitting directly in test/ (not scratch/) with real assertions, predating
 * this harness. Consolidated here rather than left running as standalone
 * `node test/*.mjs` scripts outside Vitest.
 *
 * Source: test/edit-jsx-ternary.mjs, test/jsdoc-attr-rewrite.mjs, test/ts-strip-ternary.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { parseJsxToAst, generateReactCreateElement } from '../../lib/blocks/editor-transpiler.js';
import { stripTypeScriptSyntax, rewriteAttrRefsSafely } from '../../lib/blocks/source-sanitize.js';
import { parseJsdocMetaLine } from '../../lib/blocks/scanner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../..');

describe('editor-transpiler: dual-host ternary customEditJsx must parse as JS', () => {
  it('produces an IIFE that new Function() accepts, and strips "as Node" casts', () => {
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
    // Simulate index.js's rewrite of ={...} expressions before parseJsxToAst.
    let jsx = sampleJsx;
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
          if (c === '\\') { pos += 2; continue; }
          if (c === "'") inSingle = false;
        } else if (inDouble) {
          if (c === '\\') { pos += 2; continue; }
          if (c === '"') inDouble = false;
        } else if (inBacktick) {
          if (c === '\\') { pos += 2; continue; }
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

    const code = generateReactCreateElement(parseJsxToAst(jsx), settings);
    const iife = `(() => {\n  const heading = attributes.heading;\n  const subtitle = attributes.subtitle;\n  const paddingY = attributes.paddingY;\n  const setAttributes = () => {};\n  return ${code};\n})()`;

    expect(() =>
      new Function('createElement', 'attributes', 'wp', 'sectionPaddingY', 'return ' + iife),
    ).not.toThrow();

    const castSample = `
function handleClickOutside(event) {
  if (!categoryRef.current.contains(event.target as Node)) {
    setCategoryOpen(false);
  }
}
`;
    const stripped = stripTypeScriptSyntax(castSample);
    expect(stripped).not.toContain(' as ');
  });
});

describe('scanner: block JSDoc boundary + rewriteAttrRefsSafely', () => {
  it('matches exactly one @forgewp-block JSDoc in HeroSection.tsx and extracts the correct title', () => {
    const hero = fs.readFileSync(path.join(repoRoot, 'hotelchecker24/src/components/HeroSection.tsx'), 'utf8');
    const blockRegex =
      /\/\*\*((?:(?!\*\/)[\s\S])*?@forgewp-block(?:(?!\*\/)[\s\S])*?)\*\/[\s\r\n]*(?:export\s+(?:interface|type)\s+[A-Za-z0-9_$-]+\s*=?\s*\{[\s\S]*?\}[\s\r\n]*)?export\s+(?:default\s+)?(?:function|const)\s+([A-Za-z0-9_$-]+)/g;

    let m;
    let n = 0;
    let title = '';
    while ((m = blockRegex.exec(hero)) !== null) {
      n++;
      title = parseJsdocMetaLine(m[1], 'title');
    }
    expect(n).toBe(1);
    expect(title).toBe('Hero Section');
    expect(title).not.toContain('hero_title');
  });

  it('rewrites bare identifier reads/call-args but not const bindings or object keys', () => {
    const sample = [
      "const title = setAttributes ? (titleProp ?? titleMeta) : titleMeta;",
      "const x = title + 'a';",
      "setAttributes({ title: val });",
      "fn(title)",
    ].join('\n');

    const rewritten = rewriteAttrRefsSafely(sample, ['title']);

    expect(rewritten).toContain('const title =');
    expect(rewritten).toContain("const x = attributes.title + 'a'");
    expect(rewritten).toContain('setAttributes({ title: val })');
    expect(rewritten).toContain('fn(attributes.title)');
    expect(rewritten).not.toContain('const attributes.title');
  });
});

describe('source-sanitize: stripTypeScriptSyntax on ternary-embedded casts', () => {
  it('preserves ternary branches and URL query strings while stripping "as any" casts', () => {
    const spotlight = `const spotlightImage = spotlight ? (typeof spotlight.featuredImage === 'object' && spotlight.featuredImage !== null ? (spotlight.featuredImage as any).url : String(spotlight.featuredImage)) : 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80';`;
    const out = stripTypeScriptSyntax(spotlight);

    expect(out).toContain('String(spotlight.featuredImage)');
    expect(out).toContain('auto=format');
    expect(out).not.toContain(' as ');
  });

  it('fully strips a multi-line "keyof" parameter type annotation', () => {
    const keyofLine = stripTypeScriptSyntax(
      `const cell = (\n    value: string,\n    valueKey: keyof TrustStripProps,\n  ) => (x);`,
    );
    expect(keyofLine).not.toContain('keyof');
    expect(keyofLine).not.toContain('TrustStripProps');
  });

  it('strips an "as Partial<T>" cast on a computed-property object literal without eating the value', () => {
    const castObj = stripTypeScriptSyntax(
      `onChange={(val) => setAttributes({ [valueKey]: val } as Partial<TrustStripProps>)}`,
    );
    expect(castObj).toContain('[valueKey]: val');
  });
});

describe('editor-transpiler: transpileJsxInPreamble on a bare-JSX preamble helper', () => {
  it('converts preamble JSX to createElement with no raw JSX left over', async () => {
    const { transpileJsxInPreamble } = await import('../../lib/blocks/editor-transpiler.js');
    const preamble = `
const cell = (
    value,
    label,
    valueKey,
    labelKey,
  ) => (
    <div className='flex flex-col items-center gap-1'>
      <span>{value}</span>
    </div>
  );
`;
    const converted = transpileJsxInPreamble(preamble, { attributes: {} });
    expect(converted).not.toContain('<div');
    expect(converted).toContain('createElement');
  });
});
